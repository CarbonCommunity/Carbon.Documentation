<script setup lang="ts">
import { useElementSize, useEventListener } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import CanvasElement from './CanvasElement.vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import { canvasDisplay, canvasHeight, canvasWidth } from './geometry'
import { useCanvasView } from './useCanvasView'
import { useDesigner } from './useDesigner'
import { useScreenShare } from './useScreenShare'

const { canvas, currentLayoutId, rootElements, select, selectedIds, rectOf, gridSize, guides, openContextMenu, addElement, addTextWithBackground } = useDesigner()

// Empty-canvas CTA: a centered, outline-styled "Add an element" that opens the type picker.
const emptyMenuOpen = ref(false)
function onEmptyPick(choice: Parameters<typeof addElement>[0] | 'textbg') {
  if (choice === 'textbg') addTextWithBackground(null)
  else addElement(choice, null)
  emptyMenuOpen.value = false
}

// #7 backdrop compositing: the stream renders behind the design; layoutOpacity fades the whole design.
const { stream, active, asBackdrop, layoutOpacity, videoOpacity, cropTop, cropRight, cropBottom, cropLeft } = useScreenShare()
const showBackdrop = computed(() => active.value && asBackdrop.value)
// Crop-to-fill: trim each edge by its % and stretch the remaining game region to fill the canvas. The
// <video> fills the frame (object-fit: fill), then we scale up by 1/(visible fraction) per axis and
// shift so the cropped region's top-left lands at the frame origin (transform-origin: 0 0).
const backdropStyle = computed(() => {
  const l = cropLeft.value / 100
  const t = cropTop.value / 100
  const sx = 1 / Math.max(0.05, 1 - l - cropRight.value / 100)
  const sy = 1 / Math.max(0.05, 1 - t - cropBottom.value / 100)
  return {
    opacity: videoOpacity.value,
    objectFit: 'fill',
    transformOrigin: '0 0',
    transform: `translate(${-sx * l * 100}%, ${-sy * t * 100}%) scale(${sx}, ${sy})`,
  }
})

const viewport = ref<HTMLElement | null>(null)
const { width: vw, height: vh } = useElementSize(viewport)

// Mirror the stream onto the backdrop <video> (same pattern as ScreenSharePane; re-binds on remount).
const backdrop = ref<HTMLVideoElement | null>(null)
watch(
  [stream, backdrop],
  ([s, el]) => {
    if (el) el.srcObject = s ?? null
  },
  { immediate: true },
)

// leave a margin so the frame doesn't touch the edges
const PAD = 32

const refW = computed(() => canvasWidth(canvas))
const refH = computed(() => canvasHeight(canvas))
const display = computed(() => canvasDisplay(Math.max(0, vw.value - PAD * 2), Math.max(0, vh.value - PAD * 2), canvas))

// --- zoom + pan (view state only — never persisted, never in exports) -----------------
// The canvas scales arithmetically (children multiply CUI coords by `scale`), so zooming is just a
// bigger frame + a bigger scale factor — selection handles, guide lines and the marquee stay
// screen-size-constant because nothing is CSS-transform-scaled.
const { zoom, pan, fitScale, zoomAt, resetView } = useCanvasView()
const effScale = computed(() => display.value.scale * zoom.value)

// Feed the fit scale to the view state: the zoom ceiling is absolute magnification, so a small
// pane may zoom to a much higher relative % than a large one.
watch(() => display.value.scale, (s) => (fitScale.value = s), { immediate: true })

// Fresh layout, fresh view — a zoom made for one layout rarely fits another.
watch(currentLayoutId, () => resetView())

function cursorOffset(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = viewport.value!.getBoundingClientRect()
  return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) }
}

// Wheel (plain or Ctrl — preventDefault also stops browser page-zoom on Ctrl) zooms about the
// cursor. exp() gives smooth trackpad steps and ~16%/notch on a clicky wheel.
function onWheel(e: WheelEvent) {
  const off = cursorOffset(e)
  zoomAt(off.x, off.y, Math.exp(-e.deltaY * 0.0015))
}

// MMB drag (or Space + left-drag) pans. Intercepted capture-phase on the viewport so it wins over
// marquee/element drags without touching their handlers.
const spaceHeld = ref(false)
const panning = ref(false)
let panLast: { x: number; y: number } | null = null

function clampPan() {
  // Per axis, |pan| <= |frame - viewport| / 2. Frame bigger than the viewport: the frame must keep
  // covering it (an edge can reach the viewport edge but never pass it, so no background gap while
  // zoomed in — and when the viewport GROWS, the freed space reveals more of the clipped frame
  // instead of moving it). Frame smaller: it stays fully inside the viewport.
  const r = viewport.value?.getBoundingClientRect()
  if (!r) return
  const limX = Math.abs(display.value.displayW * zoom.value - r.width) / 2
  const limY = Math.abs(display.value.displayH * zoom.value - r.height) / 2
  pan.x = Math.min(limX, Math.max(-limX, pan.x))
  pan.y = Math.min(limY, Math.max(-limY, pan.y))
}

