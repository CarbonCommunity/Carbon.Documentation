<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { AlignCenter, ArrowDownToLine, ArrowUpToLine, ChevronRight, Copy, Group, Layers, LogOut, Maximize, Pencil, Plus, Trash2, Type, Ungroup } from 'lucide-vue-next'
import { computed, reactive, ref, watch, type Component } from 'vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import type { AddPreset } from './addPresets'
import type { ElementType } from './types'
import { useDesigner } from './useDesigner'
import { useDismiss } from './useDismiss'

const { contextMenu, byId, childrenOf, select, closeContextMenu, addElement, addLabel, addTextWithBackground, duplicate, groupSelection, ungroup, canGroup, alignSelection, requestTextEdit, bringToFront, sendToBack, reparent, fill, remove } =
  useDesigner()

const target = computed(() => (contextMenu.targetId ? byId.value.get(contextMenu.targetId) ?? null : null))
// Children flagged "move with parent" (e.g. a caption) — surface the pair's actions (edit / delete each).
const passthroughKids = computed(() => (target.value ? childrenOf(target.value.id).filter((c) => c.passthrough) : []))

// "Align" flyout — position the selection within its parent.
const ALIGN_OPTS = [
  { mode: 'left', label: 'Left' },
  { mode: 'centerH', label: 'Center horizontally' },
  { mode: 'right', label: 'Right' },
  { mode: 'top', label: 'Top' },
  { mode: 'centerV', label: 'Center vertically' },
  { mode: 'bottom', label: 'Bottom' },
] as const
const alignOpen = ref(false)
const alignPos = reactive({ x: 0, y: 0 })
function openAlign(ev: MouseEvent) {
  addSubOpen.value = false
  underOpen.value = false
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const pad = 8
  const W = 190
  let x = r.right + 4
  if (x + W > window.innerWidth - pad) x = r.left - W - 4
  alignPos.x = Math.max(pad, x)
  alignPos.y = Math.max(pad, Math.min(r.top - 5, window.innerHeight - 210))
  alignOpen.value = true
}
function onAlign(mode: (typeof ALIGN_OPTS)[number]['mode']) {
  alignSelection(mode)
  closeContextMenu()
}

// "Select under" list: every element in the click's z-stack (top → bottom). Lets you reach a box hidden
// beneath a full-bleed sibling without leaving the canvas. Shown only when more than one box is stacked.
const underTargets = computed(() =>
  contextMenu.under.map((id) => byId.value.get(id)).filter((el): el is NonNullable<typeof el> => !!el)
)
const underOpen = ref(false)
const underPos = reactive({ x: 0, y: 0 })
function openUnder(ev: MouseEvent) {
  addSubOpen.value = false // only one flyout open at a time
  alignOpen.value = false
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const pad = 8
  const W = 180
  let x = r.right + 4
  if (x + W > window.innerWidth - pad) x = r.left - W - 4
  underPos.x = Math.max(pad, x)
  underPos.y = Math.max(pad, Math.min(r.top - 5, window.innerHeight - 200))
  underOpen.value = true
}
function onSelectUnder(id: string) {
  select(id)
  closeContextMenu()
}

// "Add child" type flyout. Fixed-positioned (with an edge flip) so it never spills off-screen.
const addSubOpen = ref(false)
const subPos = reactive({ x: 0, y: 0 })
// reset whenever the menu opens/closes OR retargets another element (right-click B while open)
watch(
  () => [contextMenu.open, contextMenu.targetId],
  () => {
    addSubOpen.value = false
    underOpen.value = false
    alignOpen.value = false
  }
)
function openSub(ev: MouseEvent) {
  underOpen.value = false // only one flyout open at a time
  alignOpen.value = false
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const pad = 8
  const W = 150 // approx flyout width; flip to the left when there isn't room on the right
  let x = r.right + 4
  if (x + W > window.innerWidth - pad) x = r.left - W - 4
  subPos.x = Math.max(pad, x)
  subPos.y = Math.max(pad, Math.min(r.top - 5, window.innerHeight - 130))
  addSubOpen.value = true
}
// Hovering a plain (non-submenu) row collapses any open flyout — mirrors the File menu's hover model.
function closeSubs() {
  addSubOpen.value = false
  underOpen.value = false
  alignOpen.value = false
}
function onAddChild(choice: ElementType | AddPreset) {
  const pid = target.value?.id ?? null // no target = the blank-canvas menu, adding at root
  if (choice === 'textbg') addTextWithBackground(pid)
  else addElement(choice, pid)
  closeContextMenu()
}

interface MenuItem {
  sep?: boolean
  label?: string
  icon?: Component
  danger?: boolean
  /** Opens the element-type flyout instead of running an action + closing. */
  submenu?: boolean
  /** Opens the "Select under" stack flyout instead of running an action + closing. */
  underMenu?: boolean
  /** Opens the "Align" flyout instead of running an action + closing. */
  alignMenu?: boolean
  act?: () => void
}

