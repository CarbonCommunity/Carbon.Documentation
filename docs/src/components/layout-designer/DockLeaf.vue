<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ChevronDown, PanelLeftClose, PictureInPicture2, Plus, X } from 'lucide-vue-next'
import { computed, ref, type Component } from 'vue'
import CanvasPane from './CanvasPane.vue'
import CodeOutput from './CodeOutput.vue'
import DataSourcePanel from './DataSourcePanel.vue'
import DebugPanel from './DebugPanel.vue'
import ElementTree from './ElementTree.vue'
import ElementTypeMenu from './ElementTypeMenu.vue'
import InfoTip from './InfoTip.vue'
import InspectorPanel from './InspectorPanel.vue'
import ScreenSharePane from './ScreenSharePane.vue'
import type { ElementType } from './types'
import { usePopout } from './usePopout'
import { useDesigner } from './useDesigner'
import DockDropOverlay from './DockDropOverlay.vue'
import type { PaneId } from './dockTree'
import { useDockDrag } from './useDockDrag'

// `collapsible` (#8): this pane is a row child that can minimise to an edge strip. Framed panes show
// the control in their header; self-framed code/debug get an overlay button. Emitting `collapse`
// lets the parent DockNode flip the flag on this node (it owns the tree reference).
const props = defineProps<{ pane: PaneId; collapsible?: boolean }>()
const emit = defineEmits<{ collapse: [] }>()
const { addElement, addDataSource } = useDesigner()
const { startPaneDrag } = useDockDrag()

// Start a drag from the pane header (framed panes) or the self-framed code/debug header — but never
// from an interactive control inside it, and never from the pinned canvas.
function onHeaderPointerDown(e: PointerEvent) {
  if (props.pane === 'canvas') return
  const t = e.target as HTMLElement | null
  if (!t?.closest('.ld-dock-pane-head, .ld-out-head')) return
  if (t.closest('button, select, input, textarea, a, [role="tab"], .ld-add-menu')) return
  startPaneDrag(props.pane, e)
}

// Framed tool panes: a header (title + actions + pop-out) wraps the body. canvas/code/debug are
// "self-framed" (render their own component with its own header) and skip this.
const FRAMED: Partial<Record<PaneId, { title: string; body: Component; scroll: boolean }>> = {
  elements: { title: 'Elements', body: ElementTree, scroll: true },
  dataSources: { title: 'Data Sources', body: DataSourcePanel, scroll: false },
  inspector: { title: 'Inspector', body: InspectorPanel, scroll: true },
  screenShare: { title: 'Screen Share', body: ScreenSharePane, scroll: false },
}
const meta = computed(() => FRAMED[props.pane])

const pip = usePopout(() => meta.value?.title ?? props.pane, { width: 340, height: 660 })

const addMenuOpen = ref(false)
function onAddRoot(type: ElementType) {
  addElement(type, null)
  addMenuOpen.value = false
}
useEventListener(
  window,
  'pointerdown',
  (e: PointerEvent) => {
    const t = e.target as HTMLElement | null
    if (!t?.closest?.('.ld-add-menu')) addMenuOpen.value = false
  },
  true,
)
</script>

<template>
  <div class="ld-dock-leaf-root" @pointerdown="onHeaderPointerDown">
    <CanvasPane v-if="pane === 'canvas'" />
    <CodeOutput v-else-if="pane === 'code'" />
    <DebugPanel v-else-if="pane === 'debug'" />

    <!-- code/debug are self-framed (own header), so they get an overlay collapse handle (#8) -->
    <button v-if="collapsible && (pane === 'code' || pane === 'debug')" class="ld-leaf-collapse-overlay" title="Collapse to the edge" @click="emit('collapse')">
      <PanelLeftClose :size="14" />
    </button>

    <div v-else-if="meta" class="ld-dock-pane">
    <Teleport :to="pip.pipTarget.value" :disabled="!pip.pipTarget.value">
      <div class="ld-dock-pane-inner">
        <div class="ld-dock-pane-head">
          <span class="ld-dock-pane-title">
            {{ meta.title }}
            <InfoTip
              v-if="pane === 'dataSources'"
              text="Named static values your elements can bind to. In the generated Class they become fields; everywhere else (UX/JSON/preview) the value is inlined. Edit one and every bound element updates."
            />
          </span>
          <div class="ld-dock-pane-actions">
            <div v-if="pane === 'elements'" class="ld-add-menu">
              <button class="ld-add-head-btn" title="Add an element to the root canvas" @click.stop="addMenuOpen = !addMenuOpen">
                <Plus :size="13" /> Add <ChevronDown :size="11" />
              </button>
              <ElementTypeMenu v-if="addMenuOpen" placement="below-right" @pick="onAddRoot" />
            </div>
            <button v-else-if="pane === 'dataSources'" class="ld-add-head-btn" title="Add a text data source" @click="addDataSource('text')">
              <Plus :size="13" /> Add
            </button>
            <button v-if="collapsible" class="ld-pane-pop-btn" title="Collapse to the edge" @click="emit('collapse')">
              <PanelLeftClose :size="14" />
            </button>
            <button
              v-if="pip.supported"
              class="ld-pane-pop-btn"
              :title="pip.pipTarget.value ? 'Pop back in' : 'Pop out into its own window'"
              @click="pip.toggle()"
            >
              <component :is="pip.pipTarget.value ? X : PictureInPicture2" :size="14" />
            </button>
          </div>
        </div>
        <div class="ld-dock-pane-body" :class="{ scroll: meta.scroll }">
          <component :is="meta.body" />
        </div>
      </div>
    </Teleport>
      <div v-if="pip.pipTarget.value" class="ld-dock-pane-popped">
        <span>{{ meta.title }} popped out.</span>
        <button @click="pip.close()"><X :size="12" /> Bring it back</button>
      </div>
    </div>

    <DockDropOverlay :pane="pane" />
  </div>
</template>

<style scoped>
/* positioned frame so the drag drop-overlay can sit over the pane content */
.ld-dock-leaf-root {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.ld-dock-leaf-root > :not(.ld-drop-overlay) {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* overlay collapse handle for self-framed panes (code/debug) — they have no shared header (#8) */
.ld-leaf-collapse-overlay {
  position: absolute;
  top: 7px;
  right: 8px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.12s;
}

.ld-leaf-collapse-overlay:hover {
  opacity: 1;
  color: var(--c-carbon-1);
  border-color: var(--c-carbon-1);
}

.ld-dock-pane,
.ld-dock-pane-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ld-dock-pane-head {
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

.ld-dock-pane-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.ld-dock-pane-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ld-add-menu {
  position: relative;
  display: inline-flex;
}

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

.ld-dock-pane-body {
  flex: 1;
  min-height: 0;
}

.ld-dock-pane-body.scroll {
  overflow-y: auto;
}

.ld-dock-pane-popped {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ld-dock-pane-popped button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  padding: 3px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.ld-dock-pane-popped button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
}
</style>
