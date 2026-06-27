// Shared reactive state + actions for the Layout Designer.
//
// Follows the repo convention of a plain module exporting reactive refs (see
// src/stores/*.ts), scoped to this tool. A single module-level store is fine because the
// designer is mounted once.

import { computed, reactive, ref, watch } from 'vue'
import { resolveRect, rootRect } from './geometry'
import type { CanvasConfig, ColorRGBA, DesignerElement, Provider, Rect, Vec2 } from './types'

let idCounter = 0
function nextId(): { id: string; n: number } {
  const n = ++idCounter
  return { id: `panel-${n}`, n }
}

function makePanel(parentId: string | null, anchorMin: Vec2, anchorMax: Vec2, offsetMin: Vec2, offsetMax: Vec2, color: ColorRGBA): DesignerElement {
  const { id, n } = nextId()
  return { id, type: 'panel', name: `Panel.${n}`, parentId, anchorMin, anchorMax, offsetMin, offsetMax, props: { color } }
}

const COLORS: ColorRGBA[] = [
  { r: 0.99, g: 0.35, b: 0.23, a: 0.85 }, // carbon orange
  { r: 0.2, g: 0.55, b: 0.85, a: 0.85 },
  { r: 0.25, g: 0.7, b: 0.45, a: 0.85 },
  { r: 0.7, g: 0.45, b: 0.85, a: 0.85 },
]

// --- state ---------------------------------------------------------------------------

const elements = ref<DesignerElement[]>([])
const selectedIds = ref<string[]>([])
const canvas = reactive<CanvasConfig>({ referenceHeight: 720, aspect: '16:9', rootLayer: 'Overlay' })
/** Target framework for the generated code (see codegen.ts). */
const provider = ref<Provider>('both')

/** Snap grid in reference px — drag/resize land on multiples, keeping pixel values clean. */
const gridSize = ref(8)
/** Keep elements inside their parent (and root panels inside the canvas) while editing. */
const constrain = ref(true)

// Active alignment guides (global CUI coords), shown while dragging.
const guides = reactive<{
  v: { x: number; y0: number; y1: number } | null
  h: { y: number; x0: number; x1: number } | null
}>({ v: null, h: null })
function setGuides(v: typeof guides.v, h: typeof guides.h) {
  guides.v = v
  guides.h = h
}
function clearGuides() {
  guides.v = null
  guides.h = null
}

// Right-click context menu state (shared by the canvas and the element tree).
const contextMenu = reactive<{ open: boolean; x: number; y: number; targetId: string | null }>({ open: false, x: 0, y: 0, targetId: null })
function openContextMenu(id: string, x: number, y: number) {
  if (!selectedIds.value.includes(id)) selectedIds.value = [id]
  contextMenu.open = true
  contextMenu.x = x
  contextMenu.y = y
  contextMenu.targetId = id
}
function closeContextMenu() {
  contextMenu.open = false
  contextMenu.targetId = null
}

// --- derived -------------------------------------------------------------------------

const byId = computed<Map<string, DesignerElement>>(() => {
  const m = new Map<string, DesignerElement>()
  for (const el of elements.value) m.set(el.id, el)
  return m
})

function childrenOf(parentId: string | null): DesignerElement[] {
  return elements.value.filter((e) => e.parentId === parentId)
}

const rootElements = computed(() => childrenOf(null))

/** Single selected id (only when exactly one is selected — drives the inspector). */
const selectedId = computed<string | null>(() => (selectedIds.value.length === 1 ? selectedIds.value[0] : null))
const selected = computed<DesignerElement | null>(() => (selectedId.value ? byId.value.get(selectedId.value) ?? null : null))
function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
}

const resolvedRects = computed<Map<string, Rect>>(() => {
  const map = new Map<string, Rect>()
  const root = rootRect(canvas)
  const walk = (parentId: string | null, parentRect: Rect) => {
    for (const el of childrenOf(parentId)) {
      const rect = resolveRect(el, parentRect)
      map.set(el.id, rect)
      walk(el.id, rect)
    }
  }
  walk(null, root)
  return map
})

function rectOf(id: string): Rect | undefined {
  return resolvedRects.value.get(id)
}

// --- tree helpers --------------------------------------------------------------------

