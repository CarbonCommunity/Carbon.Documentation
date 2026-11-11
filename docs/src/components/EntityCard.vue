<script setup lang="ts">
import { Entity } from '@/api/metadata/rust/entities'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { VPBadge } from 'vitepress/theme'
const { entity } = defineProps<{
  entity: Entity
}>()

const emit = defineEmits<{
  (e: 'search-append', component: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <a :href="`details?id=${entity.ID}`">
          <VPBadge :id="entity.ID.toString()" type="tip" text="#" />
        </a>
        <span class="font-mono text-sm">{{ entity.ID }}</span>
        <ButtonIconCopy
          :getTextToCopy="() => entity.ID.toString()"
          :title="`Copy entity ID`"
          class="opacity-60"
        />
      </div>
      <div class="flex items-center flex-wrap gap-1.5">
        <template v-for="component in entity.Components" :key="component">
          <button class="hover:opacity-80 transition-opacity" @click="emit('search-append', component)">
            <VPBadge type="info" :text="component" />
          </button>
        </template>
      </div>
      <span class="font-mono text-sm text-gray-600 dark:text-gray-400">
        {{ entity.Path }}
      </span>
    </div>
  </div>
</template>
