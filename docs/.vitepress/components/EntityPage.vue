<script setup lang="ts">
import { onMounted, ref, watch, Ref } from 'vue'
import { ArrowLeft, CheckCircle2, Copy, Database, ExternalLink, Image, Loader2 } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import '../theme/style.css'
import { fetchEntities } from '@/api/metadata/rust/entities'
import type { Entity } from '@/api/metadata/rust/entities'
import { URL_ASSETS_ITEMS, URL_METDAT_RUST_ENTITIES } from '@/api/constants'

const entity: Ref<Entity | null> = ref(null)
const isLoading = ref(true)
const copiedId = ref<string | number | null>(null)
const imageError = ref(false)

const copyToClipboard = async (text: string, id: string | number | null = null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const getEntityId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('id')
}

const getEntityImageUrl = (id: number) => {
  if (!id) return null
  return `${URL_ASSETS_ITEMS}/${id}.png`
}

const handleImageError = (event: Event) => {
  imageError.value = true
  console.warn(`Failed to load image for entity: ${(event.target as HTMLImageElement).src}`)
}

const loadEntity = async (entityId: string) => {
  try {
    if (!entityId) {
      console.error('No entity ID found in URL')
      return
    }

    const data = await fetchEntities()
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array')
    }

    const entityIdNumber = Number(entityId)

    const foundEntity = data.find((e) => e.ID === entityIdNumber)
    if (foundEntity) {
      entity.value = foundEntity
      imageError.value = false // Reset image error state when loading new entity
    }
  } catch (error) {
    console.error('Failed to load entity:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const entityId = getEntityId()
  if (entityId) {
    loadEntity(entityId)
  }
})

// Watch for URL changes
watch(
  () => window.location.search,
  () => {
    const entityId = getEntityId()
    if (entityId) {
      isLoading.value = true
      loadEntity(entityId)
    }
  }
)

// Update page title when entity is loaded
watch(
  entity,
  (newEntity) => {
    if (newEntity) {
      document.title = `${newEntity.Path.split('/').pop()} - Carbon Documentation`
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
      <span class="ml-2">Loading entity...</span>
    </div>

    <!-- Entity Found -->
    <div v-else-if="entity" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold">{{ entity.Path.split('/').pop() }}</h1>
          <button
            @click="copyToClipboard(entity.ID.toString(), entity.ID)"
            class="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span class="font-mono">{{ entity.ID }}</span>
            <component :is="copiedId === entity.ID ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
        </div>
        <a
          :href="URL_METDAT_RUST_ENTITIES"
          target="_blank"
          class="vp-button medium brand flex items-center gap-2"
        >
          <Database :size="16" />
          Entities API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>

      <!-- Content -->
      <div class="flex gap-8">
        <!-- Entity Image -->
        <div class="flex-shrink-0">
          <div class="relative bg-gray-50 dark:bg-gray-800" style="width: 300px; height: 300px">
            <template v-if="!imageError && getEntityImageUrl(entity.ID)">
              <img
                :src="getEntityImageUrl(entity.ID)!"
                @error="handleImageError"
                class="w-full h-full object-contain p-8"
                :alt="entity.Path.split('/').pop()"
              />
            </template>
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <div class="w-16 h-16 mb-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Image :size="48" class="text-gray-400" />
              </div>
              <span class="text-sm text-gray-500 dark:text-gray-400">No image available</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">ID: {{ entity.ID }}</span>
            </div>
          </div>
        </div>

        <!-- Entity Info -->
        <div class="flex-1 space-y-4">
          <div class="dark:bg-gray-700">
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              <template v-for="component in entity.Components" :key="component">
                <VPBadge type="info" :text="component" />
              </template>
            </div>
          </div>

          <div class="space-y-2">
            <h2 class="text-xl font-semibold">Path:</h2>
            <div class="flex items-center gap-2">
              <div
                class="font-mono text-sm text-gray-600 dark:text-gray-400 break-all p-3 bg-gray-50 dark:bg-gray-800 flex-1"
              >
                {{ entity.Path }}
              </div>
              <button
                @click="copyToClipboard(entity.Path, 'path')"
                class="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <component :is="copiedId === 'path' ? CheckCircle2 : Copy" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Return to Entities -->
      <div class="flex justify-center mt-8">
        <div class="flex items-center gap-2">
          <ArrowLeft :size="16" class="opacity-80" />
          <a href="/references/entities" class="vp-button medium brand underline"> Back to Entities </a>
        </div>
      </div>
    </div>

    <!-- Entity Not Found -->
    <div v-else class="text-center py-8">
      <div class="space-y-4">
        <p class="text-gray-500">Entity not found</p>
        <div class="flex items-center gap-2 justify-center">
          <ArrowLeft :size="16" class="opacity-80" />
          <a href="/references/entities" class="vp-button medium brand underline"> Back to Entities </a>
        </div>
      </div>
    </div>
  </div>
</template>
