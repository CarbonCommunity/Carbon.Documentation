<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, inject, ref, type Ref } from 'vue'
import DockLeaf from './DockLeaf.vue'
import { leavesOf, PANE_TITLES, titlesOf, type DockNode, type PaneId, type SplitNode } from './dockTree'
import { useDock } from './useDock'
import { useDockDrag } from './useDockDrag'

// `collapsible` is set by the parent split for a row child that may minimise to an edge strip (#8)
// — leaf/tabs children render their own collapse control from it; sub-split children get one from
// the parent (they have no header). The root has no parent, so it's undefined → not collapsible.
const props = defineProps<{ node: DockNode; collapsible?: boolean }>()
const { setSizes, setActiveTab, toggleCollapse, persist } = useDock()
const { startPaneDrag } = useDockDrag()

// Pane visibility (View menu), provided by LayoutDesigner as a reactive ref. A subtree with no
// visible pane is dropped from its parent split so the layout reflows (the canvas is always visible).
const paneVisRef = inject<Ref<Record<PaneId, boolean>>>('ld-pane-visible', ref({} as Record<PaneId, boolean>))
const visible = (p: PaneId) => paneVisRef.value[p] ?? true
const isVisible = (n: DockNode) => leavesOf(n).some(visible)
const titleOf = PANE_TITLES

// --- split ---
const splitEl = ref<HTMLElement>()
// original-index list of the children that are currently visible (others are unmounted)
const visIdx = computed(() => (props.node.type === 'split' ? props.node.children.map((c, i) => ({ c, i })).filter(({ c }) => isVisible(c)) : []))

// --- edge-collapse (#8) ---
const isRow = computed(() => props.node.type === 'split' && props.node.dir === 'row')
// A row child may collapse unless it holds the pinned canvas (never minimise the canvas away).
const childCollapsible = (i: number) => isRow.value && props.node.type === 'split' && !leavesOf(props.node.children[i]).includes('canvas')
const isStrip = (c: DockNode) => isRow.value && !!c.collapsed
// Which edge a strip hugs — left for children in the first half of the row, right otherwise; drives
// the chevron direction and the strip's flex order so it sits against the outer edge it shrank toward.
const sideOf = (k: number) => (k < (visIdx.value.length - 1) / 2 ? 'left' : 'right')
const labelOf = (c: DockNode) => titlesOf(c).join(' / ')

let drag: { node: SplitNode; a: number; b: number; startA: number; startB: number; origin: number; perPx: number } | null = null
function startResize(e: PointerEvent, a: number, b: number) {
  if (props.node.type !== 'split' || !splitEl.value) return
  const horizontal = props.node.dir === 'row'
  const rect = splitEl.value.getBoundingClientRect()
  const px = horizontal ? rect.width : rect.height
  // Collapsed strips don't grow (fixed-width), so they're excluded from the weight↔pixel mapping.
  const visWeight = visIdx.value.reduce((s, { c, i }) => s + (isStrip(c) ? 0 : props.node.sizes[i]), 0) || 1
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
      <div v-if="k > 0 && !isStrip(visIdx[k - 1].c) && !isStrip(item.c)" class="ld-dock-divider" :class="node.dir" title="Drag to resize" @pointerdown="startResize($event, visIdx[k - 1].i, item.i)" />

      <!-- collapsed (#8): a thin edge strip; click to restore -->
      <button v-if="isStrip(item.c)" class="ld-dock-strip" :class="sideOf(k)" :title="`Expand ${labelOf(item.c)}`" @click="toggleCollapse(item.c, false)">
        <component :is="sideOf(k) === 'left' ? ChevronRight : ChevronLeft" :size="14" class="ld-dock-strip-icon" />
        <span class="ld-dock-strip-label">{{ labelOf(item.c) }}</span>
      </button>

      <!-- normal cell -->
      <div v-else class="ld-dock-cell" :style="{ flexGrow: node.sizes[item.i], flexBasis: 0 }">
        <DockNode :node="item.c" :collapsible="childCollapsible(item.i)" />
        <!-- sub-splits have no header of their own, so the parent supplies the collapse handle -->
        <button v-if="childCollapsible(item.i) && item.c.type === 'split'" class="ld-dock-collapse-tab" :class="sideOf(k)" title="Collapse to the edge" @click="toggleCollapse(item.c, true)">
          <component :is="sideOf(k) === 'left' ? ChevronLeft : ChevronRight" :size="14" />
        </button>
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
    <div v-if="visibleTabs.length > 1 || collapsible" class="ld-dock-tabstrip" role="tablist">
      <button
        v-for="{ c, i } in visibleTabs"
        :key="i"
        :class="{ active: i === activeTab }"
        role="tab"
        title="Drag to dock elsewhere"
        @click="setActiveTab(node, i)"
        @pointerdown="startPaneDrag(c.pane, $event)"
      >
        {{ titleOf[c.pane] }}
      </button>
      <button v-if="collapsible" class="ld-dock-tab-collapse" title="Collapse to the edge" @click="toggleCollapse(node, true)">
        <ChevronRight :size="14" />
      </button>
    </div>
  </div>

  <!-- leaf -->
  <DockLeaf v-else :pane="node.pane" :collapsible="collapsible" @collapse="toggleCollapse(node, true)" />
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
  position: relative; /* anchors the sub-split collapse handle */
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

/* collapsed edge strip (#8): a clickable rail showing the minimised pane's title, vertically */
.ld-dock-strip {
  flex: 0 0 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  overflow: hidden;
}

.ld-dock-strip.left {
  border-right: 1px solid var(--vp-c-divider);
}

.ld-dock-strip.right {
  border-left: 1px solid var(--vp-c-divider);
}

.ld-dock-strip:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}

.ld-dock-strip-icon {
  flex-shrink: 0;
}

.ld-dock-strip-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* collapse handle for sub-splits (no header of their own): a slim tab on the outer edge */
.ld-dock-collapse-tab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.12s;
}

.ld-dock-collapse-tab.left {
  left: 6px;
}

.ld-dock-collapse-tab.right {
  right: 6px;
}

.ld-dock-cell:hover .ld-dock-collapse-tab {
  opacity: 0.85;
}

.ld-dock-collapse-tab:hover {
  opacity: 1;
  color: var(--c-carbon-1);
  border-color: var(--c-carbon-1);
}

/* collapse button at the end of a tab strip */
.ld-dock-tab-collapse {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  color: var(--vp-c-text-3);
  padding: 3px 6px;
  border-radius: 4px;
}

.ld-dock-tab-collapse:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
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
