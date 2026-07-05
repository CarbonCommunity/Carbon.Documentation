// Shared reactive state + actions for the Layout Designer.
//
// Follows the repo convention of a plain module exporting reactive refs (see
// src/stores/*.ts), scoped to this tool. A single module-level store is fine because the
// designer is mounted once.

import { useStorage, watchDebounced } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { copyText } from './clipboard'
import { parseCuiJson } from './codegen'
import type { ButtonProps } from './elements/button'
import { layoutSlot } from './elements/container'
import { tabsPageRect } from './elements/tabs'
import type { TabsProps } from './elements/tabs'
import type { ContainerLayout, ContainerProps } from './elements/container'
import type { CountdownProps } from './elements/countdown'
import type { InputProps } from './elements/input'
import { definitionOf, getDefinition } from './elements/registry'
import { EXAMPLE_LAYOUTS } from './examples'
import { offsetsForAxis, offsetsForRect, resolveRect, rootRect } from './geometry'
import { loadJson, saveJson } from './storage'
import type { CanvasConfig, ColorRGBA, DataSource, DataSourceKind, DesignerElement, ElementModifiers, ElementType, LayoutPreset, ListDataSource, PanelProps, Provider, Rect, TextAlign, TextDataSource, TextProps, Vec2 } from './types'

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
const canvas = reactive<CanvasConfig>({ aspect: '16:9', rootLayer: 'Overlay' })
/** Target framework for the generated code (see codegen.ts). */
const provider = ref<Provider>('carbon')

/** Snap grid in reference px — drag/resize land on multiples, keeping pixel values clean. */
const gridSize = ref(8)
/** Keep elements inside their parent (and root panels inside the canvas) while editing. */
const constrain = ref(true)
/** When on (default), undo/redo history carries across layout switches instead of resetting (Settings). */
const preserveHistory = useStorage('carbon-layout-designer:settings:preserveHistory', true)
/** Cap on the undo stack's size in KB — the oldest steps are trimmed once it's exceeded (Settings). */
const historyLimitKb = useStorage('carbon-layout-designer:settings:historyLimitKb', 256)
/** Live size of the undo history (for the Settings readout): steps = undo depth, bytes ≈ snapshot chars. */
const historySteps = ref(0)
const historyBytes = ref(0)

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
// `under` = the z-stack of element ids at the click point (top → bottom), so the menu can offer a
// "Select under" list to reach a box occluded by a full-bleed sibling.
const contextMenu = reactive<{ open: boolean; x: number; y: number; targetId: string | null; under: string[] }>({ open: false, x: 0, y: 0, targetId: null, under: [] })
function openContextMenu(id: string | null, x: number, y: number, under: string[] = []) {
  if (id && !selectedIds.value.includes(id)) selectedIds.value = [id]
  contextMenu.open = true
  contextMenu.x = x
  contextMenu.y = y
  contextMenu.targetId = id
  contextMenu.under = under
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
  // A tab view's seeded bar sits visually ABOVE the view — list it above in the tree too.
  if (el.type === 'tabs') {
    const arr = elements.value
    const barIdx = arr.findIndex((e2) => e2.parentId === parentId && e2.name === `${el.name} Bar`)
    const elIdx = arr.findIndex((e2) => e2.id === el.id)
    if (barIdx > elIdx) {
      const [bar] = arr.splice(barIdx, 1)
      arr.splice(elIdx, 0, bar)
    }
  }
  selectedIds.value = [el.id]
  applyContainerLayout(parentId)
  return el
}

/** Add a panel / text on the root canvas (or inside `parentId`). Thin wrappers over {@link addElement}. */
function addPanel(parentId: string | null = null): DesignerElement {
  return addElement('panel', parentId)
}
function addText(parentId: string | null = null): DesignerElement {
  return addElement('text', parentId)
}

/** Add a Text child that FILLS `parentId` — a caption for a panel/button/container (a real nested
 *  element, so it stays independently editable and can be ungrouped via "Move out of parent"). */
function addLabel(parentId: string): DesignerElement {
  const parent = byId.value.get(parentId)
  const label = addElement('text', parentId) // selects the new label
  fill(label.id, 'both')
  update(label.id, { name: parent ? `${parent.name} Label` : 'Label', passthrough: true, props: { text: 'Label' } })
  return label
}

/** "Text + background": a panel with a filled Text child — a captioned box in one action. The panel is
 *  left selected (the group root). Built from the same nesting primitives as {@link addLabel}. */
function addTextWithBackground(parentId: string | null = null): DesignerElement {
  const panel = addElement('panel', parentId)
  addLabel(panel.id)
  selectedIds.value = [panel.id]
  return panel
}

// Delete each id and its subtree, pruning the removed ids from the current selection (other
// selections are kept). Shared by remove/removeSelected.
function removeByIds(ids: string[]) {
  const toRemove = new Set<string>()
  for (const id of ids) {
    toRemove.add(id)
    for (const d of descendantIds(id)) toRemove.add(d)
  }
  // Parents losing a child may need their layout reflowed once the removal lands.
  const holed = [...new Set(ids.map((id) => byId.value.get(id)?.parentId ?? null))]
  elements.value = elements.value.filter((e) => !toRemove.has(e.id))
  selectedIds.value = selectedIds.value.filter((s) => !toRemove.has(s))
  for (const p of holed) if (p && byId.value.has(p)) applyContainerLayout(p)
}

