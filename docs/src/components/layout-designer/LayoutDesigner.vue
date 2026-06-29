<script setup lang="ts">
import { useEventListener, useStorage } from '@vueuse/core'
import { Check, ChevronRight, Clipboard, ClipboardPaste, Folder, FolderInput, FolderOpen, HelpCircle, Lock, Pencil, Plus, Redo2, RotateCcw, Trash2, Undo2, X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import ContextMenu from './ContextMenu.vue'
import DockNode from './DockNode.vue'
import InfoTip from './InfoTip.vue'
import LivePreviewControls from './LivePreviewControls.vue'
import { PANE_TITLES, leavesOf, locate, type DockSide, type PaneId } from './dockTree'
import { ASPECT_PRESETS, CLIENT_PANELS, type AspectPreset, type ClientPanel } from './types'
import { useDesigner } from './useDesigner'
import { useDock } from './useDock'
import { useScreenShare } from './useScreenShare'
import { useDockDrag } from './useDockDrag'

const {
  canvas,
  gridSize,
  constrain,
  setCanvas,
  init,
  selectedIds,
  removeSelected,
  duplicateSelected,
  nudge,
  undo,
  redo,
  canUndo,
  canRedo,
  layouts,
  currentLayoutId,
  openTabLayouts,
  recentLayouts,
  closeAllTabs,
  newLayout,
  switchLayout,
  renameLayout,
  setLayoutFolder,
  deleteLayout,
  exportClipboard,
  importClipboard,
} = useDesigner()

function fileCloseAll() {
  closeAllTabs()
  closeFileMenu()
}

const GRID_SIZES = [1, 2, 4, 8, 16, 32]

onMounted(() => {
  // The docs apply a global noise/speckle overlay (body::after, color-dodge) over the page;
  // it must not bleed into the canvas preview. Tag the body so we can suppress it (unscoped
  // <style> below), restored on navigate-away.
  document.body.classList.add('layout-designer-page')
  init()
})
onBeforeUnmount(() => {
  document.body.classList.remove('layout-designer-page')
})

// --- menus (File menu + View menu + Help) ---
const fileMenuOpen = ref(false)
const newFlyoutOpen = ref(false)
const loadFlyoutOpen = ref(false)
const viewMenuOpen = ref(false)
const helpOpen = ref(false)

// Flyouts (New / Load) open on hover. A short close-delay bridges the gap between a row and its
// flyout so moving the mouse diagonally onto the submenu doesn't dismiss it (the timer is cancelled
// the moment the pointer re-enters either the row or the flyout, which is a descendant of the row).
let flyoutTimer: ReturnType<typeof setTimeout> | null = null
function clearFlyoutTimer() {
  if (flyoutTimer) {
    clearTimeout(flyoutTimer)
    flyoutTimer = null
  }
}
function openFlyout(which: 'new' | 'load') {
  clearFlyoutTimer()
  newFlyoutOpen.value = which === 'new'
  loadFlyoutOpen.value = which === 'load'
}
function scheduleFlyoutClose() {
  clearFlyoutTimer()
  flyoutTimer = setTimeout(() => {
    newFlyoutOpen.value = false
    loadFlyoutOpen.value = false
    flyoutTimer = null
  }, 180)
}

function closeFileMenu() {
  clearFlyoutTimer()
  fileMenuOpen.value = false
  newFlyoutOpen.value = false
  loadFlyoutOpen.value = false
}

// File ▸ New presets. Today there's just Empty + Default (the seeded sample); more starters can be
// added here once the tool supports richer UX.
const NEW_PRESETS: { id: 'empty' | 'default'; name: string; hint: string }[] = [
  { id: 'empty', name: 'Empty', hint: 'A blank layout' },
  { id: 'default', name: 'Default', hint: 'The starter sample (panel + title + corner)' },
]
function fileNew(preset: 'empty' | 'default') {
  newLayout(undefined, preset) // auto-named "Layout N"; rename via the pencil
  closeFileMenu()
}
function chooseLayout(id: string) {
  switchLayout(id)
  closeFileMenu()
}
function fileImport() {
  importClipboard()
  closeFileMenu()
}
function fileExport() {
  exportClipboard()
  closeFileMenu()
}
function doRename(id: string, current: string) {
  const name = window.prompt('Rename layout', current)
  if (name !== null && name.trim()) renameLayout(id, name.trim())
}
function doDelete(id: string, name: string) {
  if (window.confirm(`Delete layout "${name}"?`)) deleteLayout(id)
}
// Saved layouts grouped for the Load selector (#10): ungrouped first (no header), then named folders
// alphabetically. Folders are flat (one level) — enough to organise a long list of saved designs.
const groupedLayouts = computed(() => {
  const groups = new Map<string, typeof layouts.value>()
  const ungrouped: typeof layouts.value = []
  for (const l of layouts.value) {
    if (l.folder) groups.set(l.folder, [...(groups.get(l.folder) ?? []), l])
    else ungrouped.push(l)
  }
  const out: { folder: string | null; items: typeof layouts.value }[] = []
  if (ungrouped.length) out.push({ folder: null, items: ungrouped })
  for (const folder of [...groups.keys()].sort((a, b) => a.localeCompare(b))) out.push({ folder, items: groups.get(folder)! })
  return out
})
function doMoveToFolder(id: string, current?: string) {
  const existing = [...new Set(layouts.value.map((l) => l.folder).filter(Boolean))].sort()
  const hint = existing.length ? `Move to folder (existing: ${existing.join(', ')}). Blank to ungroup.` : 'Move to folder — blank to ungroup.'
  const folder = window.prompt(hint, current ?? '')
  if (folder !== null) setLayoutFolder(id, folder)
}

// --- keyboard shortcuts ---
function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (isTyping(e)) return
  const mod = e.ctrlKey || e.metaKey
  const k = e.key.toLowerCase()
  if (mod && k === 'z') {
    e.preventDefault()
    e.shiftKey ? redo() : undo()
    return
  }
  if (mod && k === 'y') {
    e.preventDefault()
    redo()
    return
  }
  if (mod && k === 'd') {
    e.preventDefault()
    duplicateSelected()
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.value.length) {
    e.preventDefault()
    removeSelected()
    return
  }
  if (!selectedIds.value.length) return
  const step = e.shiftKey ? (gridSize.value || 1) * 5 : gridSize.value || 1
  if (e.key === 'ArrowLeft') (e.preventDefault(), nudge(-step, 0))
  else if (e.key === 'ArrowRight') (e.preventDefault(), nudge(step, 0))
  else if (e.key === 'ArrowUp') (e.preventDefault(), nudge(0, step)) // CUI y is up
  else if (e.key === 'ArrowDown') (e.preventDefault(), nudge(0, -step))
})