function descendantIds(id: string): string[] {
  const out: string[] = []
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const child of childrenOf(cur)) {
      out.push(child.id)
      stack.push(child.id)
    }
  }
  return out
}

function isAncestor(maybeAncestor: string, id: string): boolean {
  let cur = byId.value.get(id)?.parentId ?? null
  while (cur) {
    if (cur === maybeAncestor) return true
    cur = byId.value.get(cur)?.parentId ?? null
  }
  return false
}

// --- selection -----------------------------------------------------------------------

function select(id: string | null, additive = false) {
  if (id === null) {
    selectedIds.value = []
    return
  }
  if (additive) {
    selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((x) => x !== id) : [...selectedIds.value, id]
  } else {
    selectedIds.value = [id]
  }
}

// --- actions -------------------------------------------------------------------------

function addPanel(parentId: string | null = null): DesignerElement {
  const color = COLORS[elements.value.length % COLORS.length]
  let panel: DesignerElement
  if (parentId === null) {
    // Base/root panels default to filling the canvas (full-stretch container).
    panel = makePanel(null, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }, color)
  } else {
    // Child panels default to a centered fixed-size box, staggered so they don't fully overlap.
    const c = (elements.value.length % 6) * 24
    const half = { w: 120, h: 70 }
    panel = makePanel(parentId, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: -half.w + c, y: -half.h + c }, { x: half.w + c, y: half.h + c }, color)
  }
  elements.value.push(panel)
  selectedIds.value = [panel.id]
  return panel
}

function remove(id: string) {
  const toRemove = new Set([id, ...descendantIds(id)])
  elements.value = elements.value.filter((e) => !toRemove.has(e.id))
  selectedIds.value = selectedIds.value.filter((s) => !toRemove.has(s))
}

function removeSelected() {
  if (!selectedIds.value.length) return
  const toRemove = new Set<string>()
  for (const id of selectedIds.value) {
    toRemove.add(id)
    for (const d of descendantIds(id)) toRemove.add(d)
  }
  elements.value = elements.value.filter((e) => !toRemove.has(e.id))
  selectedIds.value = []
}

/** Re-parent an element, preserving its on-screen position by recomputing offsets. */
function reparent(id: string, newParentId: string | null) {
  if (id === newParentId) return
  if (newParentId && isAncestor(id, newParentId)) return // would create a cycle
  const el = byId.value.get(id)
  if (!el || el.parentId === newParentId) return

  const curRect = rectOf(id)
  const newParentRect = newParentId ? rectOf(newParentId) : rootRect(canvas)
  el.parentId = newParentId

  if (curRect && newParentRect) {
    el.offsetMin = {
      x: curRect.x - newParentRect.x - el.anchorMin.x * newParentRect.w,
      y: curRect.y - newParentRect.y - el.anchorMin.y * newParentRect.h,
    }
    el.offsetMax = {
      x: curRect.x + curRect.w - newParentRect.x - el.anchorMax.x * newParentRect.w,
      y: curRect.y + curRect.h - newParentRect.y - el.anchorMax.y * newParentRect.h,
    }
  }
}

type ElementPatch = Partial<Pick<DesignerElement, 'name' | 'anchorMin' | 'anchorMax' | 'offsetMin' | 'offsetMax'>> & {
  props?: Partial<DesignerElement['props']>
}

function update(id: string, patch: ElementPatch) {
  const el = byId.value.get(id)
  if (!el) return
  if (patch.name !== undefined) el.name = patch.name
  if (patch.anchorMin) el.anchorMin = patch.anchorMin
  if (patch.anchorMax) el.anchorMax = patch.anchorMax
  if (patch.offsetMin) el.offsetMin = patch.offsetMin
  if (patch.offsetMax) el.offsetMax = patch.offsetMax
  if (patch.props) el.props = { ...el.props, ...patch.props }
}

function setCanvas(patch: Partial<CanvasConfig>) {
  Object.assign(canvas, patch)
}

/** Nudge all selected elements by a CUI-px delta (arrow keys). */
function nudge(dx: number, dy: number) {
  for (const id of selectedIds.value) {
    const el = byId.value.get(id)
    if (!el) continue
    el.offsetMin = { x: el.offsetMin.x + dx, y: el.offsetMin.y + dy }
    el.offsetMax = { x: el.offsetMax.x + dx, y: el.offsetMax.y + dy }
  }
}