function remove(id: string) {
  removeByIds([id])
}

function removeSelected() {
  if (!selectedIds.value.length) return
  removeByIds(selectedIds.value)
  selectedIds.value = []
}

/** Re-parent an element, preserving its on-screen position by recomputing offsets. */
function reparent(id: string, newParentId: string | null) {
  if (id === newParentId) return
  if (newParentId && isAncestor(id, newParentId)) return // would create a cycle
  const el = byId.value.get(id)
  if (!el || el.parentId === newParentId) return

  const oldParentId = el.parentId
  const curRect = rectOf(id)
  const newParentRect = newParentId ? rectOf(newParentId) : rootRect(canvas)
  el.parentId = newParentId

  if (curRect && newParentRect) {
    const o = offsetsForRect(el, newParentRect, curRect)
    el.offsetMin = o.offsetMin
    el.offsetMax = o.offsetMax
  }
  applyContainerLayout(oldParentId)
  applyContainerLayout(newParentId)
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
  applyContainerLayout(newParentId) // reorder within a layout container re-slots its children
}

// --- container layout (editor-side auto-arrange; the slot math lives in elements/container) ---------

/** `id`'s active ContainerLayout, or null (not a container / layout not enabled). */
function layoutOf(id: string | null): ContainerLayout | null {
  if (!id) return null
  const el = byId.value.get(id)
  return el?.type === 'container' ? (el.props.layout ?? null) : null
}

/** Slam `id`'s children into their layout slots, in tree (sibling) order. No-op without an active
 *  layout. Runs after every structural change — add, remove, reorder, reparent, duplicate, param
 *  edit — so slots are law: a hand-moved child snaps back on the next reflow. A TABS parent is the
 *  same idea with one slot: every page fills the content rect below the bar. */
function applyContainerLayout(id: string | null) {
  if (!id) return
  const parent = byId.value.get(id)
  if (parent?.type === 'tabs') {
    const rect = tabsPageRect(parent.props)
    for (const kid of childrenOf(id)) Object.assign(kid, { anchorMin: { ...rect.anchorMin }, anchorMax: { ...rect.anchorMax }, offsetMin: { ...rect.offsetMin }, offsetMax: { ...rect.offsetMax } })
    // deleting/reordering pages can strand the active index past the end
    if (parent.props.activeTab >= childrenOf(id).length) parent.props.activeTab = Math.max(0, childrenOf(id).length - 1)
    return
  }
  const l = layoutOf(id)
  if (!l) return
  childrenOf(id).forEach((kid, i) => {
    const slot = layoutSlot(l, i)
    kid.anchorMin = { x: 0, y: 1 }
    kid.anchorMax = { x: 0, y: 1 }
    kid.offsetMin = slot.offsetMin
    kid.offsetMax = slot.offsetMax
  })
}

// Bumped to ask the Inspector to focus + select its text field (e.g. from "Edit label text").
const textEditSignal = ref(0)
function requestTextEdit() {
  textEditSignal.value++
}

// Element being text-edited inline on the canvas (double-click). Store-level because the double-click
// can land on a container (button) while the editor opens on its caption CHILD — a different
// CanvasElement instance. One editor at a time; null when none.
const inlineEditId = ref<string | null>(null)

// --- grouping (editor-only: a shared `groupId` tag, not a CUI node — codegen ignores it) -------------

/** All elements that share `id`'s group (so a canvas click can select them together), or just [id] when
 *  it isn't grouped. */
function groupMembersOf(id: string): string[] {
  const g = byId.value.get(id)?.groupId
  if (!g) return [id]
  return elements.value.filter((e) => e.groupId === g).map((e) => e.id)
}

/** The element a click/drag should actually act on: climb out of any child flagged `passthrough` (a
 *  label filling its button) and out of tab view PAGES (full-bleed by design, so a click on an
 *  "empty" spot of a tab view would otherwise always hit the page and the view itself could never
 *  be grabbed or resized). Alt-click and the tree bypass this; page CONTENT is deeper and still
 *  hits normally. (Slotted layout children are NOT climbed: they select and resize normally — only
 *  their MOVE is blocked, with a hint; see CanvasElement.startMove.) */
function surfaceOf(id: string): string {
  let cur = id
  let el = byId.value.get(cur)
  while (el?.parentId && (el.passthrough || byId.value.get(el.parentId)?.type === 'tabs')) {
    cur = el.parentId
    el = byId.value.get(cur)
  }
  return cur
}

/** The selected ids that aren't nested inside another selected id — the top-level "roots" to group. */
function selectionRoots(): string[] {
  const sel = new Set(selectedIds.value)
  return selectedIds.value.filter((id) => {
    let p = byId.value.get(id)?.parentId ?? null
    while (p) {
      if (sel.has(p)) return false
      p = byId.value.get(p)?.parentId ?? null
    }
    return true
  })
}

const canGroup = computed(() => selectionRoots().length > 1)
const selectionHasGroup = computed(() => selectedIds.value.some((id) => !!byId.value.get(id)?.groupId))

/** Tag the selected top-level elements with a shared `groupId` so they select and move as one. */
function groupSelection() {
  const roots = selectionRoots()
  if (roots.length < 2) return
  const gid = nextId().id
  for (const id of roots) {
    const el = byId.value.get(id)
    if (el) el.groupId = gid
  }
  selectedIds.value = roots
}