// close popovers on outside click (capture: canvas elements stopPropagation on pointerdown)
useEventListener(
  window,
  'pointerdown',
  (e: PointerEvent) => {
    const t = e.target as HTMLElement
    if (!t.closest('.ld-file-menu')) closeFileMenu()
    if (!t.closest('.ld-view-menu')) viewMenuOpen.value = false
    if (!t.closest('.ld-help')) helpOpen.value = false
  },
  true
)

// --- pane visibility (the View menu; show/hide each aux pane, persisted) ---
type PaneKey = 'elements' | 'dataSources' | 'inspector' | 'code' | 'debug' | 'screenShare'
// Screen Share is an OPTIONAL pane (added on demand, see addScreenShare) — it only appears in View
// once it's in the dock tree, so the View menu is computed from the current tree.
const VIEW_PANES = computed<{ key: PaneKey; label: string }[]>(() => {
  const list: { key: PaneKey; label: string }[] = [
    { key: 'elements', label: 'Elements' },
    { key: 'dataSources', label: 'Data Sources' },
    { key: 'inspector', label: 'Inspector' },
    { key: 'code', label: 'Code' },
    { key: 'debug', label: 'Debug' },
  ]
  if (leavesOf(tree.value).includes('screenShare')) list.push({ key: 'screenShare', label: 'Screen Share' })
  return list
})
// --- dock workspace (recursive tree of tool panes around the pinned centre canvas) ---
// Since #9 the tree is the single source of truth for what's docked: a pane is "shown" iff it's a
// leaf in the tree. View hides a pane by *removing* it (remembering where it sat) and shows it by
// re-docking there — no parallel visibility flag, so the layout can never reserve empty space for a
// pane that isn't really there (the old "blank hole" when panes were hidden).
const { tree, addPane, closePane, resetTree } = useDock()

