<script setup lang="ts">
import { FolderOpen, LayoutDashboard, Plus, X } from 'lucide-vue-next'
import DesignerCanvas from './DesignerCanvas.vue'
import { useDesigner } from './useDesigner'

// The pinned centre of the dock workspace: the canvas with its document tabs (one per open layout)
// and the empty state shown when no layout is open. The canvas itself is never dragged/closed.
const { currentLayoutId, openTabLayouts, layouts, switchLayout, closeTab, newLayout } = useDesigner()
</script>

<template>
  <div class="ld-canvas-pane">
    <!-- canvas pane title bar = document tabs; closing a tab keeps the layout -->
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
