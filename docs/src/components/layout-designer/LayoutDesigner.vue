<script setup lang="ts">
import { useEventListener, useStorage } from '@vueuse/core'
import { Check, ChevronDown, ChevronRight, Clipboard, ClipboardPaste, FolderOpen, HelpCircle, LayoutDashboard, Lock, Pencil, PictureInPicture2, Plus, Redo2, Trash2, Undo2, X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePopout } from './usePopout'
import ContextMenu from './ContextMenu.vue'
import DataSourcePanel from './DataSourcePanel.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import ElementTree from './ElementTree.vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import InfoTip from './InfoTip.vue'
import InspectorPanel from './InspectorPanel.vue'
import { ASPECT_PRESETS, CLIENT_PANELS, type AspectPreset, type ClientPanel, type ElementType } from './types'
import CodeDock from './CodeDock.vue'
import LivePreviewControls from './LivePreviewControls.vue'
import { useDesigner } from './useDesigner'

const {
  canvas,
  gridSize,
  constrain,
  addElement,
  setCanvas,
  init,
  selectedIds,
  removeSelected,
  duplicateSelected,
  addDataSource,
  nudge,
  undo,
  redo,
  canUndo,
  canRedo,
  layouts,
  currentLayoutId,
  openTabLayouts,
  closeTab,
  closeAllTabs,
  newLayout,
  switchLayout,
  renameLayout,
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

// --- add-element picker (single button → type menu; picking a type IS the add) ---
const addMenuOpen = ref(false)
function onAddRoot(type: ElementType) {
  addElement(type, null)
  addMenuOpen.value = false
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

// --- recent layouts (most-recently-opened quick-load list at the bottom of File) ---
const RECENT_MAX = 6
const recentIds = useStorage<string[]>('carbon-layout-designer:workspace:recent', [])
watch(
  currentLayoutId,
  (id) => {
    if (!id) return
    recentIds.value = [id, ...recentIds.value.filter((x) => x !== id)].slice(0, 20)
  },
  { immediate: true }
)
// most-recent-first, excluding the layout already open and any that were since deleted
const recentLayouts = computed(() => {
  const out: { id: string; name: string }[] = []
  for (const id of recentIds.value) {
    if (id === currentLayoutId.value) continue
    const l = layouts.value.find((x) => x.id === id)
    if (l) out.push({ id: l.id, name: l.name })
    if (out.length >= RECENT_MAX) break
  }
  return out
})

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
    if (!t.closest('.ld-arrange-menu')) arrangeMenuOpen.value = false
    if (!t.closest('.ld-help')) helpOpen.value = false
    if (!t.closest('.ld-add-menu')) addMenuOpen.value = false
  },
  true
)

// --- resizable panels (persisted to localStorage so the workspace sticks) ---
const leftWidth = useStorage('carbon-layout-designer:workspace:leftWidth', 230)
const rightWidth = useStorage('carbon-layout-designer:workspace:rightWidth', 300)
const bottomHeight = useStorage('carbon-layout-designer:workspace:bottomHeight', 220)
const bottomCollapsed = useStorage('carbon-layout-designer:workspace:bottomCollapsed', false)
// Height of the Data Sources section split off the bottom of the Elements pane (the tree takes the rest).
const dsHeight = useStorage('carbon-layout-designer:workspace:dsHeight', 170)

// `sign` flips drag direction when a column is moved to the opposite side (Inspector-left preset),
// so dragging a divider always grows the pane it borders.
let resize: { type: 'left' | 'right' | 'code' | 'bottom' | 'ds'; start: number; origin: number; sign: number } | null = null

