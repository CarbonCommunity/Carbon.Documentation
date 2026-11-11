<script setup lang="ts">
import { Search, SearchSlash } from 'lucide-vue-next'

const useBasicSearch = defineModel<boolean>('useBasicSearch', { required: true })
</script>

<template>
  <button
    @click="useBasicSearch = !useBasicSearch"
    :title="useBasicSearch ? 'Switch to mini search (fuzzy)' : 'Switch to basic search (finds exact match, case-insensitive)'"
    class="text-gray-400 transition-all duration-200 hover:text-gray-700 dark:hover:text-gray-200"
    :class="{ '-rotate-90': useBasicSearch }"
  >
    <component :is="!useBasicSearch ? Search : SearchSlash" :size="20" />
  </button>
</template>
