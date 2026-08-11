<script setup lang="ts" generic="T extends string | number">
import { onClickOutside, useEventListener } from '@vueuse/core'
import { ChevronDown } from 'lucide-vue-next'
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'

type OptionKeyValue = {
  key: T
  value: string
}

const { options, optionKeyValues, label } = defineProps<{
  readonly options?: readonly T[]
  readonly optionKeyValues?: readonly OptionKeyValue[]
  readonly label: string
}>()

const model = defineModel<T[]>({ default: [] })
const isOpen = shallowRef(false)
const dropdownRef = useTemplateRef<HTMLDivElement>('dropdownRef')

const effectiveOptions = computed(() => {
  if (optionKeyValues) {
    return optionKeyValues
  }
  return options?.map((opt) => ({ key: opt, value: opt })) ?? []
})

const displayText = computed(() => {
  if (effectiveOptions.value.length == 0) {
    return 'No options available...'
  }
  if (model.value.length == 0) {
    return 'Select options...'
  }
  return model.value.map((key) => effectiveOptions.value.find((opt) => opt.key == key)?.value ?? key).join(', ')
})

onClickOutside(dropdownRef, () => {
  isOpen.value = false
})

onMounted(() => {
  useEventListener(
    document,
    'scroll',
    (e) => {
      if (!dropdownRef.value?.contains(e.target as Node)) {
        isOpen.value = false
      }
    },
    { passive: true }
  )
})

function toggleOption(key: T) {
  const index = model.value.indexOf(key)
  if (index == -1) {
    model.value.push(key)
  } else {
    model.value.splice(index, 1)
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key == 'Escape') {
    isOpen.value = false
  } else if (e.key == 'Enter' || e.key == ' ') {
    isOpen.value = !isOpen.value
  }
}
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <div class="flex items-center gap-2">
      <span class="shrink-0 text-sm font-semibold">{{ label }}</span>
      <button
        @click="isOpen = !isOpen"
        @keydown="handleKeyDown"
        :disabled="effectiveOptions.length == 0"
        class="flex w-48 cursor-pointer items-center rounded-md bg-inherit px-3 py-1.5 text-sm ring-[1.5px] ring-gray-500 transition-all duration-200 ease-in-out hover:ring-violet-400 focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:ring-gray-600 dark:hover:ring-violet-400"
      >
        <span class="flex-1 truncate text-left" :class="{ 'text-gray-500 dark:text-gray-400': model.length == 0 }">{{ displayText }}</span>
        <ChevronDown class="ml-2 h-4 w-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
      </button>
    </div>

    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-show="isOpen"
        class="absolute right-0 z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800"
      >
        <div class="py-1">
          <label
            v-for="option in effectiveOptions"
            :key="option.key"
            class="flex cursor-pointer items-center px-3 py-2 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <input
              type="checkbox"
              :checked="model.includes(option.key)"
              @change="toggleOption(option.key)"
              class="h-4 w-4 cursor-pointer rounded border-gray-300 text-violet-600 transition-colors duration-150 focus:ring-2 focus:ring-violet-500"
            />
            <span class="ml-3 text-sm">{{ option.value }}</span>
          </label>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
input[type='checkbox'] {
  @apply transition-all duration-150;
}

input[type='checkbox']:checked {
  @apply border-violet-500 bg-violet-500;
}

.dark input[type='checkbox'] {
  @apply border-gray-600;
}

.dark input[type='checkbox']:checked {
  @apply border-violet-500 bg-violet-500;
}
</style>
