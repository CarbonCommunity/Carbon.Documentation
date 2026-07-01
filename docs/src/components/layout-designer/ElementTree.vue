<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import type { AddPreset } from './addPresets'
import { cssColor } from './geometry'
import type { ColorRGBA, DesignerElement, ElementType } from './types'
import { useDesigner } from './useDesigner'

const { byId, childrenOf, isSelected, isAncestor, select, addElement, addTextWithBackground, moveElement, remove, openContextMenu } = useDesigner()

/** Tree-row swatch background: the element's color, or transparent for colorless types (container). */
function swatchColor(el: DesignerElement): string {
  const c = (el.props as { color?: ColorRGBA }).color
  return c ? cssColor(c) : 'transparent'
}

// flatten the tree depth-first so we can render an indented list without a 2nd recursive SFC
const flat = computed(() => {
  const out: { el: DesignerElement; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const el of childrenOf(parentId)) {
      out.push({ el, depth })
      walk(el.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})

// --- per-row "add child" type menu (fixed-positioned: the tree is a scroll container) ---
const addMenu = reactive<{ id: string | null; x: number; y: number }>({ id: null, x: 0, y: 0 })
function toggleAddMenu(rowId: string, ev: MouseEvent) {
  if (addMenu.id === rowId) {
    addMenu.id = null
    return
  }
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  addMenu.id = rowId
  addMenu.x = r.left
  addMenu.y = r.bottom + 2
}
function onAddChild(choice: ElementType | AddPreset) {
  if (addMenu.id) {
    if (choice === 'textbg') addTextWithBackground(addMenu.id)
    else addElement(choice, addMenu.id)
  }
  addMenu.id = null
}
// close on any outside pointerdown (ignore the menu itself and the "+" buttons so clicks toggle)
useEventListener(
  window,
  'pointerdown',
  (e: PointerEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('.ld-type-menu') || t.closest('.ld-tree-add')) return
    addMenu.id = null
  },
  true
)
// the menu is fixed-positioned off the "+" button's rect, so close it if the tree scrolls or the
// window resizes (otherwise it floats at stale coords). Capture phase catches the tree's own scroll.
useEventListener(window, 'scroll', () => (addMenu.id = null), true)
useEventListener(window, 'resize', () => (addMenu.id = null))

// --- drag & drop: reorder siblings / reparent inside the tree (never the canvas) ---
type DropMode = 'before' | 'after' | 'inside'
const dragId = ref<string | null>(null)
const drop = reactive<{ id: string | null; mode: DropMode }>({ id: null, mode: 'inside' })

function onDragStart(rowId: string, e: DragEvent) {
  dragId.value = rowId
  addMenu.id = null
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', rowId) // some browsers won't start a drag without data
  }
}

// The parent the drop would land in for a given target+mode (null = root canvas).
function dropParent(targetId: string, mode: DropMode): string | null {
  const target = byId.value.get(targetId)
  if (!target) return null
  return mode === 'inside' ? target.id : target.parentId
}

function dropAllowed(targetId: string, mode: DropMode): boolean {
  const dId = dragId.value
  if (!dId || dId === targetId) return false
  const np = dropParent(targetId, mode)
  if (np === dId) return false
  if (np && isAncestor(dId, np)) return false // can't drop an element inside its own subtree
  return true
}

function onDragOver(rowEl: HTMLElement, rowId: string, e: DragEvent) {
  if (!dragId.value) return
  const rect = rowEl.getBoundingClientRect()
  const rel = (e.clientY - rect.top) / rect.height
  const mode: DropMode = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : 'inside'
  if (!dropAllowed(rowId, mode)) {
    drop.id = null
    return
  }
  e.preventDefault() // required so the drop event fires
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  drop.id = rowId
  drop.mode = mode
}

