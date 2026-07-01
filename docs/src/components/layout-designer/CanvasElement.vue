<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, ref } from 'vue'
import {
  applyResize,
  clampPatchToParent,
  cssColor,
  rootRect,
  snapAndAlignMove,
  snapResizePatch,
  type OffsetPatch,
  type ResizeEdge,
} from './geometry'
import { definitionOf } from './elements/registry'
import { fontDef, resolveText } from './types'
import type { ColorRGBA, DesignerElement, TextAlign, TextFont } from './types'
import { useDesigner } from './useDesigner'

defineOptions({ name: 'CanvasElement' })

const props = defineProps<{
  element: DesignerElement
  /** parent's CUI width/height (root canvas dims for top-level elements) */
  parentW: number
  parentH: number
  /** on-screen px per CUI px */
  scale: number
}>()

const {
  selectedId,
  selectedIds,
  isSelected: isSelectedFn,
  select,
  surfaceOf,
  groupMembersOf,
  update,
  childrenOf,
  byId,
  gridSize,
  constrain,
  openContextMenu,
  canvas,
  rectOf,
  setGuides,
  clearGuides,
  dataSources,
} = useDesigner()

const isSelected = computed(() => isSelectedFn(props.element.id)) // any selection (outline)
const single = computed(() => selectedId.value === props.element.id) // only this one (chrome)

// Resolve this element's local rect relative to the parent's content box.
const metrics = computed(() => {
  const el = props.element
  const left = el.anchorMin.x * props.parentW + el.offsetMin.x
  const right = el.anchorMax.x * props.parentW + el.offsetMax.x
  const bottom = el.anchorMin.y * props.parentH + el.offsetMin.y
  const top = el.anchorMax.y * props.parentH + el.offsetMax.y
  return { left, right, bottom, top, cuiW: right - left, cuiH: top - bottom }
})

// Geometry only (position + size). The visual fill lives on a separate `.ld-el-fill` layer (below)
// so the "Layout opacity" compositing control (#7) can fade fills/text/borders without dimming the
// selection chrome — handles stay crisp even at 0% so boxes can be placed against the real game.
const boxStyle = computed(() => {
  const m = metrics.value
  return {
    left: `${m.left * props.scale}px`,
    top: `${(props.parentH - m.top) * props.scale}px`, // flip y
    width: `${m.cuiW * props.scale}px`,
    height: `${m.cuiH * props.scale}px`,
  }
})

// Fill paint for the box: panels/buttons paint a background color (panels can also show a URL-image
// fill). Text boxes and empty containers stay transparent (invisible in-game) → null, no fill layer.
const fillStyle = computed<Record<string, string> | null>(() => {
  const el = props.element
  if (el.type === 'panel') {
    const s: Record<string, string> = { backgroundColor: cssColor(el.props.color) }
    if (el.props.image?.url) {
      s.backgroundImage = `url("${el.props.image.url.replace(/"/g, '\\"')}")`
      s.backgroundSize = '100% 100%'
      s.backgroundRepeat = 'no-repeat'
    }
    return s
  }
  if (el.type === 'button') return { backgroundColor: cssColor(el.props.color) }
  return null
})

// Border preview. Rendered as a separate overlay AFTER the children (see template) so it paints on
// top of them — matching the game, where the border = four edge subpanels appended as the panel's
// last children. Inset box-shadow draws the frame over the edges only (no mesh on a translucent
// panel); pointer-events off so it never blocks dragging. Scales with the canvas.
const borderOverlay = computed(() => {
  const el = props.element
  if (el.type !== 'panel' || !el.props.border || el.props.border.width <= 0) return null
  return { boxShadow: `inset 0 0 0 ${el.props.border.width * props.scale}px ${cssColor(el.props.border.color)}` }
})