// Re-clamp whenever the geometry changes under a fixed pan: pane resizes (dock splitters, window)
// and zoom steps from the toolbar/keyboard (which don't know the viewport).
watch([vw, vh, zoom], () => clampPan())

useEventListener(
  viewport,
  'pointerdown',
  (e: PointerEvent) => {
    if (e.button !== 1 && !(e.button === 0 && spaceHeld.value)) return
    e.preventDefault() // middle button: no autoscroll
    e.stopPropagation()
    panLast = { x: e.clientX, y: e.clientY }
    panning.value = true
  },
  { capture: true },
)
useEventListener(window, 'pointermove', (e: PointerEvent) => {
  if (!panLast) return
  pan.x += e.clientX - panLast.x
  pan.y += e.clientY - panLast.y
  panLast = { x: e.clientX, y: e.clientY }
  clampPan()
})
useEventListener(window, 'pointerup', () => {
  panLast = null
  panning.value = false
})

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}
// Zoom keys live in the rebindable shortcut system (File > Settings; run from LayoutDesigner's
// data-driven keydown handler) — only the Space pan chord is handled here.
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === ' ') {
    if ((e.target as HTMLElement)?.tagName !== 'BUTTON') e.preventDefault() // keep buttons space-clickable
    spaceHeld.value = true
  }
})
useEventListener(window, 'keyup', (e: KeyboardEvent) => {
  if (e.key === ' ') spaceHeld.value = false
})
// Alt-tabbing away mid-pan (or with Space held) never delivers the keyup/pointerup — reset.
useEventListener(window, 'blur', () => {
  spaceHeld.value = false
  panLast = null
  panning.value = false
})

// A press that starts a pan (MMB, or Space+left) must not clear the selection. Presses on frame
// children are already intercepted by the capture-phase pan listener above; this guards presses
// that land on the viewport background itself, where stopPropagation can't skip same-node listeners.
function onViewportPointerDown(e: PointerEvent) {
  if (e.button !== 0 || spaceHeld.value) return
  select(null)
}

const frameStyle = computed(() => ({
  width: `${display.value.displayW * zoom.value}px`,
  height: `${display.value.displayH * zoom.value}px`,
  transform: `translate(${pan.x}px, ${pan.y}px)`,
  // drives the design-overlay fade in CanvasElement (#7); 1 = fully opaque (normal). Only fades while the
  // backdrop is actually showing — stopping the share or unchecking "show behind canvas" snaps the design
  // back to full opacity (so you can't strand a blank layout), while the slider keeps its value for reuse.
  '--ld-layout-opacity': String(showBackdrop.value ? layoutOpacity.value : 1),
}))

// Visible grid reflects the snap grid size; hidden when too fine to be useful.
const gridStyle = computed(() => {
  const px = gridSize.value * effScale.value
  if (px < 6) return { display: 'none' }
  return { backgroundSize: `${px}px ${px}px, ${px}px ${px}px` }
})

// --- rubber-band (marquee) selection -------------------------------------------------
// Drag on empty canvas to sweep a box; root-level elements it touches get selected (Shift = add to the
// current selection). A press that doesn't move past DRAG_MIN is a plain click → clears the selection.
const frame = ref<HTMLElement | null>(null)
type Band = { x0: number; y0: number; x1: number; y1: number }
const band = ref<Band | null>(null)
let bandStart: { x: number; y: number; rect: DOMRect; shift: boolean } | null = null
const DRAG_MIN = 3 // px of movement before a click becomes a marquee

const bandStyle = computed(() => {
  const b = band.value
  if (!b) return null
  return {
    left: `${Math.min(b.x0, b.x1)}px`,
    top: `${Math.min(b.y0, b.y1)}px`,
    width: `${Math.abs(b.x1 - b.x0)}px`,
    height: `${Math.abs(b.y1 - b.y0)}px`,
  }
})

function onFramePointerDown(e: PointerEvent) {
  if (e.button !== 0) return // left button only; let right-click fall through to the context menu
  const rect = (frame.value ?? (e.currentTarget as HTMLElement)).getBoundingClientRect()
  bandStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, rect, shift: e.shiftKey }
  band.value = null
}

useEventListener(window, 'pointermove', (e: PointerEvent) => {
  if (!bandStart) return
  const x = e.clientX - bandStart.rect.left
  const y = e.clientY - bandStart.rect.top
  if (!band.value && Math.abs(x - bandStart.x) < DRAG_MIN && Math.abs(y - bandStart.y) < DRAG_MIN) return
  band.value = { x0: bandStart.x, y0: bandStart.y, x1: x, y1: y }
})