const isShown = (key: PaneKey) => leavesOf(tree.value).includes(key)

// Last spot each hidden pane occupied, so re-showing lands it back where it was. Persisted so it
// survives reloads; falls back to a sensible default home when the remembered neighbour is gone.
const hiddenSpots = useStorage<Partial<Record<PaneKey, { target: PaneId; side: DockSide }>>>('carbon-layout-designer:workspace:hiddenSpots', {}, undefined)
const DEFAULT_HOME: Record<PaneKey, { target: PaneId; side: DockSide }> = {
  elements: { target: 'canvas', side: 'left' },
  dataSources: { target: 'canvas', side: 'left' },
  inspector: { target: 'canvas', side: 'right' },
  code: { target: 'canvas', side: 'bottom' },
  debug: { target: 'canvas', side: 'bottom' },
  screenShare: { target: 'canvas', side: 'bottom' },
}

function hidePane(key: PaneKey) {
  const spot = locate(tree.value, key)
  if (spot) hiddenSpots.value[key] = spot
  closePane(key)
}
function showPane(key: PaneKey) {
  const spot = hiddenSpots.value[key]
  if (spot && isShown(spot.target)) addPane(key, spot.target, spot.side)
  if (!isShown(key)) {
    const home = DEFAULT_HOME[key] // canvas is always present, so this always lands
    addPane(key, home.target, home.side)
  }
  delete hiddenSpots.value[key]
}
// Hiding a popped-out pane removes its DockLeaf, which closes the PiP window via usePopout cleanup.
function togglePane(key: PaneKey) {
  if (isShown(key)) hidePane(key)
  else showPane(key)
}

// Reset the whole workspace arrangement: dock tree back to the default layout AND every pane shown
// again (so a stranded pane or an odd post-docking tree is recoverable in one click).
function resetWorkspaceLayout() {
  resetTree()
  hiddenSpots.value = {}
  viewMenuOpen.value = false
}

// --- screen share (issue #7): an opt-in local screen-capture pane, added on demand ---
const { supported: screenShareSupported } = useScreenShare()
/** Add the Screen Share pane to the dock (a bottom tab with Code by default; canvas-bottom if Code is
 *  hidden). No-op if it's already docked. */
function addScreenShare() {
  if (isShown('code')) addPane('screenShare', 'code', 'center')
  else addPane('screenShare', 'canvas', 'bottom')
}
// Let LivePreviewControls (and anyone else) offer the action without reaching into the dock/visibility.
provide('ld-screen-share', { supported: screenShareSupported, add: addScreenShare })

// drag-docking (2b): a floating ghost that follows the cursor while a pane is being dragged
const { dragging: dockDragging, pointer: dockPointer } = useDockDrag()
</script>

