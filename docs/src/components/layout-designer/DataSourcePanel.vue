<script setup lang="ts">
// Data Sources pane: author the named static values elements bind to. TEXT sources are shared
// strings; LIST sources are little spreadsheets — the columns define the item struct codegen emits
// (a list IS its own type), the rows are the design-time sample data a repeating container stamps
// its template from. Editing either live-updates every bound element (canvas + generated code).
// Body of the Data Sources pane (the pane chrome — header, Add, pop-out — lives in LayoutDesigner,
// mirroring how ElementTree is the body of the Elements pane).
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import InfoTip from './InfoTip.vue'
import type { ListColumn, ListColumnKind, ListDataSource, TextDataSource } from './types'
import { useDesigner } from './useDesigner'

const { dataSources, elements, updateDataSource, removeDataSource } = useDesigner()

const textSources = computed(() => dataSources.value.filter((d): d is TextDataSource => d.kind === 'text'))
const listSources = computed(() => dataSources.value.filter((d): d is ListDataSource => d.kind === 'list'))

/** How many element props are bound to a given source (repeat targets count too) — an "is this used?" hint. */
const usage = computed(() => {
  const counts = new Map<string, number>()
  for (const el of elements.value) {
    if (el.repeat?.source) counts.set(el.repeat.source, (counts.get(el.repeat.source) ?? 0) + 1)
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

// --- list (spreadsheet) editing ---------------------------------------------------------------

const COLUMN_KINDS: { id: ListColumnKind; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'itemid', label: 'Item id' },
  { id: 'url', label: 'Image URL' },
]

function setTypeName(ds: ListDataSource, raw: string) {
  const typeName = raw.trim()
  if (typeName) updateDataSource(ds.id, { typeName })
}

function addColumn(ds: ListDataSource) {
  let n = ds.columns.length + 1
  let key = `Col${n}`
  while (ds.columns.some((c) => c.key === key)) key = `Col${++n}`
  updateDataSource(ds.id, { columns: [...ds.columns, { key, kind: 'text' }] })
}

/** Rename a column, re-keying every row's value so no data is lost. Rejects empty/duplicate keys. */
function renameColumn(ds: ListDataSource, col: ListColumn, raw: string) {
  const key = raw.trim()
  if (!key || key === col.key || ds.columns.some((c) => c.key === key)) return
  updateDataSource(ds.id, {
    columns: ds.columns.map((c) => (c.key === col.key ? { ...c, key } : c)),
    items: ds.items.map((row) => {
      const { [col.key]: v, ...rest } = row
      return v === undefined ? rest : { ...rest, [key]: v }
    }),
  })
}

function setColumnKind(ds: ListDataSource, col: ListColumn, kind: ListColumnKind) {
  updateDataSource(ds.id, { columns: ds.columns.map((c) => (c.key === col.key ? { ...c, kind } : c)) })
}

function removeColumn(ds: ListDataSource, col: ListColumn) {
  if (ds.columns.length <= 1) return // a list needs at least one column
  updateDataSource(ds.id, {
    columns: ds.columns.filter((c) => c.key !== col.key),
    items: ds.items.map(({ [col.key]: _dropped, ...rest }) => rest),
  })
}

function addRow(ds: ListDataSource) {
  updateDataSource(ds.id, { items: [...ds.items, {}] })
}

function setCell(ds: ListDataSource, rowIdx: number, col: ListColumn, value: string) {
  updateDataSource(ds.id, { items: ds.items.map((row, i) => (i === rowIdx ? { ...row, [col.key]: value } : row)) })
}

function removeRow(ds: ListDataSource, rowIdx: number) {
  if (ds.items.length <= 1) return // keep one row so the template has something to show
  updateDataSource(ds.id, { items: ds.items.filter((_row, i) => i !== rowIdx) })
}
</script>

<template>
  <div class="ld-ds">
    <div class="ld-ds-body">
      <p v-if="!textSources.length && !listSources.length" class="ld-ds-empty">
        No data sources yet.<br />Add a <b>text</b> (a shared string elements bind to) or a
        <b>list</b> (rows a layout container repeats its first child over).
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

      <!-- list sources: a mini spreadsheet each — columns are the item struct, rows are sample data -->
      <div v-for="ds in listSources" :key="ds.id" class="ld-ds-item">
        <div class="ld-ds-item-head">
          <input class="ld-ds-name" type="text" :value="ds.name" title="List field name in the generated class" @change="setName(ds.id, ($event.target as HTMLInputElement).value)" />
          <span class="ld-ds-kind">list</span>
          <span v-if="usage.get(ds.id)" class="ld-ds-usage" :title="`Used by ${usage.get(ds.id)} element(s)`">{{ usage.get(ds.id) }}×</span>
          <button class="ld-ds-del" title="Delete data source" @click="remove(ds.id)">
            <Trash2 :size="13" />
          </button>
        </div>
        <label class="ld-ds-type">
          <span>Item type <InfoTip text="The C# type generated from the columns below — each column becomes a property, each row an entry in the emitted List<T>. Set a container's layout to 'Repeat from' this list to stamp its template per row." /></span>
          <input type="text" :value="ds.typeName" @change="setTypeName(ds, ($event.target as HTMLInputElement).value)" />
        </label>
        <div class="ld-ds-grid" :style="{ gridTemplateColumns: `repeat(${ds.columns.length}, minmax(72px, 1fr)) 22px` }">
          <!-- header: column name + kind -->
          <div v-for="col in ds.columns" :key="col.key" class="ld-ds-colhead">
            <input type="text" :value="col.key" title="Property name in the item type" @change="renameColumn(ds, col, ($event.target as HTMLInputElement).value)" />
            <div class="ld-ds-colmeta">
              <select :value="col.kind" title="What this column holds (drives which element props it can bind)" @change="setColumnKind(ds, col, ($event.target as HTMLSelectElement).value as ListColumnKind)">
                <option v-for="k in COLUMN_KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
              </select>
              <button class="ld-ds-del" title="Delete column" :disabled="ds.columns.length <= 1" @click="removeColumn(ds, col)"><Trash2 :size="11" /></button>
            </div>
          </div>
          <button class="ld-ds-addcol" title="Add column" @click="addColumn(ds)"><Plus :size="12" /></button>
          <!-- rows -->
          <template v-for="(row, ri) in ds.items" :key="ri">
            <input
              v-for="col in ds.columns"
              :key="`${ri}.${col.key}`"
              class="ld-ds-cell"
              type="text"
              :value="row[col.key] ?? ''"
              :placeholder="col.kind === 'itemid' ? 'item id' : col.kind === 'url' ? 'https://…' : ''"
              @change="setCell(ds, ri, col, ($event.target as HTMLInputElement).value)"
            />
            <button class="ld-ds-del" title="Delete row" :disabled="ds.items.length <= 1" @click="removeRow(ds, ri)"><Trash2 :size="11" /></button>
          </template>
        </div>
        <button class="ld-ds-addrow" @click="addRow(ds)"><Plus :size="12" /> Row</button>
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

.ld-ds-kind {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0 5px;
}

.ld-ds-type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin: 2px 0 6px;
}

.ld-ds-type input {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

/* the spreadsheet: header cells + data cells share one grid so columns stay aligned */
.ld-ds-grid {
  display: grid;
  gap: 3px;
  align-items: start;
}

.ld-ds-colhead input,
.ld-ds-cell {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font-size: 11px;
  padding: 2px 5px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.ld-ds-colhead input {
  font-weight: 600;
}

.ld-ds-colmeta {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
}

.ld-ds-colmeta select {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 10px;
  padding: 1px 2px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-3);
}

.ld-ds-colmeta select:hover {
  border-color: var(--vp-c-divider);
}

.ld-ds-addcol,
.ld-ds-addrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11px;
  padding: 2px 5px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
}

.ld-ds-addcol:hover,
.ld-ds-addrow:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.ld-ds-addrow {
  margin-top: 4px;
}

.ld-ds-del:disabled {
  opacity: 0.35;
  cursor: default;
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
