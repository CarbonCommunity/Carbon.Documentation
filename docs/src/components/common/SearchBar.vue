<script setup lang="ts">
import { useDebounceFn, useUrlSearchParams } from '@vueuse/core'
import { ChevronDown, Search } from 'lucide-vue-next'
import { nextTick, onMounted, ref, watch } from 'vue'

const debounceTimeout = 350

const { placeholder, isSticky, isExpandable, initialExpanded } = defineProps<{
  placeholder?: string
  isSticky?: boolean
  isExpandable?: boolean
  initialExpanded?: boolean
}>()

const isExpanded = ref<boolean>(initialExpanded ?? false)

function toggleExpand() {
  if (isExpandable) {
    isExpanded.value = !isExpanded.value
  }
}

const debouncedSearchValue = defineModel<string>()

const params = useUrlSearchParams('history', {
  removeFalsyValues: true,
})

function updateDebouncedSearch(value: string) {
  debouncedSearchValue.value = value
}

function encodeSearchTerm(term: string) {
  return encodeURIComponent(term.trim().replace(/\s+/g, ' '))
}

function decodeSearchTerm(term: string) {
  return decodeURIComponent(term.trim())
}

const debounceSearchValue = useDebounceFn(updateDebouncedSearch, debounceTimeout, {
  maxWait: debounceTimeout * 3,
})

function handleUrlSearch(val: string) {
  const decoded = decodeSearchTerm(val)

  if (decoded && decoded != debouncedSearchValue.value) {
    updateDebouncedSearch(decoded)
  }
}

async function updateParams(val: string | undefined) {

  if (val != undefined) {
    await nextTick()
    params.s = encodeSearchTerm(val)
  }
}

watch(debouncedSearchValue, async (newVal) => {
  await updateParams(newVal)
})

onMounted(() => {
  if (params.s) {
    handleUrlSearch(params.s.toString())
  }
})
</script>

<template>
  <div
    class="relative rounded-xl bg-zinc-100/40 px-4 py-4 backdrop-blur-sm dark:bg-gray-800/40"
    :class="{ 'pb-4': isExpandable, 'min-[960px]:sticky min-[960px]:top-[4.5rem] min-[960px]:z-10': isSticky }"
  >
    <div class="flex min-h-8 flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div class="flex w-full flex-1 items-center gap-4">
        <slot name="icon">
          <Search class="text-gray-400" :size="20" />
        </slot>
        <input
          class="w-full text-sm sm:text-base"
          :placeholder="placeholder ?? 'Search for...'"
          type="text"
          :value="debouncedSearchValue"
          @input="(event) => debounceSearchValue((event.target as HTMLInputElement).value)"
        />
      </div>
      <slot name="right" />
    </div>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="isExpandable && isExpanded" class="mt-4">
        <slot name="expandable" />
      </div>
    </Transition>

    <div v-if="isExpandable" class="absolute bottom-0 left-0 right-0 flex -translate-y-1/2 transform justify-end sm:justify-center">
      <button
        class="rounded-full px-2 text-xs text-gray-500 transition-all duration-200 hover:bg-white/10 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-700/30 dark:hover:text-gray-300"
        @click="toggleExpand()"
      >
        <span class="flex items-center gap-1">
          {{ isExpanded ? 'Show less' : '' }}
          <ChevronDown class="transition-transform duration-300" :class="{ '-rotate-180': isExpanded }" :size="16" />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  overflow: hidden;
}
</style>
