<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { Copy, Database, CheckCircle2, Tag, Loader2, Search, ExternalLink, Image, Clock, Wrench, Scissors, Lock, Unlock, X } from 'lucide-vue-next'
import { 
  getGameData,
  BLUEPRINTS_API_URL,
  getItemCategoryText,
  getItemRarityText,
  CATEGORY_COLORS,
  RARITY_COLORS,
  ITEM_IMAGE_SERVER,
  MISSING_IMAGE_URL,
  CACHE_VERSION_API_URL
} from '../shared/constants'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import { useRouter, useData } from 'vitepress'

const router = useRouter()
const { page } = useData()

const blueprints = ref([])
const copiedId = ref(null)
const isLoading = ref(true)
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const selectedCategory = ref('all')
const pageSize = 50
const currentPage = ref(1)
const loadingMore = ref(false)
const hasMore = ref(true)
const imageErrors = ref(new Map())
const selectedIngredient = ref(null)
const showIngredientModal = ref(false)
const dlcData = ref(new Map())
const error = ref(null)

const LINK_API = BLUEPRINTS_API_URL

const getItemImageUrl = (shortName) => {
  if (!shortName) return MISSING_IMAGE_URL
  return `${ITEM_IMAGE_SERVER}/${shortName}.png`
}

const handleImageError = (event, itemId) => {
  imageErrors.value.set(itemId, true)
  console.warn(`Failed to load image for item: ${event.target.src}`)
}

const categories = computed(() => {
  if (!blueprints.value?.length) return []
  const uniqueCategories = [...new Set(blueprints.value.map(bp => bp?.Item?.Category))]
    .filter(cat => cat !== undefined)
    .sort((a, b) => a - b)
  return ['all', ...uniqueCategories]
})

const filteredBlueprints = computed(() => {
  if (!blueprints.value?.length) return []
  
  let filtered = blueprints.value.filter(bp => bp && bp.Item && bp.Item.DisplayName)

  if (selectedCategory.value !== 'all') {
    const categoryNum = parseInt(selectedCategory.value)
    filtered = filtered.filter(bp => bp?.Item?.Category === categoryNum)
  }

  if (debouncedSearchQuery.value) {
    const searchLower = debouncedSearchQuery.value.toLowerCase()
    filtered = filtered.filter(bp => {
      if (!bp?.Item) return false
      return (
        (bp.Item.DisplayName && bp.Item.DisplayName.toLowerCase().includes(searchLower)) ||
        (bp.Item.ShortName && bp.Item.ShortName.toLowerCase().includes(searchLower)) ||
        (bp.Item.Description && bp.Item.Description.toLowerCase().includes(searchLower)) ||
        (bp.Item.Id == searchLower)
      )
    })
  }

  return filtered
})

