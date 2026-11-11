<script setup lang="ts">
// Small shared popover that lists the addable element types and emits the chosen one.
// Reused by the toolbar "Add element" button, the tree row "+", and the canvas context menu,
// so the set of types (and their order) lives in exactly one place: ELEMENT_TYPES.
import { computed } from 'vue'
import { Plus, SquarePlus } from 'lucide-vue-next'
import { ELEMENT_TYPES } from './elements/registry'
import { ADD_PRESETS, type AddPreset } from './addPresets'
import type { ElementType } from './types'

const props = defineProps<{
  /** Where the popover sits relative to its (position:relative) anchor. Ignored when x/y are set. */
  placement?: 'below' | 'below-right' | 'right'
  /** Viewport coords for fixed placement — used inside scroll containers (e.g. the element tree). */
  x?: number
  y?: number
}>()
const emit = defineEmits<{ pick: [choice: ElementType | AddPreset] }>()

const fixed = computed(() => props.x != null && props.y != null)
const fixedStyle = computed(() => (fixed.value ? { position: 'fixed', left: `${props.x}px`, top: `${props.y}px`, zIndex: '1000' } : undefined))
</script>

<template>
  <div class="ld-type-menu" :class="fixed ? null : `p-${placement ?? 'below'}`" :style="fixedStyle" @pointerdown.stop>
    <button
      v-for="t in ELEMENT_TYPES"
      :key="t.type"
      class="ld-type-item"
      :title="`Add ${t.label.toLowerCase()}`"
      @click="emit('pick', t.type)"
    >
      <Plus :size="13" /> <span>{{ t.label }}</span>
    </button>
    <div class="ld-type-sep" />
    <button
      v-for="p in ADD_PRESETS"
      :key="p.preset"
      class="ld-type-item"
      :title="`Add ${p.label.toLowerCase()}`"
      @click="emit('pick', p.preset)"
    >
      <SquarePlus :size="13" /> <span>{{ p.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.ld-type-menu {
  position: absolute;
  z-index: 90;
  min-width: 132px;
  padding: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5);
}

.p-below {
  top: calc(100% + 4px);
  left: 0;
}

.p-below-right {
  top: calc(100% + 4px);
  right: 0;
}

.p-right {
  top: -5px;
  left: calc(100% + 4px);
}

.ld-type-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--vp-c-divider);
}

.ld-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 9px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  border-radius: 4px;
  text-align: left;
}

.ld-type-item:hover {
  background: var(--c-carbon-soft);
  color: var(--c-carbon-1);
}

.ld-type-item :deep(svg) {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.ld-type-item:hover :deep(svg) {
  color: inherit;
}
</style>
