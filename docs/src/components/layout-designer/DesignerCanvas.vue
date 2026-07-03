<script setup lang="ts">
import { useElementSize, useEventListener } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import CanvasElement from './CanvasElement.vue'
import { canvasDisplay, canvasHeight, canvasWidth } from './geometry'
import { useDesigner } from './useDesigner'
import { useScreenShare } from './useScreenShare'

const { canvas, rootElements, select, selectedIds, rectOf, gridSize, guides } = useDesigner()

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

const frameStyle = computed(() => ({
  width: `${display.value.displayW}px`,
  height: `${display.value.displayH}px`,
  // drives the design-overlay fade in CanvasElement (#7); 1 = fully opaque (normal). Only fades while the
  // backdrop is actually showing — stopping the share or unchecking "show behind canvas" snaps the design
  // back to full opacity (so you can't strand a blank layout), while the slider keeps its value for reuse.
  '--ld-layout-opacity': String(showBackdrop.value ? layoutOpacity.value : 1),
}))

// Visible grid reflects the snap grid size; hidden when too fine to be useful.
const gridStyle = computed(() => {
  const px = gridSize.value * display.value.scale
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
    const s = display.value.scale
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
  const s = display.value.scale
  return { left: `${g.x * s}px`, top: `${(refH.value - g.y1) * s}px`, height: `${(g.y1 - g.y0) * s}px` }
})
const hGuideStyle = computed(() => {
  const g = guides.h
  if (!g) return null
  const s = display.value.scale
  return { top: `${(refH.value - g.y) * s}px`, left: `${g.x0 * s}px`, width: `${(g.x1 - g.x0) * s}px` }
})
</script>

<template>
  <div ref="viewport" class="ld-viewport" @pointerdown="select(null)">
    <div ref="frame" class="ld-frame" :style="frameStyle" @pointerdown.stop="onFramePointerDown">
      <!-- screen-share backdrop (#7) -->
      <video v-show="showBackdrop" ref="backdrop" class="ld-backdrop" :style="backdropStyle" autoplay muted playsinline />
      <div class="ld-grid" :style="gridStyle" />
      <CanvasElement
        v-for="el in rootElements"
        :key="el.id"
        :element="el"
        :parent-w="refW"
        :parent-h="refH"
        :scale="display.scale"
      />
      <div v-if="vGuideStyle" class="ld-guide ld-guide-v" :style="vGuideStyle" />
      <div v-if="hGuideStyle" class="ld-guide ld-guide-h" :style="hGuideStyle" />
      <div v-if="bandStyle" class="ld-marquee" :style="bandStyle" />
      <span class="ld-frame-label">{{ canvas.aspect }} · {{ Math.round(refW) }}×{{ Math.round(refH) }}</span>
    </div>
  </div>
</template>

<style scoped>
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

.ld-frame {
  position: relative;
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