<template>
  <div class="ld-root">
    <!-- toolbar -->
    <div class="ld-toolbar">
      <span class="ld-title">Layout Designer</span>

      <!-- File menu (new / load / import / export / recent) -->
      <div class="ld-file-menu">
        <button class="ld-menubar-btn" :class="{ open: fileMenuOpen }" title="File" @click.stop="fileMenuOpen = !fileMenuOpen">File</button>
        <div v-if="fileMenuOpen" class="ld-menu-pop" @pointerdown.stop>
          <!-- New: flyout of starter presets (Empty / Default / …) -->
          <div class="ld-menu-flyout-anchor" @pointerenter="openFlyout('new')" @pointerleave="scheduleFlyoutClose">
            <button class="ld-menu-item" :class="{ active: newFlyoutOpen }">
              <Plus :size="13" /> <span class="ld-menu-name">New</span> <ChevronRight :size="13" />
            </button>
            <div v-if="newFlyoutOpen" class="ld-menu-pop ld-menu-flyout" @pointerdown.stop>
              <button v-for="p in NEW_PRESETS" :key="p.id" class="ld-menu-item" :title="p.hint" @click="fileNew(p.id)">
                <span class="ld-menu-name">{{ p.name }}</span>
              </button>
            </div>
          </div>

          <!-- Load: flyout of every saved layout, grouped into folders (#10); rename / move / delete inline -->
          <div class="ld-menu-flyout-anchor" @pointerenter="openFlyout('load')" @pointerleave="scheduleFlyoutClose">
            <button class="ld-menu-item" :class="{ active: loadFlyoutOpen }">
              <FolderOpen :size="13" /> <span class="ld-menu-name">Load</span> <ChevronRight :size="13" />
            </button>
            <div v-if="loadFlyoutOpen" class="ld-menu-pop ld-menu-flyout" @pointerdown.stop>
              <template v-for="g in groupedLayouts" :key="g.folder ?? '__ungrouped'">
                <div v-if="g.folder" class="ld-menu-section ld-folder-head"><Folder :size="11" /> {{ g.folder }}</div>
                <button
                  v-for="l in g.items"
                  :key="l.id"
                  class="ld-menu-item"
                  :class="{ active: l.id === currentLayoutId, 'ld-in-folder': g.folder }"
                  @click="chooseLayout(l.id)"
                >
                  <span class="ld-menu-name">{{ l.name }}</span>
                  <span class="ld-menu-row-actions">
                    <FolderInput :size="12" title="Move to folder" @click.stop="doMoveToFolder(l.id, l.folder)" />
                    <Pencil :size="12" title="Rename" @click.stop="doRename(l.id, l.name)" />
                    <Trash2 :size="12" title="Delete" @click.stop="doDelete(l.id, l.name)" />
                  </span>
                </button>
              </template>
              <div v-if="!layouts.length" class="ld-menu-section">No saved layouts yet.</div>
            </div>
          </div>

          <div class="ld-menu-sep" />
          <button class="ld-menu-item" title="Accepts a designer export or raw CUI JSON from a plugin's CuiElementContainer.ToJson()" @click="fileImport"><ClipboardPaste :size="13" /> Import from clipboard</button>
          <button class="ld-menu-item" @click="fileExport"><Clipboard :size="13" /> Export to clipboard</button>

          <div class="ld-menu-sep" />
          <button class="ld-menu-item" :disabled="!openTabLayouts.length" title="Close all open layout tabs (the layouts are kept)" @click="fileCloseAll"><X :size="13" /> Close All</button>

          <template v-if="recentLayouts.length">
            <div class="ld-menu-sep" />
            <div class="ld-menu-section">Recent</div>
            <button v-for="(l, i) in recentLayouts" :key="l.id" class="ld-menu-item" @click="chooseLayout(l.id)">
              <span class="ld-menu-recent-idx">{{ i + 1 }}</span>
              <span class="ld-menu-name">{{ l.name }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- View menu (show / hide each aux pane) -->
      <div class="ld-view-menu">
        <button class="ld-menubar-btn" :class="{ open: viewMenuOpen }" title="View" @click.stop="viewMenuOpen = !viewMenuOpen">View</button>
        <div v-if="viewMenuOpen" class="ld-menu-pop" @pointerdown.stop>
          <button v-for="p in VIEW_PANES" :key="p.key" class="ld-menu-item ld-menu-check" @click="togglePane(p.key)">
            <Check v-if="isShown(p.key)" :size="13" class="ld-check-on" />
            <span v-else class="ld-check-spacer" />
            <span class="ld-menu-name">{{ p.label }}</span>
          </button>
          <div class="ld-menu-sep" />
          <button class="ld-menu-item" title="Restore the default pane arrangement and show every pane" @click="resetWorkspaceLayout">
            <RotateCcw :size="13" /> <span class="ld-menu-name">Reset Layout</span>
          </button>
        </div>
      </div>

      <button class="ld-icon-btn" :disabled="!canUndo" title="Undo (Ctrl+Z)" @click="undo"><Undo2 :size="15" /></button>
      <button class="ld-icon-btn" :disabled="!canRedo" title="Redo (Ctrl+Shift+Z)" @click="redo"><Redo2 :size="15" /></button>

      <LivePreviewControls />

      <div class="ld-spacer" />

      <div class="ld-tool-field">
        <span>Aspect</span>
        <div class="ld-segmented ld-collapsible" role="group" aria-label="Aspect ratio">
          <button
            v-for="a in ASPECT_PRESETS"
            :key="a"
            :class="{ active: canvas.aspect === a }"
            :title="`Preview at ${a}`"
            @click="setCanvas({ aspect: a })"
          >
            {{ a }}
          </button>
        </div>
        <!-- collapsed form when the toolbar is narrow (see media query below) -->
        <select
          class="ld-collapsed-select"
          :value="canvas.aspect"
          title="Preview aspect ratio"
          @change="setCanvas({ aspect: ($event.target as HTMLSelectElement).value as AspectPreset })"
        >
          <option v-for="a in ASPECT_PRESETS" :key="a" :value="a">{{ a }}</option>
        </select>
        <InfoTip text="The screen shape to preview. Switching it shows how the layout responds: relative (anchored/stretched) elements reflow, while fixed-px elements keep their reference size." />
      </div>

      <label class="ld-tool-field">
        <span>Ref. height</span>
        <input
          type="number"
          min="120"
          step="10"
          :value="canvas.referenceHeight"
          title="Reference-resolution height in pixels — scales Rust's fixed 1280×720 (16:9) reference. The canvas dimensions per aspect follow Rust's Expand scaler."
          @change="setCanvas({ referenceHeight: Math.max(120, Number(($event.target as HTMLInputElement).value) || 720) })"
        />
        <InfoTip text="Rust's CUI reference resolution is 1280×720 (16:9) and scales in Expand mode — it pins whichever screen dimension is more constrained (width below 16:9, height above) and lets the other grow. This sets the reference height (720); width is height × 16/9. All offset pixels are measured in the resulting space." />
      </label>

      <label class="ld-tool-field">
        <span>Layer</span>
        <select
          :value="canvas.rootLayer"
          title="Rust client UI layer the root attaches to"
          @change="setCanvas({ rootLayer: ($event.target as HTMLSelectElement).value as ClientPanel })"
        >
          <option v-for="p in CLIENT_PANELS" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
        <InfoTip text="The Rust client UI layer the root of your layout attaches to. Oxide parents root elements to this layer string; Carbon emits cui.v2.CreateParent(CUI.ClientPanels.X). Overlay is the standard full-screen menu layer." />
      </label>

      <label class="ld-tool-field">
        <span>Grid</span>
        <select
          :value="gridSize"
          title="Snap grid in pixels. Drag/resize land on multiples — keeps values clean (no fractions)."
          @change="gridSize = Number(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="g in GRID_SIZES" :key="g" :value="g">{{ g }}px</option>
        </select>
        <InfoTip text="Snap grid in reference pixels. Dragging and resizing land on multiples of this, so offsets stay whole numbers. Use 1px for fine control." />
      </label>

      <button
        class="ld-btn"
        :class="{ toggled: constrain }"
        :title="constrain ? 'Bounds on: elements stay inside their parent' : 'Bounds off: elements may overflow'"
        @click="constrain = !constrain"
      >
        <Lock :size="14" /> Bounds
      </button>
      <InfoTip text="When on, elements can't be dragged or resized outside their parent, and root panels stay within the canvas." />


      <div class="ld-help">
        <button class="ld-icon-btn" title="Shortcuts & help" @click.stop="helpOpen = !helpOpen"><HelpCircle :size="16" /></button>
        <div v-if="helpOpen" class="ld-help-pop" @pointerdown.stop>
          <div class="ld-help-title">Shortcuts</div>
          <ul>
            <li><b>Drag</b> a box to move · <b>drag a handle</b> to resize</li>
            <li><b>Alt + resize</b> — resize from the center (mirror)</li>
            <li><b>Shift / Ctrl + click</b> — add to selection</li>
            <li><b>Drag a selection</b> — move all · <b>arrow keys</b> nudge (Shift = ×5)</li>
            <li><b>Right-click</b> — element menu (front/back, duplicate, nest…)</li>
            <li><b>Ctrl+Z / Ctrl+Shift+Z</b> — undo / redo</li>
            <li><b>Ctrl+D</b> duplicate · <b>Delete</b> remove</li>
          </ul>
          <div class="ld-help-note">Snapping: boxes snap to the grid and to the edges/centers of the parent and sibling elements (magenta guides).</div>
        </div>
      </div>
    </div>

    <!-- body: recursive dock tree (tool panes around the pinned centre canvas) -->
    <div class="ld-body">
      <DockNode :node="tree" />
    </div>

    <!-- drag-docking ghost: a label that tracks the cursor while a pane is dragged -->
    <Teleport to="body">
      <div v-if="dockDragging" class="ld-dock-ghost" :style="{ left: dockPointer.x + 14 + 'px', top: dockPointer.y + 14 + 'px' }">
        {{ PANE_TITLES[dockDragging] }}
      </div>
    </Teleport>

    <ContextMenu />
  </div>
</template>

<style scoped>
.ld-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--vp-nav-height));
  background: var(--c-carbon-bg-dark);
  color: var(--vp-c-text-1);
  font-size: 14px;
}