/** Remove the group tag from every member of `id`'s group. */
function ungroup(id: string) {
  const g = byId.value.get(id)?.groupId
  if (!g) return
  for (const el of elements.value) if (el.groupId === g) delete el.groupId
}

/** Ungroup every group represented in the current selection (the Ungroup command / Ctrl+Shift+G). */
function ungroupSelection() {
  const gids = new Set(selectedIds.value.map((id) => byId.value.get(id)?.groupId).filter((g): g is string => !!g))
  if (!gids.size) return
  for (const el of elements.value) if (el.groupId && gids.has(el.groupId)) delete el.groupId
}

/** Align each selected element within its parent (keeping size + anchors), on one axis or centred. */
type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'
function alignSelection(mode: AlignMode) {
  for (const id of selectedIds.value) {
    const el = byId.value.get(id)
    if (!el) continue
    const pr = el.parentId ? rectOf(el.parentId) : rootRect(canvas)
    const er = rectOf(id)
    if (!pr || !er) continue
    const offsetMin = { ...el.offsetMin }
    const offsetMax = { ...el.offsetMax }
    if (mode === 'left' || mode === 'centerH' || mode === 'right') {
      const left = mode === 'left' ? pr.x : mode === 'right' ? pr.x + pr.w - er.w : pr.x + (pr.w - er.w) / 2
      const o = offsetsForAxis(el, pr, 'x', left, er.w)
      offsetMin.x = o.min
      offsetMax.x = o.max
    } else {
      // CUI y is up: 'top' pins the element's top edge to the parent's top.
      const bottom = mode === 'bottom' ? pr.y : mode === 'top' ? pr.y + pr.h - er.h : pr.y + (pr.h - er.h) / 2
      const o = offsetsForAxis(el, pr, 'y', bottom, er.h)
      offsetMin.y = o.min
      offsetMax.y = o.max
    }
    update(id, { offsetMin, offsetMax })
  }
}

/** Place each selected element in its parent, inset by `pad` px. `pad` is anchor-aware "padding" — there
 *  is no real CUI padding, so it just writes offsets: a STRETCHED axis is inset on both sides (works even
 *  when the element fills its parent); a PINNED axis is positioned by h/v and pushed `pad` off that edge;
 *  a CENTERED placement ignores pad. Keeps size + anchors. */
type HPlace = 'left' | 'center' | 'right'
type VPlace = 'top' | 'middle' | 'bottom'
function snapSelection(h: HPlace, v: VPlace, pad = 0) {
  for (const id of selectedIds.value) {
    const el = byId.value.get(id)
    if (!el) continue
    const pr = el.parentId ? rectOf(el.parentId) : rootRect(canvas)
    const er = rectOf(id)
    if (!pr || !er) continue
    const offsetMin = { ...el.offsetMin }
    const offsetMax = { ...el.offsetMax }
    if (el.anchorMin.x !== el.anchorMax.x) {
      offsetMin.x = pad // stretched → inset both sides
      offsetMax.x = -pad
    } else {
      const left = h === 'left' ? pr.x + pad : h === 'right' ? pr.x + pr.w - er.w - pad : pr.x + (pr.w - er.w) / 2
      const o = offsetsForAxis(el, pr, 'x', left, er.w)
      offsetMin.x = o.min
      offsetMax.x = o.max
    }
    if (el.anchorMin.y !== el.anchorMax.y) {
      offsetMin.y = pad
      offsetMax.y = -pad
    } else {
      const bottom = v === 'bottom' ? pr.y + pad : v === 'top' ? pr.y + pr.h - er.h - pad : pr.y + (pr.h - er.h) / 2
      const o = offsetsForAxis(el, pr, 'y', bottom, er.h)
      offsetMin.y = o.min
      offsetMax.y = o.max
    }
    update(id, { offsetMin, offsetMax })
  }
}

// Every prop key across all element types (container has none). The shared keys (color, text, font…)
// have identical types in every element module, so the intersection is well-formed — and a typo'd or
// unknown key in an inspector setter is a compile error instead of a silently dropped patch.
type AnyElementProps = PanelProps & TextProps & ButtonProps & InputProps & CountdownProps & ContainerProps & TabsProps

type ElementPatch = Partial<Pick<DesignerElement, 'name' | 'anchorMin' | 'anchorMax' | 'offsetMin' | 'offsetMax' | 'passthrough'>> & {
  // A modifier key set to null/false clears it (merged in, then falsy keys are pruned).
  modifiers?: { [K in keyof ElementModifiers]?: ElementModifiers[K] | null }
  // Accept any prop from any element type; the inspector only sends fields valid for the
  // selected element, so a panel never receives text props and vice-versa.
  props?: Partial<AnyElementProps>
}

