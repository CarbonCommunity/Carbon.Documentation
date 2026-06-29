// Shared reactive state + actions for the Layout Designer.
//
// Follows the repo convention of a plain module exporting reactive refs (see
// src/stores/*.ts), scoped to this tool. A single module-level store is fine because the
// designer is mounted once.

import { computed, reactive, ref, watch } from 'vue'
import { parseCuiJson } from './codegen'
import { definitionOf, getDefinition } from './elements/registry'
import { resolveRect, rootRect } from './geometry'
import type { CanvasConfig, ColorRGBA, DataSource, DataSourceKind, DesignerElement, ElementType, ListDataSource, PanelProps, Provider, Rect, TextDataSource, TextProps, Vec2 } from './types'

let idCounter = 0
function nextId(): { id: string; n: number } {
  const n = ++idCounter
  return { id: `el-${n}`, n }
}

let dsCounter = 0
function nextDataSourceId(): { id: string; n: number } {
  const n = ++dsCounter
  return { id: `ds-${n}`, n }
}

/**
 * Build a fresh element of `type` (parented under `parentId`) with that type's default geometry/props,
 * via the element registry. The store owns the bits that depend on the current tree: a freshly
 * allocated id, the position in the array (for child staggering), and the cycled default fill color.
 */
function createByType(type: ElementType, parentId: string | null): DesignerElement {
  const { id, n } = nextId()
  const index = elements.value.length
  return getDefinition(type).create({ id, n, parentId, index, color: COLORS[index % COLORS.length] })
}

/** Deep-clone an element's props, preserving its concrete type (delegated to its definition). */
function cloneProps(el: DesignerElement): DesignerElement['props'] {
  return definitionOf(el).cloneProps(el)
}

const COLORS: ColorRGBA[] = [
  { r: 0.99, g: 0.35, b: 0.23, a: 0.85 }, // carbon orange
  { r: 0.2, g: 0.55, b: 0.85, a: 0.85 },
  { r: 0.25, g: 0.7, b: 0.45, a: 0.85 },
  { r: 0.7, g: 0.45, b: 0.85, a: 0.85 },
]

// --- state ---------------------------------------------------------------------------

const elements = ref<DesignerElement[]>([])
/** Static data sources (shared strings / template lists) — see types.ts. Bound elements resolve through these. */
const dataSources = ref<DataSource[]>([])
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

/**
 * Add an element of the given type on the root canvas (or inside `parentId`), select it, and seed any
 * related children the type defines (e.g. a button's label). The per-type defaults + seeding live in
 * the element registry, so this stays type-agnostic.
 */
function addElement(type: ElementType, parentId: string | null = null): DesignerElement {
  ensureLayout() // adding from the empty state spins up a fresh layout to hold it
  const def = getDefinition(type)
  const el = createByType(type, parentId)
  elements.value.push(el)
  const seeds = def.seedChildren?.(el, (t, pid) => createByType(t, pid)) ?? []
  if (seeds.length) elements.value.push(...seeds)
  selectedIds.value = [el.id]
  return el
}