function startLeftResize(e: PointerEvent) {
  resize = { type: 'left', start: leftWidth.value, origin: e.clientX, sign: isInspectorLeft.value ? -1 : 1 }
  e.preventDefault()
}
function startRightResize(e: PointerEvent) {
  resize = { type: 'right', start: rightWidth.value, origin: e.clientX, sign: isInspectorLeft.value ? 1 : -1 }
  e.preventDefault()
}
function startCodeColResize(e: PointerEvent) {
  resize = { type: 'code', start: codeColWidth.value, origin: e.clientX, sign: -1 }
  e.preventDefault()
}
function startBottomResize(e: PointerEvent) {
  if (bottomCollapsed.value) return
  resize = { type: 'bottom', start: bottomHeight.value, origin: e.clientY, sign: -1 }
  e.preventDefault()
}
function startDsResize(e: PointerEvent) {
  // Data Sources sits below the element tree; dragging the divider up grows it (sign -1).
  resize = { type: 'ds', start: dsHeight.value, origin: e.clientY, sign: -1 }
  e.preventDefault()
}

useEventListener(window, 'pointermove', (e: PointerEvent) => {
  if (!resize) return
  const r = resize
  if (r.type === 'bottom') {
    bottomHeight.value = Math.min(560, Math.max(120, r.start + r.sign * (e.clientY - r.origin)))
    return
  }
  if (r.type === 'ds') {
    dsHeight.value = Math.min(420, Math.max(90, r.start + r.sign * (e.clientY - r.origin)))
    return
  }
  const next = r.start + r.sign * (e.clientX - r.origin)
  if (r.type === 'left') leftWidth.value = Math.min(420, Math.max(180, next))
  else if (r.type === 'right') rightWidth.value = Math.min(620, Math.max(240, next))
  else codeColWidth.value = Math.min(680, Math.max(260, next))
})
useEventListener(window, 'pointerup', () => {
  resize = null
})

// --- pop-out panes (Document Picture-in-Picture; Chromium-only) ---
const elementsPop = usePopout(() => 'Elements', { width: 320, height: 640 })
const dataSourcesPop = usePopout(() => 'Data Sources', { width: 320, height: 420 })
const inspectorPop = usePopout(() => 'Inspector', { width: 360, height: 700 })

// --- pane visibility (the View menu; show/hide each aux pane, persisted) ---
type PaneKey = 'elements' | 'dataSources' | 'inspector' | 'code' | 'debug'
const VIEW_PANES: { key: PaneKey; label: string }[] = [
  { key: 'elements', label: 'Elements' },
  { key: 'dataSources', label: 'Data Sources' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'code', label: 'Code' },
  { key: 'debug', label: 'Debug' },
]
const paneVisible = useStorage<Record<PaneKey, boolean>>(
  'carbon-layout-designer:workspace:paneVisible',
  { elements: true, dataSources: true, inspector: true, code: true, debug: true },
  undefined, // let vueuse pick its SSR-safe default storage (this page is server-rendered at build time)
  { mergeDefaults: true } // a newly-added pane (e.g. Debug) picks up its default for existing users
)
// the left column only exists while at least one of its stacked panes is shown
const leftColVisible = computed(() => paneVisible.value.elements || paneVisible.value.dataSources)
// the Code/Debug dock exists while either of its panes is shown
const codeDockVisible = computed(() => paneVisible.value.code || paneVisible.value.debug)
function togglePane(key: PaneKey) {
  const next = !paneVisible.value[key]
  paneVisible.value[key] = next
  if (!next) {
    // hiding a popped-out pane would otherwise leave an orphaned PiP window — bring it back first
    if (key === 'elements') elementsPop.close()
    else if (key === 'dataSources') dataSourcesPop.close()
    else if (key === 'inspector') inspectorPop.close()
  }
}

