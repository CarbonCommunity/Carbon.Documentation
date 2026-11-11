<script setup lang="ts" generic="Type extends object">
import { LoaderCircle } from 'lucide-vue-next'
import MiniSearch from 'minisearch'

const { error, filteredList, list, searchVal, isFetchedRestData, miniSearch } = defineProps<{
  error: string
  filteredList: Type[]
  list: Type[] | null | undefined
  searchVal: string
  isFetchedRestData: boolean
  miniSearch: MiniSearch | null
}>()
</script>

<template>
  <div v-if="error" class="flex flex-col items-center justify-center py-8 text-center">
    <div class="mb-4 text-red-500">{{ error }}</div>
  </div>
  <template v-else>
    <slot name="top"> </slot>
    <div v-if="filteredList && filteredList.length" class="mt-4">
      <slot name="list"> </slot>
    </div>
    <div v-else-if="isFetchedRestData && miniSearch" class="flex flex-col items-center justify-center gap-2 py-8">
      <p>No results found matching your search</p>
      <p v-if="!list || !list.length" class="text-sm">Debug: No items loaded. Check console for errors.</p>
      <p v-else-if="searchVal" class="text-sm">Debug: Search query "{{ searchVal }}" returned no results.</p>
    </div>
    <div class="mt-8 flex flex-col gap-8 font-normal">
      <TransitionGroup :css="false" name="transitionList">
        <div v-if="!isFetchedRestData" class="flex items-center justify-center gap-2">
          <LoaderCircle class="animate-spin" :size="24" />
          <span>Loading em...</span>
        </div>
        <div v-if="!miniSearch" class="flex items-center justify-center gap-2">
          <LoaderCircle class="animate-spin" :size="24" />
          <span>Loading minisearch...</span>
        </div>
      </TransitionGroup>
    </div>
  </template>
</template>
<style scoped>
.transitionList-move {
  transition: transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
}
</style>
