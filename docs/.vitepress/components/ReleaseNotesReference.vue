<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { Copy, Database, CheckCircle2, Tag, Loader2, Search, ExternalLink, Image, Clock, Wrench, Scissors, Lock, Unlock, X, GitMergeIcon, GitPullRequestIcon } from 'lucide-vue-next'
import { 
  getGameData,
  RELEASE_NOTES_API_URL,
  getSpawnTypeText,
  SpawnType,
  CACHE_VERSION_API_URL
} from '../shared/constants'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import CarbonBadge from './CarbonBadge.vue'

const releaseNotes = ref([])
const copiedId = ref(null)
const isLoading = ref(true)
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const pageSize = 50
const currentPage = ref(1)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref(null)

const LINK_API = RELEASE_NOTES_API_URL

const filteredReleaseNotes = computed(() => {
  if (!releaseNotes.value?.length) return []
  
  let filtered = releaseNotes.value.filter(releaseNote => releaseNote && releaseNote.Version)

  if (debouncedSearchQuery.value) {
    const searchLower = debouncedSearchQuery.value.toLowerCase()
    filtered = filtered.filter(releaseNote => {
      if (!releaseNote) return false
      return true;
    })
  }

  return filtered
})

const paginatedReleaseNotes = computed(() => {
  const start = 0
  const end = currentPage.value * pageSize
  return filteredReleaseNotes.value.slice(start, end)
})

let debounceTimeout
const updateDebouncedSearch = (value) => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedSearchQuery.value = value
    currentPage.value = 1
  }, 300)
}

const copyToClipboard = async (text, id = null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => copiedId.value = null, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const loadReleaseNotes = async () => {
  try {
    isLoading.value = true
    error.value = null
    const data = await getGameData(LINK_API)
    releaseNotes.value = data
  } catch (err) {
    console.error('Failed to load release notes:', err)
    error.value = 'Failed to load release notes. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  currentPage.value++
  hasMore.value = currentPage.value * pageSize < filteredReleaseNotes.value.length
  loadingMore.value = false
}

const handleScroll = () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
    loadMore()
  }
}

onMounted(async () => {
  await loadReleaseNotes()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Watch for version changes
let versionCheckInterval
onMounted(() => {
  versionCheckInterval = setInterval(async () => {
    try {
      const response = await fetch(CACHE_VERSION_API_URL)
      if (!response.ok) return
      const version = await response.text()
      const cachedVersion = localStorage.getItem('carbon_docs_cache_version')
      
      if (cachedVersion !== version) {
        // Reload data if version changed
        await loadReleaseNotes()
      }
    } catch (error) {
      console.warn('Error checking version:', error)
    }
  }, 60000) // Check every minute
})

onUnmounted(() => {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval)
  }
})

const getChangeType = (val) => {
  if(val == 0) {
    return "add"
  } else if(val == 1) {
    return "update"
  } else if(val == 2) {
    return "remove"
  } else if(val == 3) {
    return "fix"
  } else if(val == 4) {
    return "misc"
  }
  return "date"
}

</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Release Notes</h1>
    <p class="mb-8">Carbon change patch notes and more information about the changes we've done recently.</p>

    <h1 class="text-2xl font-bold mb-4">Latest Update</h1>
    <p class="mb-8">Latest production release build changelog based on the <a href="https://github.com/CarbonCommunity/Carbon/tree/production" target="_blank"><strong>production branch</strong></a>.</p>

    <div v-if="!isLoading">
      <Badge type="info" :text="'Current Version: ' + releaseNotes[0]?.Version" style="text-align:center; width:195px" /> <br>
      <CarbonButton href="https://github.com/CarbonCommunity/Carbon.Core/releases/tag/production_build" text="Download Latest" icon="CloudDownload" external/> <br>
      <Badge type="info" :text="releaseNotes[0].Date" style="text-align:center; width:195px" />
    </div>
    <div v-else class="flex justify-center py-4">
          <Loader2 class="animate-spin" size="24"/>
    </div>
    <p class="mb-8"></p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a :href="LINK_API" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <Database size="16"/>
          Release Notes API
          <ExternalLink size="14" class="opacity-80"/>
        </a>
        <div style="width: 10px;"></div>
        <a v-if="releaseNotes[0]?.CommitUrl" :href="releaseNotes[0]?.CommitUrl" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <GitPullRequestIcon size="16"/>
          Full Commit Log
          <ExternalLink size="14" class="opacity-80"/>
        </a>
      </div>
    </div>
    <p class="mb-8"></p>
    <h1 class="text-2xl font-bold mb-4">Change Logs</h1>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" size="24"/>
      <span class="ml-2">Loading release notes...</span>
    </div>

    <div v-else>
      <div v-if="paginatedReleaseNotes && paginatedReleaseNotes.length">
        
        <div class="fixed bottom-4 right-4 z-50">
          <div class="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2">
            Showing {{ paginatedReleaseNotes.length }} of {{ filteredReleaseNotes.length }} release notes
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody>
                <tr v-for="change in releaseNotes[0].Changes.slice().sort((a, b) => a.Type - b.Type)" class="items-table-row">
                  <td class="whitespace-normal">
                      <CarbonChange :variant="getChangeType(change.Type)" :text="change.Message" />
                  </td>
                </tr>
              </tbody>
            </table>

            <p class="mb-8"></p>
            <h1 class="text-2xl font-bold mb-4">Older Updates</h1>
            <p class="mb-8">All changelogs from previous Carbon updates.</p>

            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody>
                <tr v-for="releaseNote in releaseNotes" class="items-table-row">
                  <td>
                    <details v-if="releaseNote != releaseNotes[0]" style="margin: 2.5px; margin-left: 10px;">
                    <summary style="font-size: 15px; ">
                      <span style="display: inline-flex; align-items: center; gap: 5px;">
                        {{ releaseNote.Version }}
                        <a v-if="releaseNote.CommitUrl" :href="releaseNote.CommitUrl" target="_blank"><ExternalLink class="opacity-60" style="width: 15px; height: 15px;" /></a>
                        <CarbonBadge v-if="releaseNote.Date" variant="date" :text="releaseNote.Date"/>
                      </span>
                      
                    </summary>
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style="margin: 10px;">
                      <tbody>
                        <tr v-for="change in releaseNote.Changes.slice().sort((a, b) => a.Type - b.Type)">
                          <td class="whitespace-normal">
                              <CarbonChange :variant="getChangeType(change.Type)" :text="change.Message" />
                          </td>
                        </tr>
                      </tbody>
                  </table>
                  </details>
                  </td>
                </tr>
              </tbody>
            </table>
          
          </div>
        </div>

        <div v-if="loadingMore" class="flex justify-center py-4">
          <Loader2 class="animate-spin" size="24"/>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500">
        <p>No release notes found matching your search</p>
        <p v-if="releaseNotes.value && releaseNotes.value.length === 0" class="mt-2 text-sm">
          Debug: No release notes loaded. Check console for errors.
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