<script setup lang="ts">
import { URL_ASSETS_ITEMS, URL_ASSETS_MISSING } from '@/api/constants'
import type { Blueprint, Ingredient } from '@/api/metadata/rust/blueprints'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { Clock, ExternalLink, Lock, Scissors, Unlock, Wrench, X } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import { Ref, ref } from 'vue'
import { CATEGORY_COLORS, getItemCategoryText, getItemRarityText, RARITY_COLORS } from '../shared/constants'

const { blueprint } = defineProps<{
  blueprint: Blueprint
}>()

const selectedIngredient: Ref<Ingredient | null> = ref(null)
const showIngredientModal = ref(false)
const dlcData: Ref<Map<number, unknown>> = ref(new Map()) // https://store.steampowered.com/api/appdetails?appids=1174370

function getItemImageUrl(shortName: string) {
  if (!shortName) return URL_ASSETS_MISSING
  return `${URL_ASSETS_ITEMS}/${shortName}.png`
}

async function showItemModal(itemId: number) {
  const ingredient = blueprint.Ingredients?.find((ing) => ing.Item.Id === itemId)

  if (ingredient) {
    selectedIngredient.value = ingredient
    showIngredientModal.value = true

    if (ingredient.Item.SteamDlcItem?.AppId) {
      await fetchDlcData(ingredient.Item.SteamDlcItem.AppId)
    }
  }
}

function closeIngredientModal() {
  showIngredientModal.value = false
  selectedIngredient.value = null
}

