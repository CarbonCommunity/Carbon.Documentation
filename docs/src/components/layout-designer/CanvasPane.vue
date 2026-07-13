<script setup lang="ts">
import { Copy, FolderOpen, LayoutDashboard, Pencil, Plus, RotateCcw, X } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import ContextMenuPopover from './ContextMenuPopover.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import { useDesigner } from './useDesigner'

// The pinned centre of the dock workspace: the canvas with its document tabs (one per open layout)
// and the empty state shown when no layout is open. The canvas itself is never dragged/closed.
const {
  currentLayoutId,
  openTabLayouts,
  layouts,
  switchLayout,
  closeTab,
  newLayout,
  reorderTab,
  duplicateLayout,
  restoreBackup,
  closeOtherTabs,
  closeTabsToLeft,
  closeTabsToRight,
  closeAllTabs,
  renameLayout,
  layoutNameTaken,
} = useDesigner()

// One-slot safety net: roll the layout back to how it looked when its tab was last activated.
// The rollback itself lands as an undoable step, so even a mistaken restore is reversible.
function doRestore(id: string) {
  const name = openTabLayouts.value.find((l) => l.id === id)?.name ?? 'this layout'
  if (!window.confirm(`Restore "${name}" to its state when it was last opened? (The restore can be undone.)`)) return
  if (!restoreBackup(id)) window.alert('No earlier state is stored for this layout yet.')
}

// Focus + select an inline-rename input the moment it mounts (no template-ref juggling inside v-for).
const vFocus = { mounted: (el: HTMLInputElement) => (el.focus(), el.select()) }

// inline rename (double-click a tab) — conflicts are flagged live and de-duped on commit
const editing = ref<string | null>(null)
const editName = ref('')
function startRename(id: string, current: string) {
  editing.value = id
  editName.value = current
}
function startRenameById(id: string) {
  const t = openTabLayouts.value.find((l) => l.id === id)
  if (t) startRename(id, t.name)
}
function commitRename() {
  if (editing.value) renameLayout(editing.value, editName.value)
  editing.value = null
}

