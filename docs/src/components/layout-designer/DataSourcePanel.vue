<script setup lang="ts">
// Data Sources pane: author the named static values elements bind to. This checkpoint exposes TEXT
// sources (shared strings); the `list` kind exists in the model/store and lands here alongside the
// repeat/template work. Editing a source's value live-updates every element bound to it (canvas +
// generated code), since both resolve through resolveText().
// Body of the Data Sources pane (the pane chrome — header, Add, pop-out — lives in LayoutDesigner,
// mirroring how ElementTree is the body of the Elements pane).
import { Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import type { TextDataSource } from './types'
import { useDesigner } from './useDesigner'

const { dataSources, elements, updateDataSource, removeDataSource } = useDesigner()

// Only text sources are editable here for now (list editing ships with repeat/template).
const textSources = computed(() => dataSources.value.filter((d): d is TextDataSource => d.kind === 'text'))

/** How many element props are bound to a given source — a quick "is this used?" hint. */
const usage = computed(() => {
  const counts = new Map<string, number>()
  for (const el of elements.value) {
    if (!el.bindings) continue
    for (const id of Object.values(el.bindings)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
})

function setName(id: string, raw: string) {
  const name = raw.trim()
  if (name) updateDataSource(id, { name })
}
function setValue(id: string, value: string) {
  updateDataSource(id, { value })
}
function remove(id: string) {
  const used = usage.value.get(id) ?? 0
  if (used > 0 && !window.confirm(`This data source is bound to ${used} element${used > 1 ? 's' : ''}. Delete it and clear those bindings?`)) return
  removeDataSource(id)
}
</script>

<template>
  <div class="ld-ds">
    <div class="ld-ds-body">
      <p v-if="!textSources.length" class="ld-ds-empty">
        No data sources yet.<br />Add one, then bind a Text element to it in the Inspector.
      </p>

      <div v-for="ds in textSources" :key="ds.id" class="ld-ds-item">
        <div class="ld-ds-item-head">
          <input
            class="ld-ds-name"
            type="text"
            :value="ds.name"
            title="Field name in the generated class"
            @change="setName(ds.id, ($event.target as HTMLInputElement).value)"
          />
          <span v-if="usage.get(ds.id)" class="ld-ds-usage" :title="`Bound to ${usage.get(ds.id)} element(s)`">{{ usage.get(ds.id) }}×</span>
          <button class="ld-ds-del" title="Delete data source" @click="remove(ds.id)">
            <Trash2 :size="13" />
          </button>
        </div>
        <textarea
          class="ld-textarea ld-ds-value"
          rows="2"
          :value="ds.value"
          placeholder="Value…"
          @change="setValue(ds.id, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ld-ds {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.ld-ds-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ld-ds-empty {
  margin: 4px 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}
.ld-ds-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px;
  background: var(--vp-c-bg-soft);
}
.ld-ds-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.ld-ds-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-1);
}
.ld-ds-name:hover,
.ld-ds-name:focus {
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg);
  outline: none;
}
.ld-ds-usage {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}
.ld-ds-del {
  flex: 0 0 auto;
  display: inline-flex;
  padding: 3px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  border-radius: 4px;
}
.ld-ds-del:hover {
  color: var(--vp-c-danger-1, #e45649);
  background: var(--vp-c-bg);
}
.ld-ds-value {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  resize: vertical;
}
</style>