/** Add a panel / text on the root canvas (or inside `parentId`). Thin wrappers over {@link addElement}. */
function addPanel(parentId: string | null = null): DesignerElement {
  return addElement('panel', parentId)
}
function addText(parentId: string | null = null): DesignerElement {
  return addElement('text', parentId)
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

/**
 * Move an element to a new parent and/or sibling position (used by the element-tree drag & drop).
 * Reparenting preserves the on-screen rect via `reparent`; ordering is the array order among
 * siblings (also the render/z order). `beforeId` = the sibling to drop in front of (null = last
 * child). No-ops on cycles (dropping onto self or a descendant).
 */
function moveElement(id: string, newParentId: string | null, beforeId: string | null = null) {
  if (id === beforeId) return
  const el = byId.value.get(id)
  if (!el) return
  if (newParentId === id || (newParentId && isAncestor(id, newParentId))) return // would create a cycle
  if (el.parentId !== newParentId) reparent(id, newParentId)
  const arr = elements.value.slice()
  const from = arr.findIndex((e) => e.id === id)
  if (from < 0) return
  const [moved] = arr.splice(from, 1)
  let to = arr.length
  if (beforeId) {
    const idx = arr.findIndex((e) => e.id === beforeId)
    if (idx >= 0) to = idx
  }
  arr.splice(to, 0, moved)
  elements.value = arr
}

type ElementPatch = Partial<Pick<DesignerElement, 'name' | 'anchorMin' | 'anchorMax' | 'offsetMin' | 'offsetMax'>> & {
  // Accept any prop from either element type; the inspector only sends fields valid for the
  // selected element, so a panel never receives text props and vice-versa.
  props?: Partial<PanelProps & TextProps>
}

function update(id: string, patch: ElementPatch) {
  const el = byId.value.get(id)
  if (!el) return
  if (patch.name !== undefined) el.name = patch.name
  if (patch.anchorMin) el.anchorMin = patch.anchorMin
  if (patch.anchorMax) el.anchorMax = patch.anchorMax
  if (patch.offsetMin) el.offsetMin = patch.offsetMin
  if (patch.offsetMax) el.offsetMax = patch.offsetMax
  if (patch.props) el.props = { ...(el.props as PanelProps & TextProps), ...patch.props }
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
      props: cloneProps(el),
      // bindings/repeat are objects — copy them so the clone doesn't share (and mutate) the original's.
      bindings: el.bindings ? { ...el.bindings } : el.bindings,
      repeat: el.repeat ? { ...el.repeat } : el.repeat,
    } as DesignerElement
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
  // Build sample panels through the registry factory, then override geometry/color for the specific
  // sample layout (the factory's defaults are a starting point; this is a hand-placed composition).
  const place = (parentId: string | null, aMin: Vec2, aMax: Vec2, oMin: Vec2, oMax: Vec2, color: ColorRGBA): DesignerElement => {
    const el = createByType('panel', parentId)
    el.anchorMin = aMin
    el.anchorMax = aMax
    el.offsetMin = oMin
    el.offsetMax = oMax
    el.props.color = color
    elements.value.push(el)
    return el
  }
  const bg = place(null, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { r: 0.09, g: 0.09, b: 0.11, a: 0.92 })
  const title = place(bg.id, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 8, y: -56 }, { x: -8, y: -8 }, { r: 0.99, g: 0.35, b: 0.23, a: 0.95 })
  place(bg.id, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: -132, y: 12 }, { x: -12, y: 52 }, { r: 0.2, g: 0.55, b: 0.85, a: 0.95 })
  selectedIds.value = [title.id]
}

// --- data sources --------------------------------------------------------------------

