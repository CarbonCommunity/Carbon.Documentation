<script setup lang="ts">
import { URL_ASSETS_PREFABS, URL_METDAT_RUST_PREFABS } from '@/api/constants'
import type { Prefab } from '@/api/metadata/rust/prefabs'
import { fetchPrefabs } from '@/api/metadata/rust/prefabs'
import { ArrowLeft, CheckCircle2, Copy, Database, ExternalLink, Image, Loader2 } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import { onMounted, onUnmounted, ref, Ref, watch } from 'vue'

const prefab: Ref<Prefab | null> = ref(null)
const isLoading = ref(true)
const isSide = ref(false)
const copiedId = ref<string | number | null>(null)
const imageError = ref(false)

const timerDelay = 4000
let timerSwitch: ReturnType<typeof setTimeout> = null!

const copyToClipboard = async (text: string, id: string | number | null = null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const getPrefabId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('id')
}

const handleImageError = (event: Event) => {
  imageError.value = true
  console.warn(`Failed to load image for prefab: ${(event.target as HTMLImageElement).src}`)
}

const loadPrefab = async (prefabId: string) => {
  try {
    if (!prefabId) {
      console.error('No prefab ID found in URL')
      return
    }

    const prefabIdNumber = Number(prefabId)

    const { data } = await fetchPrefabs()
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array')
    }

    const foundPrefab = data.find((e) => e.ID === prefabIdNumber)
    if (foundPrefab) {
      prefab.value = foundPrefab
      imageError.value = false // Reset image error state when loading new prefab
    }
  } catch (error) {
    console.error('Failed to load prefab:', error)
  } finally {
    isLoading.value = false
  }
}

function switchSidesTimer() {
  isSide.value = !isSide.value
  timerSwitch = setTimeout(switchSidesTimer, timerDelay)
}

onMounted(() => {
  const prefabId = getPrefabId()
  if (prefabId) {
    loadPrefab(prefabId)
  }
  timerSwitch = setTimeout(switchSidesTimer, timerDelay)
})

onUnmounted(() => {
  clearTimeout(timerSwitch)
})

// Watch for URL changes
watch(
  () => window.location.search,
  () => {
    const prefabId = getPrefabId()
    if (prefabId) {
      isLoading.value = true
      loadPrefab(prefabId)
    }
  }
)

// Update page title when prefab is loaded
watch(
  prefab,
  (newPrefab) => {
    if (newPrefab) {
      document.title = `${newPrefab.Path.split('/').pop()} - Carbon Documentation`
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
      <span class="ml-2">Loading prefab...</span>
    </div>

    <!-- Prefab Found -->
    <div v-else-if="prefab" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold">{{ prefab.Path.split('/').pop() }}</h1>
          <button
            @click="copyToClipboard(prefab.ID.toString(), prefab.ID)"
            class="flex items-center bg-gray-100 px-3 py-1.5 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <span class="font-mono">{{ prefab.ID }}</span>
            <component :is="copiedId === prefab.ID ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
        </div>
        <a :href="URL_METDAT_RUST_PREFABS" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <Database :size="16" />
          Prefabs API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>

      <!-- Content -->
      <div class="flex gap-8">
        <!-- Prefab Image -->
        <div class="flex-shrink-0">
          <div class="relative bg-gray-50 dark:bg-gray-800" style="width: 300px; height: 300px">
            <template v-if="!imageError">
              <img
                :src="URL_ASSETS_PREFABS + '/' + prefab.ID + (isSide ? '.side' : '') + '.png'"
                @error="handleImageError"
                class="h-full w-full object-contain p-0"
                :alt="prefab.Path.split('/').pop()"
              />
              <img src="/misc/border-edge.webp" class="dark-only pointer-events-none absolute inset-0 h-full w-full object-contain" alt="Overlay" />
              <img src="/misc/border-edge-light.webp" class="light-only pointer-events-none absolute inset-0 h-full w-full object-contain" alt="Overlay" />
            </template>
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <div class="mb-4 flex h-16 w-16 items-center justify-center bg-gray-200 dark:bg-gray-700">
                <Image :size="48" class="text-gray-400" />
              </div>
              <span class="text-sm text-gray-500 dark:text-gray-400">No image available</span>
              <span class="mt-1 text-xs text-gray-400 dark:text-gray-500">ID: {{ prefab.ID }}</span>
            </div>
          </div>
        </div>

        <!-- Prefab Info -->
        <div class="flex-1 space-y-4">
          <div class="dark:bg-gray-700">
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              <template v-for="component in prefab.Components" :key="component">
                <VPBadge type="info" :text="component" />
              </template>
            </div>
          </div>

          <div class="space-y-2">
            <h2 class="text-xl font-semibold">Path:</h2>
            <div class="flex items-center gap-2">
              <div class="flex-1 break-all bg-gray-50 p-3 font-mono text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {{ prefab.Path }}
              </div>
              <button
                @click="copyToClipboard(prefab.Path, 'path')"
                class="flex items-center bg-gray-100 px-3 py-1.5 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <component :is="copiedId === 'path' ? CheckCircle2 : Copy" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Return to Prefabs -->
      <div class="mt-8 flex justify-center">
        <div class="flex items-center gap-2">
          <ArrowLeft :size="16" class="opacity-80" />
          <a href="/references/prefabs" class="vp-button medium brand underline"> Back to Prefabs </a>
        </div>
      </div>
    </div>

    <!-- Prefab Not Found -->
    <div v-else class="py-8 text-center">
      <div class="space-y-4">
        <p class="text-gray-500">Prefab not found</p>
        <div class="flex items-center justify-center gap-2">
          <ArrowLeft :size="16" class="opacity-80" />
          <a href="/references/prefabs" class="vp-button medium brand underline"> Back to Prefabs </a>
        </div>
      </div>
    </div>
  </div>
</template>