// drag-to-reorder tabs
const dragId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
function onDragStart(id: string, e: DragEvent) {
  dragId.value = id
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDropOn(id: string) {
  if (dragId.value && dragId.value !== id) reorderTab(dragId.value, id)
  dragId.value = dragOverId.value = null
}
function onDropEnd() {
  if (dragId.value) reorderTab(dragId.value, null) // released past the last tab → move to the end
  dragId.value = dragOverId.value = null
}

// right-click tab menu (built on the shared ContextMenuPopover)
const tabMenu = reactive<{ id: string | null; x: number; y: number }>({ id: null, x: 0, y: 0 })
function openTabMenu(id: string, e: MouseEvent) {
  tabMenu.id = id
  tabMenu.x = e.clientX
  tabMenu.y = e.clientY
}
function closeTabMenu() {
  tabMenu.id = null
}
const tabMenuItems = computed(() => {
  const id = tabMenu.id
  if (!id) return []
  const idx = openTabLayouts.value.findIndex((t) => t.id === id)
  const n = openTabLayouts.value.length
  return [
    { label: 'Duplicate', icon: Copy, act: () => duplicateLayout(id) },
    { label: 'Rename…', icon: Pencil, act: () => startRenameById(id) },
    { label: 'Restore last opened state...', icon: RotateCcw, act: () => doRestore(id) },
    { sep: true as const },
    { label: 'Close', icon: X, act: () => closeTab(id) },
    { label: 'Close others', disabled: n < 2, act: () => closeOtherTabs(id) },
    { label: 'Close to the left', disabled: idx <= 0, act: () => closeTabsToLeft(id) },
    { label: 'Close to the right', disabled: idx >= n - 1, act: () => closeTabsToRight(id) },
    { sep: true as const },
    { label: 'Close all', act: () => closeAllTabs() },
  ]
})
</script>

<template>
  <div class="ld-canvas-pane">
    <!-- canvas pane title bar = document tabs; closing a tab keeps the layout -->
    <div v-if="currentLayoutId" class="ld-canvas-tabs" role="tablist" @dragover.prevent @drop.prevent="onDropEnd">
      <div
        v-for="t in openTabLayouts"
        :key="t.id"
        class="ld-canvas-tab"
        :class="{ active: t.id === currentLayoutId, dragover: dragOverId === t.id, dragging: dragId === t.id }"
        role="tab"
        :title="t.name"
        :draggable="editing !== t.id"
        @click="switchLayout(t.id)"
        @dblclick="startRename(t.id, t.name)"
        @contextmenu.prevent="openTabMenu(t.id, $event)"
        @mousedown.middle.prevent
        @mouseup.middle="closeTab(t.id)"
        @dragstart="onDragStart(t.id, $event)"
        @dragover.prevent="dragId && dragId !== t.id && (dragOverId = t.id)"
        @drop.stop.prevent="onDropOn(t.id)"
        @dragend="onDropEnd"
      >
        <input
          v-if="editing === t.id"
          v-focus
          v-model="editName"
          class="ld-canvas-tab-edit"
          :class="{ conflict: layoutNameTaken(editName, t.id) }"
          :title="layoutNameTaken(editName, t.id) ? 'Another layout already uses this name — it will be made unique' : ''"
          @click.stop
          @keydown.enter.prevent="commitRename"
          @keydown.esc.prevent="editing = null"
          @blur="commitRename"
        />
        <span v-else class="ld-canvas-tab-name">{{ t.name }}</span>
        <button v-if="editing !== t.id" class="ld-canvas-tab-close" title="Close tab (keeps the layout)" @click.stop="closeTab(t.id)"><X :size="12" /></button>
      </div>
    </div>

    <div class="ld-canvas-stage">
      <DesignerCanvas v-if="currentLayoutId" />
      <!-- empty state: nothing open (all tabs closed) -->
      <div v-else class="ld-canvas-empty">
        <div class="ld-canvas-empty-card">
          <LayoutDashboard :size="34" class="ld-canvas-empty-icon" />
          <div class="ld-canvas-empty-title">No layout open</div>
          <div class="ld-canvas-empty-sub">Create a new layout or open a saved one.</div>
          <button class="ld-btn primary ld-canvas-empty-new" @click="newLayout()"><Plus :size="14" /> New layout</button>
          <div v-if="layouts.length" class="ld-canvas-empty-saved">
            <div class="ld-canvas-empty-saved-label">Open a saved layout</div>
            <div class="ld-canvas-empty-saved-list">
              <button v-for="l in layouts" :key="l.id" class="ld-canvas-empty-saved-item" @click="switchLayout(l.id)">
                <FolderOpen :size="13" /> <span>{{ l.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ContextMenuPopover v-if="tabMenu.id" :x="tabMenu.x" :y="tabMenu.y" :items="tabMenuItems" @close="closeTabMenu" />
  </div>
</template>

<style scoped>
.ld-canvas-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 240px; /* keep the canvas usable; the body scrolls rather than crushing it */
  overflow: hidden;
}

/* canvas document tabs (one per open layout) — the canvas pane's title bar */
.ld-canvas-tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  min-height: 33px;
  padding: 3px 6px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
  flex-shrink: 0;
}

.ld-canvas-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  padding: 4px 6px 4px 11px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 5px 5px 0 0;
  cursor: pointer;
  white-space: nowrap;
}

.ld-canvas-tab:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.ld-canvas-tab.active {
  color: var(--vp-c-text-1);
  background: var(--c-carbon-bg-dark);
  border-color: var(--vp-c-divider);
}

.ld-canvas-tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* dragging a tab to reorder */
.ld-canvas-tab.dragging {
  opacity: 0.45;
}
.ld-canvas-tab.dragover {
  box-shadow: inset 2px 0 0 var(--c-carbon-1);
}

/* inline rename field */
.ld-canvas-tab-edit {
  width: 116px;
  min-width: 60px;
  padding: 1px 4px;
  font: inherit;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--c-carbon-1);
  border-radius: 3px;
  outline: none;
}
.ld-canvas-tab-edit.conflict {
  border-color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}


.ld-canvas-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px;
  border-radius: 3px;
  color: var(--vp-c-text-3);
  opacity: 0.65;
}

.ld-canvas-tab-close:hover {
  opacity: 1;
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}

.ld-canvas-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

/* empty state when no tab is open */
.ld-canvas-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto; /* scroll rather than clip the card top on a short stage */
}

.ld-canvas-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 360px;
  text-align: center;
}

.ld-canvas-empty-icon {
  color: var(--vp-c-text-3);
  opacity: 0.7;
}

.ld-canvas-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.ld-canvas-empty-sub {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.ld-canvas-empty-new {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.ld-canvas-empty-saved {
  margin-top: 14px;
  width: 100%;
}

.ld-canvas-empty-saved-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
  margin-bottom: 6px;
}

.ld-canvas-empty-saved-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 180px;
  overflow-y: auto;
}

.ld-canvas-empty-saved-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
}

.ld-canvas-empty-saved-item:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
}

.ld-btn.primary {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  background: var(--c-carbon-1);
  border: 1px solid var(--c-carbon-1);
  color: #fff;
}

.ld-btn.primary:hover {
  background: var(--c-carbon-3);
}
</style>