/** Next generic data-source name: "Data N" past the highest existing one. */
function nextDataSourceName(): string {
  let max = 0
  for (const ds of dataSources.value) {
    const m = /^Data (\d+)$/.exec(ds.name)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `Data ${max + 1}`
}

/** Create a data source of the given kind (text default) and return it. */
function addDataSource(kind: DataSourceKind = 'text', name?: string): DataSource {
  ensureLayout() // a data source needs a layout to live in too
  const { id } = nextDataSourceId()
  const finalName = name ?? nextDataSourceName()
  const ds: DataSource =
    kind === 'list'
      ? ({ id, name: finalName, kind: 'list', items: ['Item 1', 'Item 2', 'Item 3'] } satisfies ListDataSource)
      : ({ id, name: finalName, kind: 'text', value: 'Text' } satisfies TextDataSource)
  dataSources.value.push(ds)
  return ds
}

type DataSourcePatch = Partial<Pick<TextDataSource, 'name' | 'value'>> & Partial<Pick<ListDataSource, 'items'>>

/** Patch a data source's fields. The inspector only sends keys valid for the source's kind. */
function updateDataSource(id: string, patch: DataSourcePatch) {
  const ds = dataSources.value.find((d) => d.id === id)
  if (!ds) return
  if (patch.name !== undefined) ds.name = patch.name
  if (ds.kind === 'text' && patch.value !== undefined) ds.value = patch.value
  if (ds.kind === 'list' && patch.items !== undefined) ds.items = patch.items
}

/** Delete a data source and clear any element bindings that referenced it (no dangling ids). */
function removeDataSource(id: string) {
  dataSources.value = dataSources.value.filter((d) => d.id !== id)
  for (const el of elements.value) {
    if (!el.bindings) continue
    for (const key of Object.keys(el.bindings)) if (el.bindings[key] === id) delete el.bindings[key]
    if (el.repeat?.source === id) el.repeat = null
    if (Object.keys(el.bindings).length === 0) delete el.bindings
  }
}

/** Bind (dsId) or unbind (null) an element prop to a data source. */
function setBinding(elId: string, propPath: string, dsId: string | null) {
  const el = byId.value.get(elId)
  if (!el) return
  if (dsId) {
    if (!el.bindings) el.bindings = {}
    el.bindings[propPath] = dsId
  } else if (el.bindings) {
    delete el.bindings[propPath]
    if (Object.keys(el.bindings).length === 0) delete el.bindings
  }
}

// --- history (undo / redo) -----------------------------------------------------------

let past: string[] = []
let future: string[] = []
let current: string | null = null
const canUndo = ref(false)
const canRedo = ref(false)

function snapshot(): string {
  return JSON.stringify({ elements: elements.value, dataSources: dataSources.value, canvas })
}
function reindexIdCounter() {
  // Element ids look like `el-N` (legacy layouts use `panel-N`); data-source ids `ds-N`. Seed each
  // counter past the highest existing suffix so freshly added items never collide with loaded ones.
  let max = 0
  for (const e of elements.value) {
    const m = /-(\d+)$/.exec(e.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  idCounter = max
  let dsMax = 0
  for (const ds of dataSources.value) {
    const m = /-(\d+)$/.exec(ds.id)
    if (m) dsMax = Math.max(dsMax, Number(m[1]))
  }
  dsCounter = dsMax
}
function applySnapshot(s: string) {
  const o = JSON.parse(s)
  elements.value = o.elements
  dataSources.value = o.dataSources ?? []
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
  /** Optional for legacy layouts saved before data sources existed → treated as []. */
  dataSources?: DataSource[]
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
// Open document tabs: an ordered list of layout ids shown as tabs across the canvas. Distinct from
// `layouts` (every saved design) — closing a tab just removes the id here, the layout still exists.
// currentLayoutId === null (and openTabs empty) is the "nothing open" state (canvas empty state).
const openTabs = ref<string[]>([])
const currentLayout = computed(() => layouts.value.find((l) => l.id === currentLayoutId.value) ?? null)
const currentLayoutName = computed(() => currentLayout.value?.name ?? 'Untitled')
const openTabLayouts = computed(() => openTabs.value.map((id) => layouts.value.find((l) => l.id === id)).filter((l): l is Layout => !!l))
function openTab(id: string) {
  if (!openTabs.value.includes(id)) openTabs.value.push(id)
}

// "Recent" = recently CLOSED layouts (quick re-open). A layout lands here when its tab is closed,
// pushed to the top; switching tabs does NOT touch it, and anything still open is filtered out below.
const RECENT_MAX = 6
const recentIds = ref<string[]>([])
function pushRecent(...ids: string[]) {
  const incoming = ids.filter(Boolean)
  if (!incoming.length) return
  recentIds.value = [...incoming, ...recentIds.value.filter((id) => !incoming.includes(id))].slice(0, 30)
}
const recentLayouts = computed(() => {
  const open = new Set(openTabs.value)
  const out: Layout[] = []
  for (const id of recentIds.value) {
    if (open.has(id)) continue // never list a layout that's currently open in a tab
    const l = layouts.value.find((x) => x.id === id)
    if (l) out.push(l)
    if (out.length >= RECENT_MAX) break
  }
  return out
})

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
  return JSON.parse(JSON.stringify({ elements: elements.value, dataSources: dataSources.value, canvas }))
}
function applyData(data: LayoutData) {
  elements.value = JSON.parse(JSON.stringify(data.elements ?? []))
  dataSources.value = JSON.parse(JSON.stringify(data.dataSources ?? []))
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, layouts: layouts.value, currentLayoutId: currentLayoutId.value, openTabs: openTabs.value, recentIds: recentIds.value }))
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
    const valid = new Set(layouts.value.map((l) => l.id))
    const storedCurrent: string | null = valid.has(o.currentLayoutId) ? o.currentLayoutId : null
    // Restore open tabs (filtered to layouts that still exist). Legacy stores have no openTabs — open
    // the previously-active layout so the workspace isn't suddenly empty for existing users.
    let tabs: string[] = Array.isArray(o.openTabs) ? o.openTabs.filter((id: string) => valid.has(id)) : []
    if (!tabs.length && storedCurrent) tabs = [storedCurrent]
    openTabs.value = tabs
    recentIds.value = Array.isArray(o.recentIds) ? o.recentIds.filter((id: string) => valid.has(id)) : []
    currentLayoutId.value = storedCurrent && tabs.includes(storedCurrent) ? storedCurrent : (tabs[0] ?? null)
    applyData(currentLayout.value ? currentLayout.value.data : { elements: [], canvas: defaultCanvas() })
    return true
  } catch {
    return false
  }
}
function newLayout(name?: string, preset: 'empty' | 'default' = 'default') {
  persist()
  const finalName = name ?? nextLayoutName()
  const id = newLayoutId()
  layouts.value.push({ id, name: finalName, data: { elements: [], canvas: defaultCanvas() }, updatedAt: Date.now() })
  currentLayoutId.value = id
  openTab(id)
  applyData({ elements: [], canvas: defaultCanvas() })
  if (preset === 'default') seedSample() // 'default' seeds the sample content; 'empty' starts blank
  persist()
  resetHistory()
}
function switchLayout(id: string) {
  const l = layouts.value.find((x) => x.id === id)
  if (!l) return
  openTab(id) // selecting a layout (re)opens it as a tab
  if (id === currentLayoutId.value) return
  persist()
  currentLayoutId.value = id
  applyData(l.data)
  resetHistory()
}
/** Close a document tab (the layout itself is kept). Activates a neighbour, or the empty state. */
function closeTab(id: string) {
  const idx = openTabs.value.indexOf(id)
  if (idx < 0) return
  if (currentLayoutId.value === id) persist() // save edits before leaving
  openTabs.value.splice(idx, 1)
  pushRecent(id) // closing a tab makes the layout "recent" (quick re-open)
  if (currentLayoutId.value === id) {
    const next = openTabs.value[idx] ?? openTabs.value[idx - 1] ?? null
    currentLayoutId.value = next
    applyData(next ? currentLayout.value!.data : { elements: [], canvas: defaultCanvas() })
    resetHistory()
  }
  persist()
}
/** Close every open tab → the empty state (no layout deleted). */
function closeAllTabs() {
  if (currentLayoutId.value) persist()
  pushRecent(...openTabs.value) // every closed tab becomes recent
  openTabs.value = []
  currentLayoutId.value = null
  applyData({ elements: [], canvas: defaultCanvas() })
  resetHistory()
  persist()
}
/** Edits need a layout to live in; spin up a blank one if the workspace is at the empty state. */
function ensureLayout() {
  if (!currentLayoutId.value) newLayout(undefined, 'empty')
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
  const tabIdx = openTabs.value.indexOf(id)
  if (tabIdx >= 0) openTabs.value.splice(tabIdx, 1)
  if (currentLayoutId.value === id) {
    // activate a neighbouring open tab, else drop to the empty state (no auto-reseed)
    const next = openTabs.value[tabIdx] ?? openTabs.value[tabIdx - 1] ?? null
    currentLayoutId.value = next
    applyData(next ? currentLayout.value!.data : { elements: [], canvas: defaultCanvas() })
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

    // Raw CUI JSON (a plugin's CuiElementContainer.ToJson()) — accept it alongside our own format so
    // someone can round-trip an existing UI back into the designer. parseCuiJson returns null for our
    // export shape, so this never shadows a normal layout import.
    const cui = parseCuiJson(o)
    if (cui) {
      const id = newLayoutId()
      const data: LayoutData = { elements: cui.elements, canvas: { ...defaultCanvas(), rootLayer: cui.rootLayer } }
      layouts.value.push({ id, name: 'Imported CUI (imported)', data, updatedAt: Date.now() })
      persist()
      switchLayout(id)
      window.alert(`Imported ${cui.elements.length} element${cui.elements.length > 1 ? 's' : ''} from CUI JSON.`)
      return
    }

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
    openTabs.value = [id]
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
  [elements, dataSources, canvas],
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
    dataSources,
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
    openTabs,
    openTabLayouts,
    recentLayouts,
    newLayout,
    switchLayout,
    closeTab,
    closeAllTabs,
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
    addText,
    addElement,
    select,
    remove,
    removeSelected,
    reparent,
    moveElement,
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
    // data sources
    addDataSource,
    updateDataSource,
    removeDataSource,
    setBinding,
  }
}
