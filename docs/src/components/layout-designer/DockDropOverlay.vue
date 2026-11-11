<script setup lang="ts">
// Drop-zone overlay shown over a leaf while a pane is being dragged (issue #6 Part 2b). Five hit
// regions — center (make a tab group) plus the four sides (split) — report which zone the cursor is
// over; a translucent preview shows where the dragged pane would land. The canvas is pinned, so it
// offers the four sides only (no center: it never shares a tab group).
import { computed } from 'vue'
import type { DockSide, PaneId } from './dockTree'
import { useDockDrag } from './useDockDrag'

const props = defineProps<{ pane: PaneId }>()
const { dragging, hover, setHover, clearHover } = useDockDrag()

// Don't offer a drop on the pane being dragged (dropping onto self is a no-op anyway).
const active = computed(() => dragging.value !== null && dragging.value !== props.pane)
const sides = computed<DockSide[]>(() => (props.pane === 'canvas' ? ['left', 'right', 'top', 'bottom'] : ['center', 'left', 'right', 'top', 'bottom']))
const previewSide = computed(() => (hover.value?.pane === props.pane ? hover.value.side : null))
</script>

<template>
  <div v-if="active" class="ld-drop-overlay" @pointerleave="clearHover(pane)">
    <div
      v-for="side in sides"
      :key="side"
      class="ld-drop-zone"
      :class="side"
      @pointerenter="setHover(pane, side)"
    />
    <div v-if="previewSide" class="ld-drop-preview" :class="previewSide" />
  </div>
</template>

<style scoped>
.ld-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
}

/* hit regions (transparent; the preview shows feedback) */
.ld-drop-zone {
  position: absolute;
}

.ld-drop-zone.left {
  left: 0;
  top: 0;
  width: 25%;
  height: 100%;
}

.ld-drop-zone.right {
  right: 0;
  top: 0;
  width: 25%;
  height: 100%;
}

.ld-drop-zone.top {
  left: 25%;
  right: 25%;
  top: 0;
  height: 25%;
}

.ld-drop-zone.bottom {
  left: 25%;
  right: 25%;
  bottom: 0;
  height: 25%;
}

.ld-drop-zone.center {
  left: 25%;
  right: 25%;
  top: 25%;
  bottom: 25%;
}

/* landing preview — where the dragged pane will go */
.ld-drop-preview {
  position: absolute;
  pointer-events: none;
  background: var(--c-carbon-soft);
  border: 2px solid var(--c-carbon-1);
  border-radius: 4px;
  transition:
    inset 0.08s ease,
    width 0.08s ease,
    height 0.08s ease;
}

.ld-drop-preview.center {
  inset: 0;
}

.ld-drop-preview.left {
  left: 0;
  top: 0;
  width: 50%;
  height: 100%;
}

.ld-drop-preview.right {
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
}

.ld-drop-preview.top {
  left: 0;
  top: 0;
  width: 100%;
  height: 50%;
}

.ld-drop-preview.bottom {
  left: 0;
  bottom: 0;
  width: 100%;
  height: 50%;
}
</style>
