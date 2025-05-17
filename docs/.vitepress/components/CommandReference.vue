<script setup lang="ts">
import { computed, onMounted, onUnmounted, Ref, ref } from 'vue'
import { Database, ExternalLink, Loader2, Search } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import { fetchCommandsCarbon } from '@/api/metadata/carbon/commands'
import type { CommandCarbon } from '@/api/metadata/carbon/commands'
import { URL_METDAT_CARB_COMMANDS } from '@/api/constants'

const commands: Ref<CommandCarbon[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const searchQuery: Ref<string> = ref('')
const debouncedSearchQuery: Ref<string> = ref('')
const pageSize: number = 50
const currentPage: Ref<number> = ref(1)
const loadingMore: Ref<boolean> = ref(false)
const hasMore: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)

const filteredCommands = computed(() => {
  if (!commands.value?.length) return []

  let filtered = commands.value.filter((command) => command && command.Name)

  if (debouncedSearchQuery.value) {
    const searchLower = debouncedSearchQuery.value.toLowerCase()
    filtered = filtered.filter((command) => {
      if (!command) return false
      return (
        (command.Name && command.Name.toLowerCase().includes(searchLower)) ||
        (command.Help && command.Help.toLowerCase().includes(searchLower))
      )
    })
  }

  return filtered
})

const paginatedCommands = computed(() => {
  const start = 0
  const end = currentPage.value * pageSize
  return filteredCommands.value.slice(start, end)
})

let debounceTimeout: NodeJS.Timeout
const updateDebouncedSearch = (value: string) => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedSearchQuery.value = value
    currentPage.value = 1
  }, 300)
}

const loadCommands = async () => {
  try {
    isLoading.value = true
    error.value = null
    const data = await fetchCommandsCarbon()
    commands.value = data
  } catch (err) {
    console.error('Failed to load commands:', err)
    error.value = 'Failed to load commands. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++
  hasMore.value = currentPage.value * pageSize < filteredCommands.value.length
  loadingMore.value = false
}

const handleScroll = () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
    loadMore()
  }
}

onMounted(async () => {
  await loadCommands()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Carbon Command Reference</h1>
    <p class="mb-8">Here's a full list of all currently available Carbon commands you can use.</p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a :href="URL_METDAT_CARB_COMMANDS" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <Database :size="16" />
          Command API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" :size="24" />
      <span class="ml-2">Loading commands...</span>
    </div>

    <div v-else>
      <div class="filters mb-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center flex-1">
            <Search class="text-gray-400" :size="20" />
            <input
              type="text"
              v-model="searchQuery"
              @input="(event) => updateDebouncedSearch((event.target as HTMLInputElement).value)"
              placeholder="Search commands..."
              class="w-[400px] px-4 py-2"
            />
          </div>
        </div>
      </div>

      <div v-if="paginatedCommands && paginatedCommands.length">
        <div class="fixed bottom-4 right-4 z-50">
          <div
            class="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2"
          >
            Showing {{ paginatedCommands.length }} of {{ filteredCommands.length }} commands
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody>
                <tr
                  v-for="command in paginatedCommands"
                  :key="command.Name"
                  :id="command.Name"
                  class="items-table-row"
                >
                  <td class="whitespace-normal pb-4">
                    <div class="flex flex-col">
                      <h1 class="font-mono">
                        {{ command.Name }}
                        <VPBadge
                          :type="`${
                            command.AuthLevel <= 0 ? 'info' : command.AuthLevel == 1 ? 'info' : 'danger'
                          }`"
                          :text="`${
                            command.AuthLevel <= 0 ? 'User' : command.AuthLevel == 1 ? 'Moderator' : 'Admin'
                          }`"
                        />
                      </h1>
                      <p v-if="command.Help" class="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        {{ command.Help }}
                      </p>
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
        <p>No commands found matching your search</p>
        <p v-if="commands && commands.length === 0" class="mt-2 text-sm">
          Debug: No commands loaded. Check console for errors.
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