function update(id: string, patch: ElementPatch) {
  const el = byId.value.get(id)
  if (!el) return
  if (patch.name !== undefined) el.name = patch.name
  if (patch.anchorMin) el.anchorMin = patch.anchorMin
  if (patch.anchorMax) el.anchorMax = patch.anchorMax
  if (patch.offsetMin) el.offsetMin = patch.offsetMin
  if (patch.offsetMax) el.offsetMax = patch.offsetMax
  if (patch.passthrough !== undefined) el.passthrough = patch.passthrough
  if (patch.modifiers) {
    // Merge the sent key(s), then prune falsy ones so `?.modifier` checks + emit stay clean; an empty
    // set collapses back to undefined so an element with no modifiers emits byte-identically.
    const merged = { ...el.modifiers, ...patch.modifiers } as Record<string, unknown>
    for (const k of Object.keys(merged)) if (!merged[k]) delete merged[k]
    el.modifiers = Object.keys(merged).length ? (merged as ElementModifiers) : undefined
  }
  if (patch.props) {
    el.props = { ...(el.props as AnyElementProps), ...patch.props }
    if ('layout' in patch.props || el.type === 'tabs') applyContainerLayout(id) // layout/tabs param edits re-slot immediately
  }
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
      // bindings/repeat/modifiers are objects — copy them so the clone doesn't share (and mutate) the original's.
      bindings: el.bindings ? { ...el.bindings } : el.bindings,
      repeat: el.repeat ? { ...el.repeat } : el.repeat,
      modifiers: el.modifiers ? { ...el.modifiers } : el.modifiers,
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
  applyContainerLayout(root.parentId) // a copy dropped into a layout container takes the next slot
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
  const bg = seedPanel(null, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { r: 0.09, g: 0.09, b: 0.11, a: 0.92 })
  const title = seedPanel(bg.id, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 8, y: -56 }, { x: -8, y: -8 }, { r: 0.99, g: 0.35, b: 0.23, a: 0.95 })
  seedPanel(bg.id, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: -132, y: 12 }, { x: -12, y: 52 }, { r: 0.2, g: 0.55, b: 0.85, a: 0.95 })
  selectedIds.value = [title.id]
}

// Shared placement helpers for the seed presets below: build an element through the registry factory,
// then override geometry (+ props) for a hand-placed composition. Same pattern as seedSample's local
// `place`, hoisted so every preset can drop in panels and text labels.
function seedPanel(parentId: string | null, aMin: Vec2, aMax: Vec2, oMin: Vec2, oMax: Vec2, color: ColorRGBA, name?: string): DesignerElement {
  const el = createByType('panel', parentId)
  el.anchorMin = aMin
  el.anchorMax = aMax
  el.offsetMin = oMin
  el.offsetMax = oMax
  if (el.type === 'panel') el.props.color = color
  if (name) el.name = name
  elements.value.push(el)
  return el
}
function seedText(parentId: string | null, aMin: Vec2, aMax: Vec2, oMin: Vec2, oMax: Vec2, text: string, opts?: { fontSize?: number; align?: TextAlign; color?: ColorRGBA; name?: string; passthrough?: boolean }): DesignerElement {
  const el = createByType('text', parentId)
  el.anchorMin = aMin
  el.anchorMax = aMax
  el.offsetMin = oMin
  el.offsetMax = oMax
  if (el.type === 'text') {
    el.props.text = text
    if (opts?.fontSize != null) el.props.fontSize = opts.fontSize
    if (opts?.align) el.props.align = opts.align
    if (opts?.color) el.props.color = opts.color
  }
  if (opts?.name) el.name = opts.name
  if (opts?.passthrough) el.passthrough = true
  elements.value.push(el)
  return el
}

/** Seed a real button element (not a panel) with the given geometry, colour and caption. The button's
 *  own definition seeds a centred, "move with parent" child Text label — we just override its text. */
function seedButton(parentId: string | null, aMin: Vec2, aMax: Vec2, oMin: Vec2, oMax: Vec2, color: ColorRGBA, label: string, opts?: { command?: string; name?: string; fontSize?: number }): DesignerElement {
  const el = createByType('button', parentId)
  el.anchorMin = aMin
  el.anchorMax = aMax
  el.offsetMin = oMin
  el.offsetMax = oMax
  if (el.type === 'button') {
    el.props.color = color
    if (opts?.command) el.props.command = opts.command
  }
  if (opts?.name) el.name = opts.name
  elements.value.push(el)
  const seeds = getDefinition('button').seedChildren?.(el, (t, pid) => createByType(t, pid)) ?? []
  for (const s of seeds) {
    if (s.type === 'text') {
      s.props.text = label
      if (opts?.fontSize != null) s.props.fontSize = opts.fontSize
    }
  }
  elements.value.push(...seeds)
  return el
}

/** A plain centered menu window: title bar with a title + close (X) button, and one action button. */
function seedMenu() {
  const white = { r: 0.95, g: 0.95, b: 0.97, a: 1 }
  const window = seedPanel(null, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: -180, y: -130 }, { x: 180, y: 130 }, { r: 0.12, g: 0.13, b: 0.16, a: 0.98 }, 'Menu')
  const titleBar = seedPanel(window.id, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: -44 }, { x: 0, y: 0 }, { r: 0.99, g: 0.35, b: 0.23, a: 1 }, 'Title Bar')
  seedText(titleBar.id, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 14, y: 0 }, { x: -44, y: 0 }, 'Menu Title', { fontSize: 16, align: 'MiddleLeft', color: white, name: 'Title', passthrough: true })
  seedButton(titleBar.id, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: -40, y: -40 }, { x: -4, y: -4 }, { r: 0.82, g: 0.24, b: 0.2, a: 1 }, 'X', { name: 'Close Button', fontSize: 16 })
  seedButton(window.id, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 24, y: 24 }, { x: -24, y: 68 }, { r: 0.2, g: 0.55, b: 0.85, a: 1 }, 'Button', { name: 'Button', fontSize: 15 })
  selectedIds.value = [window.id]
}

