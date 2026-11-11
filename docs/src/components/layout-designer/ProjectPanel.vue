<script setup lang="ts">
// Project explorer (#1/#5): the saved layouts as a NESTED folder tree, where a layout's `folder` is a
// "/"-separated path (e.g. "UI/HUD"). Folders are derived from those paths — there are no empty folders.
// Supports multi-select (click / Ctrl / Shift), delete, open-on-double-click, and HTML5 drag-and-drop to
// reorder and to move layouts into/out of folders. Folders are expanded unless explicitly collapsed.
import { useStorage } from '@vueuse/core'
import { ChevronDown, ChevronRight, Copy, FilePlus2, FolderInput, FolderPlus, Folder, FolderOpen, LayoutTemplate, Pencil, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import ContextMenuPopover from './ContextMenuPopover.vue'
import { useDesigner } from './useDesigner'

type LayoutMeta = { id: string; name: string; folder?: string }
type FolderNode = { name: string; path: string; folders: Map<string, FolderNode>; items: LayoutMeta[] }
type Row = { kind: 'folder'; node: FolderNode; depth: number } | { kind: 'layout'; item: LayoutMeta; depth: number }

const { layouts, currentLayoutId, openTabs, switchLayout, deleteLayout, duplicateLayout, renameLayout, setLayoutFolder, moveLayout, newLayout } = useDesigner()

// Folders are expanded by default; we persist only the COLLAPSED set so new folders show open.
const collapsed = useStorage<string[]>('carbon-layout-designer:project:collapsed', [])
const isExpanded = (path: string) => !(collapsed.value ?? []).includes(path)
function toggleFolder(path: string) {
  const cur = collapsed.value ?? []
  collapsed.value = isExpanded(path) ? [...cur, path] : cur.filter((p) => p !== path)
}

const tree = computed<FolderNode>(() => {
  const root: FolderNode = { name: '', path: '', folders: new Map(), items: [] }
  for (const l of layouts.value) {
    const segs = (l.folder ?? '').split('/').map((s) => s.trim()).filter(Boolean)
    let cur = root
    let path = ''
    for (const seg of segs) {
      path = path ? `${path}/${seg}` : seg
      if (!cur.folders.has(seg)) cur.folders.set(seg, { name: seg, path, folders: new Map(), items: [] })
      cur = cur.folders.get(seg)!
    }
    cur.items.push({ id: l.id, name: l.name, folder: l.folder })
  }
  return root
})

// Flatten to a render list honouring expand state — folders first (alphabetical), then layouts (list order).
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const walk = (node: FolderNode, depth: number) => {
    for (const name of [...node.folders.keys()].sort((a, b) => a.localeCompare(b))) {
      const f = node.folders.get(name)!
      out.push({ kind: 'folder', node: f, depth })
      if (isExpanded(f.path)) walk(f, depth + 1)
    }
    for (const item of node.items) out.push({ kind: 'layout', item, depth })
  }
  walk(tree.value, 0)
  return out
})

// --- selection (local to the panel) ---
const selected = ref<Set<string>>(new Set())
const lastClicked = ref<string | null>(null)
const layoutOrder = computed(() => rows.value.filter((r): r is Extract<Row, { kind: 'layout' }> => r.kind === 'layout').map((r) => r.item.id))

