<script setup lang="ts">
// Searchable Rust item picker: type a display name, short name or numeric id; rows show the CDN
// icon thumbnail. Pasting/typing a raw id still works (unknown ids are kept as-is), so the field
// never blocks on the catalog being loaded -- it just gets nicer when it is.
import { computed, ref, watch } from 'vue'
import { useItemCatalog } from './useItemCatalog'
import type { Item } from '@/api/metadata/rust/items'

const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const { ensureLoaded, loaded, pickerItems, itemById, iconUrl, iconUrlById } = useItemCatalog()
ensureLoaded()

const query = ref('')
const open = ref(false)
const hi = ref(0) // highlighted row (keyboard)
let focused = false

/** Field text when idle: "Display Name (id)" once the catalog resolves it, else the bare id. */
function display(): string {
  const it = itemById(props.modelValue)
  return it ? `${it.DisplayName} (${it.Id})` : String(props.modelValue || '')
}
const text = ref(display())
watch([() => props.modelValue, loaded], () => {
  if (!focused) text.value = display()
})

const MAX_ROWS = 40
const results = computed<Item[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return pickerItems.value.slice(0, MAX_ROWS)
  const out: Item[] = []
  for (const it of pickerItems.value) {
    if (it.DisplayName.toLowerCase().includes(q) || it.ShortName.toLowerCase().includes(q) || String(it.Id).startsWith(q.replace(/^-/, '-'))) {
      out.push(it)
      if (out.length >= MAX_ROWS) break
    }
  }
  return out
})

function onFocus() {
  focused = true
  query.value = ''
  text.value = ''
  hi.value = 0
  open.value = true
}
function onInput(v: string) {
  text.value = v
  query.value = v
  hi.value = 0
  open.value = true
}
function pick(it: Item) {
  emit('update:modelValue', it.Id)
  open.value = false
  focused = false
  text.value = `${it.DisplayName} (${it.Id})`
}
function onBlur() {
  // Row mousedown fires before blur -- delay so a click still lands. A typed raw number commits.
  setTimeout(() => {
    if (!focused) return
    focused = false
    open.value = false
    const n = Number.parseInt(text.value.trim(), 10)
    if (!Number.isNaN(n) && n !== props.modelValue && /^-?\d+$/.test(text.value.trim())) emit('update:modelValue', n)
    text.value = display()
  }, 150)
}
function onKey(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowDown') (e.preventDefault(), (hi.value = Math.min(hi.value + 1, results.value.length - 1)))
  else if (e.key === 'ArrowUp') (e.preventDefault(), (hi.value = Math.max(hi.value - 1, 0)))
  else if (e.key === 'Enter') {
    e.preventDefault()
    const it = results.value[hi.value]
    if (it) pick(it)
    else (e.target as HTMLInputElement).blur()
  } else if (e.key === 'Escape') {
    open.value = false
    focused = false
    text.value = display()
    ;(e.target as HTMLInputElement).blur()
  }
}
const currentIcon = computed(() => iconUrlById(props.modelValue))
</script>

<template>
  <div class="ld-itempick">
    <img v-if="currentIcon" class="ld-itempick-cur" :src="currentIcon" alt="" title="Selected item's inventory icon" />
    <input
      class="ld-itempick-input"
      :value="text"
      spellcheck="false"
      placeholder="Search items or paste an id"
      title="Item -- search by name, short name or numeric id; a pasted raw id is kept as-is"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKey"
      @input="onInput(($event.target as HTMLInputElement).value)"
    />
    <div v-if="open && results.length" class="ld-itempick-list">
      <button
        v-for="(it, i) in results"
        :key="it.Id"
        class="ld-itempick-row"
        :class="{ hi: i === hi }"
        type="button"
        @mousedown.prevent="pick(it)"
        @mousemove="hi = i"
      >
        <img class="ld-itempick-icon" :src="iconUrl(it)" loading="lazy" alt="" />
        <span class="ld-itempick-name">{{ it.DisplayName }}</span>
        <span class="ld-itempick-meta">{{ it.ShortName }} - {{ it.Id }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ld-itempick {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.ld-itempick-cur {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.ld-itempick-input {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  font-size: 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  outline: none;
}

.ld-itempick-input:focus {
  border-color: var(--c-carbon-1);
}

.ld-itempick-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 40;
  margin-top: 2px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}

.ld-itempick-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 4px 8px;
  font-size: 12px;
  text-align: left;
  color: var(--vp-c-text-1);
}

.ld-itempick-row.hi {
  background: var(--c-carbon-soft);
}

.ld-itempick-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.ld-itempick-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ld-itempick-meta {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}
</style>