/** Render order = array order among siblings. Move to end => drawn last => on top. */
function bringToFront(id: string) {
  const i = elements.value.findIndex((e) => e.id === id)
  if (i < 0) return
  const [el] = elements.value.splice(i, 1)
  elements.value.push(el)
}
function sendToBack(id: string) {
  const i = elements.value.findIndex((e) => e.id === id)
  if (i < 0) return
  const [el] = elements.value.splice(i, 1)
  elements.value.unshift(el)
}

/** Deep-clone an element and its subtree with fresh ids; returns the new root id. */
function cloneSubtree(id: string): string | null {
  const src = byId.value.get(id)
  if (!src) return null
  const subtree = [src, ...descendantIds(id).map((d) => byId.value.get(d)!)]
  const idMap = new Map<string, string>()
  const clones: DesignerElement[] = subtree.map((el) => {
    const { id: nid } = nextId()
    idMap.set(el.id, nid)
    return {
      ...el,
      id: nid,
      name: `${el.name} copy`,
      anchorMin: { ...el.anchorMin },
      anchorMax: { ...el.anchorMax },
      offsetMin: { ...el.offsetMin },
      offsetMax: { ...el.offsetMax },
      props: { ...el.props, color: { ...el.props.color } },
    }
  })
  clones.forEach((c, i) => {
    const origParent = subtree[i].parentId
    c.parentId = origParent && idMap.has(origParent) ? idMap.get(origParent)! : origParent
  })
  const root = clones[0]
  root.offsetMin = { x: root.offsetMin.x + 16, y: root.offsetMin.y - 16 }
  root.offsetMax = { x: root.offsetMax.x + 16, y: root.offsetMax.y - 16 }
  elements.value.push(...clones)
  return root.id
}
function duplicate(id: string) {
  const nid = cloneSubtree(id)
  if (nid) selectedIds.value = [nid]
}
function duplicateSelected() {
  const newIds = selectedIds.value.map((id) => cloneSubtree(id)).filter((x): x is string => !!x)
  if (newIds.length) selectedIds.value = newIds
}

/** Make an element fill its parent on the given axis/axes (stretch + zero offsets). */
function fill(id: string, mode: 'both' | 'x' | 'y' = 'both') {
  const el = byId.value.get(id)
  if (!el) return
  if (mode === 'both' || mode === 'x') {
    el.anchorMin = { ...el.anchorMin, x: 0 }
    el.anchorMax = { ...el.anchorMax, x: 1 }
    el.offsetMin = { ...el.offsetMin, x: 0 }
    el.offsetMax = { ...el.offsetMax, x: 0 }
  }
  if (mode === 'both' || mode === 'y') {
    el.anchorMin = { ...el.anchorMin, y: 0 }
    el.anchorMax = { ...el.anchorMax, y: 1 }
    el.offsetMin = { ...el.offsetMin, y: 0 }
    el.offsetMax = { ...el.offsetMax, y: 0 }
  }
}

function seedSample() {
  const bg = makePanel(null, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { r: 0.09, g: 0.09, b: 0.11, a: 0.92 })
  elements.value.push(bg)
  const title = makePanel(bg.id, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 8, y: -56 }, { x: -8, y: -8 }, { r: 0.99, g: 0.35, b: 0.23, a: 0.95 })
  elements.value.push(title)
  const corner = makePanel(bg.id, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: -132, y: 12 }, { x: -12, y: 52 }, { r: 0.2, g: 0.55, b: 0.85, a: 0.95 })
  elements.value.push(corner)
  selectedIds.value = [title.id]
}

// --- history (undo / redo) -----------------------------------------------------------

let past: string[] = []
let future: string[] = []
let current: string | null = null
const canUndo = ref(false)
const canRedo = ref(false)

