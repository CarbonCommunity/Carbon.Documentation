<script setup lang="ts">
import { onMounted, ref, watch, Ref } from 'vue'
import {
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Image,
  Loader2,
  Lock,
  Scissors,
  Unlock,
  Wrench,
  X,
} from 'lucide-vue-next'
import {
  CATEGORY_COLORS,
  getItemCategoryText,
  getItemRarityText,
  RARITY_COLORS,
} from '../shared/constants'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import { fetchBlueprints } from '@/api/metadata/rust/blueprints'
import type { Blueprint, Ingredient } from '@/api/metadata/rust/blueprints'
import { URL_ASSETS_ITEMS, URL_ASSETS_MISSING, URL_METDAT_RUST_BLUEPRINTS } from '@/api/constants'

const blueprint: Ref<Blueprint | null> = ref(null)
const isLoading = ref(true)
const copiedId: Ref<string | number | null> = ref(null)
const imageError = ref(false)
const selectedIngredient: Ref<Ingredient | null> = ref(null)
const showIngredientModal = ref(false)
const dlcData = ref(new Map())

const getBlueprintId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('id')
}

const getItemImageUrl = (shortName: string) => {
  if (!shortName) return URL_ASSETS_MISSING
  return `${URL_ASSETS_ITEMS}/${shortName}.png`
}

