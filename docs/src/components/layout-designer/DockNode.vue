<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, inject, ref, type Ref } from 'vue'
import DockLeaf from './DockLeaf.vue'
import { leavesOf, type DockNode, type PaneId, type SplitNode } from './dockTree'
import { useDock } from './useDock'

const props = defineProps<{ node: DockNode }>()
const { setSizes, setActiveTab, persist } = useDock()

// Pane visibility (View menu), provided by LayoutDesigner as a reactive ref. A subtree with no
// visible pane is dropped from its parent split so the layout reflows (the canvas is always visible).
const paneVisRef = inject<Ref<Record<PaneId, boolean>>>('ld-pane-visible', ref({} as Record<PaneId, boolean>))
const visible = (p: PaneId) => paneVisRef.value[p] ?? true
const isVisible = (n: DockNode) => leavesOf(n).some(visible)
const titleOf: Record<PaneId, string> = {
  elements: 'Elements',
  dataSources: 'Data Sources',
  inspector: 'Inspector',
  canvas: 'Canvas',
  code: 'Code',
  debug: 'Debug',
}

// --- split ---
const splitEl = ref<HTMLElement>()
// original-index list of the children that are currently visible (others are unmounted)
const visIdx = computed(() => (props.node.type === 'split' ? props.node.children.map((c, i) => ({ c, i })).filter(({ c }) => isVisible(c)) : []))

let drag: { node: SplitNode; a: number; b: number; startA: number; startB: number; origin: number; perPx: number } | null = null
function startResize(e: PointerEvent, a: number, b: number) {
  if (props.node.type !== 'split' || !splitEl.value) return
  const horizontal = props.node.dir === 'row'
  const rect = splitEl.value.getBoundingClientRect()
  const px = horizontal ? rect.width : rect.height
  const visWeight = visIdx.value.reduce((s, { i }) => s + props.node.sizes[i], 0) || 1
  drag = {
    node: props.node,
    a,
    b,
    startA: props.node.sizes[a],
    startB: props.node.sizes[b],
    origin: horizontal ? e.clientX : e.clientY,
    perPx: visWeight / Math.max(1, px), // weight units per pixel
  }
  e.preventDefault()
}
useEventListener(window, 'pointermove', (e: PointerEvent) => {
  if (!drag) return
  const horizontal = drag.node.dir === 'row'
  const deltaW = ((horizontal ? e.clientX : e.clientY) - drag.origin) * drag.perPx
  const combined = drag.startA + drag.startB
  const min = combined * 0.12 // keep each side at least ~12% of the pair
  const a = Math.min(combined - min, Math.max(min, drag.startA + deltaW))
  const next = [...drag.node.sizes]
  next[drag.a] = a
  next[drag.b] = combined - a
  setSizes(drag.node, next, false) // live, no persist
})
useEventListener(window, 'pointerup', () => {
  if (drag) {
    persist()
    drag = null
  }
})

// --- tabs ---
const visibleTabs = computed(() => (props.node.type === 'tabs' ? props.node.children.map((c, i) => ({ c, i })).filter(({ c }) => visible(c.pane)) : []))
const activeTab = computed(() => {
  if (props.node.type !== 'tabs') return 0
  const cur = props.node.children[props.node.active]
  return cur && visible(cur.pane) ? props.node.active : (visibleTabs.value[0]?.i ?? props.node.active)
})
</script>

<template>
  <!-- split -->
  <div v-if="node.type === 'split'" ref="splitEl" class="ld-dock-split" :class="node.dir">
    <template v-for="(item, k) in visIdx" :key="item.i">
      <div v-if="k > 0" class="ld-dock-divider" :class="node.dir" title="Drag to resize" @pointerdown="startResize($event, visIdx[k - 1].i, item.i)" />
      <div class="ld-dock-cell" :style="{ flexGrow: node.sizes[item.i], flexBasis: 0 }">
        <DockNode :node="item.c" />
      </div>
    </template>
  </div>

  <!-- tab group (tool-window tabs along the bottom edge) -->
  <div v-else-if="node.type === 'tabs'" class="ld-dock-tabgroup">
    <div class="ld-dock-tabgroup-body">
      <template v-for="(child, i) in node.children" :key="i">
        <div v-if="visible(child.pane)" v-show="i === activeTab" class="ld-dock-tabgroup-pane">
          <DockLeaf :pane="child.pane" />
        </div>
      </template>
    </div>
    <div v-if="visibleTabs.length > 1" class="ld-dock-tabstrip" role="tablist">
      <button
        v-for="{ c, i } in visibleTabs"
        :key="i"
        :class="{ active: i === activeTab }"
        role="tab"
        @click="setActiveTab(node, i)"
      >
        {{ titleOf[c.pane] }}
      </button>
    </div>
  </div>

  <!-- leaf -->
  <DockLeaf v-else :pane="node.pane" />
</template>

<style scoped>
.ld-dock-split {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.ld-dock-split.row {
  flex-direction: row;
}

.ld-dock-split.col {
  flex-direction: column;
}

.ld-dock-cell {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.ld-dock-cell > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.ld-dock-divider {
  flex-shrink: 0;
  background: var(--vp-c-divider);
  transition: background 0.12s;
}

.ld-dock-divider:hover {
  background: var(--c-carbon-1);
}

.ld-dock-divider.row {
  width: 5px;
  cursor: col-resize;
}

.ld-dock-divider.col {
  height: 5px;
  cursor: row-resize;
}

/* tab group */
.ld-dock-tabgroup {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  flex: 1;
}

.ld-dock-tabgroup-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ld-dock-tabgroup-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ld-dock-tabstrip {
  display: flex;
  gap: 2px;
  padding: 3px 6px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.ld-dock-tabstrip button {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  padding: 3px 12px;
  border-radius: 4px;
}

.ld-dock-tabstrip button:hover {
  color: var(--vp-c-text-1);
}

.ld-dock-tabstrip button.active {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
</style>
