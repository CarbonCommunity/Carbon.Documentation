// Live in-game preview for the Layout Designer (issue #3).
//
// Pushes the current layout to a connected player's screen as real CUI, reusing the Control Panel's
// server layer wholesale — its `Server` objects already own the binary WebSocket, the RPC-id hashing
// (`md5("RPC_"+name)`), persistence, and player lists. We only add the layout-specific machinery:
// the reserved-root wrap, a per-element `update` diff (no flicker), and a debounced push.
//
// Server side = two Carbon `[WebCall]` primitives (see core memory `webcontrolpanel-rpc-seam`):
//   RPC_AddUi(playerId, json)     → CuiHelper.AddUi(player, json)      — create OR patch (per `update`)
//   RPC_DestroyUi(playerId, name) → CuiHelper.DestroyUi(player, name)  — tear down by name (cascades)

import { computed, ref, watch } from 'vue'
import { Server, load, servers } from '@/components/control-panel/ControlPanel.SaveLoad'
import { generateAddUiJson } from './codegen'
import { diffPreview } from './previewDiff'
import { CLIENT_PANELS } from './types'
import type { CuiElement } from './types'
import { useDesigner } from './useDesigner'

// --- server-side contract (centralized) ----------------------------------------------
// These three names MUST match the Carbon handlers. If the core RPCs / permission were named
// differently, this is the ONLY place to change. `sendCall(RPC_ADD, …)` hashes to md5("RPC_AddUi").
const RPC_ADD = 'AddUi'
const RPC_DESTROY = 'DestroyUi'
const PERM = 'draw_ui' // PermissionTypes.DrawUi — frontend gate only; the server enforces regardless.

/** Reserved root the whole preview tree hangs under, so OFF / layout-switch is one DestroyUi. */
const PREVIEW_ROOT = 'layoutdesigner.preview'
const DEBOUNCE_MS = 200

const { elements, canvas } = useDesigner()

const previewing = ref(false)
const previewServer = ref<Server | null>(null)
const previewPlayerId = ref<bigint | null>(null)

// Names sent on the previous push — drives the diff: seen → update-in-place, gone → DestroyUi.
let lastNames = new Set<string>()
// name → parent on the previous push — a changed parent is a reparent (destroy + recreate, not update).
let lastParents = new Map<string, string>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let stopWatch: (() => void) | null = null

const connectedServers = computed(() => servers.value.filter((s) => s.IsConnected && s.Bridge))
const players = computed<any[]>(() => [...(previewServer.value?.PlayerInfo ?? []), ...(previewServer.value?.SleeperInfo ?? [])])
const canPreview = computed(() => !!previewServer.value?.IsConnected && previewPlayerId.value != null)
/** The selected server permits CUI draw (defaults true if the panel never reported the flag). */
const mayDraw = computed(() => previewServer.value?.hasPermission(PERM) ?? true)
/** The account can list players — without `players_view` the server ignores the Players request. */
const mayViewPlayers = computed(() => previewServer.value?.hasPermission('players_view') ?? true)

/** Transparent full-screen panel every layout root re-parents under. */
function rootElement(): CuiElement {
  const layer = CLIENT_PANELS.find((p) => p.id === canvas.rootLayer) ?? CLIENT_PANELS[0]
  return {
    name: PREVIEW_ROOT,
    parent: layer.oxide,
    components: [
      { type: 'UnityEngine.UI.Image', color: '0 0 0 0' },
      { type: 'RectTransform', anchormin: '0 0', anchormax: '1 1', offsetmin: '0 0', offsetmax: '0 0' },
    ],
  }
}

/** Root + layout body (the full tree). Create/update flags are decided by the diff at push time. */
function buildPayload(): CuiElement[] {
  const body = generateAddUiJson(elements.value, canvas.rootLayer, { rootParent: PREVIEW_ROOT })
  return [rootElement(), ...body]
}

/**
 * Send one full snapshot. Reparented elements (and their cascade-destroyed subtrees) are torn down
 * first then recreated — Rust CUI won't reparent on `update:true`. Everything else patches in place;
 * finally DestroyUi anything that vanished since the last send.
 */
function pushSnapshot() {
  const sv = previewServer.value
  const pid = previewPlayerId.value
  if (!sv || pid == null) return
  const { payload, reparentDestroys } = diffPreview(buildPayload(), lastNames, lastParents)
  // Tear down moved subtrees BEFORE re-adding, so they recreate cleanly under their new parent.
  for (const name of reparentDestroys) sv.sendCall(RPC_DESTROY, pid, name)
  sv.sendCall(RPC_ADD, pid, JSON.stringify(payload))
  const names = new Set(payload.map((e) => e.name))
  for (const old of lastNames) {
    if (!names.has(old)) sv.sendCall(RPC_DESTROY, pid, old)
  }
  lastNames = names
  lastParents = new Map(payload.map((e) => [e.name, e.parent]))
}

function destroyPreview() {
  const sv = previewServer.value
  const pid = previewPlayerId.value
  if (sv && pid != null) sv.sendCall(RPC_DESTROY, pid, PREVIEW_ROOT)
  lastNames = new Set()
  lastParents = new Map()
}

function schedulePush() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    pushSnapshot()
  }, DEBOUNCE_MS)
}

function startPreview() {
  if (!canPreview.value) return
  previewing.value = true
  destroyPreview() // clear any stale root on the client → next push is a clean create
  pushSnapshot()
  // Re-push on any edit to elements or canvas (rootLayer/aspect). The name diff handles add/move/remove
  // and even a full layout switch, so no special-casing here.
  stopWatch = watch([elements, () => ({ ...canvas })], schedulePush, { deep: true })
}

function stopPreview() {
  previewing.value = false
  if (stopWatch) {
    stopWatch()
    stopWatch = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  destroyPreview()
}

function togglePreview() {
  if (previewing.value) stopPreview()
  else startPreview()
}

/** Switch the target server: tear down on the old target, reset the player, refresh the new list. */
function selectServer(sv: Server | null) {
  if (previewing.value) stopPreview()
  previewServer.value = sv
  previewPlayerId.value = null
  // Refresh players only if the socket is already open. A freshly-added server is still CONNECTING
  // (send() would throw); its connect() onopen handler fetches Players itself.
  if (sv?.IsConnected) sv.sendCall('Players')
}

function selectPlayer(pid: bigint | null) {
  if (previewing.value) destroyPreview()
  previewPlayerId.value = pid
  if (previewing.value) pushSnapshot()
}

/** Re-request the player list for the current server (e.g. after the Control Panel modal closes). */
function refreshPlayers() {
  if (previewServer.value?.IsConnected) previewServer.value.sendCall('Players')
}

/** Ensure the persisted server list is loaded (idempotent) — call from the UI's onMounted. */
function initPreview() {
  load()
}

export function usePreview() {
  return {
    previewing,
    previewServer,
    previewPlayerId,
    connectedServers,
    players,
    canPreview,
    mayDraw,
    mayViewPlayers,
    togglePreview,
    startPreview,
    stopPreview,
    selectServer,
    selectPlayer,
    refreshPlayers,
    initPreview,
  }
}