/** "List menu" preset: the Menu window, but the body is a scrolling repeat container stamped from a
 *  seeded Kits list -- the working starting point for kit/shop/leaderboard style UIs. */
function seedListMenu() {
  const white = { r: 0.95, g: 0.95, b: 0.97, a: 1 }
  const window = seedPanel(null, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: -180, y: -150 }, { x: 180, y: 150 }, { r: 0.12, g: 0.13, b: 0.16, a: 0.98 }, 'Menu')
  window.modifiers = { cursor: true }
  const titleBar = seedPanel(window.id, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: -44 }, { x: 0, y: 0 }, { r: 0.99, g: 0.35, b: 0.23, a: 1 }, 'Title Bar')
  seedText(titleBar.id, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 14, y: 0 }, { x: -44, y: 0 }, 'Kits', { fontSize: 16, align: 'MiddleLeft', color: white, name: 'Title', passthrough: true })
  seedButton(titleBar.id, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: -40, y: -40 }, { x: -4, y: -4 }, { r: 0.82, g: 0.24, b: 0.2, a: 1 }, 'X', { name: 'Close Button', fontSize: 16 })

  // The list source the template stamps from (real item ids only -- invalid ids crash the client).
  const kits: ListDataSource = {
    id: nextDataSourceId().id,
    name: 'Kits',
    kind: 'list',
    typeName: 'Kit',
    columns: [
      { key: 'Title', kind: 'text' },
      { key: 'ItemId', kind: 'itemid' },
    ],
    items: [
      { Title: 'Starter', ItemId: '-97956382' },
      { Title: 'Builder', ItemId: '-2099697608' },
      { Title: 'Lumberjack', ItemId: '-151838493' },
      { Title: 'Scrapper', ItemId: '69511070' },
      { Title: 'Raider', ItemId: '-97956382' },
      { Title: 'Farmer', ItemId: '-151838493' },
    ],
  }
  dataSources.value.push(kits)

  // Scrolling repeat container filling the window body below the title bar.
  const layout: ContainerLayout = { direction: 'vertical', itemsPerLine: 1, itemWidth: 312, itemHeight: 44, gapX: 8, gapY: 8, padding: 0, scroll: 'vertical' }
  const list = createByType('container', window.id)
  list.name = 'Kit List'
  list.anchorMin = { x: 0, y: 0 }
  list.anchorMax = { x: 1, y: 1 }
  list.offsetMin = { x: 24, y: 24 }
  list.offsetMax = { x: -24, y: -56 }
  if (list.type === 'container') list.props.layout = layout
  list.repeat = { source: kits.id }
  elements.value.push(list)

  // Template row on slot 0: a button whose caption binds Title and whose icon binds ItemId.
  const slot = layoutSlot(layout, 0)
  const row = seedButton(list.id, { x: 0, y: 1 }, { x: 0, y: 1 }, slot.offsetMin, slot.offsetMax, { r: 0.18, g: 0.2, b: 0.24, a: 1 }, 'Kit', {
    command: 'kit.claim',
    name: 'Kit Row',
    fontSize: 14,
  })
  const caption = childrenOf(row.id).find((k) => k.type === 'text')
  if (caption) caption.itemBindings = { text: 'Title' }
  const icon = createByType('panel', row.id)
  icon.name = 'Kit Icon'
  icon.anchorMin = { x: 0, y: 0.5 }
  icon.anchorMax = { x: 0, y: 0.5 }
  icon.offsetMin = { x: 4, y: -18 }
  icon.offsetMax = { x: 40, y: 18 }
  if (icon.type === 'panel') icon.props = { ...icon.props, color: { r: 1, g: 1, b: 1, a: 1 }, image: { kind: 'itemicon', itemId: -97956382, skinId: 0 } }
  icon.itemBindings = { 'image.itemId': 'ItemId' }
  elements.value.push(icon)

  selectedIds.value = [window.id]
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
      ? ({
          id,
          name: finalName,
          kind: 'list',
          // Realistic starter rows (real Rust item ids) so a repeat previews like actual game data.
          typeName: 'Entry',
          columns: [
            { key: 'Title', kind: 'text' },
            { key: 'ItemId', kind: 'itemid' },
            { key: 'Amount', kind: 'text' },
          ],
          items: [
            { Title: 'Stone', ItemId: '-2099697608', Amount: 'x1000' },
            { Title: 'Wood', ItemId: '-151838493', Amount: 'x1000' },
            { Title: 'Metal Fragments', ItemId: '69511070', Amount: 'x500' },
          ],
        } satisfies ListDataSource)
      : ({ id, name: finalName, kind: 'text', value: 'Text' } satisfies TextDataSource)
  dataSources.value.push(ds)
  return ds
}

type DataSourcePatch = Partial<Pick<TextDataSource, 'name' | 'value'>> & Partial<Pick<ListDataSource, 'typeName' | 'columns' | 'items'>>