// The sibling immediately after `el` (null = it's the last child) — used for 'after' drops.
function siblingAfter(el: DesignerElement): string | null {
  const sibs = childrenOf(el.parentId)
  const i = sibs.findIndex((s) => s.id === el.id)
  return i >= 0 && i < sibs.length - 1 ? sibs[i + 1].id : null
}

function onDrop(rowId: string) {
  const dId = dragId.value
  const target = byId.value.get(rowId)
  if (dId && target && drop.id === rowId) {
    if (drop.mode === 'inside') moveElement(dId, target.id, null)
    else if (drop.mode === 'before') moveElement(dId, target.parentId, target.id)
    else moveElement(dId, target.parentId, siblingAfter(target))
  }
  endDrag()
}

function endDrag() {
  dragId.value = null
  drop.id = null
}
</script>

<template>
  <div class="ld-tree">
    <div
      v-for="row in flat"
      :key="row.el.id"
      class="ld-tree-row"
      :class="{
        active: isSelected(row.el.id),
        dragging: dragId === row.el.id,
        'drop-before': drop.id === row.el.id && drop.mode === 'before',
        'drop-after': drop.id === row.el.id && drop.mode === 'after',
        'drop-inside': drop.id === row.el.id && drop.mode === 'inside',
      }"
      :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
      draggable="true"
      @click="select(row.el.id, $event.shiftKey || $event.ctrlKey || $event.metaKey)"
      @contextmenu.prevent.stop="openContextMenu(row.el.id, $event.clientX, $event.clientY)"
      @dragstart.stop="onDragStart(row.el.id, $event)"
      @dragover="onDragOver($event.currentTarget as HTMLElement, row.el.id, $event)"
      @drop.prevent="onDrop(row.el.id)"
      @dragend="endDrag"
    >
      <span class="ld-swatch" :style="{ background: swatchColor(row.el) }" />
      <span class="ld-tree-name">{{ row.el.name }}</span>
      <button class="ld-tree-btn ld-tree-add" draggable="false" :class="{ open: addMenu.id === row.el.id }" title="Add child element" @click.stop="toggleAddMenu(row.el.id, $event)"><Plus :size="13" /></button>
      <button class="ld-tree-btn danger" draggable="false" title="Delete (and children)" @click.stop="remove(row.el.id)"><Trash2 :size="13" /></button>
    </div>
    <div v-if="!flat.length" class="ld-tree-empty">No elements yet.</div>

    <!-- single fixed-positioned type menu, anchored under the active row's "+" button -->
    <ElementTypeMenu v-if="addMenu.id" :x="addMenu.x" :y="addMenu.y" @pick="onAddChild" />
  </div>
</template>

<style scoped>
.ld-tree {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.ld-tree-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border-left: 2px solid transparent;
  user-select: none;
}

.ld-tree-row:hover {
  background: var(--vp-c-bg-soft);
}

/* drag & drop feedback */
.ld-tree-row.dragging {
  opacity: 0.45;
}

.ld-tree-row.drop-inside {
  background: var(--c-carbon-soft);
  outline: 1px solid var(--c-carbon-1);
  outline-offset: -1px;
}

.ld-tree-row.drop-before {
  box-shadow: inset 0 2px 0 0 var(--c-carbon-1);
}

.ld-tree-row.drop-after {
  box-shadow: inset 0 -2px 0 0 var(--c-carbon-1);
}

.ld-tree-row.active {
  background: var(--c-carbon-soft);
  border-left-color: var(--c-carbon-1);
  color: var(--vp-c-text-1);
}

.ld-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.ld-tree-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ld-tree-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
  padding: 2px;
}

.ld-tree-row:hover .ld-tree-btn {
  opacity: 1;
}

.ld-tree-btn.open {
  opacity: 1;
  color: var(--c-carbon-1);
}

.ld-tree-btn:hover {
  color: var(--vp-c-text-1);
}

.ld-tree-btn.danger:hover {
  color: var(--vp-c-danger-1);
}

.ld-tree-empty {
  padding: 16px 8px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
</style>