function snapshot(): string {
  return JSON.stringify({ elements: elements.value, canvas })
}
function reindexIdCounter() {
  let max = 0
  for (const e of elements.value) {
    const m = /panel-(\d+)/.exec(e.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  idCounter = max
}
function applySnapshot(s: string) {
  const o = JSON.parse(s)
  elements.value = o.elements
  Object.assign(canvas, o.canvas)
  reindexIdCounter()
  selectedIds.value = selectedIds.value.filter((id) => elements.value.some((e) => e.id === id))
}
function updateHistoryFlags() {
  canUndo.value = past.length > 0
  canRedo.value = future.length > 0
}
function commitHistory() {
  const snap = snapshot()
  if (current === null) {
    current = snap
    updateHistoryFlags()
    return
  }
  if (snap === current) return // no change (also covers post-undo/redo state)
  past.push(current)
  if (past.length > 100) past.shift()
  current = snap
  future = []
  updateHistoryFlags()
}
function resetHistory() {
  past = []
  future = []
  current = snapshot()
  updateHistoryFlags()
}
function undo() {
  if (!past.length) return
  future.push(current!)
  current = past.pop()!
  applySnapshot(current)
  updateHistoryFlags()
}
function redo() {
  if (!future.length) return
  past.push(current!)
  current = future.pop()!
  applySnapshot(current)
  updateHistoryFlags()
}

// --- layouts (localStorage + clipboard export/import) --------------------------------

interface LayoutData {
  elements: DesignerElement[]
  canvas: CanvasConfig
}
interface Layout {
  id: string
  name: string
  data: LayoutData
  updatedAt: number
}

const STORAGE_KEY = 'carbon-layout-designer:v1'
const layouts = ref<Layout[]>([])
const currentLayoutId = ref<string | null>(null)
const currentLayout = computed(() => layouts.value.find((l) => l.id === currentLayoutId.value) ?? null)
const currentLayoutName = computed(() => currentLayout.value?.name ?? 'Untitled')

let layoutSeq = 0
function newLayoutId(): string {
  return `layout-${Date.now()}-${++layoutSeq}`
}
/** Next generic name: "Layout N" where N is one past the highest existing "Layout N". */
function nextLayoutName(): string {
  let max = 0
  for (const l of layouts.value) {
    const m = /^Layout (\d+)$/.exec(l.name)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `Layout ${max + 1}`
}
function defaultCanvas(): CanvasConfig {
  return { referenceHeight: 720, aspect: '16:9', rootLayer: 'Overlay' }
}
function cloneData(): LayoutData {
  return JSON.parse(JSON.stringify({ elements: elements.value, canvas }))
}
function applyData(data: LayoutData) {
  elements.value = JSON.parse(JSON.stringify(data.elements ?? []))
  Object.assign(canvas, defaultCanvas(), data.canvas ?? {})
  reindexIdCounter()
  selectedIds.value = []
}
function persist() {
  const cur = currentLayout.value
  if (cur) {
    cur.data = cloneData()
    cur.updatedAt = Date.now()
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, layouts: layouts.value, currentLayoutId: currentLayoutId.value }))
  } catch {
    /* storage may be unavailable */
  }
}
function loadFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const o = JSON.parse(raw)
    if (!o?.layouts?.length) return false
    layouts.value = o.layouts
    currentLayoutId.value = o.layouts.some((l: Layout) => l.id === o.currentLayoutId) ? o.currentLayoutId : o.layouts[0].id
    applyData(currentLayout.value!.data)
    return true
  } catch {
    return false
  }
}
function newLayout(name?: string) {
  persist()
  const finalName = name ?? nextLayoutName()
  const id = newLayoutId()
  layouts.value.push({ id, name: finalName, data: { elements: [], canvas: defaultCanvas() }, updatedAt: Date.now() })
  currentLayoutId.value = id
  applyData({ elements: [], canvas: defaultCanvas() })
  seedSample() // every new layout starts from the default content
  persist()
  resetHistory()
}
function switchLayout(id: string) {
  if (id === currentLayoutId.value) return
  persist()
  const l = layouts.value.find((x) => x.id === id)
  if (!l) return
  currentLayoutId.value = id
  applyData(l.data)
  resetHistory()
}
function renameLayout(id: string, name: string) {
  const l = layouts.value.find((x) => x.id === id)
  if (l) {
    l.name = name.trim() || l.name
    persist()
  }
}
function deleteLayout(id: string) {
  const i = layouts.value.findIndex((x) => x.id === id)
  if (i < 0) return
  layouts.value.splice(i, 1)
  if (currentLayoutId.value === id) {
    if (!layouts.value.length) {
      // deleted the last one — fall back to a fresh default "Layout 1"
      const nid = newLayoutId()
      layouts.value.push({ id: nid, name: nextLayoutName(), data: { elements: [], canvas: defaultCanvas() }, updatedAt: Date.now() })
      currentLayoutId.value = nid
      applyData({ elements: [], canvas: defaultCanvas() })
      seedSample()
    } else {
      currentLayoutId.value = layouts.value[Math.max(0, i - 1)].id
      applyData(currentLayout.value!.data)
    }
    resetHistory()
  }
  persist()
}
// Clipboard helpers that also work in insecure contexts (http on a LAN IP), where
// navigator.clipboard is undefined.
function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return fallbackCopy(text)
    }
  }
  return fallbackCopy(text)
}

