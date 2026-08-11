<script setup lang="ts">
import { URL_ASSETS_ITEMS, URL_ASSETS_MISSING, URL_METDAT_RUST_ITEMS } from '@/api/constants'
import type { Item } from '@/api/metadata/rust/items'
import { fetchItems } from '@/api/metadata/rust/items'
import { ArrowLeft, CheckCircle2, Copy, Database, ExternalLink, Loader2, Tag } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import { onMounted, ref, Ref, watch } from 'vue'
import { getItemCategoryText, getItemFlagText, getItemRarityText } from '../shared/constants'

const item: Ref<Item | null> = ref(null)
const isLoading = ref(true)
const copiedId = ref<string | number | null>(null)

const copyToClipboard = async (text: string, id: string | number | null = null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const getItemId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('id')
}

const getItemImageUrl = (shortName: string) => {
  if (!shortName) return URL_ASSETS_MISSING
  return `${URL_ASSETS_ITEMS}/${shortName}.png`
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = URL_ASSETS_MISSING
  console.warn(`Failed to load image for item: ${target.src}`)
}

const loadItem = async (itemId: string | number) => {
  try {
    if (!itemId) {
      console.error('No item ID found in URL')
      return
    }

    const { data } = await fetchItems()
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array')
    }

    const itemIdNumber = Number(itemId)

    const foundItem = data.find((i) => i.Id === itemIdNumber)
    if (foundItem) {
      item.value = foundItem
    }
  } catch (error) {
    console.error('Failed to load item:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const itemId = getItemId()
  if (itemId) {
    loadItem(itemId)
  }
})

watch(
  () => window.location.search,
  () => {
    const itemId = getItemId()
    if (itemId) {
      isLoading.value = true
      loadItem(itemId)
    }
  }
)

watch(
  item,
  (newItem) => {
    if (newItem) {
      document.title = `${newItem.DisplayName} - Carbon Documentation`
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="mx-auto max-w-screen-lg px-4 py-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" :size="24" />
      <span class="ml-2">Loading item...</span>
    </div>

    <!-- Item Found -->
    <div v-else-if="item" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <VPBadge type="info" :text="getItemCategoryText(item.Category)" />
          <h1 class="text-2xl font-bold">{{ item.DisplayName }}</h1>
          <button
            @click="copyToClipboard(item.Id.toString(), item.Id)"
            class="flex items-center bg-gray-100 px-3 py-1.5 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <span class="font-mono">{{ item.Id }}</span>
            <component :is="copiedId === item.Id ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
          <button
            @click="copyToClipboard(item.ShortName, 'shortname')"
            class="flex items-center bg-gray-100 px-3 py-1.5 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <span class="font-mono">{{ item.ShortName }}</span>
            <component :is="copiedId === item.ShortName ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
        </div>
        <a :href="`${URL_METDAT_RUST_ITEMS}`" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <Database :size="16" />
          Items API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>

      <!-- Content -->
      <div class="flex gap-8">
        <!-- Item Image -->
        <div class="flex-shrink-0">
          <div class="relative bg-gray-50 dark:bg-gray-800" style="width: 300px; height: 300px">
            <img :src="getItemImageUrl(item.ShortName)" @error="handleImageError" class="h-full w-full object-contain p-8" :alt="item.DisplayName" />
            <div class="absolute inset-0 flex items-center justify-center" v-if="!item.Id">
              <Tag :size="48" class="text-gray-400" />
            </div>
          </div>
        </div>

        <!-- Item Info -->
        <div class="flex-1 space-y-4">
          <div class="dark:bg-gray-700">
            <p class="text-gray-600 dark:text-gray-300">{{ item.Description }}</p>
            <div class="mt-4 flex flex-wrap gap-1">
              <VPBadge v-if="item.Rarity != 0" type="danger" :text="getItemRarityText(item.Rarity)" />

              <VPBadge type="info" :text="`Stack: ${item.Stack}`" />
              <template v-for="flag in getItemFlagText(item.Flags)" :key="flag">
                <VPBadge type="danger" :text="flag" />
              </template>
              <VPBadge type="warning" v-if="item.SteamDlcItem" text="DLC Item" />
              <VPBadge type="warning" v-if="item.SteamStoreItem" text="Store Item" />
              <VPBadge type="warning" v-if="item.RedirectOf" text="Store Skin Item" />
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2"></div>
          </div>
        </div>
      </div>

      <!-- Return to Items -->
      <div class="mt-8 flex justify-center">
        <div class="flex items-center gap-2">
          <ArrowLeft :size="16" class="opacity-80" />
          <a href="/references/items" class="vp-button medium brand underline"> Back to Items </a>
        </div>
      </div>

      <div class="flex flex-col gap-6" v-if="item.ItemMods">
        <div class="flex flex-col gap-2">
          <h2 class="text-xl font-bold">Item Mods</h2>
          <code>{{ item.ItemMods.join(', ') }}</code>
        </div>
        <template v-for="([key1, value1], index1) in Object.entries(item).filter(([key, value]) => key.startsWith('ItemMod_') && value != null)" :key="index1">
          <div class="flex flex-col gap-2">
            <h2 class="text-xl font-bold">{{ key1 }}</h2>
            <div class="flex flex-col gap-2">
              <template v-for="([key2, value2], index2) in Object.entries(value1)" :key="index2">
                <code>{{ key2 }}: {{ value2 }}</code>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Item Not Found -->
    <div v-else class="py-8 text-center">
      <div class="space-y-4">
        <p class="text-gray-500">Item not found</p>
        <a href="/references/items" class="vp-button medium brand"> Back to Items </a>
      </div>
    </div>
  </div>
</template>
