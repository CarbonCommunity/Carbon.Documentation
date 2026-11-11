<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

defineProps<{
  isLoading: boolean
  error: string | null
  loadingText?: string
}>()
</script>

<template>
  <div>
    <template v-if="isLoading">
      <slot name="loading">
        <div class="flex items-center justify-center py-8 gap-2">
          <Loader2 class="animate-spin" :size="24" />
          <span>{{ loadingText || 'Loading...' }}</span>
        </div>
      </slot>
    </template>
    <template v-else-if="error">
      <slot name="error" :error="error">
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <div class="text-red-500 mb-4">{{ error }}</div>
        </div>
      </slot>
    </template>
    <template v-else>
      <slot />
    </template>
  </div>
</template>