/** Copy the current layout to the clipboard as JSON (mirrors the Control Panel pattern). */
function exportClipboard() {
  if (!window.confirm('Copy this layout to the clipboard?')) return
  persist()
  const cur = currentLayout.value
  if (!cur) return
  copyText(JSON.stringify({ name: cur.name, data: cur.data })).then((ok) => {
    window.alert(ok ? `Copied "${cur.name}" to the clipboard.` : 'Copy failed — clipboard unavailable. Try over HTTPS or localhost.')
  })
}

function ingestLayoutJson(text: string | null) {
  if (!text) return
  try {
    const o = JSON.parse(text)
    const incoming: { name?: string; data: LayoutData }[] = Array.isArray(o) ? o : [o]
    let lastId: string | null = null
    let added = 0
    for (const item of incoming) {
      if (!item?.data) continue
      const id = newLayoutId()
      layouts.value.push({ id, name: `${item.name ?? 'Imported'} (imported)`, data: item.data, updatedAt: Date.now() })
      lastId = id
      added++
    }
    persist()
    if (lastId) switchLayout(lastId)
    window.alert(added ? `Imported ${added} layout${added > 1 ? 's' : ''}.` : 'Nothing imported — no valid layout data found.')
  } catch (e) {
    console.error('Layout import failed', e)
    window.alert('Import failed — the clipboard did not contain valid layout JSON.')
  }
}
/** Append layout(s) from the clipboard JSON. */
function importClipboard() {
  if (!window.confirm('Import layout(s) from the clipboard?')) return
  if (navigator.clipboard?.readText) {
    navigator.clipboard
      .readText()
      .then(ingestLayoutJson)
      .catch(() => ingestLayoutJson(window.prompt('Paste the layout JSON:')))
  } else {
    ingestLayoutJson(window.prompt('Paste the layout JSON:'))
  }
}

// --- init + autosave/history watcher -------------------------------------------------

let inited = false
function init() {
  if (inited) return
  inited = true
  if (!loadFromStorage()) {
    const id = newLayoutId()
    layouts.value = [{ id, name: nextLayoutName(), data: { elements: [], canvas: defaultCanvas() }, updatedAt: Date.now() }]
    currentLayoutId.value = id
    elements.value = []
    Object.assign(canvas, defaultCanvas())
    seedSample()
    persist()
  }
  resetHistory()
}

// Debounced: commit a history entry and persist on any state change. Drag bursts collapse
// into a single entry. Post-undo/redo states are skipped by the snapshot-equality check.
let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(
  [elements, canvas],
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      commitHistory()
      persist()
    }, 350)
  },
  { deep: true }
)

export function useDesigner() {
  return {
    // state
    elements,
    selectedIds,
    selectedId,
    selected,
    isSelected,
    canvas,
    provider,
    gridSize,
    constrain,
    contextMenu,
    guides,
    setGuides,
    clearGuides,
    // history
    canUndo,
    canRedo,
    undo,
    redo,
    // layouts
    layouts,
    currentLayoutId,
    currentLayoutName,
    newLayout,
    switchLayout,
    renameLayout,
    deleteLayout,
    exportClipboard,
    importClipboard,
    copyText,
    init,
    // derived
    byId,
    rootElements,
    resolvedRects,
    childrenOf,
    rectOf,
    isAncestor,
    descendantIds,
    // actions
    addPanel,
    select,
    remove,
    removeSelected,
    reparent,
    update,
    setCanvas,
    nudge,
    bringToFront,
    sendToBack,
    duplicate,
    duplicateSelected,
    fill,
    openContextMenu,
    closeContextMenu,
  }
}
