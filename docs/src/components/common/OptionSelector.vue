<script setup lang="ts">
import { computed } from 'vue'

type OptionKeyValue = {
  key: string
  value: string
}

const { options, optionKeyValues, label } = defineProps<{
  options?: string[]
  optionKeyValues?: OptionKeyValue[]
  label: string
}>()

const model = defineModel<string>()

const effectiveOptions = computed(() => {
  if (optionKeyValues) {
    return optionKeyValues
  }
  return options?.map((opt) => ({ key: opt, value: opt })) ?? []
})
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-sm font-semibold">{{ label }}</span>
    <select
      v-model="model"
      class="min-w-32 cursor-pointer rounded-md bg-inherit px-3 py-1 text-sm ring-[1.5px] ring-gray-500 focus:ring-2 focus:ring-violet-500 dark:text-gray-100 dark:ring-gray-600"
    >
      <option v-for="option in effectiveOptions" :key="option.key" :value="option.key">
        {{ option.value }}
      </option>
    </select>
  </div>
</template>

<style scoped>
option {
  background-color: var(--vp-c-bg-soft);
}
</style>
