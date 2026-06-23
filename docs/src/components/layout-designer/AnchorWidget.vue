<script setup lang="ts">
import { computed } from 'vue'
import { applyAnchorPreset, referenceWidth } from './geometry'
import { useDesigner } from './useDesigner'

const { selected, canvas, rectOf, update } = useDesigner()

interface AxisOpt {
  key: string
  label: string
  min: number
  max: number
}

// Horizontal & vertical are independent: a point (left/center/right or top/middle/bottom) or a
// stretch. "Stretch on both axes" = fills the parent.
const H_OPTS: AxisOpt[] = [
  { key: 'left', label: 'Left', min: 0, max: 0 },
  { key: 'center', label: 'Center', min: 0.5, max: 0.5 },
  { key: 'right', label: 'Right', min: 1, max: 1 },
  { key: 'stretch', label: 'Stretch', min: 0, max: 1 },
]
const V_OPTS: AxisOpt[] = [
  { key: 'top', label: 'Top', min: 1, max: 1 },
  { key: 'middle', label: 'Middle', min: 0.5, max: 0.5 },
  { key: 'bottom', label: 'Bottom', min: 0, max: 0 },
  { key: 'stretch', label: 'Stretch', min: 0, max: 1 },
]

function parentDims(): { w: number; h: number } {
  const el = selected.value
  if (!el || !el.parentId) return { w: referenceWidth(canvas), h: canvas.referenceHeight }
  const r = rectOf(el.parentId)
  return r ? { w: r.w, h: r.h } : { w: referenceWidth(canvas), h: canvas.referenceHeight }
}

const activeH = computed(() => {
  const el = selected.value
  if (!el) return ''
  return H_OPTS.find((o) => o.min === el.anchorMin.x && o.max === el.anchorMax.x)?.key ?? ''
})
const activeV = computed(() => {
  const el = selected.value
  if (!el) return ''
  return V_OPTS.find((o) => o.min === el.anchorMin.y && o.max === el.anchorMax.y)?.key ?? ''
})

function pickH(opt: AxisOpt) {
  const el = selected.value
  if (!el) return
  const { w, h } = parentDims()
  update(el.id, applyAnchorPreset(el, w, h, { x: opt.min, y: el.anchorMin.y }, { x: opt.max, y: el.anchorMax.y }))
}
function pickV(opt: AxisOpt) {
  const el = selected.value
  if (!el) return
  const { w, h } = parentDims()
  update(el.id, applyAnchorPreset(el, w, h, { x: el.anchorMin.x, y: opt.min }, { x: el.anchorMax.x, y: opt.max }))
}
</script>

<template>
  <div class="ld-anchor">
    <div class="ld-axis">
      <span class="ld-axis-label">Horizontal</span>
      <div class="ld-seg">
        <button
          v-for="o in H_OPTS"
          :key="o.key"
          :class="{ active: activeH === o.key }"
          :disabled="!selected"
          :title="o.key === 'stretch' ? 'Grow with the parent\'s width' : `Pin horizontally to the ${o.label.toLowerCase()}`"
          @click="pickH(o)"
        >
          {{ o.label }}
        </button>
      </div>
    </div>

    <div class="ld-axis">
      <span class="ld-axis-label">Vertical</span>
      <div class="ld-seg">
        <button
          v-for="o in V_OPTS"
          :key="o.key"
          :class="{ active: activeV === o.key }"
          :disabled="!selected"
          :title="o.key === 'stretch' ? 'Grow with the parent\'s height' : `Pin vertically to the ${o.label.toLowerCase()}`"
          @click="pickV(o)"
        >
          {{ o.label }}
        </button>
      </div>
    </div>

    <p class="ld-axis-hint">“Stretch” grows the box with the parent on that axis; the other options keep its size and pin it to that spot. Stretch on both = fills the parent.</p>
  </div>
</template>

<style scoped>
.ld-anchor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ld-axis {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ld-axis-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
}

.ld-seg {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}

.ld-seg button {
  flex: 1;
  padding: 5px 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-divider);
  transition: background 0.12s, color 0.12s;
}

.ld-seg button:last-child {
  border-right: none;
}

.ld-seg button:hover:not(:disabled):not(.active) {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.ld-seg button.active {
  background: var(--c-carbon-1);
  color: #fff;
}

.ld-seg button:disabled {
  opacity: 0.4;
  cursor: default;
}

.ld-axis-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--vp-c-text-3);
}
</style>