// --- workspace arrangement (preset pane layouts, persisted) ---
type Arrangement = 'default' | 'inspector-left' | 'code-right'
const ARRANGEMENTS: { id: Arrangement; name: string }[] = [
  { id: 'default', name: 'Default' },
  { id: 'inspector-left', name: 'Inspector left' },
  { id: 'code-right', name: 'Code side-panel' },
]
const arrangement = useStorage<Arrangement>('carbon-layout-designer:workspace:arrangement', 'default')
const arrangeMenuOpen = ref(false)
const isInspectorLeft = computed(() => arrangement.value === 'inspector-left')
const codeSide = computed(() => arrangement.value === 'code-right')
const currentArrangementName = computed(() => ARRANGEMENTS.find((a) => a.id === arrangement.value)?.name ?? 'Default')
const codeColWidth = useStorage('carbon-layout-designer:workspace:codeColWidth', 380)

// flex `order` for each body child — swaps the Elements/Inspector columns for the "Inspector left"
// preset while each pane's resize divider stays bound to its own width var.
const bodyOrder = computed(() => {
  const swap = isInspectorLeft.value
  return {
    elements: swap ? 40 : 0,
    elementsDiv: swap ? 30 : 10,
    center: 20,
    inspectorDiv: swap ? 10 : 30,
    inspector: swap ? 0 : 40,
  }
})

