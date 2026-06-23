<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ArrowDownToLine, ArrowUpToLine, Copy, LogOut, Maximize, Plus, Trash2 } from 'lucide-vue-next'
import { computed, type Component } from 'vue'
import { useDesigner } from './useDesigner'

const { contextMenu, byId, closeContextMenu, addPanel, duplicate, bringToFront, sendToBack, reparent, fill, remove } =
  useDesigner()

const target = computed(() => (contextMenu.targetId ? byId.value.get(contextMenu.targetId) ?? null : null))

interface MenuItem {
  sep?: boolean
  label?: string
  icon?: Component
  danger?: boolean
  act?: () => void
}

const items = computed<MenuItem[]>(() => {
  const t = target.value
  if (!t) return []
  const grandparent = t.parentId ? byId.value.get(t.parentId)?.parentId ?? null : null
  const list: MenuItem[] = [
    { label: 'Add child panel', icon: Plus, act: () => addPanel(t.id) },
    { label: 'Duplicate', icon: Copy, act: () => duplicate(t.id) },
    { sep: true },
    { label: 'Bring to front', icon: ArrowUpToLine, act: () => bringToFront(t.id) },
    { label: 'Send to back', icon: ArrowDownToLine, act: () => sendToBack(t.id) },
    { sep: true },
    { label: 'Fill parent', icon: Maximize, act: () => fill(t.id, 'both') },
  ]
  if (t.parentId) list.push({ label: 'Move out of parent', icon: LogOut, act: () => reparent(t.id, grandparent) })
  list.push({ sep: true }, { label: 'Delete', icon: Trash2, danger: true, act: () => remove(t.id) })
  return list
})

// keep the menu on-screen
const style = computed(() => {
  const pad = 8
  const w = 210
  const h = 16 + items.value.length * 30
  const x = Math.min(contextMenu.x, window.innerWidth - w - pad)
  const y = Math.min(contextMenu.y, window.innerHeight - h - pad)
  return { left: `${Math.max(pad, x)}px`, top: `${Math.max(pad, y)}px` }
})

function run(item: MenuItem) {
  item.act?.()
  closeContextMenu()
}

// close on outside click / escape / scroll / resize.
// Capture phase is required: canvas elements call stopPropagation() on pointerdown, so a
// bubble-phase listener would never see clicks inside the layout.
useEventListener(
  window,
  'pointerdown',
  (e: PointerEvent) => {
    if (e.button === 2) return // right-press: let the contextmenu event (re)open the menu
    if (!(e.target as HTMLElement)?.closest('.ld-ctx')) closeContextMenu()
  },
  true
)
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeContextMenu()
})
useEventListener(window, 'resize', () => closeContextMenu())
useEventListener(window, 'scroll', () => closeContextMenu(), true)
</script>

<template>
  <div v-if="contextMenu.open && target" class="ld-ctx" :style="style" @contextmenu.prevent>
    <template v-for="(it, i) in items" :key="i">
      <div v-if="it.sep" class="ld-ctx-sep" />
      <button v-else class="ld-ctx-item" :class="{ danger: it.danger }" @click="run(it)">
        <component :is="it.icon" :size="14" />
        <span>{{ it.label }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.ld-ctx {
  position: fixed;
  z-index: 1000;
  min-width: 190px;
  padding: 5px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5);
  user-select: none;
}

.ld-ctx-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 9px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  border-radius: 4px;
  text-align: left;
}

.ld-ctx-item:hover {
  background: var(--c-carbon-soft);
  color: var(--c-carbon-1);
}

.ld-ctx-item.danger:hover {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
}

.ld-ctx-item :deep(svg) {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.ld-ctx-item:hover :deep(svg) {
  color: inherit;
}

.ld-ctx-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--vp-c-divider);
}
</style>
