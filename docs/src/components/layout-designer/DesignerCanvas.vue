<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, ref } from 'vue'
import CanvasElement from './CanvasElement.vue'
import { canvasDisplay, canvasHeight, canvasWidth } from './geometry'
import { useDesigner } from './useDesigner'

const { canvas, rootElements, select, gridSize, guides } = useDesigner()

const viewport = ref<HTMLElement | null>(null)
const { width: vw, height: vh } = useElementSize(viewport)

// leave a margin so the frame doesn't touch the edges
const PAD = 32

const refW = computed(() => canvasWidth(canvas))
const refH = computed(() => canvasHeight(canvas))
const display = computed(() => canvasDisplay(Math.max(0, vw.value - PAD * 2), Math.max(0, vh.value - PAD * 2), canvas))

const frameStyle = computed(() => ({
  width: `${display.value.displayW}px`,
  height: `${display.value.displayH}px`,
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