// Map a Unity TextAnchor (Upper/Middle/Lower × Left/Center/Right) to flexbox + text-align.
function alignParts(a: TextAlign): { vert: string; horiz: string; textAlign: string } {
  const vert = a.startsWith('Upper') ? 'flex-start' : a.startsWith('Lower') ? 'flex-end' : 'center'
  const horiz = a.endsWith('Left') ? 'flex-start' : a.endsWith('Right') ? 'flex-end' : 'center'
  const textAlign = a.endsWith('Left') ? 'left' : a.endsWith('Right') ? 'right' : 'center'
  return { vert, horiz, textAlign }
}

// Elements that render text in their box (share content + fontSize + font + align props).
const TEXTY = new Set(['text', 'input', 'countdown'])
const isTexty = computed(() => TEXTY.has(props.element.type))

// Inner text-node style (text/input/countdown). Font size scales with the canvas like offsets do.
const textStyle = computed<Record<string, string> | null>(() => {
  const el = props.element
  if (!TEXTY.has(el.type)) return null
  const p = el.props as { align: TextAlign; font?: TextFont; color: ColorRGBA; fontSize: number }
  const a = alignParts(p.align)
  const f = fontDef(p.font)
  return {
    alignItems: a.vert,
    justifyContent: a.horiz,
    textAlign: a.textAlign,
    color: cssColor(p.color),
    fontSize: `${p.fontSize * props.scale}px`,
    fontFamily: f.css,
    fontWeight: String(f.weight ?? 400),
  }
})
// What to show in the box: a bound text resolves through its data source; input/countdown show their
// own literal text (input's initial value, countdown's %TIME_LEFT% template).
const textContent = computed(() => {
  const el = props.element
  if (el.type === 'text') return resolveText(el, dataSources.value)
  if (el.type === 'input' || el.type === 'countdown') return el.props.text
  return ''
})

const children = computed(() => childrenOf(props.element.id))

// Anchor markers: the rectangle (within the parent) that this element is anchored to.
// Positions are expressed relative to this element's own box (the anchor point is exactly
// -offset away from the matching edge), so they can sit outside the box when stretched.
const anchorMarkers = computed(() => {
  const m = metrics.value
  const s = props.scale
  const Wd = m.cuiW * s
  const Hd = m.cuiH * s
  const el = props.element
  const xA = -el.offsetMin.x * s // anchorMin.x
  const xB = Wd - el.offsetMax.x * s // anchorMax.x
  const yTop = el.offsetMax.y * s // anchorMax.y (top, since CUI y is up)
  const yBot = Hd + el.offsetMin.y * s // anchorMin.y (bottom)
  return {
    rect: {
      left: `${Math.min(xA, xB)}px`,
      top: `${Math.min(yTop, yBot)}px`,
      width: `${Math.abs(xB - xA)}px`,
      height: `${Math.abs(yBot - yTop)}px`,
    },
    corners: [
      { left: `${xA}px`, top: `${yTop}px` },
      { left: `${xB}px`, top: `${yTop}px` },
      { left: `${xA}px`, top: `${yBot}px` },
      { left: `${xB}px`, top: `${yBot}px` },
    ],
  }
})

// --- drag / resize -------------------------------------------------------------------

function cloneEl(el: DesignerElement): DesignerElement {
  return {
    ...el,
    anchorMin: { ...el.anchorMin },
    anchorMax: { ...el.anchorMax },
    offsetMin: { ...el.offsetMin },
    offsetMax: { ...el.offsetMax },
    props: definitionOf(el).cloneProps(el),
  } as DesignerElement
}

type GroupItem = { id: string; snap: DesignerElement }
// `snapshot` is the drag SUBJECT (the element actually being moved/resized) — for a move inside a group
// that's the group, not the clicked child — and parentW/H are the subject's parent dims.
type Drag = { mode: 'move' | 'resize'; edge?: ResizeEdge; startX: number; startY: number; snapshot: DesignerElement; parentW: number; parentH: number; group?: GroupItem[] }
const drag = ref<Drag | null>(null)