/* toolbar */
.ld-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* below the collapse breakpoint, controls wrap as whole units to a 2nd row */
  gap: 8px 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

/* keep control labels on one line — let whole controls wrap instead of their text */
.ld-btn,
.ld-tool-field,
.ld-tool-field span {
  white-space: nowrap;
}

.ld-title {
  font-weight: 700;
  font-size: 15px;
}

.ld-spacer {
  flex: 1;
}

.ld-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.ld-btn:hover {
  border-color: var(--c-carbon-1);
}

.ld-btn.primary {
  background: var(--c-carbon-1);
  border-color: var(--c-carbon-1);
  color: #fff;
}

.ld-btn.toggled {
  background: var(--c-carbon-soft);
  border-color: var(--c-carbon-1);
  color: var(--c-carbon-1);
}

.ld-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
}

.ld-icon-btn:hover:not(:disabled) {
  border-color: var(--c-carbon-1);
  color: var(--vp-c-text-1);
}

.ld-icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* dropdown menus (layouts) */
.ld-file-menu,
.ld-view-menu,
.ld-help {
  position: relative;
  display: inline-flex;
}

/* View menu: checkable pane toggles (Check icon when shown, spacer keeps labels aligned) */
.ld-menu-check {
  gap: 7px;
}

.ld-check-spacer {
  display: inline-block;
  width: 13px;
}

