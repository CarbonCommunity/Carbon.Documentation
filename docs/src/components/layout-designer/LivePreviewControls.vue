<script setup lang="ts">
import { Cast, Plus, RefreshCw } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import type { Server } from '@/components/control-panel/ControlPanel.SaveLoad'
import { usePreview } from './usePreview'

const {
  previewing,
  previewServer,
  previewPlayerId,
  connectedServers,
  players,
  canPreview,
  mayDraw,
  togglePreview,
  selectServer,
  selectPlayer,
  addAndConnect,
  initPreview,
} = usePreview()

const open = ref(false)
const adding = ref(false)
const addr = ref('')
const pass = ref('')

onMounted(() => initPreview())

function onServerChange(e: Event) {
  const address = (e.target as HTMLSelectElement).value
  selectServer(connectedServers.value.find((s: Server) => s.Address === address) ?? null)
}

function onPlayerChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  selectPlayer(v ? BigInt(v) : null)
}

function submitAdd() {
  if (!addr.value.trim()) return
  addAndConnect(addr.value.trim(), pass.value)
  addr.value = ''
  pass.value = ''
  adding.value = false
}

const serverLabel = (s: Server) => s.CachedHostname || s.Address
</script>

<template>
  <div class="lp-wrap">
    <button class="lp-btn" :class="{ live: previewing }" title="Live in-game preview — Carbon servers only" @click.stop="open = !open">
      <Cast :size="15" />
      <span>Live preview</span>
      <span v-if="previewing" class="lp-dot" />
    </button>

    <div v-if="open" class="lp-pop" @pointerdown.stop>
      <div class="lp-head">
        <div class="lp-title">Live preview</div>
        <div class="lp-sub">Carbon servers only · pushes over the WebControlPanel</div>
      </div>

      <!-- server -->
      <label class="lp-field">
        <span class="lp-label">Server</span>
        <div class="lp-row">
          <select class="lp-select" :value="previewServer?.Address ?? ''" :disabled="!connectedServers.length" @change="onServerChange">
            <option value="" disabled>{{ connectedServers.length ? 'Select a server…' : 'No connected Bridge servers' }}</option>
            <option v-for="s in connectedServers" :key="s.Address" :value="s.Address">{{ serverLabel(s) }}</option>
          </select>
          <button class="lp-icon" title="Add a server" @click="adding = !adding"><Plus :size="14" /></button>
        </div>
      </label>

      <!-- add-server mini-form (reuses the Control Panel data layer) -->
      <div v-if="adding" class="lp-add">
        <input v-model="addr" class="lp-select" type="text" placeholder="localhost:28507" @keyup.enter="submitAdd" />
        <input v-model="pass" class="lp-select" type="password" placeholder="password" @keyup.enter="submitAdd" />
        <button class="lp-action lp-add-btn" @click="submitAdd">Add &amp; connect (Bridge)</button>
      </div>

      <!-- player -->
      <label class="lp-field">
        <span class="lp-label">Target player</span>
        <div class="lp-row">
          <select class="lp-select" :value="previewPlayerId != null ? String(previewPlayerId) : ''" :disabled="!previewServer" @change="onPlayerChange">
            <option value="" disabled>{{ players.length ? 'Select a player…' : 'No players online' }}</option>
            <option v-for="p in players" :key="String(p.SteamID)" :value="String(p.SteamID)">{{ p.DisplayName }}</option>
          </select>
          <button class="lp-icon" title="Refresh players" :disabled="!previewServer?.IsConnected" @click="previewServer?.sendCall('Players')"><RefreshCw :size="13" /></button>
        </div>
      </label>

      <p v-if="previewServer && !mayDraw" class="lp-warn">This account lacks the <code>draw_ui</code> permission — the server may reject preview calls.</p>

      <!-- toggle -->
      <button class="lp-action lp-toggle" :class="{ live: previewing }" :disabled="!canPreview" @click="togglePreview">
        {{ previewing ? 'Stop previewing' : 'Start previewing' }}
      </button>
      <p class="lp-hint">Pushes the layout live to the player and streams edits. Toggling off clears it.</p>
    </div>
  </div>
</template>

<style scoped>
.lp-wrap {
  position: relative;
}

/* trigger — a filled, present feature button (not a ghost) */
.lp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 5px;
  border: 1px solid var(--c-carbon-1, #d6453a);
  background: var(--c-carbon-1, #d6453a);
  color: #fff;
  cursor: pointer;
  transition:
    filter 0.12s ease,
    background 0.12s ease;
}
.lp-btn:hover {
  filter: brightness(1.08);
}
.lp-btn.live {
  background: #2ea36b;
  border-color: #2ea36b;
}
.lp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #eafff4;
  box-shadow: 0 0 6px #b9ffdd;
}
.lp-pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 290px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  z-index: 40;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}
.lp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lp-title {
  font-weight: 700;
  font-size: 13px;
}
.lp-sub {
  font-size: 11px;
  opacity: 0.55;
}

/* small icon buttons (add / refresh) */
.lp-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.lp-icon:hover:not(:disabled) {
  border-color: var(--c-carbon-1, #d6453a);
  color: var(--vp-c-text-1);
}
.lp-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* filled action buttons (add & connect / toggle) */
.lp-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--c-carbon-1, #d6453a);
  background: var(--c-carbon-1, #d6453a);
  color: #fff;
  cursor: pointer;
}
.lp-action:hover:not(:disabled) {
  filter: brightness(1.08);
}
.lp-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lp-toggle.live {
  background: #2ea36b;
  border-color: #2ea36b;
}
.lp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lp-label {
  font-size: 11px;
  opacity: 0.6;
}
.lp-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.lp-select {
  flex: 1;
  min-width: 0;
  padding: 5px 7px;
  font-size: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.lp-add {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 6px;
}
.lp-add-btn {
  justify-content: center;
}
.lp-toggle {
  justify-content: center;
  margin-top: 2px;
}
.lp-warn {
  font-size: 11px;
  color: #e0a23a;
  margin: 0;
}
.lp-hint {
  font-size: 11px;
  opacity: 0.5;
  margin: 0;
}
</style>