useEventListener(window, 'pointerup', () => {
  if (!bandStart) return
  const b = band.value
  if (!b) {
    if (!bandStart.shift) select(null) // bare click on empty canvas clears (Shift-click keeps) selection
  } else {
    const s = effScale.value
    const mx0 = Math.min(b.x0, b.x1)
    const mx1 = Math.max(b.x0, b.x1)
    const my0 = Math.min(b.y0, b.y1)
    const my1 = Math.max(b.y0, b.y1)
    const hits: string[] = []
    for (const el of rootElements.value) {
      const r = rectOf(el.id)
      if (!r) continue
      const left = r.x * s
      const top = (refH.value - (r.y + r.h)) * s // CUI y is up; flip to DOM-top
      if (left + r.w * s >= mx0 && left <= mx1 && top + r.h * s >= my0 && top <= my1) hits.push(el.id)
    }
    selectedIds.value = bandStart.shift ? [...new Set([...selectedIds.value, ...hits])] : hits
  }
  band.value = null
  bandStart = null
})

// Alignment guide lines (convert global CUI coords to frame DOM px; CUI y is up).
const vGuideStyle = computed(() => {
  const g = guides.v
  if (!g) return null
  const s = effScale.value
  return { left: `${g.x * s}px`, top: `${(refH.value - g.y1) * s}px`, height: `${(g.y1 - g.y0) * s}px` }
})
const hGuideStyle = computed(() => {
  const g = guides.h
  if (!g) return null
  const s = effScale.value
  return { top: `${(refH.value - g.y) * s}px`, left: `${g.x0 * s}px`, width: `${(g.x1 - g.x0) * s}px` }
})
</script>

<template>
  <div
    ref="viewport"
    class="ld-viewport"
    :class="{ 'ld-pan-ready': spaceHeld && !panning, 'ld-panning': panning }"
    @pointerdown="onViewportPointerDown"
    @wheel.prevent="onWheel"
    @contextmenu.prevent="openContextMenu(null, $event.clientX, $event.clientY)"
  >
    <div ref="frame" class="ld-frame" :style="frameStyle" @pointerdown.stop="onFramePointerDown">
      <div v-if="!rootElements.length" class="ld-empty-cta" @pointerdown.stop>
        <button class="ld-empty-add" @click.stop="emptyMenuOpen = !emptyMenuOpen">+ Add an element</button>
        <ElementTypeMenu v-if="emptyMenuOpen" placement="below" @pick="onEmptyPick" />
      </div>
      <!-- screen-share backdrop (#7) -->
      <video v-show="showBackdrop" ref="backdrop" class="ld-backdrop" :style="backdropStyle" autoplay muted playsinline />
      <div class="ld-grid" :style="gridStyle" />
      <CanvasElement
        v-for="el in rootElements"
        :key="el.id"
        :element="el"
        :parent-w="refW"
        :parent-h="refH"
        :scale="effScale"
      />
      <div v-if="vGuideStyle" class="ld-guide ld-guide-v" :style="vGuideStyle" />
      <div v-if="hGuideStyle" class="ld-guide ld-guide-h" :style="hGuideStyle" />
      <div v-if="bandStyle" class="ld-marquee" :style="bandStyle" />
      <span class="ld-frame-label">{{ canvas.aspect }} · {{ Math.round(refW) }}×{{ Math.round(refH) }}<template v-if="zoom !== 1"> · {{ Math.round(zoom * 100) }}%</template></span>
    </div>
  </div>
</template>

<style scoped>
/* empty-canvas call to action: centered, OUTLINE-styled (deliberately not the orange accent) */
.ld-empty-cta {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.ld-empty-add {
  padding: 8px 18px;
  font-size: 13px;
  border: 1px dashed var(--vp-c-text-3);
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.ld-empty-add:hover {
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-text-1);
}

.ld-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* the canvas previews the game UI — keep it isolated from docs blend-mode effects */
  isolation: isolate;
  background:
    repeating-conic-gradient(rgba(255, 255, 255, 0.018) 0% 25%, transparent 0% 50%) 50% / 24px 24px;
}

/* Space held / dragging with MMB — the whole viewport becomes a pan surface */
.ld-viewport.ld-pan-ready,
.ld-viewport.ld-pan-ready * {
  cursor: grab !important;
}
.ld-viewport.ld-panning,
.ld-viewport.ld-panning * {
  cursor: grabbing !important;
}

.ld-frame {
  position: relative;
  /* the frame is a flex item — without this, a zoomed width wider than the viewport gets
     flex-shrunk while the arithmetic content keeps its full size, clipping it off the right
     and breaking the frame's aspect */
  flex-shrink: 0;
  background: #0c0c0e;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14), 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* live screen-share backdrop — sits over the frame bg, under the design + grid (#7) */
.ld-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  background: #000;
}

/* subtle snap grid — spacing set inline from the grid size */
.ld-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
}

.ld-guide {
  position: absolute;
  background: #ff3d7f;
  pointer-events: none;
  z-index: 3;
}

/* rubber-band selection rectangle — drawn over the design while sweeping, never intercepts pointers */
.ld-marquee {
  position: absolute;
  z-index: 4;
  pointer-events: none;
  background: var(--c-carbon-soft);
  border: 1px solid var(--c-carbon-1);
}

.ld-guide-v {
  width: 1px;
}

.ld-guide-h {
  height: 1px;
}

.ld-frame-label {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}
</style>
