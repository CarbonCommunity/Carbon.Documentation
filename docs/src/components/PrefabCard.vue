<script setup lang="ts">
import { Prefab } from '@/api/metadata/rust/prefabs'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { VPBadge } from 'vitepress/theme'
const { prefab } = defineProps<{
  prefab: Prefab
}>()

const emit = defineEmits<{
  (e: 'search-append', component: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <a :href="`details?id=${prefab.ID}`">
          <VPBadge :id="prefab.ID.toString()" type="tip" text="#" />
        </a>
        <span class="font-mono text-sm">{{ prefab.ID }}</span>
        <ButtonIconCopy
          :getTextToCopy="() => prefab.ID.toString()"
          :title="`Copy prefab ID`"
          class="opacity-60"
        />
      </div>
      <div class="flex items-center flex-wrap gap-1.5">
        <template v-for="component in prefab.Components" :key="component">
          <button class="hover:opacity-80 transition-opacity" @click="emit('search-append', component)">
            <VPBadge type="info" :text="component" />
          </button>
        </template>
      </div>
      <span class="font-mono text-sm text-gray-600 dark:text-gray-400">
        {{ prefab.Path }}
      </span>
    </div>
  </div>
</template>