.ld-check-on {
  color: var(--c-carbon-1);
}

/* menu-bar style trigger (File / View) — borderless text, distinct from the bordered .ld-btn */
.ld-menubar-btn {
  padding: 5px 10px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 4px;
  color: var(--vp-c-text-1);
}

.ld-menubar-btn:hover,
.ld-menubar-btn.open {
  background: var(--c-carbon-soft);
}

/* a File-menu row that opens a side flyout (New / Load) */
.ld-menu-flyout-anchor {
  position: relative;
}

/* two classes → outranks the base .ld-menu-pop (top:100%/left:0) regardless of source order,
   so the flyout sits to the right of its row instead of dropping below it */
.ld-menu-pop.ld-menu-flyout {
  top: -6px;
  left: calc(100% + 3px);
  min-width: 200px;
}

.ld-menu-section {
  padding: 5px 9px 3px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

/* folder grouping in the Load selector (#10) */
.ld-folder-head {
  display: flex;
  align-items: center;
  gap: 5px;
  text-transform: none;
  letter-spacing: 0;
  color: var(--vp-c-text-2);
}

.ld-menu-item.ld-in-folder {
  padding-left: 22px; /* nest layouts under their folder header */
}

.ld-menu-recent-idx {
  width: 13px;
  text-align: right;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.ld-menu-item:disabled {
  opacity: 0.4;
  cursor: default;
}

.ld-menu-item:disabled:hover {
  background: none;
}

.ld-menu-pop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 80;
  min-width: 220px;
  padding: 5px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5);
}