async function fetchDlcData(appId: number) {
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
  <div>
    <div class="whitespace-normal py-4">
      <div class="flex gap-8">
        <!-- Left Column: Blueprint Details -->
        <div class="flex-1">
          <div class="flex gap-4">
            <!-- Item Image -->
            <div class="flex-shrink-0">
              <a :href="`/references/blueprints/details?id=${blueprint.Item.Id}`" class="block">
                <div class="relative aspect-square overflow-hidden" style="width: 150px; height: 150px">
                  <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('https://cdn.carbonmod.gg/items/blueprintbase.png')"></div>
                  <img
                    :src="getItemImageUrl(blueprint.Item.ShortName)"
                    class="relative z-10 h-full w-full object-contain p-4"
                    :alt="blueprint.Item.DisplayName"
                    :onerror="`this.src='${URL_ASSETS_MISSING}'`"
                    loading="lazy"
                  />
                </div>
              </a>
            </div>

            <!-- Item Details -->
            <div class="flex-1">
              <!-- Header -->
              <div class="mb-2 flex items-center justify-between">
                <h5 class="text-lg font-medium">
                  <a :href="`/references/blueprints/details?id=${blueprint.Item.Id}`" class="hover:text-primary inline-flex items-center gap-2">
                    {{ blueprint.Item.DisplayName }}
                    <ExternalLink :size="14" class="opacity-60" />
                  </a>
                </h5>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-sm">{{ blueprint.Item.ShortName }}</span>
                  <ButtonIconCopy :getTextToCopy="() => blueprint.Item.ShortName" title="Copy shortname" class="opacity-60" />
                </div>
              </div>

              <!-- Badges -->
              <div class="mt-2 flex flex-wrap gap-2">
                <VPBadge
                  :text="getItemCategoryText(blueprint.Item.Category)"
                  class="opacity-75"
                  :style="{ backgroundColor: CATEGORY_COLORS[blueprint.Item.Category as keyof typeof CATEGORY_COLORS], color: '#fff' }"
                />
                <VPBadge
                  v-if="blueprint.Item.Rarity != 0"
                  class="opacity-75"
                  :text="getItemRarityText(blueprint.Item.Rarity)"
                  :style="{ backgroundColor: RARITY_COLORS[blueprint.Item.Rarity as keyof typeof RARITY_COLORS], color: '#fff' }"
                />
                <VPBadge v-if="blueprint.UserCraftable" type="danger" :text="'Craftable'" />
                <VPBadge v-if="blueprint.WorkbenchLevelRequired >= 0" type="warning" :text="`Tier ${blueprint.WorkbenchLevelRequired}`" />
                <VPBadge v-if="blueprint.ScrapRequired > 0" type="info" :text="`${blueprint.ScrapRequired} Scrap`" />
                <VPBadge v-if="blueprint.NeedsSteamItem" type="danger" :text="'Steam Item Required'" />
                <VPBadge v-if="blueprint.NeedsSteamDLC" type="danger" :text="'Steam DLC Required'" />
              </div>

              <!-- Description -->
              <p v-if="blueprint.Item.Description" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {{ blueprint.Item.Description }}
              </p>

              <!-- Crafting Details -->
              <div class="mt-4 space-y-3">
                <!-- Time -->
                <div class="flex items-center gap-2 text-sm">
                  <Clock :size="16" class="text-gray-400" />
                  <span>{{ blueprint.Time }} seconds</span>
                </div>

                <!-- Workbench -->
                <div v-if="blueprint.WorkbenchLevelRequired >= 0" class="flex items-center gap-2 text-sm">
                  <Wrench :size="16" class="text-gray-400" />
                  <span>Requires Workbench Tier {{ blueprint.WorkbenchLevelRequired }}</span>
                </div>

                <!-- Craft Amount -->
                <div v-if="blueprint.CraftAmount > 1" class="flex items-center gap-2 text-sm">
                  <Scissors :size="16" class="text-gray-400" />
                  <span>Crafts {{ blueprint.CraftAmount }} at once</span>
                </div>

                <!-- Steam Requirements -->
                <div v-if="blueprint.NeedsSteamItem || blueprint.NeedsSteamDLC" class="flex items-center gap-2 text-sm">
                  <Lock :size="16" class="text-gray-400" />
                  <span v-if="blueprint.NeedsSteamItem">Requires Steam Item</span>
                  <span v-if="blueprint.NeedsSteamItem && blueprint.NeedsSteamDLC"> & </span>
                  <span v-if="blueprint.NeedsSteamDLC">
                    Requires Steam DLC:
                    <a
                      v-if="blueprint.Item.SteamDlcItem"
                      :href="`https://store.steampowered.com/app/${blueprint.Item.SteamDlcItem.AppId}`"
                      target="_blank"
                      class="text-primary hover:underline"
                    >
                      {{ blueprint.Item.SteamDlcItem.Name }}
                    </a>
                  </span>
                </div>

                <!-- Research Info -->
                <div v-if="blueprint.ScrapRequired > 0 || blueprint.ScrapFromRecycle > 0" class="mt-2">
                  <div class="mb-1 text-sm font-medium">Research Details:</div>
                  <div class="space-y-1">
                    <div v-if="blueprint.ScrapRequired > 0" class="flex items-center gap-2 text-sm">
                      <Lock :size="16" class="text-gray-400" />
                      <span>Research Cost: {{ blueprint.ScrapRequired }} Scrap</span>
                    </div>
                    <div v-if="blueprint.ScrapFromRecycle > 0" class="flex items-center gap-2 text-sm">
                      <Unlock :size="16" class="text-gray-400" />
                      <span>Recycle Value: {{ blueprint.ScrapFromRecycle }} Scrap</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Ingredients -->
        <div v-if="blueprint.Ingredients?.length" class="w-64 flex-shrink-0">
          <div class="sticky top-4">
            <div class="mb-2 text-sm font-medium">Required Materials:</div>
            <div class="space-y-2">
              <div
                v-for="ing in blueprint.Ingredients"
                :key="ing.Item.ShortName"
                class="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
              >
                <div class="flex items-center gap-2">
                  <div class="relative h-8 w-8 flex-shrink-0">
                    <img
                      :src="getItemImageUrl(ing.Item.ShortName)"
                      class="h-full w-full object-contain"
                      :alt="ing.Item.DisplayName"
                      :onerror="`this.src='${URL_ASSETS_MISSING}'`"
                      loading="lazy"
                    />
                  </div>
                  <button class="hover:text-primary text-sm" @click="showItemModal(ing.Item.Id)">
                    {{ ing.Item.DisplayName }}
                  </button>
                </div>
                <span class="text-sm font-medium">{{ ing.Amount }}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showIngredientModal && selectedIngredient" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="closeIngredientModal">
      <div class="mx-4 w-full max-w-lg rounded-lg bg-white p-6 dark:bg-gray-800" @click.stop>
        <div class="mb-4 flex items-center justify-between">
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
                class="h-full w-full object-contain p-4"
                :alt="selectedIngredient.Item.DisplayName"
                :onerror="`this.src='${URL_ASSETS_MISSING}'`"
                loading="lazy"
              />
            </div>
          </div>

          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">{{ selectedIngredient.Item.Id }}</span>
              <ButtonIconCopy :getTextToCopy="() => selectedIngredient!.Item.Id.toString()" title="Copy item id" class="opacity-60" />
            </div>

            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">{{ selectedIngredient.Item.ShortName }}</span>
              <ButtonIconCopy :getTextToCopy="() => selectedIngredient!.Item.ShortName" title="Copy shortname" class="opacity-60" />
            </div>

            <div class="flex flex-wrap gap-2">
              <VPBadge
                :text="getItemCategoryText(selectedIngredient.Item.Category)"
                :style="{ backgroundColor: CATEGORY_COLORS[selectedIngredient.Item.Category as keyof typeof CATEGORY_COLORS], color: '#fff' }"
              />
              <VPBadge
                v-if="selectedIngredient.Item.Rarity != 0"
                :text="getItemRarityText(selectedIngredient.Item.Rarity)"
                :style="{ backgroundColor: RARITY_COLORS[selectedIngredient.Item.Rarity as keyof typeof RARITY_COLORS], color: '#fff' }"
              />
            </div>

            <p v-if="selectedIngredient.Item.Description" class="text-sm text-gray-600 dark:text-gray-300">
              {{ selectedIngredient.Item.Description }}
            </p>

            <div class="pt-2">
              <a :href="`/references/items/details?id=${selectedIngredient.Item.Id}`" class="vp-button medium brand flex items-center gap-2">
                View Full Details
                <ExternalLink :size="14" />
              </a>
            </div>
          </div>
        </div>

        <!-- DLC Info -->
        <div v-if="selectedIngredient.Item.SteamDlcItem" class="mt-4 border-t pt-4">
          <div class="mb-2 flex items-center gap-2 text-sm font-medium">
            <Lock :size="16" class="text-gray-400" />
            <span>Steam DLC Required</span>
          </div>
          <a :href="`https://store.steampowered.com/app/${selectedIngredient.Item.SteamDlcItem.AppId}`" target="_blank" class="group block">
            <div class="flex items-center gap-4 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600">
              <img
                v-if="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.header_image"
                :src="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.header_image"
                class="h-12 w-24 rounded object-cover"
                :alt="selectedIngredient.Item.SteamDlcItem.Name"
                :onerror="`this.src='${URL_ASSETS_MISSING}'`"
                loading="lazy"
              />
              <div>
                <div class="group-hover:text-primary font-medium">
                  {{ selectedIngredient.Item.SteamDlcItem.Name }}
                </div>
                <div v-if="dlcData.get(selectedIngredient.Item.SteamDlcItem.AppId)?.price_overview" class="text-sm text-gray-600 dark:text-gray-400">
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