const handleImageError = (event: Event) => {
  imageError.value = true
  console.warn(`Failed to load image for blueprint: ${(event.target as HTMLImageElement).src}`)
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

const fetchDlcData = async (appId: number) => {
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

const getDlcImageUrl = (appId: number) => {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
}

const loadBlueprint = async (blueprintId: string) => {
  try {
    if (!blueprintId) {
      console.error('No blueprint ID found in URL')
      return
    }

    const data = await fetchBlueprints()
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array')
    }

    const blueprintIdNumber = Number(blueprintId)

    const foundBlueprint = data.find((bp) => bp.Item.Id === blueprintIdNumber)
    if (foundBlueprint) {
      blueprint.value = foundBlueprint
      imageError.value = false

      // Fetch DLC data if needed
      if (foundBlueprint.Item.SteamDlcItem?.AppId) {
        await fetchDlcData(foundBlueprint.Item.SteamDlcItem.AppId)
        console.log(dlcData.value)
      }
    }
  } catch (error) {
    console.error('Failed to load blueprint:', error)
  } finally {
    isLoading.value = false
  }
}

const openIngredientModal = async (ingredient: Ingredient) => {
  selectedIngredient.value = ingredient
  showIngredientModal.value = true

  // Fetch DLC data if needed
  if (ingredient.Item.SteamDlcItem?.AppId) {
    await fetchDlcData(ingredient.Item.SteamDlcItem.AppId)
  }
}

const closeIngredientModal = () => {
  showIngredientModal.value = false
  selectedIngredient.value = null
}

onMounted(() => {
  const blueprintId = getBlueprintId()
  if (blueprintId) {
    loadBlueprint(blueprintId)
  }
})

watch(
  () => window.location.search,
  () => {
    const blueprintId = getBlueprintId()
    if (blueprintId) {
      isLoading.value = true
      loadBlueprint(blueprintId)
    }
  }
)

watch(
  blueprint,
  (newBlueprint) => {
    if (newBlueprint) {
      document.title = `${newBlueprint.Item.DisplayName} - Carbon Documentation`
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" :size="24" />
      <span class="ml-2">Loading blueprint...</span>
    </div>

    <!-- Blueprint Found -->
    <div v-else-if="blueprint" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold">{{ blueprint.Item.DisplayName }}</h1>
          <button
            @click="copyToClipboard(blueprint.Item.Id.toString(), blueprint.Item.Id)"
            class="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span class="font-mono">{{ blueprint.Item.Id }}</span>
            <component :is="copiedId === blueprint.Item.Id ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
          <button
            @click="copyToClipboard(blueprint.Item.ShortName, 'shortname')"
            class="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span class="font-mono">{{ blueprint.Item.ShortName }}</span>
            <component
              :is="copiedId === blueprint.Item.ShortName ? CheckCircle2 : Copy"
              class="ml-2"
              :size="14"
            />
          </button>
        </div>
        <a
          :href="`${URL_METDAT_RUST_BLUEPRINTS}`"
          target="_blank"
          class="vp-button medium brand flex items-center gap-2"
        >
          <Database :size="16" />
          Blueprints API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>

      <!-- Content -->
      <div class="flex gap-8">
        <!-- Blueprint Image -->
        <div class="flex-shrink-0">
          <div class="relative bg-gray-50 dark:bg-gray-800" style="width: 300px; height: 300px">
            <div
              v-if="!imageError"
              class="absolute inset-0 bg-cover bg-center"
              style="background-image: url('https://cdn.carbonmod.gg/items/blueprintbase.png')"
            ></div>
            <template v-if="!imageError">
              <img
                :src="getItemImageUrl(blueprint.Item.ShortName)"
                @error="handleImageError"
                class="w-full h-full object-contain p-8 relative z-10"
                :alt="blueprint.Item.DisplayName"
              />
            </template>
            <div
              v-else
              class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10"
            >
              <div class="w-16 h-16 mb-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Image :size="48" class="text-gray-400" />
              </div>
              <span class="text-sm text-gray-500 dark:text-gray-400">No image available</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{
                blueprint.Item.ShortName
              }}</span>
            </div>
          </div>
        </div>

        <!-- Blueprint Info -->
        <div class="flex-1 space-y-4">
          <!-- Badges -->
          <div class="flex flex-wrap gap-2">
            <VPBadge
              :text="getItemCategoryText(blueprint.Item.Category)"
              class="opacity-75"
              :style="{ backgroundColor: CATEGORY_COLORS[blueprint.Item.Category as keyof typeof CATEGORY_COLORS], color: '#fff' }"
            />
            <VPBadge
              :text="getItemRarityText(blueprint.Item.Rarity)"
              class="opacity-75"
              :style="{ backgroundColor: RARITY_COLORS[blueprint.Item.Rarity as keyof typeof RARITY_COLORS], color: '#fff' }"
            />
            <VPBadge v-if="blueprint.UserCraftable" type="danger" :text="'Craftable'" />
            <VPBadge
              v-if="blueprint.WorkbenchLevelRequired >= 0"
              class="opacity-75"
              type="warning"
              :text="`Tier ${blueprint.WorkbenchLevelRequired}`"
            />
            <VPBadge
              v-if="blueprint.ScrapRequired > 0"
              type="info"
              :text="`${blueprint.ScrapRequired} Scrap`"
            />
            <VPBadge v-if="blueprint.NeedsSteamItem" type="danger" :text="'Steam Item Required'" />
            <VPBadge v-if="blueprint.NeedsSteamDLC" type="danger" :text="'Steam DLC Required'" />
          </div>

          <!-- Description -->
          <p v-if="blueprint.Item.Description" class="text-gray-600 dark:text-gray-300">
            {{ blueprint.Item.Description }}
          </p>

          <!-- Crafting Details -->
          <div class="space-y-4">
            <!-- Time -->
            <div class="flex items-center gap-2">
              <Clock :size="16" class="text-gray-400" />
              <span>Crafting Time: {{ blueprint.Time }} seconds</span>
            </div>

            <!-- Workbench -->
            <div v-if="blueprint.WorkbenchLevelRequired >= 0" class="flex items-center gap-2">
              <Wrench :size="16" class="text-gray-400" />
              <span>Requires Workbench Tier {{ blueprint.WorkbenchLevelRequired }}</span>
            </div>

            <!-- Craft Amount -->
            <div v-if="blueprint.CraftAmount > 1" class="flex items-center gap-2">
              <Scissors :size="16" class="text-gray-400" />
              <span>Crafts {{ blueprint.CraftAmount }} at once</span>
            </div>

            <!-- Requirements -->
            <div v-if="blueprint.Ingredients?.length" class="mt-4">
              <h3 class="text-lg font-medium mb-2">Required Materials:</h3>
              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="ing in blueprint.Ingredients"
                  :key="ing.Item.ShortName"
                  class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div class="flex items-center gap-2">
                    <div class="relative w-8 h-8 flex-shrink-0">
                      <img
                        :src="getItemImageUrl(ing.Item.ShortName)"
                        @error="(e) => handleImageError(e)"
                        class="w-full h-full object-contain"
                        :alt="ing.Item.DisplayName"
                      />
                      <div
                        v-if="imageError"
                        class="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700"
                      >
                        <Image :size="16" class="text-gray-400" />
                      </div>
                    </div>
                    <button @click="openIngredientModal(ing)" class="text-sm hover:text-primary">
                      {{ ing.Item.DisplayName }}
                    </button>
                  </div>
                  <span class="text-sm font-medium">{{ ing.Amount }}x</span>
                </div>
              </div>
            </div>

            <!-- Research Info -->
            <div v-if="blueprint.ScrapRequired > 0 || blueprint.ScrapFromRecycle > 0" class="mt-4">
              <h3 class="text-lg font-medium mb-2">Research Details:</h3>
              <div class="space-y-2">
                <div v-if="blueprint.ScrapRequired > 0" class="flex items-center gap-2">
                  <Lock :size="16" class="text-gray-400" />
                  <span>Research Cost: {{ blueprint.ScrapRequired }} Scrap</span>
                </div>
                <div v-if="blueprint.ScrapFromRecycle > 0" class="flex items-center gap-2">
                  <Unlock :size="16" class="text-gray-400" />
                  <span>Recycle Value: {{ blueprint.ScrapFromRecycle }} Scrap</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DLC Info -->
      <div v-if="blueprint.Item.SteamDlcItem" class="mt-4 pt-4">
        <div class="flex items-center gap-2 text-lg font-medium mb-4">
          <Lock :size="20" class="text-gray-400" />
          <span>Required DLC</span>
        </div>
        <a
          :href="`https://store.steampowered.com/app/${blueprint.Item.SteamDlcItem.AppId}`"
          target="_blank"
          class="block group"
        >
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
            <!-- DLC Image -->
            <div class="relative">
              <img
                :src="getDlcImageUrl(blueprint.Item.SteamDlcItem.AppId)"
                class=""
                :alt="blueprint.Item.SteamDlcItem.Name"
                @error="(e) => (e.target as HTMLImageElement).parentElement?.classList.add('hidden')"
              />
            </div>

            <!-- DLC Info -->
            <div class="p-4">
              <div class="text-xl font-medium group-hover:text-primary mb-2">
                {{ blueprint.Item.SteamDlcItem.Name }}
              </div>
              <div class="flex items-center gap-4">
                <div
                  v-if="dlcData.get(blueprint.Item.SteamDlcItem.AppId)?.price_overview"
                  class="text-lg font-medium text-primary"
                >
                  {{ dlcData.get(blueprint.Item.SteamDlcItem.AppId)?.price_overview.final_formatted }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  View on Steam
                  <ExternalLink :size="14" class="inline ml-1" />
                </div>
              </div>
              <div
                v-if="dlcData.get(blueprint.Item.SteamDlcItem.AppId)?.short_description"
                class="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3"
              >
                {{ dlcData.get(blueprint.Item.SteamDlcItem.AppId)?.short_description }}
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- Blueprint Not Found -->
    <div v-else class="text-center py-8">
      <div class="space-y-4">
        <p class="text-gray-500">Blueprint not found</p>
        <a href="/references/blueprints" class="vp-button medium brand"> Back to Blueprints </a>
      </div>
    </div>

    <!-- Ingredient Modal -->
    <div
      v-if="showIngredientModal && selectedIngredient"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="closeIngredientModal"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4" @click.stop>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">{{ selectedIngredient.Item.DisplayName }}</h3>
          <button @click="closeIngredientModal" class="text-gray-500 hover:text-gray-700">
            <X :size="20" />
          </button>
        </div>

        <div class="flex gap-4">
          <div class="flex-shrink-0">
            <div class="relative bg-gray-50 dark:bg-gray-700" style="width: 100px; height: 100px">
              <img
                :src="getItemImageUrl(selectedIngredient.Item.ShortName)"
                @error="(e) => handleImageError(e)"
                class="w-full h-full object-contain p-4"
                :alt="selectedIngredient.Item.DisplayName"
              />
              <div v-if="imageError" class="absolute inset-0 flex items-center justify-center">
                <Image :size="32" class="text-gray-400" />
              </div>
            </div>
          </div>

          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">{{ selectedIngredient.Item.Id }}</span>
              <button
                @click="copyToClipboard(selectedIngredient.Item.Id.toString(), 'ingredient-id')"
                class="flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <component :is="copiedId === 'ingredient-id' ? CheckCircle2 : Copy" :size="12" />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">{{ selectedIngredient.Item.ShortName }}</span>
              <button
                @click="copyToClipboard(selectedIngredient.Item.ShortName, 'ingredient-shortname')"
                class="flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <component :is="copiedId === 'ingredient-shortname' ? CheckCircle2 : Copy" :size="12" />
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <VPBadge
                :text="getItemCategoryText(selectedIngredient.Item.Category)"
                :style="{ backgroundColor: CATEGORY_COLORS[selectedIngredient.Item.Category as keyof typeof CATEGORY_COLORS], color: '#fff' }"
              />
              <VPBadge
                :text="getItemRarityText(selectedIngredient.Item.Rarity)"
                :style="{ backgroundColor: RARITY_COLORS[selectedIngredient.Item.Rarity as keyof typeof RARITY_COLORS], color: '#fff' }"
              />
            </div>

            <p v-if="selectedIngredient.Item.Description" class="text-sm text-gray-600 dark:text-gray-300">
              {{ selectedIngredient.Item.Description }}
            </p>

            <div class="pt-2">
              <a
                :href="`/references/items/details?id=${selectedIngredient.Item.Id}`"
                class="vp-button medium brand flex items-center gap-2"
              >
                View Full Details
                <ExternalLink :size="14" />
              </a>
            </div>
          </div>
        </div>

        <!-- DLC Info -->
        <div v-if="selectedIngredient?.Item?.SteamDlcItem" class="mt-4 pt-4">
          <div class="flex items-center gap-2 text-sm font-medium mb-2">
            <Lock :size="16" class="text-gray-400" />
            <span>Steam DLC Required</span>
          </div>
          <a
            :href="`https://store.steampowered.com/app/${selectedIngredient.Item.SteamDlcItem.AppId}`"
            target="_blank"
            class="block group"
          >
            <div
              class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <img
                :src="getDlcImageUrl(selectedIngredient.Item.SteamDlcItem.AppId)"
                class="w-32 h-auto rounded"
                :alt="selectedIngredient.Item.SteamDlcItem.Name"
                @error="(e) => (e.target as HTMLImageElement).parentElement?.classList.add('hidden')"
              />
              <div>
                <div class="font-medium group-hover:text-primary">
                  {{ selectedIngredient.Item.SteamDlcItem.Name }}
                </div>
                <div
                  v-if="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.price_overview"
                  class="text-sm text-gray-600 dark:text-gray-400"
                >
                  {{
                    dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.price_overview.final_formatted
                  }}
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