function onLayoutClick(id: string, e: MouseEvent) {
  if (e.shiftKey && lastClicked.value) {
    const order = layoutOrder.value
    const a = order.indexOf(lastClicked.value)
    const b = order.indexOf(id)
    if (a >= 0 && b >= 0) {
      const [lo, hi] = a < b ? [a, b] : [b, a]
      selected.value = new Set(order.slice(lo, hi + 1))
      return
    }
  }
  if (e.ctrlKey || e.metaKey) {
    const next = new Set(selected.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selected.value = next
  } else {
    selected.value = new Set([id])
  }
  lastClicked.value = id
}

function deleteSelected() {
  const ids = [...selected.value]
  if (!ids.length) return
  if (!window.confirm(`Delete ${ids.length} layout${ids.length > 1 ? 's' : ''}? This can't be undone.`)) return
  for (const id of ids) deleteLayout(id)
  selected.value = new Set()
}

function newFolder() {
  const name = window.prompt('New folder name')?.trim()
  if (!name) return
  const ids = [...selected.value]
  if (ids.length) for (const id of ids) setLayoutFolder(id, name)
  else {
    newLayout() // an empty folder can't persist, so seed it with a fresh layout
    if (currentLayoutId.value) setLayoutFolder(currentLayoutId.value, name)
  }
}

function renameFolder(f: FolderNode) {
  const next = window.prompt('Rename folder', f.name)?.trim()
  if (!next || next === f.name || next.includes('/')) return
  const parent = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''
  const newPath = parent ? `${parent}/${next}` : next
  for (const l of layouts.value) {
    const fol = l.folder ?? ''
    if (fol === f.path) setLayoutFolder(l.id, newPath)
    else if (fol.startsWith(`${f.path}/`)) setLayoutFolder(l.id, newPath + fol.slice(f.path.length))
  }
}

// --- drag & drop ---
const dropTarget = ref<string | null>(null) // folder path or layout id currently hovered
function draggedIds(id: string): string[] {
  // dragging an unselected row drags just it; dragging a selected row drags the whole selection
  return selected.value.has(id) ? [...selected.value] : [id]
}
function onLayoutDragStart(id: string, e: DragEvent) {
  if (!selected.value.has(id)) selected.value = new Set([id])
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}
function dropOnFolder(f: FolderNode) {
  for (const id of [...selected.value]) setLayoutFolder(id, f.path)
  dropTarget.value = null
}
function dropOnLayout(target: LayoutMeta) {
  // join the target's folder and slot in just before it
  for (const id of [...selected.value]) {
    if (id === target.id) continue
    setLayoutFolder(id, target.folder ?? '')
    moveLayout(id, target.id)
  }
  dropTarget.value = null
}
function dropOnRoot() {
  for (const id of [...selected.value]) setLayoutFolder(id, '')
  dropTarget.value = null
}

// --- right-click menu (shared ContextMenuPopover) ---
type MenuState = { x: number; y: number; items: Array<{ sep: true } | { label: string; icon?: unknown; danger?: boolean; act: () => void }> }
const menu = ref<MenuState | null>(null)
const closeMenu = () => (menu.value = null)

function renameLayoutPrompt(id: string) {
  const next = window.prompt('Rename layout', layouts.value.find((l) => l.id === id)?.name ?? '')
  if (next && next.trim()) renameLayout(id, next.trim())
}
function moveToFolderPrompt(ids: string[]) {
  const existing = [...new Set(layouts.value.map((l) => l.folder).filter(Boolean))].sort()
  const hint = existing.length ? `Move to folder (existing: ${existing.join(', ')}). Blank = root.` : 'Move to folder — blank = root.'
  const folder = window.prompt(hint, '')
  if (folder === null) return
  for (const id of ids) setLayoutFolder(id, folder.trim())
}
function newLayoutInFolder(path: string) {
  newLayout()
  if (currentLayoutId.value) setLayoutFolder(currentLayoutId.value, path)
}
function deleteFolder(node: FolderNode) {
  const ids = layouts.value.filter((l) => { const f = l.folder ?? ''; return f === node.path || f.startsWith(`${node.path}/`) }).map((l) => l.id)
  if (!ids.length) return
  if (!window.confirm(`Delete folder "${node.name}" and its ${ids.length} layout${ids.length > 1 ? 's' : ''}? This can't be undone.`)) return
  for (const id of ids) deleteLayout(id)
}

function onLayoutMenu(item: LayoutMeta, e: MouseEvent) {
  if (!selected.value.has(item.id)) {
    selected.value = new Set([item.id])
    lastClicked.value = item.id
  }
  const ids = [...selected.value]
  menu.value = {
    x: e.clientX,
    y: e.clientY,
    items: [
      { label: 'Open', icon: FolderOpen, act: () => switchLayout(item.id) },
      { label: 'Duplicate', icon: Copy, act: () => duplicateLayout(item.id) },
      { label: 'Rename…', icon: Pencil, act: () => renameLayoutPrompt(item.id) },
      { label: ids.length > 1 ? `Move ${ids.length} to folder…` : 'Move to folder…', icon: FolderInput, act: () => moveToFolderPrompt(ids) },
      { sep: true },
      { label: ids.length > 1 ? `Delete ${ids.length}` : 'Delete', icon: Trash2, danger: true, act: () => deleteSelected() },
    ],
  }
}
function onFolderMenu(node: FolderNode, e: MouseEvent) {
  menu.value = {
    x: e.clientX,
    y: e.clientY,
    items: [
      { label: 'New layout here', icon: FilePlus2, act: () => newLayoutInFolder(node.path) },
      { label: 'Rename…', icon: Pencil, act: () => renameFolder(node) },
      { sep: true },
      { label: 'Delete folder', icon: Trash2, danger: true, act: () => deleteFolder(node) },
    ],
  }
}
</script>

<template>
  <div class="ld-proj" tabindex="0" @keydown.delete.prevent="deleteSelected">
    <div class="ld-proj-toolbar">
      <button class="ld-proj-tool" title="New layout" @click="newLayout()"><FilePlus2 :size="14" /></button>
      <button class="ld-proj-tool" title="New folder (holds the selected layouts)" @click="newFolder"><FolderPlus :size="14" /></button>
      <button class="ld-proj-tool danger" title="Delete selected" :disabled="!selected.size" @click="deleteSelected"><Trash2 :size="14" /></button>
      <span class="ld-proj-count">{{ layouts.length }} layout{{ layouts.length === 1 ? '' : 's' }}</span>
    </div>

    <!-- the list also acts as the "move to root" drop zone -->
    <div class="ld-proj-list" :class="{ rootdrop: dropTarget === ' root' }" @dragover.prevent="dropTarget = ' root'" @drop.prevent="dropOnRoot" @dragleave="dropTarget = null">
      <template v-for="r in rows" :key="r.kind === 'folder' ? `f:${r.node.path}` : `l:${r.item.id}`">
        <!-- folder row -->
        <div
          v-if="r.kind === 'folder'"
          class="ld-proj-row ld-proj-folder"
          :class="{ droptarget: dropTarget === r.node.path }"
          :style="{ paddingLeft: `${6 + r.depth * 14}px` }"
          @click="toggleFolder(r.node.path)"
          @dblclick.stop="renameFolder(r.node)"
          @contextmenu.prevent.stop="onFolderMenu(r.node, $event)"
          @dragover.prevent.stop="dropTarget = r.node.path"
          @drop.prevent.stop="dropOnFolder(r.node)"
        >
          <component :is="isExpanded(r.node.path) ? ChevronDown : ChevronRight" :size="13" class="ld-proj-twisty" />
          <component :is="isExpanded(r.node.path) ? FolderOpen : Folder" :size="14" class="ld-proj-ficon" />
          <span class="ld-proj-name">{{ r.node.name }}</span>
        </div>

        <!-- layout row -->
        <div
          v-else
          class="ld-proj-row ld-proj-layout"
          :class="{ selected: selected.has(r.item.id), active: r.item.id === currentLayoutId, droptarget: dropTarget === r.item.id }"
          :style="{ paddingLeft: `${8 + r.depth * 14}px` }"
          :title="r.item.name"
          draggable="true"
          @click="onLayoutClick(r.item.id, $event)"
          @dblclick="switchLayout(r.item.id)"
          @contextmenu.prevent.stop="onLayoutMenu(r.item, $event)"
          @dragstart="onLayoutDragStart(r.item.id, $event)"
          @dragover.prevent.stop="dropTarget = r.item.id"
          @drop.prevent.stop="dropOnLayout(r.item)"
        >
          <LayoutTemplate :size="13" class="ld-proj-licon" />
          <span class="ld-proj-name">{{ r.item.name }}</span>
          <span v-if="openTabs.includes(r.item.id)" class="ld-proj-open" title="Open in a tab" />
        </div>
      </template>

      <div v-if="!layouts.length" class="ld-proj-empty">No layouts yet. Click <FilePlus2 :size="12" /> to create one.</div>
    </div>

    <ContextMenuPopover v-if="menu" :x="menu.x" :y="menu.y" :items="menu.items" @close="closeMenu" />
  </div>
</template>

<style scoped>
.ld-proj {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  outline: none;
}

.ld-proj-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

.ld-proj-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  color: var(--vp-c-text-2);
}
.ld-proj-tool:hover:not(:disabled) {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
.ld-proj-tool.danger:hover:not(:disabled) {
  color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}
.ld-proj-tool:disabled {
  opacity: 0.35;
}

.ld-proj-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.ld-proj-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 3px 0;
}
.ld-proj-list.rootdrop {
  box-shadow: inset 0 0 0 2px var(--c-carbon-soft);
}

.ld-proj-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 3px;
  padding-bottom: 3px;
  padding-right: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.ld-proj-row:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.ld-proj-row.droptarget {
  box-shadow: inset 0 -2px 0 var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
.ld-proj-folder.droptarget {
  box-shadow: inset 0 0 0 1px var(--c-carbon-1);
}

.ld-proj-layout.selected {
  background: var(--c-carbon-soft);
  color: var(--vp-c-text-1);
}
.ld-proj-layout.active .ld-proj-name {
  font-weight: 700;
  color: var(--c-carbon-1);
}

.ld-proj-twisty {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}
.ld-proj-ficon {
  color: var(--c-carbon-1);
  flex-shrink: 0;
}
.ld-proj-licon {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  margin-left: 13px; /* align with folder rows that have a twisty */
}

.ld-proj-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.ld-proj-open {
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--c-carbon-1);
  flex-shrink: 0;
}

.ld-proj-empty {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 12px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
</style>
