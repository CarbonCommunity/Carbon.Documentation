<script setup lang="ts">
// Debug pane: a time-ordered console of the tool's runtime activity — every live-preview RPC the
// transport sends (AddUi with its exact payload, DestroyUi by name) plus captured console.warn/error.
// This is the only view of what actually goes over the wire (the Code panel's JSON tab shows the plain
// layout; the live payload differs — wrapped under the reserved preview root, `update:true` on re-sends).
// Click a row to expand its payload; Copy grabs it; Clear empties the log. (Replaces the old Debug pane,
// which just duplicated File → Export.)
import { Copy, PictureInPicture2, Trash2, X } from 'lucide-vue-next'
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { copyText } from './clipboard'
import { installConsoleCapture, useDebugLog } from './useDebugLog'
import { usePopout } from './usePopout'

const { entries, clear } = useDebugLog()
const { supported: popoutSupported, pipTarget, toggle: togglePopout, close: closePopout } = usePopout(() => 'Debug', { width: 520, height: 620 })
const closePaneFn = inject<(pane: 'debug') => void>('ld-pane-close')

onMounted(installConsoleCapture)

const expanded = ref<Set<number>>(new Set())
function toggleRow(id: number) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

// Auto-scroll to newest unless the user has scrolled up to read history.
const listEl = ref<HTMLElement | null>(null)
const follow = ref(true)
function onScroll() {
  const el = listEl.value
  if (!el) return
  follow.value = el.scrollHeight - el.scrollTop - el.clientHeight < 24
}
watch(
  () => entries.value.length,
  async () => {
    if (!follow.value) return
    await nextTick()
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  },
)

const count = computed(() => entries.value.length)
</script>

<template>
  <div class="ld-output">
    <Teleport :to="pipTarget" :disabled="!pipTarget">
      <div class="ld-out-inner">
        <div class="ld-out-head">
          <span class="ld-out-title">Debug <span class="ld-dbg-count">{{ count }}</span></span>
          <div class="ld-out-actions">
            <button class="ld-out-copy" :disabled="!count" title="Clear the log" @click="clear"><Trash2 :size="13" /> Clear</button>
            <button
              v-if="popoutSupported"
              class="ld-out-copy ld-out-pop"
              :title="pipTarget ? 'Pop back in' : 'Pop out into its own window'"
              @click="togglePopout"
            >
              <component :is="pipTarget ? X : PictureInPicture2" :size="13" />
            </button>
            <button v-if="closePaneFn" class="ld-out-copy ld-out-pop" title="Close this pane (View to bring it back)" @click="closePaneFn('debug')">
              <X :size="13" />
            </button>
          </div>
        </div>

        <div ref="listEl" class="ld-dbg-list" @scroll="onScroll">
          <p v-if="!count" class="ld-dbg-empty">
            Live-preview sends (AddUi / DestroyUi) and console warnings / errors show up here. Start the
            live preview and edit the layout, or trigger a warning.
          </p>
          <div v-for="e in entries" :key="e.id" class="ld-dbg-row" :class="`k-${e.kind}`">
            <button class="ld-dbg-line" @click="e.detail && toggleRow(e.id)">
              <span class="ld-dbg-time">{{ e.time }}</span>
              <span class="ld-dbg-kind">{{ e.kind }}</span>
              <span class="ld-dbg-summary">{{ e.summary }}</span>
              <Copy v-if="e.detail" :size="12" class="ld-dbg-copy" title="Copy payload" @click.stop="copyText(e.detail)" />
            </button>
            <pre v-if="e.detail && expanded.has(e.id)" class="ld-dbg-detail">{{ e.detail }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
    <div v-if="pipTarget" class="ld-out-placeholder">
      <span>Debug panel popped out.</span>
      <button @click="closePopout"><X :size="12" /> Bring it back</button>
    </div>
  </div>
</template>

<style scoped>
.ld-output {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.ld-out-inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  height: 100%;
}
.ld-out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.ld-out-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.ld-dbg-count {
  margin-left: 4px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
}
.ld-out-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ld-out-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
}
.ld-out-copy:hover:not(:disabled) {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
}
.ld-out-copy:disabled {
  opacity: 0.5;
}
.ld-out-pop {
  padding: 2px 5px;
}

.ld-dbg-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
}
.ld-dbg-empty {
  padding: 12px;
  color: var(--vp-c-text-3);
  line-height: 1.5;
  font-family: var(--vp-font-family-base);
  font-size: 12px;
}
.ld-dbg-row {
  border-bottom: 1px solid var(--vp-c-divider);
}
.ld-dbg-line {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 3px 8px;
  text-align: left;
  border-left: 2px solid transparent;
}
.ld-dbg-line:hover {
  background: var(--vp-c-bg-soft);
}
.k-AddUi .ld-dbg-line {
  border-left-color: #3b82f6;
}
.k-DestroyUi .ld-dbg-line {
  border-left-color: #f59e0b;
}
.k-error .ld-dbg-line {
  border-left-color: #ef4444;
}
.k-warn .ld-dbg-line {
  border-left-color: #eab308;
}
.k-info .ld-dbg-line {
  border-left-color: var(--vp-c-text-3);
}
.ld-dbg-time {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}
.ld-dbg-kind {
  flex-shrink: 0;
  font-weight: 700;
  min-width: 64px;
}
.k-AddUi .ld-dbg-kind {
  color: #3b82f6;
}
.k-DestroyUi .ld-dbg-kind {
  color: #f59e0b;
}
.k-error .ld-dbg-kind {
  color: #ef4444;
}
.k-warn .ld-dbg-kind {
  color: #eab308;
}
.k-info .ld-dbg-kind {
  color: var(--vp-c-text-3);
}
.ld-dbg-summary {
  flex: 1;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ld-dbg-copy {
  flex-shrink: 0;
  color: var(--vp-c-text-3);
}
.ld-dbg-copy:hover {
  color: var(--c-carbon-1);
}
.ld-dbg-detail {
  margin: 0;
  padding: 8px 10px;
  max-height: 320px;
  overflow: auto;
  background: var(--vp-c-bg-alt);
  border-top: 1px dashed var(--vp-c-divider);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 11px;
  line-height: 1.45;
}

.ld-out-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.ld-out-placeholder button {
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
.ld-out-placeholder button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
}
</style>
