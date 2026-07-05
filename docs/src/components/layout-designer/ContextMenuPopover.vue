<script setup lang="ts">
// Generic right-click menu popover: a fixed-position list of items with outside-click / Escape to close.
// Shared by the canvas tab strip and the Project explorer (both wanted the same little menu). Callers
// pass a flat item list; a `sep:true` entry draws a divider. Kept presentation-only — every action lives
// in the caller's `act`.
import type { Component } from 'vue'
import { useDismiss } from './useDismiss'

type Item = { sep: true } | { label: string; icon?: Component; danger?: boolean; disabled?: boolean; act: () => void }

defineProps<{ x: number; y: number; items: Item[] }>()
const emit = defineEmits<{ close: [] }>()

function run(it: Extract<Item, { label: string }>) {
  if (it.disabled) return
  it.act()
  emit('close')
}
useDismiss('.ld-ctxmenu', () => emit('close'))
</script>

<template>
  <div class="ld-ctxmenu" :style="{ left: `${x}px`, top: `${y}px` }" @contextmenu.prevent>
    <template v-for="(it, i) in items" :key="i">
      <div v-if="'sep' in it" class="ld-ctxmenu-sep" />
      <button v-else class="ld-ctxmenu-item" :class="{ danger: it.danger }" :disabled="it.disabled" @click="run(it)">
        <component :is="it.icon" v-if="it.icon" :size="14" />
        <span>{{ it.label }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.ld-ctxmenu {
  position: fixed;
  z-index: 1000;
  min-width: 172px;
  padding: 5px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5);
  user-select: none;
}
.ld-ctxmenu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 9px;
  font-size: 13px;
  text-align: left;
  color: var(--vp-c-text-1);
  border-radius: 4px;
}
.ld-ctxmenu-item:hover:not(:disabled) {
  background: var(--c-carbon-soft);
  color: var(--c-carbon-1);
}
.ld-ctxmenu-item:disabled {
  opacity: 0.4;
  cursor: default;
}
.ld-ctxmenu-item.danger:hover:not(:disabled) {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
}
.ld-ctxmenu-item :deep(svg) {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}
.ld-ctxmenu-item:hover:not(:disabled) :deep(svg) {
  color: inherit;
}
.ld-ctxmenu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--vp-c-divider);
}
</style>