.ld-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 9px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  border-radius: 4px;
  text-align: left;
}

.ld-menu-item:hover {
  background: var(--c-carbon-soft);
}

.ld-menu-item.active {
  color: var(--c-carbon-1);
}

.ld-menu-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ld-menu-row-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  color: var(--vp-c-text-3);
}

.ld-menu-item:hover .ld-menu-row-actions {
  opacity: 1;
}

.ld-menu-row-actions :deep(svg):hover {
  color: var(--c-carbon-1);
}

.ld-menu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--vp-c-divider);
}

/* help popover */
.ld-help-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 80;
  width: 320px;
  padding: 12px 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5);
  font-size: 12.5px;
  line-height: 1.5;
}

.ld-help-title {
  font-weight: 700;
  margin-bottom: 6px;
}

.ld-help-pop ul {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--vp-c-text-2);
}

.ld-help-pop b {
  color: var(--vp-c-text-1);
}

.ld-help-note {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

.ld-btn.primary:hover {
  background: var(--c-carbon-3);
}

/* add-element button + its type menu anchor */
.ld-add-menu {
  position: relative;
  display: inline-flex;
}

.ld-tool-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ld-tool-field select,
.ld-tool-field input {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 4px 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.ld-tool-field input {
  width: 72px;
}

.ld-segmented {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}

.ld-segmented button {
  padding: 5px 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-divider);
}

.ld-segmented button:last-child {
  border-right: none;
}

.ld-segmented button.active {
  background: var(--c-carbon-1);
  color: #fff;
}

/* Responsive: the Aspect and Target segmented controls need ~1642px of toolbar; below that they
   collapse into compact <select> dropdowns so the toolbar stays a single row down to ~1349px. */
.ld-collapsed-select,
.ld-collapsed-label {
  display: none;
}

@media (max-width: 1660px) {
  .ld-collapsible {
    display: none;
  }
  .ld-collapsed-select {
    display: inline-block;
  }
  .ld-collapsed-label {
    display: inline;
  }
}

/* body */
.ld-body {
  display: flex;
  flex: 1;
  min-height: 0;
  /* escape valve when fixed columns + min-width canvas exceed the viewport (narrow screens) */
  overflow-x: auto;
}

/* floating drag-docking ghost (teleported to body, so it rides above everything) */
.ld-dock-ghost {
  position: fixed;
  z-index: 3000;
  pointer-events: none;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--c-carbon-1);
  border-radius: 4px;
  box-shadow: 0 4px 14px rgb(0 0 0 / 35%);
}

</style>

<!-- Unscoped: suppress the docs' global noise/speckle overlay while the designer is open so
     the canvas preview shows the solid colors that Rust actually renders. -->
<style>
body.layout-designer-page::after {
  display: none !important;
}

/* The designer fills the viewport (`.ld-root` = 100vh - nav), so the site footer below it would push
   a scrollbar. Hide it on this full-bleed tool page; the class is removed on navigate-away. */
body.layout-designer-page .VPFooter {
  display: none;
}
</style>
