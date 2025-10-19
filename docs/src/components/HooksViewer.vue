<script setup lang="ts">
import type { Hook } from '@/api/metadata/carbon/hooks'
import { fetchHooks } from '@/api/metadata/carbon/hooks'
import CheckBox from '@/components/common/CheckBox.vue'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import OptionSelector from '@/components/common/OptionSelector.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { data as initialHooks } from '@/data-loaders/hooks.data'
import { store } from '@/stores/hooks-store'
import { useKeyModifier } from '@vueuse/core'
import MiniSearch from 'minisearch'
import type { Highlighter } from 'shiki'
import { getSingletonHighlighter } from 'shiki'
import { computed, onMounted, provide, readonly, shallowRef } from 'vue'
import HookCard from './HookCard.vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const categories = shallowRef<string[]>([])
const list = shallowRef<Hook[]>(initialHooks)

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const selectedCategory = store.chosenCategory
const showOxideHooks = store.showOxideHooks
const showCarbonHooks = store.showCarbonHooks

const initialPageSize = 25
const pageSize = 50

const highlighter = shallowRef<Highlighter | null>(null)
provide('highlighter', readonly(highlighter))

const isCtrlPressed = useKeyModifier<boolean>('Control', { initial: false })

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }
  if (!showOxideHooks.value && !showCarbonHooks.value) {
    return []
  }

  if (!debouncedSearchValue.value && selectedCategory.value == 'All' && showOxideHooks.value == showCarbonHooks.value) {
    return list.value
  }

  let filtered = list.value

  if (selectedCategory.value != 'All') {
    filtered = filtered.filter((hook) => hook.Category == selectedCategory.value)
  }

  if (showOxideHooks.value != showCarbonHooks.value) {
    filtered = filtered.filter((hook) => hook.OxideCompatible == showOxideHooks.value)
  }

  const searchAsNumber = Number(debouncedSearchValue.value)
  if (!isNaN(searchAsNumber) && searchAsNumber) {
    const hook = filtered.filter((hook) => hook.Id == searchAsNumber)
    if (hook.length > 0) {
      return hook
    }
  }

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (hook) =>
          hook.FullName.toLowerCase().includes(lowerCaseSearchValue) ||
          hook.Descriptions?.map((s) => s.toLowerCase()).some((x) => x.includes(lowerCaseSearchValue)) ||
          hook.MethodName?.toLowerCase().includes(lowerCaseSearchValue) ||
          hook.TargetName?.toLowerCase().includes(lowerCaseSearchValue) ||
          hook.AssemblyName?.toLowerCase().includes(lowerCaseSearchValue)
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const hookMap = new Map(filtered.map((hook) => [hook.FullName, hook]))
      filtered = results.map((result) => hookMap.get(result.id)).filter(Boolean) as Hook[]
    }
  }

  return filtered
})

function tryLoadMiniSearch() {
  if (miniSearch.value && isDataFromCache.value) {
    return
  }

  const startTime = performance.now()

  const minisearch = new MiniSearch({
    idField: 'FullName',
    fields: ['FullName', 'Descriptions', 'MethodName', 'TargetName', 'AssemblyName'],
    searchOptions: {
      prefix: true,
      boost: {
        FullName: 3.5,
        MethodName: 2,
        TargetName: 1.5,
        AssemblyName: 1.2,
        Descriptions: 1,
      },
      fuzzy: 0.1,
    },
    tokenize: (text, fieldName) => {
      // TODO: should be refactored in the future
      const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u // from minisearch source
      const processed = text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .toLowerCase()
        .split(SPACE_OR_PUNCTUATION)
        .filter((token) => token.length)

      if (fieldName != 'Descriptions') {
        let cumulativeToken = ''
        for (let i = processed.length - 1; i >= 0; i--) {
          cumulativeToken = processed[i] + cumulativeToken
          processed.push(cumulativeToken)
        }

        processed.push(text.toLowerCase())
      }

      if (fieldName == 'FullName') {
        const uppercase = text.split(' ').map((word) => word.match(/[A-Z]/g))
        uppercase.forEach((word) => {
          if (word && word.length > 1) {
            processed.push(word.join(''))
          }
        })
      }

      return Array.from(new Set(processed.filter((token) => token.length > 1)))
    },
  })

  minisearch.addAll(list.value)

  console.log(`Initialized MiniSearch for hooks in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchHooks()

    const flatHooks: Hook[] = []
    data.forEach((hooks) => {
      flatHooks.push(...hooks)
    })

    categories.value = Array.from(data.keys())

    list.value = flatHooks

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load hooks:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load hooks. Please try again later.'
  }
}

async function tryLoadHighlighter() {
  try {
    highlighter.value = await getSingletonHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['csharp'],
    })
  } catch (err) {
    console.error('Failed to load highlighter:', err)
  }
}

onMounted(async () => {
  await Promise.all([loadItems(), tryLoadHighlighter()])
  tryLoadMiniSearch()
})
</script>

<template>
  <ApiPageStateHandler
    :error
    :filtered-list="filteredList"
    :list="list"
    :search-val="debouncedSearchValue"
    :is-fetched-rest-data="isFetchedRest"
    :mini-search="miniSearch"
  >
    <template #top>
      <SearchBar v-model="debouncedSearchValue" placeholder="Search hooks..." :isSticky="true">
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #right>
          <div class="flex flex-row gap-4">
            <!-- TODO: to multipe options -->
            <OptionSelector v-model="selectedCategory" :options="['All', ...categories]" label="Category:" />
            <div class="flex flex-row items-center gap-2">
              <CheckBox v-model="showOxideHooks">
                <template #default>
                  <span class="text-sm">Oxide</span>
                </template>
              </CheckBox>
              <CheckBox v-model="showCarbonHooks">
                <template #default>
                  <span class="text-sm">Carbon</span>
                </template>
              </CheckBox>
            </div>
          </div>
        </template>
      </SearchBar>
    </template>

    <template #list>
      <InfinitePageScroll :list="filteredList" :pageSize="pageSize" :initialPageSize="initialPageSize" v-slot="{ renderedList }">
        <ApiPageInfo
          :rendered-lenght="renderedList.length"
          :filtered-lenght="filteredList.length"
          :total-lenght="list?.length ?? -1"
          :is-fetched-rest-data="isFetchedRest"
        />

        <div class="flex flex-col gap-5">
          <template v-for="hook in renderedList" :key="hook.FullName">
            <HookCard :hook="hook" :isCtrlPressed="isCtrlPressed" />
          </template>
        </div>
        <img
          v-if="isFetchedRest && renderedList.length == list.length && list.length > 0"
          src="/misc/cat-d.gif"
          alt="evs"
          class="mx-auto h-10 w-10 animate-bounce"
        />
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