function chooseArrangement(id: Arrangement) {
  arrangement.value = id
  arrangeMenuOpen.value = false
}
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

          <!-- Load: flyout of every saved layout (rename / delete inline) -->
          <div class="ld-menu-flyout-anchor" @pointerenter="openFlyout('load')" @pointerleave="scheduleFlyoutClose">
            <button class="ld-menu-item" :class="{ active: loadFlyoutOpen }">
              <FolderOpen :size="13" /> <span class="ld-menu-name">Load</span> <ChevronRight :size="13" />
            </button>
            <div v-if="loadFlyoutOpen" class="ld-menu-pop ld-menu-flyout" @pointerdown.stop>
              <button
                v-for="l in layouts"
                :key="l.id"
                class="ld-menu-item"
                :class="{ active: l.id === currentLayoutId }"
                @click="chooseLayout(l.id)"
              >
                <span class="ld-menu-name">{{ l.name }}</span>
                <span class="ld-menu-row-actions">
                  <Pencil :size="12" title="Rename" @click.stop="doRename(l.id, l.name)" />
                  <Trash2 :size="12" title="Delete" @click.stop="doDelete(l.id, l.name)" />
                </span>
              </button>
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
            <Check v-if="paneVisible[p.key]" :size="13" class="ld-check-on" />
            <span v-else class="ld-check-spacer" />
            <span class="ld-menu-name">{{ p.label }}</span>
          </button>
        </div>
      </div>

      <!-- workspace arrangement (pane layout presets — distinct from the saved CUI "Layouts" above) -->
      <div class="ld-arrange-menu">
        <button class="ld-btn" title="Arrange panes" @click.stop="arrangeMenuOpen = !arrangeMenuOpen">
          <LayoutDashboard :size="14" /> {{ currentArrangementName }} <ChevronDown :size="13" />
        </button>
        <div v-if="arrangeMenuOpen" class="ld-menu-pop" @pointerdown.stop>
          <button v-for="a in ARRANGEMENTS" :key="a.id" class="ld-menu-item" :class="{ active: a.id === arrangement }" @click="chooseArrangement(a.id)">
            <span class="ld-menu-name">{{ a.name }}</span>
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
          title="Reference resolution height in pixels — the space offsets are measured in. Width is derived from the aspect ratio."
          @change="setCanvas({ referenceHeight: Math.max(120, Number(($event.target as HTMLInputElement).value) || 720) })"
        />
        <InfoTip text="The reference resolution height (Rust uses 720). All offset pixel values are measured in this space, and the width is derived from the chosen aspect ratio." />
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

    <!-- body -->
    <div class="ld-body">
      <!-- left column: two independent panes (Elements, Data Sources), each pop-out-able -->
      <div v-if="leftColVisible" class="ld-left-col" :style="{ width: `${leftWidth}px`, order: bodyOrder.elements }">
        <!-- Elements -->
        <aside v-if="paneVisible.elements" class="ld-pane ld-pane-grow" :class="{ 'ld-pane-popped-v': elementsPop.pipTarget.value }">
          <Teleport :to="elementsPop.pipTarget.value" :disabled="!elementsPop.pipTarget.value">
            <div class="ld-pane-inner">
              <div class="ld-panel-head">
                <span>Elements</span>
                <div class="ld-panel-head-actions">
                  <!-- add-element lives here (not the toolbar) → one type menu; picking a type adds it -->
                  <div class="ld-add-menu">
                    <button class="ld-add-head-btn" title="Add an element to the root canvas" @click.stop="addMenuOpen = !addMenuOpen">
                      <Plus :size="13" /> Add <ChevronDown :size="11" />
                    </button>
                    <ElementTypeMenu v-if="addMenuOpen" placement="below-right" @pick="onAddRoot" />
                  </div>
                  <button
                    v-if="elementsPop.supported"
                    class="ld-pane-pop-btn"
                    :title="elementsPop.pipTarget.value ? 'Pop back in' : 'Pop out into its own window'"
                    @click="elementsPop.toggle()"
                  >
                    <component :is="elementsPop.pipTarget.value ? X : PictureInPicture2" :size="14" />
                  </button>
                </div>
              </div>
              <div class="ld-tree-wrap">
                <ElementTree />
              </div>
            </div>
          </Teleport>
          <button v-if="elementsPop.pipTarget.value" class="ld-pane-restore-h" title="Bring Elements back" @click="elementsPop.close()">
            <PictureInPicture2 :size="14" />
            <span>Elements</span>
          </button>
        </aside>

        <div v-if="paneVisible.elements && paneVisible.dataSources && !elementsPop.pipTarget.value && !dataSourcesPop.pipTarget.value" class="ld-divider-h" title="Drag to resize Data Sources" @pointerdown="startDsResize" />

        <!-- Data Sources (its own pane, not part of Elements) -->
        <aside v-if="paneVisible.dataSources" class="ld-pane ld-ds-pane" :class="{ 'ld-pane-popped-v': dataSourcesPop.pipTarget.value }" :style="dataSourcesPop.pipTarget.value ? undefined : { height: `${dsHeight}px` }">
          <Teleport :to="dataSourcesPop.pipTarget.value" :disabled="!dataSourcesPop.pipTarget.value">
            <div class="ld-pane-inner">
              <div class="ld-panel-head">
                <span>Data Sources <InfoTip text="Named static values your elements can bind to. In the generated Class they become fields; everywhere else (UX/JSON/preview) the value is inlined. Edit one and every bound element updates." /></span>
                <div class="ld-panel-head-actions">
                  <button class="ld-add-head-btn" title="Add a text data source" @click="addDataSource('text')">
                    <Plus :size="13" /> Add
                  </button>
                  <button
                    v-if="dataSourcesPop.supported"
                    class="ld-pane-pop-btn"
                    :title="dataSourcesPop.pipTarget.value ? 'Pop back in' : 'Pop out into its own window'"
                    @click="dataSourcesPop.toggle()"
                  >
                    <component :is="dataSourcesPop.pipTarget.value ? X : PictureInPicture2" :size="14" />
                  </button>
                </div>
              </div>
              <DataSourcePanel />
            </div>
          </Teleport>
          <button v-if="dataSourcesPop.pipTarget.value" class="ld-pane-restore-h" title="Bring Data Sources back" @click="dataSourcesPop.close()">
            <PictureInPicture2 :size="14" />
            <span>Data Sources</span>
          </button>
        </aside>
      </div>

      <div v-if="leftColVisible && !(elementsPop.pipTarget.value && dataSourcesPop.pipTarget.value)" class="ld-divider-v" title="Drag to resize" :style="{ order: bodyOrder.elementsDiv }" @pointerdown="startLeftResize" />

      <main class="ld-center" :style="{ order: bodyOrder.center }">
        <!-- canvas pane title bar = document tabs (each open layout); closing a tab keeps the layout -->
        <div v-if="currentLayoutId" class="ld-canvas-tabs" role="tablist">
          <div
            v-for="t in openTabLayouts"
            :key="t.id"
            class="ld-canvas-tab"
            :class="{ active: t.id === currentLayoutId }"
            role="tab"
            :title="t.name"
            @click="switchLayout(t.id)"
            @mousedown.middle.prevent
            @mouseup.middle="closeTab(t.id)"
          >
            <span class="ld-canvas-tab-name">{{ t.name }}</span>
            <button class="ld-canvas-tab-close" title="Close tab (keeps the layout)" @click.stop="closeTab(t.id)"><X :size="12" /></button>
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
      </main>

      <div v-if="paneVisible.inspector && !inspectorPop.pipTarget.value" class="ld-divider-v" title="Drag to resize" :style="{ order: bodyOrder.inspectorDiv }" @pointerdown="startRightResize" />

      <aside v-if="paneVisible.inspector" class="ld-right" :class="{ 'ld-pane-popped': inspectorPop.pipTarget.value }" :style="{ width: inspectorPop.pipTarget.value ? undefined : `${rightWidth}px`, order: bodyOrder.inspector }">
        <Teleport :to="inspectorPop.pipTarget.value" :disabled="!inspectorPop.pipTarget.value">
          <div class="ld-pane-inner">
            <div class="ld-panel-head">
              <span>Inspector</span>
              <button
                v-if="inspectorPop.supported"
                class="ld-pane-pop-btn"
                :title="inspectorPop.pipTarget.value ? 'Pop back in' : 'Pop out into its own window'"
                @click="inspectorPop.toggle()"
              >
                <component :is="inspectorPop.pipTarget.value ? X : PictureInPicture2" :size="14" />
              </button>
            </div>
            <div class="ld-right-scroll">
              <InspectorPanel />
            </div>
          </div>
        </Teleport>
        <button v-if="inspectorPop.pipTarget.value" class="ld-pane-restore" title="Bring Inspector back" @click="inspectorPop.close()">
          <PictureInPicture2 :size="15" />
          <span class="ld-pane-restore-label">Inspector</span>
        </button>
      </aside>

      <!-- code as a right-hand column (the "Code side-panel" arrangement; bottom dock is hidden then) -->
      <template v-if="codeSide && codeDockVisible">
        <div class="ld-divider-v" title="Drag to resize" :style="{ order: 50 }" @pointerdown="startCodeColResize" />
        <aside class="ld-code-col" :style="{ width: `${codeColWidth}px`, order: 60 }">
          <CodeDock :show-code="paneVisible.code" :show-debug="paneVisible.debug" />
        </aside>
      </template>
    </div>

    <!-- Code/Debug dock (resizable / collapsible) — hidden when code is shown as a side panel -->
    <div v-if="!codeSide && codeDockVisible" class="ld-dock" :class="{ collapsed: bottomCollapsed }">
      <div class="ld-dock-grip" :class="{ resizable: !bottomCollapsed }" @pointerdown="startBottomResize">
        <span class="ld-grip-lines" aria-hidden="true" />
        <span v-if="bottomCollapsed" class="ld-dock-title">Code</span>
        <button
          class="ld-dock-toggle"
          :title="bottomCollapsed ? 'Expand' : 'Collapse'"
          @pointerdown.stop
          @click="bottomCollapsed = !bottomCollapsed"
        >
          <ChevronDown :size="15" :style="{ transform: bottomCollapsed ? 'rotate(180deg)' : 'none' }" />
        </button>
      </div>
      <div v-show="!bottomCollapsed" class="ld-dock-body" :style="{ height: `${bottomHeight}px` }">
        <CodeDock :show-code="paneVisible.code" :show-debug="paneVisible.debug" />
      </div>
    </div>

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
.ld-arrange-menu,
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

