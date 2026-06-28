<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ChevronDown, Clipboard, ClipboardPaste, HelpCircle, Layers, Lock, Pencil, Plus, Redo2, Trash2, Undo2 } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ContextMenu from './ContextMenu.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import ElementTree from './ElementTree.vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import InfoTip from './InfoTip.vue'
import InspectorPanel from './InspectorPanel.vue'
import { ASPECT_PRESETS, CLIENT_PANELS, type AspectPreset, type ClientPanel, type ElementType } from './types'
import CodeOutput from './CodeOutput.vue'
import LivePreviewControls from './LivePreviewControls.vue'
import { useDesigner } from './useDesigner'

const {
  canvas,
  provider,
  gridSize,
  constrain,
  addElement,
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
  currentLayoutName,
  newLayout,
  switchLayout,
  renameLayout,
  deleteLayout,
  exportClipboard,
  importClipboard,
} = useDesigner()

const GRID_SIZES = [1, 2, 4, 8, 16, 32]

const PROVIDERS: { value: 'oxide' | 'carbon' | 'both'; label: string }[] = [
  { value: 'oxide', label: 'Oxide' },
  { value: 'carbon', label: 'Carbon' },
  { value: 'both', label: 'Both' },
]

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

// --- layout & help menus ---
const layoutMenuOpen = ref(false)
const helpOpen = ref(false)

// --- add-element picker (single button → type menu; picking a type IS the add) ---
const addMenuOpen = ref(false)
function onAddRoot(type: ElementType) {
  addElement(type, null)
  addMenuOpen.value = false
}

function chooseLayout(id: string) {
  switchLayout(id)
  layoutMenuOpen.value = false
}
function addLayout() {
  newLayout() // auto-named "Layout N"; rename via the pencil
  layoutMenuOpen.value = false
}
function doRename(id: string, current: string) {
  const name = window.prompt('Rename layout', current)
  if (name !== null && name.trim()) renameLayout(id, name.trim())
}
function doDelete(id: string, name: string) {
  if (window.confirm(`Delete layout "${name}"?`)) deleteLayout(id)
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
    if (!t.closest('.ld-layout-menu')) layoutMenuOpen.value = false
    if (!t.closest('.ld-help')) helpOpen.value = false
    if (!t.closest('.ld-add-menu')) addMenuOpen.value = false
  },
  true
)

// --- resizable panels ---
const rightWidth = ref(300)
const bottomHeight = ref(220)
const bottomCollapsed = ref(false)

let resize: { type: 'right' | 'bottom'; start: number; origin: number } | null = null

function startRightResize(e: PointerEvent) {
  resize = { type: 'right', start: rightWidth.value, origin: e.clientX }
  e.preventDefault()
}
function startBottomResize(e: PointerEvent) {
  if (bottomCollapsed.value) return
  resize = { type: 'bottom', start: bottomHeight.value, origin: e.clientY }
  e.preventDefault()
}

useEventListener(window, 'pointermove', (e: PointerEvent) => {
  if (!resize) return
  if (resize.type === 'right') {
    rightWidth.value = Math.min(620, Math.max(240, resize.start - (e.clientX - resize.origin)))
  } else {
    bottomHeight.value = Math.min(560, Math.max(120, resize.start - (e.clientY - resize.origin)))
  }
})
useEventListener(window, 'pointerup', () => {
  resize = null
})
</script>

