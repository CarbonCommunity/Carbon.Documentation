<script setup lang="ts">
import { computed, onMounted, onUnmounted, Ref, ref } from 'vue'
import { CheckCircle2, Copy, Database, ExternalLink, Loader2, Search } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import { fetchConVarsRust } from '@/api/metadata/rust/convars'
import type { ConVarRust } from '@/api/metadata/rust/convars'
import { URL_METDAT_RUST_CONVARS } from '@/api/constants'

const convars: Ref<ConVarRust[]> = ref([])
const copiedId = ref<string | null>(null)
const isLoading = ref(true)
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const pageSize = 50
const currentPage = ref(1)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref<string | null>(null)

const filteredConvars = computed(() => {
  if (!convars.value?.length) return []

  let filtered = convars.value.filter((convar) => convar && convar.Name)

  if (debouncedSearchQuery.value) {
    const searchLower = debouncedSearchQuery.value.toLowerCase()
    filtered = filtered.filter((convar) => {
      if (!convar) return false
      return (
        (convar.Name && convar.Name.toLowerCase().includes(searchLower)) ||
        (convar.Help && convar.Help.toLowerCase().includes(searchLower))
      )
    })
  }

  return filtered
})

const paginatedConvars = computed(() => {
  const start = 0
  const end = currentPage.value * pageSize
  return filteredConvars.value.slice(start, end)
})

let debounceTimeout: NodeJS.Timeout
const updateDebouncedSearch = (value: string) => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedSearchQuery.value = value
    currentPage.value = 1
  }, 300)
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = text
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const loadConvars = async () => {
  try {
    isLoading.value = true
    error.value = null
    const data = await fetchConVarsRust()
    convars.value = data
  } catch (err) {
    console.error('Failed to load convar:', err)
    error.value = 'Failed to load convar. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++
  hasMore.value = currentPage.value * pageSize < filteredConvars.value.length
  loadingMore.value = false
}

const handleScroll = () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
    loadMore()
  }
}

onMounted(async () => {
  await loadConvars()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Rust ConVar Reference</h1>
    <p class="mb-8">All available Rust console variables.</p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a
          :href="URL_METDAT_RUST_CONVARS"
          target="_blank"
          class="vp-button medium brand flex items-center gap-2"
        >
          <Database :size="16" />
          Rust ConVar API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" :size="24" />
      <span class="ml-2">Loading convars...</span>
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
              placeholder="Search convars..."
              class="w-[400px] px-4 py-2"
            />
          </div>
        </div>
      </div>

      <div v-if="paginatedConvars && paginatedConvars.length">
        <div class="fixed bottom-4 right-4 z-50">
          <div
            class="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2"
          >
            Showing {{ paginatedConvars.length }} of {{ filteredConvars.length }} convars
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody>
                <tr
                  v-for="convar in paginatedConvars"
                  :key="convar.Name"
                  :id="convar.Name"
                  class="items-table-row"
                >
                  <td class="whitespace-normal pb-4">
                    <span class="font-mono flex items-center gap-2"
                      ><VPBadge type="info" :text="convar.Type" /> {{ convar.Name }}
                      <button @click="copyToClipboard(convar.Name)" class="flex items-center py-1.5 text-sm">
                        <component :is="copiedId === convar.Name ? CheckCircle2 : Copy" :size="14" />
                      </button>
                      <div class="opacity-75">{{ convar.DefaultValue }}</div>
                      <VPBadge v-if="convar.Saved" type="tip" :text="`Saved`" />
                    </span>
                    <p v-if="convar.Help" class="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      {{ convar.Help }}
                    </p>
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
        <p>No convars found matching your search</p>
        <p v-if="convars && convars.length === 0" class="mt-2 text-sm">
          Debug: No convars loaded. Check console for errors.
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