/* left column holds the Elements and Data Sources panes stacked vertically */
.ld-left-col {
  width: 230px;
  flex-shrink: 0;
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* a stacked pane in the left column */
.ld-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* the pane that absorbs the column's free space (Elements); keeps a floor so a tall Data Sources
   pane on a short viewport can't crush it away entirely */
.ld-pane-grow {
  flex: 1 1 auto;
  min-height: 64px;
}

.ld-center {
  flex: 1;
  /* keep the canvas usable; if the fixed-width side columns can't all fit, the body scrolls
     horizontally rather than crushing the canvas to nothing (e.g. Code-side-panel on a narrow window) */
  min-width: 240px;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.ld-divider-v {
  width: 5px;
  flex-shrink: 0;
  cursor: col-resize;
  background: var(--vp-c-divider);
  transition: background 0.12s;
}

.ld-divider-v:hover {
  background: var(--c-carbon-1);
}

/* Elements pane is split: the tree takes the free space, Data Sources a resizable strip below it. */
.ld-tree-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

/* Data Sources pane: its inline height is the preferred size, but it may shrink (its list scrolls)
   when the column is short so the Elements pane keeps its floor. */
.ld-ds-pane {
  flex: 0 1 auto;
  min-height: 0;
}

.ld-divider-h {
  height: 5px;
  flex-shrink: 0;
  cursor: row-resize;
  background: var(--vp-c-divider);
  transition: background 0.12s;
}

.ld-divider-h:hover {
  background: var(--c-carbon-1);
}

.ld-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ld-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px 5px 12px;
  min-height: 33px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

/* "Add element" button that now lives in the Elements panel header */
.ld-add-head-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: #fff;
  background: var(--c-carbon-1);
  border-radius: 4px;
}

.ld-add-head-btn:hover {
  background: var(--c-carbon-3);
}

.ld-right-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* --- pop-out panes --- */
/* the content that gets teleported into a PiP window; fills its container in both places */
.ld-pane-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.ld-panel-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ld-pane-pop-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 4px;
  color: var(--vp-c-text-3);
}

