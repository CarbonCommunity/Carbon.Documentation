// Rust item catalog for the designer -- the same metadata + CDN icons the references/items pages
// use (api.carbonmod.gg items.json; cdn.carbonmod.gg/items/<shortname>.png). Loaded lazily once,
// shared module-wide; nothing here is persisted or emitted into generated code -- item icons on the
// canvas and in the pickers are preview/UX only.
import { computed, ref } from 'vue'
import { URL_ASSETS_ITEMS, URL_ASSETS_MISSING } from '@/api/constants'
import { fetchItems, type Item } from '@/api/metadata/rust/items'

const items = ref<Item[]>([])
const loaded = ref(false)
const failed = ref(false)
let pending: Promise<void> | null = null

/** Kick off the catalog fetch (idempotent; no-op during SSR). Callers just read the refs. */
function ensureLoaded() {
  if (typeof window === 'undefined' || loaded.value || pending) return
  pending = fetchItems()
    .then(({ data }) => {
      items.value = data
      loaded.value = true
    })
    .catch(() => {
      failed.value = true // stay usable -- pickers degrade to plain numeric entry
    })
    .finally(() => {
      pending = null
    })
}

const byId = computed(() => {
  const m = new Map<number, Item>()
  for (const it of items.value) m.set(it.Id, it)
  return m
})

/** Picker rows: visible items sorted by display name (hidden ones stay resolvable via byId). */
const pickerItems = computed(() => items.value.filter((i) => !i.Hidden).sort((a, b) => a.DisplayName.localeCompare(b.DisplayName)))

function itemById(id: number): Item | undefined {
  return byId.value.get(id)
}

/** CDN icon for an item id; null when the id is unknown (caller decides placeholder vs nothing). */
function iconUrlById(id: number): string | null {
  const it = byId.value.get(id)
  return it ? iconUrl(it) : null
}

function iconUrl(it: Item): string {
  return it.ShortName ? `${URL_ASSETS_ITEMS}/${it.ShortName}.png` : URL_ASSETS_MISSING
}

export function useItemCatalog() {
  return { ensureLoaded, loaded, failed, pickerItems, itemById, iconUrlById, iconUrl }
}
