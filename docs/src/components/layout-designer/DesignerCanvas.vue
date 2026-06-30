<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import CanvasElement from './CanvasElement.vue'
import { canvasDisplay, canvasHeight, canvasWidth } from './geometry'
import { useDesigner } from './useDesigner'
import { useScreenShare } from './useScreenShare'

const { canvas, rootElements, select, gridSize, guides } = useDesigner()

// Design-over-scene compositing (#7): the captured stream renders as a backdrop behind the design,
// and `layoutOpacity` fades the whole design over it (the per-element opacity slider in the Inspector
// is unrelated — this dims the entire rendered layout so you can see/edit against the real game).
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
  // drives the design-overlay fade in CanvasElement (#7); 1 = fully opaque (normal)
  '--ld-layout-opacity': String(layoutOpacity.value),
}))

// Visible grid reflects the snap grid size; hidden when too fine to be useful.
const gridStyle = computed(() => {
  const px = gridSize.value * display.value.scale
  if (px < 6) return { display: 'none' }
  return { backgroundSize: `${px}px ${px}px, ${px}px ${px}px` }
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
    <div class="ld-frame" :style="frameStyle" @pointerdown.stop="select(null)">
      <!-- live screen-share backdrop (#7): behind the design; the layout fades over it -->
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