.ld-pane-pop-btn:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}

/* while a side pane is popped out, its column collapses to a slim "bring it back" strip */
.ld-left.ld-pane-popped,
.ld-right.ld-pane-popped {
  width: 34px;
  align-items: stretch;
}

.ld-pane-restore {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 10px 0;
  color: var(--vp-c-text-3);
}

.ld-pane-restore:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}

/* a stacked (vertical) pane that's popped out collapses to a short full-width "bring it back" bar */
.ld-pane.ld-pane-popped-v {
  flex: 0 0 auto;
  height: auto;
}

.ld-pane-restore-h {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 33px;
  padding: 0 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ld-pane-restore-h:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}

.ld-pane-restore-label {
  writing-mode: vertical-rl;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

/* code shown as a right-hand column instead of the bottom dock */
.ld-code-col {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--vp-c-divider);
}

/* captured-values dock */
.ld-dock {
  flex-shrink: 0;
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
}

.ld-dock-grip {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 22px;
  padding: 0 10px;
  background: var(--vp-c-bg-soft);
  user-select: none;
}

.ld-dock-grip.resizable {
  cursor: row-resize;
}

.ld-grip-lines {
  flex: 1;
  height: 100%;
  background-image: linear-gradient(var(--vp-c-divider) 1px, transparent 1px);
  background-size: 100% 4px;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.5;
}

.ld-dock-grip:hover .ld-grip-lines {
  opacity: 1;
}

.ld-dock-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.ld-dock-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  padding: 2px;
}

.ld-dock-toggle:hover {
  color: var(--vp-c-text-1);
}

.ld-dock-body {
  min-height: 0;
  border-top: 1px solid var(--vp-c-divider);
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