// Ordered (top → bottom) list of element ids under a screen point — the canvas's z-stack at that spot.
// Lets Alt-click reach a box hidden beneath a full-bleed sibling (a plain click only ever hits the top).
function elementsUnderPoint(clientX: number, clientY: number): string[] {
  const ids: string[] = []
  for (const node of document.elementsFromPoint(clientX, clientY)) {
    const id = node instanceof HTMLElement ? node.dataset.elId : undefined
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids
}

function startMove(e: PointerEvent) {
  e.stopPropagation()
  // Alt-click drills DOWN the z-stack at the cursor: each Alt-click selects the next element below the
  // current one (wrapping), so an occluded box is reachable on the canvas. Once selected it floats above
  // its siblings (.selected z-index), so it can then be dragged normally. No drag starts on this click.
  if (e.altKey) {
    const stack = elementsUnderPoint(e.clientX, e.clientY)
    if (stack.length) {
      const idx = selectedId.value ? stack.indexOf(selectedId.value) : -1
      select(stack[(idx + 1) % stack.length])
    }
    return
  }
  // A full-bleed child (e.g. a label filling its button) defers to its parent, and the click then acts
  // on the whole group the target belongs to. Alt-click (above) bypasses both to reach the raw element.
  const subjectId = surfaceOf(props.element.id)
  const members = groupMembersOf(subjectId)
  const additive = e.shiftKey || e.ctrlKey || e.metaKey
  if (additive) {
    const allSel = members.every((m) => selectedIds.value.includes(m))
    selectedIds.value = allSel ? selectedIds.value.filter((id) => !members.includes(id)) : [...new Set([...selectedIds.value, ...members])]
    return // toggle selection, no drag
  }
  if (!members.every((m) => selectedIds.value.includes(m))) selectedIds.value = members
  const subject = byId.value.get(subjectId) ?? props.element
  const ids = selectedIds.value.slice()
  const group = ids
    .map((id) => {
      const el = byId.value.get(id)
      return el ? { id, snap: cloneEl(el) } : null
    })
    .filter((g): g is GroupItem => !!g)
  const pr = subject.parentId ? rectOf(subject.parentId) : rootRect(canvas)
  drag.value = {
    mode: 'move',
    startX: e.clientX,
    startY: e.clientY,
    snapshot: cloneEl(subject),
    parentW: pr?.w ?? props.parentW,
    parentH: pr?.h ?? props.parentH,
    group,
  }
}

function startResize(e: PointerEvent, edge: ResizeEdge) {
  e.stopPropagation()
  select(props.element.id)
  drag.value = { mode: 'resize', edge, startX: e.clientX, startY: e.clientY, snapshot: cloneEl(props.element), parentW: props.parentW, parentH: props.parentH }
}

useEventListener(window, 'pointermove', (e: PointerEvent) => {
  const d = drag.value
  if (!d) return
  const dxCui = (e.clientX - d.startX) / props.scale
  const dyCui = -(e.clientY - d.startY) / props.scale // screen y is down; CUI y is up
  let patch: OffsetPatch | null = null
  if (d.mode === 'move') {
    const threshold = 6 / props.scale // ~6 screen px
    const pg = d.snapshot.parentId ? rectOf(d.snapshot.parentId) : rootRect(canvas)
    // alignment candidates from sibling elements (in parent-local coords)
    const extraX: number[] = []
    const extraY: number[] = []
    if (pg) {
      for (const sib of childrenOf(d.snapshot.parentId)) {
        if (sib.id === d.snapshot.id) continue
        const sr = rectOf(sib.id)
        if (!sr) continue
        const lx = sr.x - pg.x
        const rx = lx + sr.w
        const by = sr.y - pg.y
        const ty = by + sr.h
        extraX.push(lx, (lx + rx) / 2, rx)
        extraY.push(by, (by + ty) / 2, ty)
      }
    }
    const res = snapAndAlignMove(d.snapshot, dxCui, dyCui, d.parentW, d.parentH, gridSize.value, threshold, extraX, extraY)
    patch = { offsetMin: res.offsetMin, offsetMax: res.offsetMax }
    if (constrain.value) patch = clampPatchToParent(d.snapshot, patch, d.parentW, d.parentH, true)
    const v = res.guideX !== null && pg ? { x: pg.x + res.guideX, y0: pg.y, y1: pg.y + d.parentH } : null
    const h = res.guideY !== null && pg ? { y: pg.y + res.guideY, x0: pg.x, x1: pg.x + d.parentW } : null
    setGuides(v, h)
    // move the rest of the selection by the same applied delta (clamped per their own parent)
    if (d.group && d.group.length > 1) {
      const ddx = patch.offsetMin.x - d.snapshot.offsetMin.x
      const ddy = patch.offsetMin.y - d.snapshot.offsetMin.y
      for (const g of d.group) {
        if (g.id === d.snapshot.id) continue
        let gp: OffsetPatch = {
          offsetMin: { x: g.snap.offsetMin.x + ddx, y: g.snap.offsetMin.y + ddy },
          offsetMax: { x: g.snap.offsetMax.x + ddx, y: g.snap.offsetMax.y + ddy },
        }
        if (constrain.value) {
          const ppr = g.snap.parentId ? rectOf(g.snap.parentId) : rootRect(canvas)
          if (ppr) gp = clampPatchToParent(g.snap, gp, ppr.w, ppr.h, true)
        }
        update(g.id, gp)
      }
    }
  } else if (d.edge) {
    patch = snapResizePatch(applyResize(d.snapshot, d.parentW, d.parentH, d.edge, dxCui, dyCui, e.altKey), gridSize.value)
    if (constrain.value && !e.altKey) patch = clampPatchToParent(d.snapshot, patch, d.parentW, d.parentH, false)
  }
  if (patch) update(d.snapshot.id, patch)
})

function onContextMenu(e: MouseEvent) {
  // Right-click, like a plain click, acts on the surface element (a full-bleed caption defers to its host).
  openContextMenu(surfaceOf(props.element.id), e.clientX, e.clientY, elementsUnderPoint(e.clientX, e.clientY))
}

useEventListener(window, 'pointerup', () => {
  if (drag.value) clearGuides()
  drag.value = null
})

const HANDLES: { edge: ResizeEdge; cls: string; cursor: string }[] = [
  { edge: 'nw', cls: 'h-nw', cursor: 'nwse-resize' },
  { edge: 'n', cls: 'h-n', cursor: 'ns-resize' },
  { edge: 'ne', cls: 'h-ne', cursor: 'nesw-resize' },
  { edge: 'e', cls: 'h-e', cursor: 'ew-resize' },
  { edge: 'se', cls: 'h-se', cursor: 'nwse-resize' },
  { edge: 's', cls: 'h-s', cursor: 'ns-resize' },
  { edge: 'sw', cls: 'h-sw', cursor: 'nesw-resize' },
  { edge: 'w', cls: 'h-w', cursor: 'ew-resize' },
]
</script>

<template>
  <div
    class="ld-element"
    :class="{ selected: isSelected }"
    :style="boxStyle"
    :data-el-id="element.id"
    :title="`${element.name} — drag to move, drag a handle to resize, Alt-click to reach what's underneath, right-click for options`"
    @pointerdown="startMove"
    @contextmenu.prevent.stop="onContextMenu"
  >
    <!-- fill layer (behind everything): faded by the Layout-opacity control, so handles stay crisp -->
    <div v-if="fillStyle" class="ld-el-fill" :style="fillStyle" />

    <!-- text content (text / input / countdown); pointer-events off so the box stays draggable -->
    <div v-if="isTexty" class="ld-text" :style="textStyle ?? undefined">{{ textContent }}</div>

    <!-- selection chrome (full chrome only for a single selection) -->
    <span v-if="single" class="ld-name-tag">{{ element.name }}</span>
    <template v-if="single">
      <!-- anchor markers: where this box is pinned within its parent -->
      <div class="ld-anchor-rect" :style="anchorMarkers.rect" />
      <span v-for="(c, i) in anchorMarkers.corners" :key="`a${i}`" class="ld-anchor-marker" :style="c" />
      <span
        v-for="h in HANDLES"
        :key="h.edge"
        class="ld-handle"
        :class="h.cls"
        :style="{ cursor: h.cursor }"
        @pointerdown="startResize($event, h.edge)"
      />
    </template>

    <!-- children render inside, relative to this element's box -->
    <CanvasElement
      v-for="child in children"
      :key="child.id"
      :element="child"
      :parent-w="metrics.cuiW"
      :parent-h="metrics.cuiH"
      :scale="scale"
    />

    <!-- border overlay LAST so it paints over the children (matches the in-game edge subpanels) -->
    <div v-if="borderOverlay" class="ld-border-overlay" :style="borderOverlay" />
  </div>
</template>

<style scoped>
/* --ld-layout-opacity (0..1, set on the frame, default 1) fades the DESIGN — fills, text, borders and
   the wireframe outline — over a screen-share backdrop, while selection chrome stays crisp (#7). */
.ld-el-fill {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--ld-layout-opacity, 1);
}

