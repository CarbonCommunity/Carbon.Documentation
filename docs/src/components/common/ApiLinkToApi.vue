<script setup lang="ts">
import { Database, ExternalLink } from 'lucide-vue-next'

const { text, url } = defineProps<{
  text: string
  url: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <a :href="url" target="_blank" class="flex items-center gap-2">
      <Database :size="16" />
      {{ text }}
      <ExternalLink :size="14" class="opacity-80" />
    </a>
  </div>
</template>