<template>
  <div class="ld-root">
    <!-- toolbar -->
    <div class="ld-toolbar">
      <span class="ld-title">Layout Designer</span>
      <span class="ld-badge">Preview</span>

      <!-- layout switcher -->
      <div class="ld-layout-menu">
        <button class="ld-btn" title="Layouts" @click.stop="layoutMenuOpen = !layoutMenuOpen">
          <Layers :size="14" /> {{ currentLayoutName }} <ChevronDown :size="13" />
        </button>
        <div v-if="layoutMenuOpen" class="ld-menu-pop" @pointerdown.stop>
          <button v-for="l in layouts" :key="l.id" class="ld-menu-item" :class="{ active: l.id === currentLayoutId }" @click="chooseLayout(l.id)">
            <span class="ld-menu-name">{{ l.name }}</span>
            <span class="ld-menu-row-actions">
              <Pencil :size="12" title="Rename" @click.stop="doRename(l.id, l.name)" />
              <Trash2 :size="12" title="Delete" @click.stop="doDelete(l.id, l.name)" />
            </span>
          </button>
          <div class="ld-menu-sep" />
          <button class="ld-menu-item" @click="addLayout"><Plus :size="13" /> New layout</button>
          <button class="ld-menu-item" @click="(exportClipboard(), (layoutMenuOpen = false))"><Clipboard :size="13" /> Copy to clipboard</button>
          <button class="ld-menu-item" @click="(importClipboard(), (layoutMenuOpen = false))"><ClipboardPaste :size="13" /> Import from clipboard</button>
        </div>
      </div>

      <button class="ld-icon-btn" :disabled="!canUndo" title="Undo (Ctrl+Z)" @click="undo"><Undo2 :size="15" /></button>
      <button class="ld-icon-btn" :disabled="!canRedo" title="Redo (Ctrl+Shift+Z)" @click="redo"><Redo2 :size="15" /></button>

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

      <div class="ld-tool-field">
        <span class="ld-collapsed-label">Target</span>
        <div class="ld-segmented ld-collapsible" role="group" aria-label="Target provider">
          <button
            v-for="p in PROVIDERS"
            :key="p.value"
            :title="p.value === 'both' ? 'Carbon + Oxide via #if CARBON / #else directives' : `Generate ${p.label}-style code`"
            :class="{ active: provider === p.value }"
            @click="provider = p.value"
          >
            {{ p.label }}
          </button>
        </div>
        <!-- collapsed form when the toolbar is narrow (see media query below) -->
        <select
          class="ld-collapsed-select"
          :value="provider"
          title="Target framework for the generated code"
          @change="provider = ($event.target as HTMLSelectElement).value as 'oxide' | 'carbon' | 'both'"
        >
          <option v-for="p in PROVIDERS" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
        <InfoTip text="Target framework for the generated code: Oxide (CUI), Carbon (LUI), or Both (one file with #if CARBON / #else directives). Shown in the panel below." />
      </div>

      <LivePreviewControls />

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
      <aside class="ld-left">
        <div class="ld-panel-head">
          <span>Elements</span>
          <!-- add-element lives here (not the toolbar) → one type menu; picking a type adds it -->
          <div class="ld-add-menu">
            <button class="ld-add-head-btn" title="Add an element to the root canvas" @click.stop="addMenuOpen = !addMenuOpen">
              <Plus :size="13" /> Add <ChevronDown :size="11" />
            </button>
            <ElementTypeMenu v-if="addMenuOpen" placement="below-right" @pick="onAddRoot" />
          </div>
        </div>
        <ElementTree />
      </aside>

      <main class="ld-center">
        <DesignerCanvas />
      </main>

      <div class="ld-divider-v" title="Drag to resize" @pointerdown="startRightResize" />

      <aside class="ld-right" :style="{ width: `${rightWidth}px` }">
        <div class="ld-panel-head">Inspector</div>
        <div class="ld-right-scroll">
          <InspectorPanel />
        </div>
      </aside>
    </div>

    <!-- generated-code dock (resizable / collapsible) -->
    <div class="ld-dock" :class="{ collapsed: bottomCollapsed }">
      <div class="ld-dock-grip" :class="{ resizable: !bottomCollapsed }" @pointerdown="startBottomResize">
        <span class="ld-grip-lines" aria-hidden="true" />
        <span v-if="bottomCollapsed" class="ld-dock-title">Generated code</span>
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
        <CodeOutput />
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

.ld-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: var(--c-carbon-1);
  padding: 1px 6px;
  border-radius: 3px;
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
.ld-layout-menu,
.ld-help {
  position: relative;
  display: inline-flex;
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
}

.ld-left {
  width: 230px;
  flex-shrink: 0;
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ld-center {
  flex: 1;
  min-width: 0;
  min-height: 0;
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
</style>
