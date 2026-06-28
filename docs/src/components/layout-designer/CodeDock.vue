<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeOutput from './CodeOutput.vue'
import DebugPanel from './DebugPanel.vue'

// A docked group of the Code and Debug panes, shown one at a time with tool-window-style tabs along
// the bottom edge of the region. The eventual dock-tree (issue #6) generalises this; for now it's the
// one place those two panes live, used by both the bottom dock and the code-side-panel arrangement.
const props = defineProps<{ showCode: boolean; showDebug: boolean }>()

type DockTab = 'code' | 'debug'
const tab = ref<DockTab>('code')
// the active tab must point at a visible pane — fall back when the selected one is hidden via View
const active = computed<DockTab>(() => {
  if (tab.value === 'debug' && props.showDebug) return 'debug'
  if (tab.value === 'code' && props.showCode) return 'code'
  return props.showCode ? 'code' : 'debug'
})
</script>

<template>
  <div class="ld-codedock">
    <div class="ld-codedock-body">
      <CodeOutput v-if="showCode" v-show="active === 'code'" />
      <DebugPanel v-if="showDebug" v-show="active === 'debug'" />
    </div>
    <!-- bottom tab strip (tool-window style); only when both panes share the region -->
    <div v-if="showCode && showDebug" class="ld-codedock-tabs" role="tablist">
      <button :class="{ active: active === 'code' }" role="tab" @click="tab = 'code'">Code</button>
      <button :class="{ active: active === 'debug' }" role="tab" @click="tab = 'debug'">Debug</button>
    </div>
  </div>
</template>

<style scoped>
.ld-codedock {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.ld-codedock-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* the active pane fills the body (the inactive one is display:none via v-show) */
.ld-codedock-body > * {
  flex: 1;
  min-height: 0;
}

/* bottom tab strip */
.ld-codedock-tabs {
  display: flex;
  gap: 2px;
  padding: 3px 6px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.ld-codedock-tabs button {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  padding: 3px 12px;
  border-radius: 4px;
}

.ld-codedock-tabs button:hover {
  color: var(--vp-c-text-1);
}

.ld-codedock-tabs button.active {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
</style>