const items = computed<MenuItem[]>(() => {
  const t = target.value
  // Blank spot (canvas background / empty tree area): just the add flyout, at root.
  if (!t) return [{ label: 'Add element', icon: Plus, submenu: true }]
  const grandparent = t.parentId ? byId.value.get(t.parentId)?.parentId ?? null : null
  const list: MenuItem[] = [
    { label: 'Add child', icon: Plus, submenu: true },
  ]
  // A caption nested inside another label is pointless, so offer "Add label" only on non-text boxes.
  if (t.type !== 'text') list.push({ label: 'Add label', icon: Type, act: () => addLabel(t.id) })
  list.push({ label: 'Duplicate', icon: Copy, act: () => duplicate(t.id) })
  if (canGroup.value) list.push({ label: 'Group selection', icon: Group, act: () => groupSelection() })
  if (t.groupId) list.push({ label: 'Ungroup', icon: Ungroup, act: () => ungroup(t.id) })
  // Edit the caption text of a "move with parent" label without hunting for it (selects it → Inspector).
  const captionKid = passthroughKids.value.find((k) => k.type === 'text')
  if (captionKid) list.push({ label: 'Edit label text', icon: Pencil, act: () => (select(captionKid.id), requestTextEdit()) })
  if (underTargets.value.length > 1) list.push({ label: 'Select under', icon: Layers, underMenu: true })
  list.push(
    { sep: true },
    { label: 'Align', icon: AlignCenter, alignMenu: true },
    { label: 'Bring to front', icon: ArrowUpToLine, act: () => bringToFront(t.id) },
    { label: 'Send to back', icon: ArrowDownToLine, act: () => sendToBack(t.id) },
    { sep: true },
    { label: 'Fill parent', icon: Maximize, act: () => fill(t.id, 'both') },
  )
  if (t.parentId) list.push({ label: 'Move out of parent', icon: LogOut, act: () => reparent(t.id, grandparent) })
  list.push({ sep: true })
  if (passthroughKids.value.length) {
    // A caption pair: let you delete either the host or its label(s) explicitly.
    list.push({ label: `Delete ${t.name}`, icon: Trash2, danger: true, act: () => remove(t.id) })
    for (const k of passthroughKids.value) list.push({ label: `Delete ${k.name}`, icon: Trash2, danger: true, act: () => remove(k.id) })
  } else {
    list.push({ label: 'Delete', icon: Trash2, danger: true, act: () => remove(t.id) })
  }
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

// close on outside click / escape (shared wiring) plus scroll / resize.
useDismiss('.ld-ctx', closeContextMenu)
useEventListener(window, 'resize', () => closeContextMenu())
useEventListener(window, 'scroll', () => closeContextMenu(), true)
</script>

<template>
  <div v-if="contextMenu.open && items.length" class="ld-ctx" :style="style" @contextmenu.prevent>
    <template v-for="(it, i) in items" :key="i">
      <div v-if="it.sep" class="ld-ctx-sep" />
      <div v-else-if="it.submenu" class="ld-ctx-sub">
        <button class="ld-ctx-item" :class="{ active: addSubOpen }" @mouseenter="openSub($event)" @click="openSub($event)">
          <component :is="it.icon" :size="14" />
          <span>{{ it.label }}</span>
          <ChevronRight :size="14" class="ld-ctx-chev" />
        </button>
        <ElementTypeMenu v-if="addSubOpen" :x="subPos.x" :y="subPos.y" @pick="onAddChild" />
      </div>
      <div v-else-if="it.underMenu" class="ld-ctx-sub">
        <button class="ld-ctx-item" :class="{ active: underOpen }" @mouseenter="openUnder($event)" @click="openUnder($event)">
          <component :is="it.icon" :size="14" />
          <span>{{ it.label }}</span>
          <ChevronRight :size="14" class="ld-ctx-chev" />
        </button>
        <div v-if="underOpen" class="ld-ctx ld-ctx-under" :style="{ left: `${underPos.x}px`, top: `${underPos.y}px` }">
          <button
            v-for="el in underTargets"
            :key="el.id"
            class="ld-ctx-item"
            :class="{ active: el.id === contextMenu.targetId }"
            @click="onSelectUnder(el.id)"
          >
            <Layers :size="14" />
            <span>{{ el.name }}</span>
          </button>
        </div>
      </div>
      <div v-else-if="it.alignMenu" class="ld-ctx-sub">
        <button class="ld-ctx-item" :class="{ active: alignOpen }" @mouseenter="openAlign($event)" @click="openAlign($event)">
          <component :is="it.icon" :size="14" />
          <span>{{ it.label }}</span>
          <ChevronRight :size="14" class="ld-ctx-chev" />
        </button>
        <div v-if="alignOpen" class="ld-ctx ld-ctx-under" :style="{ left: `${alignPos.x}px`, top: `${alignPos.y}px` }">
          <button v-for="o in ALIGN_OPTS" :key="o.mode" class="ld-ctx-item" @click="onAlign(o.mode)">
            <AlignCenter :size="14" />
            <span>{{ o.label }}</span>
          </button>
        </div>
      </div>
      <button v-else class="ld-ctx-item" :class="{ danger: it.danger }" @mouseenter="closeSubs" @click="run(it)">
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