/** Patch a data source's fields. The inspector only sends keys valid for the source's kind. */
function updateDataSource(id: string, patch: DataSourcePatch) {
  const ds = dataSources.value.find((d) => d.id === id)
  if (!ds) return
  if (patch.name !== undefined) ds.name = patch.name
  if (ds.kind === 'text' && patch.value !== undefined) ds.value = patch.value
  if (ds.kind === 'list') {
    if (patch.typeName !== undefined) ds.typeName = patch.typeName
    if (patch.columns !== undefined) ds.columns = patch.columns
    if (patch.items !== undefined) ds.items = patch.items
  }
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

/** Point a layout container's repeat at a list source (or null to stop repeating). */
function setRepeat(containerId: string, sourceId: string | null) {
  const el = byId.value.get(containerId)
  if (!el || el.type !== 'container') return
  el.repeat = sourceId ? { source: sourceId } : null
}

/** Bind (columnKey) or unbind (null) an element prop to a column of the enclosing repeat's list. */
function setItemBinding(elId: string, propPath: string, columnKey: string | null) {
  const el = byId.value.get(elId)
  if (!el) return
  if (columnKey) {
    if (!el.itemBindings) el.itemBindings = {}
    el.itemBindings[propPath] = columnKey
  } else if (el.itemBindings) {
    delete el.itemBindings[propPath]
    if (Object.keys(el.itemBindings).length === 0) delete el.itemBindings
  }
}

/** The list source a member of a repeating container's template is stamped from, or null. Climbs to
 *  the nearest ancestor container that has both a layout and a repeat. */
function repeatSourceOf(elId: string): ListDataSource | null {
  let cur = byId.value.get(elId)?.parentId ?? null
  while (cur) {
    const el = byId.value.get(cur)
    if (!el) return null
    if (el.type === 'container' && el.props.layout && el.repeat?.source) {
      const ds = dataSources.value.find((d) => d.id === el.repeat!.source)
      return ds?.kind === 'list' ? ds : null
    }
    cur = el.parentId
  }
  return null
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
  // Snapshots only ever come from snapshot() above (in-session, never storage), so the shape is exact.
  const o = JSON.parse(s)
  elements.value = o.elements
  dataSources.value = o.dataSources
  Object.assign(canvas, o.canvas)
  reindexIdCounter()
  selectedIds.value = selectedIds.value.filter((id) => elements.value.some((e) => e.id === id))
}
function updateHistoryFlags() {
  canUndo.value = past.length > 0
  canRedo.value = future.length > 0
  historySteps.value = past.length
  let bytes = current ? current.length : 0
  for (const s of past) bytes += s.length
  for (const s of future) bytes += s.length
  historyBytes.value = bytes
}
/** Drop the oldest undo steps until the whole history fits the user's KB budget (Settings). */
function trimHistory() {
  const cap = Math.max(1, historyLimitKb.value) * 1024
  let bytes = (current?.length ?? 0) + future.reduce((a, s) => a + s.length, 0) + past.reduce((a, s) => a + s.length, 0)
  while (past.length > 1 && bytes > cap) bytes -= past.shift()!.length
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
  current = snap
  future = []
  trimHistory()
  updateHistoryFlags()
}
function resetHistory() {
  // With "preserve history" on, a layout load doesn't wipe the stacks — it just records the loaded
  // state as another step, so undo/redo can walk back across layout switches.
  if (preserveHistory.value) {
    commitHistory()
    return
  }
  past = []
  future = []
  current = snapshot()
  updateHistoryFlags()
}
/** Drop the undo/redo stacks but keep the current state (Settings → Clear history). */
function clearHistory() {
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

export interface LayoutData {
  elements: DesignerElement[]
  /** Optional for legacy layouts saved before data sources existed → treated as []. */
  dataSources?: DataSource[]
  canvas: CanvasConfig
}
export interface Layout {
  id: string
  name: string
  data: LayoutData
  updatedAt: number
  /** Optional grouping folder for the Load selector (#10). Absent = ungrouped (flat, one level). */
  folder?: string
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
  return { aspect: '16:9', rootLayer: 'Overlay' }
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

// The persisted store blob, post-migration. Everything read from STORAGE_KEY funnels through
// migrate() so legacy shapes are normalized in one place instead of at each consumer.
interface PersistedStore {
  layouts: Layout[]
  currentLayoutId: string | null
  openTabs: string[]
  recentIds: string[]
}

/** Normalize one layout's data in place (storage blobs, clipboard imports, bundled examples):
 *  fill the dataSources array (older layouts predate data sources) and strip the legacy per-layout
 *  reference resolution — the CUI reference is a fixed 1280×720 (see geometry.ts), but older builds
 *  let users change it and persisted `referenceHeight` (briefly `referenceWidth`). */
function migrateLayoutData(data: LayoutData): LayoutData {
  if (!data.dataSources) data.dataSources = []
  if (data.canvas) {
    const legacy = data.canvas as CanvasConfig & { referenceWidth?: number; referenceHeight?: number }
    delete legacy.referenceWidth
    delete legacy.referenceHeight
  }
  return data
}

/** Migrate a raw persisted store blob to the current shape; null = unusable (no layouts) → caller
 *  starts fresh. May throw on garbage input — loadFromStorage treats that as unusable too. */
function migrate(raw: unknown): PersistedStore | null {
  const o = raw as { version?: number; layouts?: Layout[]; currentLayoutId?: string | null; openTabs?: unknown; recentIds?: unknown } | null
  if (!o?.layouts?.length) return null
  const version = typeof o.version === 'number' ? o.version : 0
  if (version <= 1) {
    // v0→1 steps (idempotent — also fix v1 blobs written while the loaders patched these ad hoc).
    // Legacy `panel-N` element ids are deliberately left as-is: reindexIdCounter's suffix regex
    // accepts them, and rewriting ids would churn every stored layout.
    for (const l of o.layouts) migrateLayoutData(l.data)
  }
  // Integrity (not version-specific): drop references to layouts that no longer exist.
  const valid = new Set(o.layouts.map((l) => l.id))
  const storedCurrent = o.currentLayoutId != null && valid.has(o.currentLayoutId) ? o.currentLayoutId : null
  // Legacy stores predate tabs (no openTabs) — reopen the previously-active layout so the workspace
  // isn't suddenly empty for existing users.
  let openTabs = Array.isArray(o.openTabs) ? o.openTabs.filter((id: string) => valid.has(id)) : []
  if (!openTabs.length && storedCurrent) openTabs = [storedCurrent]
  const recentIds = Array.isArray(o.recentIds) ? o.recentIds.filter((id: string) => valid.has(id)) : []
  return {
    layouts: o.layouts,
    currentLayoutId: storedCurrent && openTabs.includes(storedCurrent) ? storedCurrent : (openTabs[0] ?? null),
    openTabs,
    recentIds,
  }
}

function persist() {
  const cur = currentLayout.value
  if (cur) {
    cur.data = cloneData()
    cur.updatedAt = Date.now()
  }
  saveJson(STORAGE_KEY, { version: 1, layouts: layouts.value, currentLayoutId: currentLayoutId.value, openTabs: openTabs.value, recentIds: recentIds.value })
}
function loadFromStorage(): boolean {
  try {
    const store = migrate(loadJson<unknown>(STORAGE_KEY, null))
    if (!store) return false
    layouts.value = store.layouts
    openTabs.value = store.openTabs
    recentIds.value = store.recentIds
    currentLayoutId.value = store.currentLayoutId
    applyData(currentLayout.value ? currentLayout.value.data : { elements: [], canvas: defaultCanvas() })
    return true
  } catch {
    return false
  }
}
function newLayout(name?: string, preset: LayoutPreset = 'default') {
  persist()
  const finalName = name ?? nextLayoutName()
  const id = newLayoutId()
  layouts.value.push({ id, name: finalName, data: { elements: [], canvas: defaultCanvas() }, updatedAt: Date.now() })
  currentLayoutId.value = id
  openTab(id)
  applyData({ elements: [], canvas: defaultCanvas() })
  // 'empty' starts blank; every other preset seeds a hand-placed starter composition.
  if (preset === 'default') seedSample()
  else if (preset === 'menu') seedMenu()
  else if (preset === 'list') seedListMenu()
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
/** Reorder an open tab, dropping it before `beforeId` (null = move to the end). */
function reorderTab(id: string, beforeId: string | null) {
  if (id === beforeId) return
  const from = openTabs.value.indexOf(id)
  if (from < 0) return
  const arr = openTabs.value.slice()
  arr.splice(from, 1)
  let to = arr.length
  if (beforeId) {
    const idx = arr.indexOf(beforeId)
    if (idx >= 0) to = idx
  }
  arr.splice(to, 0, id)
  openTabs.value = arr
  persist()
}

/** Close a set of tabs at once (keeping the layouts), activating the nearest survivor if the current
 *  tab is among them. Backs the "Close others / to the left / to the right" tab commands. */
function closeTabs(ids: string[]) {
  const set = new Set(ids.filter((id) => openTabs.value.includes(id)))
  if (!set.size) return
  const cur = currentLayoutId.value
  if (cur && set.has(cur)) persist() // save edits before leaving the active tab
  pushRecent(...openTabs.value.filter((id) => set.has(id)))
  let next = cur
  if (cur && set.has(cur)) {
    const i = openTabs.value.indexOf(cur)
    next =
      openTabs.value.slice(i).find((id) => !set.has(id)) ?? // nearest survivor to the right
      [...openTabs.value.slice(0, i)].reverse().find((id) => !set.has(id)) ?? // else to the left
      null
  }
  openTabs.value = openTabs.value.filter((id) => !set.has(id))
  if (next !== currentLayoutId.value) {
    currentLayoutId.value = next
    applyData(next ? layouts.value.find((l) => l.id === next)!.data : { elements: [], canvas: defaultCanvas() })
    resetHistory()
  }
  persist()
}
function closeOtherTabs(id: string) {
  closeTabs(openTabs.value.filter((t) => t !== id))
}
function closeTabsToLeft(id: string) {
  const i = openTabs.value.indexOf(id)
  if (i > 0) closeTabs(openTabs.value.slice(0, i))
}
function closeTabsToRight(id: string) {
  const i = openTabs.value.indexOf(id)
  if (i >= 0) closeTabs(openTabs.value.slice(i + 1))
}

/** Duplicate a saved layout (deep-copied data, a unique name), open it as a tab and switch to it. */
function duplicateLayout(id: string) {
  const src = layouts.value.find((l) => l.id === id)
  if (!src) return
  if (currentLayoutId.value) persist()
  const nid = newLayoutId()
  const data = JSON.parse(JSON.stringify(src.data)) // plain JSON — a deep clone with no shared refs
  layouts.value.push({ id: nid, name: uniqueLayoutName(`${src.name} copy`), data, updatedAt: Date.now(), folder: src.folder })
  openTab(nid)
  currentLayoutId.value = nid
  applyData(data)
  resetHistory()
  persist()
}

/** Edits need a layout to live in; spin up a blank one if the workspace is at the empty state. */
function ensureLayout() {
  if (!currentLayoutId.value) newLayout(undefined, 'empty')
}
/** Is `name` already used by another layout? Drives the inline-rename conflict hint. */
function layoutNameTaken(name: string, exceptId?: string): boolean {
  const n = name.trim().toLowerCase()
  return !!n && layouts.value.some((l) => l.id !== exceptId && l.name.trim().toLowerCase() === n)
}
/** `name`, or `name (2)`, `name (3)`… — the first variant not already taken by another layout. */
function uniqueLayoutName(name: string, exceptId?: string): string {
  const base = name.trim() || 'Layout'
  if (!layoutNameTaken(base, exceptId)) return base
  let i = 2
  while (layoutNameTaken(`${base} (${i})`, exceptId)) i++
  return `${base} (${i})`
}
function renameLayout(id: string, name: string) {
  const l = layouts.value.find((x) => x.id === id)
  if (!l) return
  const trimmed = name.trim()
  if (!trimmed) return // empty keeps the old name
  l.name = uniqueLayoutName(trimmed, id) // never let two layouts share a name
  persist()
}
/** Reorder a saved layout in the master list (drives Project-explorer drag-drop ordering), dropping it
 *  before `beforeId` (null = end). Order within a folder follows this array order. */
function moveLayout(id: string, beforeId: string | null) {
  if (id === beforeId) return
  const from = layouts.value.findIndex((l) => l.id === id)
  if (from < 0) return
  const arr = layouts.value.slice()
  const [moved] = arr.splice(from, 1)
  let to = arr.length
  if (beforeId) {
    const idx = arr.findIndex((l) => l.id === beforeId)
    if (idx >= 0) to = idx
  }
  arr.splice(to, 0, moved)
  layouts.value = arr
  persist()
}

/** Assign a saved layout to a grouping folder for the Load selector (#10); blank string = ungroup. */
function setLayoutFolder(id: string, folder: string) {
  const l = layouts.value.find((x) => x.id === id)
  if (!l) return
  if (folder.trim()) l.folder = folder.trim()
  else delete l.folder
  persist()
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
      layouts.value.push({ id, name: `${item.name ?? 'Imported'} (imported)`, data: migrateLayoutData(item.data), updatedAt: Date.now() })
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

/** Load the bundled example layouts (one per element / fill / modifier) into an "Examples" folder.
 *  Re-loading DROPS the whole existing "Examples" folder first and recreates it from the current
 *  bundled data — so a stale or corrupted example copy can never survive a reload (fixes reach anyone
 *  who loaded them earlier). Only the Examples folder is touched; the user's own layouts are untouched. */
function loadExampleLayouts() {
  const removed = new Set(layouts.value.filter((l) => l.folder === 'Examples').map((l) => l.id))
  if (removed.size) {
    layouts.value = layouts.value.filter((l) => !removed.has(l.id))
    openTabs.value = openTabs.value.filter((id) => !removed.has(id))
    recentIds.value = recentIds.value.filter((id) => !removed.has(id))
    if (currentLayoutId.value && removed.has(currentLayoutId.value)) currentLayoutId.value = null
  }
  let target: string | null = null
  for (const ex of EXAMPLE_LAYOUTS) {
    const id = newLayoutId()
    layouts.value.push({ id, name: `Example — ${ex.name}`, folder: 'Examples', data: migrateLayoutData(JSON.parse(JSON.stringify(ex.data))), updatedAt: Date.now() })
    target = id
  }
  persist()
  if (target) switchLayout(target)
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

// Debounced (350ms trailing): commit a history entry and persist on any state change. Drag bursts
// collapse into a single entry. Post-undo/redo states are skipped by the snapshot-equality check.
// Module-scope watcher, alive for the app session (the designer is mounted once). `deep` is the
// honest option: elements are mutated in place from many sites (direct offset/prop writes during
// drags, array reorders), not one chokepoint, and the debounce already bounds the traversal cost.
watchDebounced(
  [elements, dataSources, canvas],
  () => {
    commitHistory()
    persist()
  },
  { debounce: 350, deep: true }
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
    preserveHistory,
    historyLimitKb,
    historySteps,
    historyBytes,
    clearHistory,
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
    reorderTab,
    closeOtherTabs,
    closeTabsToLeft,
    closeTabsToRight,
    duplicateLayout,
    renameLayout,
    layoutNameTaken,
    moveLayout,
    setLayoutFolder,
    deleteLayout,
    exportClipboard,
    importClipboard,
    loadExampleLayouts,
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
    addLabel,
    addTextWithBackground,
    addElement,
    select,
    remove,
    removeSelected,
    reparent,
    moveElement,
    groupMembersOf,
    surfaceOf,
    groupSelection,
    ungroup,
    ungroupSelection,
    alignSelection,
    snapSelection,
    textEditSignal,
    requestTextEdit,
    inlineEditId,
    layoutOf,
    applyContainerLayout,
    canGroup,
    selectionHasGroup,
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
    setRepeat,
    setItemBinding,
    repeatSourceOf,
  }
}