.ld-border-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--ld-layout-opacity, 1);
}

.ld-element {
  position: absolute;
  box-sizing: border-box;
  /* wireframe hairline — alpha tracks the layout-opacity var so boxes vanish at 0% (calc in the
     alpha channel), leaving only the selected box's chrome visible over the real game. */
  outline: 1px solid rgb(255 255 255 / calc(0.12 * var(--ld-layout-opacity, 1)));
  user-select: none;
  touch-action: none;
}

.ld-element.selected {
  outline: 1.5px solid var(--c-carbon-1);
  z-index: 1;
}

/* inner text node for text elements — fills the box, alignment/color/size come from :style */
.ld-text {
  position: absolute;
  inset: 0;
  display: flex;
  overflow: hidden;
  padding: 0;
  line-height: 1.1;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
  opacity: var(--ld-layout-opacity, 1);
  font-family: 'Roboto Condensed', system-ui, sans-serif;
}

/* anchor markers (cyan) — distinct from the orange selection/handles */
.ld-anchor-rect {
  position: absolute;
  border: 1px dashed rgba(125, 211, 252, 0.85);
  pointer-events: none;
  z-index: 1;
}

.ld-anchor-marker {
  position: absolute;
  width: 9px;
  height: 9px;
  background: rgba(125, 211, 252, 0.95);
  transform: translate(-50%, -50%) rotate(45deg);
  pointer-events: none;
  z-index: 2;
}


.ld-name-tag {
  position: absolute;
  top: -18px;
  left: 0;
  font-size: 11px;
  line-height: 16px;
  padding: 0 5px;
  background: var(--c-carbon-1);
  color: #fff;
  white-space: nowrap;
  border-radius: 2px 2px 0 0;
  pointer-events: none;
}

.ld-handle {
  position: absolute;
  width: 9px;
  height: 9px;
  background: #fff;
  border: 1.5px solid var(--c-carbon-1);
  border-radius: 1px;
  z-index: 2;
}

.h-nw { top: -5px; left: -5px; }
.h-n  { top: -5px; left: 50%; transform: translateX(-50%); }
.h-ne { top: -5px; right: -5px; }
.h-e  { top: 50%; right: -5px; transform: translateY(-50%); }
.h-se { bottom: -5px; right: -5px; }
.h-s  { bottom: -5px; left: 50%; transform: translateX(-50%); }
.h-sw { bottom: -5px; left: -5px; }
.h-w  { top: 50%; left: -5px; transform: translateY(-50%); }
</style>
