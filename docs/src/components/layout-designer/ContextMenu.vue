<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ArrowDownToLine, ArrowUpToLine, ChevronRight, Copy, LogOut, Maximize, Plus, Trash2 } from 'lucide-vue-next'
import { computed, reactive, ref, watch, type Component } from 'vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import type { ElementType } from './types'
import { useDesigner } from './useDesigner'

const { contextMenu, byId, closeContextMenu, addElement, duplicate, bringToFront, sendToBack, reparent, fill, remove } =
  useDesigner()

const target = computed(() => (contextMenu.targetId ? byId.value.get(contextMenu.targetId) ?? null : null))

// "Add child" type flyout. Fixed-positioned (with an edge flip) so it never spills off-screen.
const addSubOpen = ref(false)
const subPos = reactive({ x: 0, y: 0 })
// reset whenever the menu opens/closes OR retargets another element (right-click B while open)
watch(
  () => [contextMenu.open, contextMenu.targetId],
  () => {
    addSubOpen.value = false
  }
)
function toggleSub(ev: MouseEvent) {
  if (addSubOpen.value) {
    addSubOpen.value = false
    return
  }
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const pad = 8
  const W = 150 // approx flyout width; flip to the left when there isn't room on the right
  let x = r.right + 4
  if (x + W > window.innerWidth - pad) x = r.left - W - 4
  subPos.x = Math.max(pad, x)
  subPos.y = Math.max(pad, Math.min(r.top - 5, window.innerHeight - 130))
  addSubOpen.value = true
}
function onAddChild(type: ElementType) {
  const t = target.value
  if (t) addElement(type, t.id)
  closeContextMenu()
}

interface MenuItem {
  sep?: boolean
  label?: string
  icon?: Component
  danger?: boolean
  /** Opens the element-type flyout instead of running an action + closing. */
  submenu?: boolean
  act?: () => void
}

const items = computed<MenuItem[]>(() => {
  const t = target.value
  if (!t) return []
  const grandparent = t.parentId ? byId.value.get(t.parentId)?.parentId ?? null : null
  const list: MenuItem[] = [
    { label: 'Add child', icon: Plus, submenu: true },
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
      <div v-else-if="it.submenu" class="ld-ctx-sub">
        <button class="ld-ctx-item" :class="{ active: addSubOpen }" @click="toggleSub($event)">
          <component :is="it.icon" :size="14" />
          <span>{{ it.label }}</span>
          <ChevronRight :size="14" class="ld-ctx-chev" />
        </button>
        <ElementTypeMenu v-if="addSubOpen" :x="subPos.x" :y="subPos.y" @pick="onAddChild" />
      </div>
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

.ld-ctx-item:hover,
.ld-ctx-item.active {
  background: var(--c-carbon-soft);
  color: var(--c-carbon-1);
}

/* "Add child" row anchors the type flyout */
.ld-ctx-sub {
  position: relative;
}

.ld-ctx-chev {
  margin-left: auto;
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