const paginatedBlueprints = computed(() => {
  const start = 0
  const end = currentPage.value * pageSize
  return filteredBlueprints.value.slice(start, end)
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

const loadBlueprints = async () => {
  try {
    isLoading.value = true
    error.value = null
    const data = await getGameData(LINK_API)
    blueprints.value = data
  } catch (err) {
    console.error('Failed to load blueprints:', err)
    error.value = 'Failed to load blueprints. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  currentPage.value++
  hasMore.value = currentPage.value * pageSize < filteredBlueprints.value.length
  loadingMore.value = false
}

const handleScroll = () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
    loadMore()
  }
}

onMounted(async () => {
  await loadBlueprints()
  window.addEventListener('scroll', handleScroll)
  
  // Handle URL hash for search
  const hash = decodeURIComponent(window.location.hash.slice(1))
  if (hash) {
    searchQuery.value = hash
    updateDebouncedSearch(hash)
  }

  // Listen for hash changes, not really needed but fuck it
  window.addEventListener('hashchange', () => {
    const newHash = decodeURIComponent(window.location.hash.slice(1))
    if (newHash) {
      searchQuery.value = newHash
      updateDebouncedSearch(newHash)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('hashchange', () => {})
})

// Watch for version changes to dump the cache
let versionCheckInterval
onMounted(() => {
  versionCheckInterval = setInterval(async () => {
    try {
      const response = await fetch(CACHE_VERSION_API_URL)
      if (!response.ok) return
      const version = await response.text()
      const cachedVersion = localStorage.getItem('carbon_docs_cache_version')
      
      if (cachedVersion !== version) {
        await loadBlueprints()
      }
    } catch (error) {
      console.warn('Error checking version:', error)
    }
  }, 60000)
})

onUnmounted(() => {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval)
  }
})

watch(debouncedSearchQuery, () => {
  currentPage.value = 1
  hasMore.value = true
})

watch(selectedCategory, () => {
  currentPage.value = 1
  hasMore.value = true
})

const emit = defineEmits(['showItemModal'])

const showItemModal = async (itemId) => {
  const ingredient = blueprints.value
    .flatMap(bp => bp.Ingredients || [])
    .find(ing => ing.Item.Id === itemId)
  
  if (ingredient) {
    selectedIngredient.value = ingredient
    showIngredientModal.value = true

    if (ingredient.Item.SteamDlcItem?.AppId) {
      await fetchDlcData(ingredient.Item.SteamDlcItem.AppId)
    }
  }
}

const closeIngredientModal = () => {
  showIngredientModal.value = false
  selectedIngredient.value = null
}

const fetchDlcData = async (appId) => {
  if (dlcData.value.has(appId)) return dlcData.value.get(appId)
  
  try {
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`)
    const data = await response.json()
    if (data[appId]?.success) {
      dlcData.value.set(appId, data[appId].data)
      return data[appId].data
    }
  } catch (error) {
    console.error('Failed to fetch DLC data:', error)
  }
  return null
}
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Rust Game Blueprints Reference</h1>
    <p class="mb-8">This section contains a comprehensive list of all crafting blueprints available in the game. Each blueprint shows the item details, crafting requirements, and research costs.</p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a :href="LINK_API" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <Database size="16"/>
          Blueprints API
          <ExternalLink size="14" class="opacity-80"/>
        </a>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" size="24"/>
      <span class="ml-2">Loading blueprints...</span>
    </div>

    <div v-else>
      <div class="filters mb-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center flex-1">
            <Search class="text-gray-400" size="20"/>
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="updateDebouncedSearch($event.target.value)"
              placeholder="Search blueprints..." 
              class="w-[400px] px-4 py-2"
            >
          </div>
          <select 
            v-model="selectedCategory"
            class="px-4 py-2 min-w-[140px]"
          >
            <option value="all">All Blueprints</option>
            <option 
              v-for="category in categories.filter(c => c !== 'all')" 
              :key="category" 
              :value="category"
            >
              {{ getItemCategoryText(category) }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="paginatedBlueprints && paginatedBlueprints.length">
        <div class="fixed bottom-4 right-4 z-50">
          <div class="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2">
            Showing {{ paginatedBlueprints.length }} of {{ filteredBlueprints.length }} blueprints
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="inline-block min-w-full p-4">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody>
                <tr v-for="bp in paginatedBlueprints" :key="bp.Item.ShortName" class="items-table-row">
                  <td class="whitespace-normal py-4">
                    <div class="flex gap-8">
                      <!-- Left Column: Blueprint Details -->
                      <div class="flex-1">
                        <div class="flex gap-4">
                          <!-- Item Image -->
                          <div class="flex-shrink-0">
                            <a :href="`/Carbon.Documentation/references/blueprints/details?id=${bp.Item.Id}`" class="block">
                              <div class="relative aspect-square overflow-hidden" style="width:150px; height:150px;">
                                <div v-if="!imageErrors.get(bp.Item.Id)" 
                                     class="absolute inset-0 bg-cover bg-center" 
                                     style="background-image: url('https://carbonmod.gg/assets/media/items/blueprintbase.png');">
                                </div>
                                <template v-if="!imageErrors.get(bp.Item.Id)">
                                  <img 
                                    :src="getItemImageUrl(bp.Item.ShortName)" 
                                    @error="(e) => handleImageError(e, bp.Item.Id)"
                                    class="w-full h-full object-contain p-4 relative z-10"
                                    :alt="bp.Item.DisplayName"
                                  >
                                </template>
                                <div v-else 
                                     class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                                  <div class="w-16 h-16 mb-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <Image size="48" class="text-gray-400"/>
                                  </div>
                                  <span class="text-sm text-gray-500 dark:text-gray-400">No image available</span>
                                  <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ bp.Item.ShortName }}</span>
                                </div>
                              </div>
                            </a>
                          </div>

                          <!-- Item Details -->
                          <div class="flex-1">
                            <!-- Header -->
                            <div class="flex items-center justify-between mb-2">
                              <h5 class="text-lg font-medium">
                                <a :href="`/Carbon.Documentation/references/blueprints/details?id=${bp.Item.Id}`" 
                                  class="hover:text-primary inline-flex items-center gap-2">
                                  {{ bp.Item.DisplayName }}
                                  <ExternalLink size="14" class="opacity-60"/>
                                </a>
                              </h5>
                              <div class="flex items-center gap-2">
                                <button 
                                  @click="copyToClipboard(bp.Item.ShortName, bp.Item.ShortName)" 
                                  class="flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                  <span class="font-mono">{{ bp.Item.ShortName }}</span>
                                  <component :is="copiedId === bp.Item.ShortName ? CheckCircle2 : Copy" 
                                           class="ml-2" 
                                           size="14"
                                  />
                                </button>
                              </div>
                            </div>

                            <!-- Badges -->
                            <div class="flex flex-wrap gap-2 mt-2">
                              <VPBadge :text="getItemCategoryText(bp.Item.Category)" class="opacity-75"
                                      :style="{ backgroundColor: CATEGORY_COLORS[bp.Item.Category], color: '#fff' }"/>
                              <VPBadge v-if="getItemRarityText(bp.Item.Rarity)" class="opacity-75" :text="getItemRarityText(bp.Item.Rarity)"
                                      :style="{ backgroundColor: RARITY_COLORS[bp.Item.Rarity], color: '#fff' }"/>
                              <VPBadge v-if="bp.UserCraftable" type="danger" :text="'Craftable'"/>
                              <VPBadge v-if="bp.WorkbenchLevelRequired >= 0" type="warning" :text="`Tier ${bp.WorkbenchLevelRequired}`"/>
                              <VPBadge v-if="bp.ScrapRequired > 0" type="info" :text="`${bp.ScrapRequired} Scrap`"/>
                              <VPBadge v-if="bp.NeedsSteamItem" type="danger" :text="'Steam Item Required'"/>
                              <VPBadge v-if="bp.NeedsSteamDLC" type="danger" :text="'Steam DLC Required'"/>
                            </div>

                            <!-- Description -->
                            <p v-if="bp.Item.Description" class="text-sm text-gray-600 dark:text-gray-400 mt-3">
                              {{ bp.Item.Description }}
                            </p>

                            <!-- Crafting Details -->
                            <div class="mt-4 space-y-3">
                              <!-- Time -->
                              <div class="flex items-center gap-2 text-sm">
                                <Clock size="16" class="text-gray-400"/>
                                <span>{{ bp.Time }} seconds</span>
                              </div>

                              <!-- Workbench -->
                              <div v-if="bp.WorkbenchLevelRequired >= 0" class="flex items-center gap-2 text-sm">
                                <Wrench size="16" class="text-gray-400"/>
                                <span>Requires Workbench Tier {{ bp.WorkbenchLevelRequired }}</span>
                              </div>

                              <!-- if requires dlc -->
                              <div v-if="bp.RequiresDLC" class="flex items-center gap-2 text-sm">
                                <span>Requires DLC: {{ bp.RequiresDLC }}</span>
                              </div>

                              <!-- Craft Amount -->
                              <div v-if="bp.CraftAmount > 1" class="flex items-center gap-2 text-sm">
                                <Scissors size="16" class="text-gray-400"/>
                                <span>Crafts {{ bp.CraftAmount }} at once</span>
                              </div>

                              <!-- Steam Requirements -->
                              <div v-if="bp.NeedsSteamItem || bp.NeedsSteamDLC" class="flex items-center gap-2 text-sm">
                                <Lock size="16" class="text-gray-400"/>
                                <span v-if="bp.NeedsSteamItem">Requires Steam Item</span>
                                <span v-if="bp.NeedsSteamItem && bp.NeedsSteamDLC"> & </span>
                                <span v-if="bp.NeedsSteamDLC">
                                  Requires Steam DLC: 
                                  <a v-if="bp.Item.SteamDlcItem" 
                                     :href="`https://store.steampowered.com/app/${bp.Item.SteamDlcItem.AppId}`"
                                     target="_blank"
                                     class="text-primary hover:underline"
                                  >
                                    {{ bp.Item.SteamDlcItem.Name }}
                                  </a>
                                </span>
                              </div>

                              <!-- Research Info -->
                              <div v-if="bp.ScrapRequired > 0 || bp.ScrapFromRecycle > 0" class="mt-2">
                                <div class="text-sm font-medium mb-1">Research Details:</div>
                                <div class="space-y-1">
                                  <div v-if="bp.ScrapRequired > 0" class="flex items-center gap-2 text-sm">
                                    <Lock size="16" class="text-gray-400"/>
                                    <span>Research Cost: {{ bp.ScrapRequired }} Scrap</span>
                                  </div>
                                  <div v-if="bp.ScrapFromRecycle > 0" class="flex items-center gap-2 text-sm">
                                    <Unlock size="16" class="text-gray-400"/>
                                    <span>Recycle Value: {{ bp.ScrapFromRecycle }} Scrap</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Right Column: Ingredients -->
                      <div v-if="bp.Ingredients?.length" class="w-64 flex-shrink-0">
                        <div class="sticky top-4">
                          <div class="text-sm font-medium mb-2">Required Materials:</div>
                          <div class="space-y-2">
                            <div v-for="ing in bp.Ingredients" :key="ing.Item.ShortName" 
                                 class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div class="flex items-center gap-2">
                                <div class="relative w-8 h-8 flex-shrink-0">
                                  <img 
                                    :src="getItemImageUrl(ing.Item.ShortName)" 
                                    @error="(e) => handleImageError(e, ing.Item.Id)"
                                    class="w-full h-full object-contain"
                                    :alt="ing.Item.DisplayName"
                                  >
                                  <div v-if="imageErrors.get(ing.Item.Id)" 
                                       class="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                    <Image size="16" class="text-gray-400"/>
                                  </div>
                                </div>
                                <button 
                                  class="text-sm hover:text-primary"
                                  @click="showItemModal(ing.Item.Id)"
                                >
                                  {{ ing.Item.DisplayName }}
                                </button>
                              </div>
                              <span class="text-sm font-medium">{{ ing.Amount }}x</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
        <p>No blueprints found matching your search</p>
        <p v-if="blueprints.value && blueprints.value.length === 0" class="mt-2 text-sm">
          Debug: No blueprints loaded. Check console for errors.
        </p>
        <p v-else-if="debouncedSearchQuery" class="mt-2 text-sm">
          Debug: Search query "{{ debouncedSearchQuery }}" returned no results.
        </p>
        <p v-else-if="selectedCategory !== 'all'" class="mt-2 text-sm">
          Debug: Category filter "{{ selectedCategory }}" returned no results.
        </p>
      </div>
    </div>

    <!-- Ingredient Modal -->
    <div v-if="showIngredientModal && selectedIngredient" 
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
         @click="closeIngredientModal">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4" 
           @click.stop>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">{{ selectedIngredient.Item.DisplayName }}</h3>
          <button @click="closeIngredientModal" class="text-gray-500 hover:text-gray-700">
            <X size="20"/>
          </button>
        </div>
        
        <div class="flex gap-4">
          <div class="flex-shrink-0">
            <div class="relative bg-gray-50 dark:bg-gray-700" style="width:100px; height:100px;">
              <img 
                :src="getItemImageUrl(selectedIngredient.Item.ShortName)" 
                @error="(e) => handleImageError(e, selectedIngredient.Item.Id)"
                class="w-full h-full object-contain p-4"
                :alt="selectedIngredient.Item.DisplayName"
              >
              <div v-if="imageErrors.get(selectedIngredient.Item.Id)" 
                   class="absolute inset-0 flex items-center justify-center">
                <Image size="32" class="text-gray-400"/>
              </div>
            </div>
          </div>
          
          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">{{ selectedIngredient.Item.Id }}</span>
              <button 
                @click="copyToClipboard(selectedIngredient.Item.Id, 'ingredient-id')" 
                class="flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <component :is="copiedId === 'ingredient-id' ? CheckCircle2 : Copy" size="12"/>
              </button>
            </div>
            
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">{{ selectedIngredient.Item.ShortName }}</span>
              <button 
                @click="copyToClipboard(selectedIngredient.Item.ShortName, 'ingredient-shortname')" 
                class="flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <component :is="copiedId === 'ingredient-shortname' ? CheckCircle2 : Copy" size="12"/>
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <VPBadge :text="getItemCategoryText(selectedIngredient.Item.Category)"
                      :style="{ backgroundColor: CATEGORY_COLORS[selectedIngredient.Item.Category], color: '#fff' }"/>
              <VPBadge :text="getItemRarityText(selectedIngredient.Item.Rarity)"
                      :style="{ backgroundColor: RARITY_COLORS[selectedIngredient.Item.Rarity], color: '#fff' }"/>
            </div>

            <p v-if="selectedIngredient.Item.Description" class="text-sm text-gray-600 dark:text-gray-300">
              {{ selectedIngredient.Item.Description }}
            </p>

            <div class="pt-2">
              <a :href="`/Carbon.Documentation/references/items/details?id=${selectedIngredient.Item.Id}`" 
                 class="vp-button medium brand flex items-center gap-2">
                View Full Details
                <ExternalLink size="14"/>
              </a>
            </div>
          </div>
        </div>

        <!-- DLC Info -->
        <div v-if="selectedIngredient.Item.SteamDlcItem" class="mt-4 pt-4 border-t">
          <div class="flex items-center gap-2 text-sm font-medium mb-2">
            <Lock size="16" class="text-gray-400"/>
            <span>Steam DLC Required</span>
          </div>
          <a :href="`https://store.steampowered.com/app/${selectedIngredient.Item.SteamDlcItem.AppId}`"
             target="_blank"
             class="block group"
          >
            <div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <img v-if="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.header_image"
                   :src="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.header_image"
                   class="w-24 h-12 object-cover rounded"
                   :alt="selectedIngredient.Item.SteamDlcItem.Name"
              >
              <div>
                <div class="font-medium group-hover:text-primary">
                  {{ selectedIngredient.Item.SteamDlcItem.Name }}
                </div>
                <div v-if="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.price_overview"
                     class="text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.price_overview.final_formatted }}
                </div>
              </div>
            </div>
          </a>
        </div>
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