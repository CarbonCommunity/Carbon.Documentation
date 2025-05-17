<script setup lang="ts">
import { computed, onMounted, onUnmounted, Ref, ref } from 'vue'
import { CheckCircle2, Copy, Database, ExternalLink, Loader2, Search } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import { fetchPrefabs } from '@/api/metadata/rust/prefabs'
import type { Prefab } from '@/api/metadata/rust/prefabs'
import { URL_METDAT_RUST_PREFABS } from '@/api/constants'

const prefabs: Ref<Prefab[]> = ref([])
const copiedId = ref<string | number | null>(null)
const isLoading = ref(true)
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const pageSize = 20
const currentPage = ref(1)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref<string | null>(null)

const filteredPrefabs = computed(() => {
  if (!prefabs.value?.length) return []

  let filtered = prefabs.value.filter((prefab) => prefab && prefab.Name)

  if (debouncedSearchQuery.value) {
    const searchLower = debouncedSearchQuery.value.toLowerCase()
    const searchNumber = Number(searchLower)
    filtered = filtered.filter((prefab) => {
      if (!prefab) return false
      return (
        (prefab.Name && prefab.Name.toLowerCase().includes(searchLower)) ||
        (prefab.Path && prefab.Path.toLowerCase().includes(searchLower)) ||
        prefab.ID == searchNumber
      )
    })
  }

  return filtered
})

const paginatedPrefabs = computed(() => {
  const start = 0
  const end = currentPage.value * pageSize
  return filteredPrefabs.value.slice(start, end)
})

let debounceTimeout: NodeJS.Timeout
const updateDebouncedSearch = (value: string) => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedSearchQuery.value = value
    currentPage.value = 1
  }, 300)
}

const copyToClipboard = async (text: string, id: string | number | null = null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const loadPrefabs = async () => {
  try {
    isLoading.value = true
    error.value = null
    const data = await fetchPrefabs()
    prefabs.value = data
  } catch (err) {
    console.error('Failed to load prefabs:', err)
    error.value = 'Failed to load prefabs. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++
  hasMore.value = currentPage.value * pageSize < filteredPrefabs.value.length
  loadingMore.value = false
}

const handleScroll = () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
    loadMore()
  }
}

onMounted(async () => {
  await loadPrefabs()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Rust Game Prefab Reference</h1>
    <p class="mb-8">
      This section contains a comprehensive list of all prefabs available in the game. Each prefab is listed
      with its unique ID, components, and file path.
    </p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a
          :href="URL_METDAT_RUST_PREFABS"
          target="_blank"
          class="vp-button medium brand flex items-center gap-2"
        >
          <Database :size="16" />
          Prefab API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" :size="24" />
      <span class="ml-2">Loading prefabs...</span>
    </div>

    <div v-else>
      <div class="filters mb-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center flex-1">
            <Search class="text-gray-400" :size="20" />
            <input
              type="text"
              v-model="searchQuery"
              @input="event => updateDebouncedSearch((event.target as HTMLInputElement).value)"
              placeholder="Search prefabs..."
              class="w-[400px] px-4 py-2"
            />
          </div>
        </div>
      </div>

      <div v-if="paginatedPrefabs && paginatedPrefabs.length">
        <div class="fixed bottom-4 right-4 z-50">
          <div
            class="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2"
          >
            Showing {{ paginatedPrefabs.length }} of {{ filteredPrefabs.length }} prefabs
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody>
                <tr
                  v-for="prefab in paginatedPrefabs"
                  :key="prefab.ID"
                  :id="prefab.ID.toString()"
                  class="items-table-row"
                >
                  <td class="whitespace-normal pb-4">
                    <div class="flex flex-col">
                      <div class="flex flex-wrap items-center">
                        <a :href="`/references/prefabs/details?id=${prefab.ID}`" class="flex-shrink-0">
                          <VPBadge :id="prefab.ID.toString()" type="tip" text="#" />
                        </a>
                        <button
                          @click="copyToClipboard(prefab.ID.toString(), prefab.ID)"
                          class="flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                        >
                          <span class="font-mono">{{ prefab.ID }}</span>
                          <component
                            :is="copiedId === prefab.ID ? CheckCircle2 : Copy"
                            class="ml-2"
                            :size="14"
                          />
                        </button>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <template v-for="component in prefab.Components" :key="component">
                          <VPBadge type="info" :text="component" />
                        </template>
                      </div>
                      <div class="font-mono text-sm text-gray-600 dark:text-gray-400 break-all">
                        {{ prefab.Path }}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="loadingMore" class="flex justify-center py-4">
          <Loader2 class="animate-spin" :size="24" />
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500">
        <p>No prefabs found matching your search</p>
        <p v-if="prefabs && prefabs.length === 0" class="mt-2 text-sm">
          Debug: No prefabs loaded. Check console for errors.
        </p>
        <p v-else-if="debouncedSearchQuery" class="mt-2 text-sm">
          Debug: Search query "{{ debouncedSearchQuery }}" returned no results.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.items-table-row {
  transition: background-color 0.2s ease;
}

.items-table-row:hover {
  background-color: #f3f4f6;
}

.dark .items-table-row:hover {
  background-color: #1f2937;
}
</style>
