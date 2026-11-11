<script setup lang="ts">
const { hoverLabel } = defineProps<{
  hoverLabel?: string
  disabled?: boolean
}>()

const modelValue = defineModel<boolean>()
</script>

<template>
  <label class="flex items-center gap-1" :title="hoverLabel">
    <input
      :aria-label="hoverLabel"
      :disabled="disabled"
      v-model="modelValue"
      type="checkbox"
      class="w-4 h-4 accent-violet-600 focus:ring-2 ring-violet-500"
    />
    <slot />
  </label>
</template>
