<script setup lang="ts">
import { fetchPrefabs, type Prefab } from '@/api/metadata/rust/prefabs'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import OptionSelector from '@/components/common/OptionSelector.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import PrefabCard from '@/components/PrefabCard.vue'
import { data as initialList } from '@/data-loaders/prefabs.data'
import { store } from '@/stores/prefabs-store'
import MiniSearch, { SearchOptions } from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const list = shallowRef<Prefab[]>(initialList)

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const selectedSearchType = store.searchType

const initialPageSize = 20
const pageSize = 30

function appendSearch(component: string) {
  debouncedSearchValue.value = `${debouncedSearchValue.value.trim()} ${component}`.trim()
}

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }

  if (!debouncedSearchValue.value) {
    return list.value
  }

  let filtered = list.value

  const searchAsNumber = Number(debouncedSearchValue.value)
  if (!isNaN(searchAsNumber) && searchAsNumber) {
    const prefab = filtered.filter((prefab) => prefab.ID == searchAsNumber)
    if (prefab.length > 0) {
      return prefab
    }
  }

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (entity) =>
          entity.Name.toLowerCase().includes(lowerCaseSearchValue) ||
          entity.Path?.toLowerCase().includes(lowerCaseSearchValue) ||
          entity.Components?.map((s) => s.toLowerCase()).some((x) => x.includes(lowerCaseSearchValue))
      )
    } else {
      const searchOptions: SearchOptions = { combineWith: selectedSearchType.value }
      if (selectedSearchType.value == 'AND') {
        searchOptions.tokenize = (text: string) => {
          const SPACES = /[\n\r\s]+/u
          const PARENTHESES = /(\(.+\))/g

          const tokens: string[] = []
          const matches = text.match(PARENTHESES)
          if (matches) {
            matches.forEach((match) => {
              tokens.push(match.slice(1, -1))
            })
          }

          const textWithoutParentheses = text.replace(PARENTHESES, '')
          tokens.push(...textWithoutParentheses.split(SPACES))
          const result = [...new Set(tokens.filter((token) => token.length > 1))]
          return result
        }
        searchOptions.fuzzy = 0
      }
      const results = miniSearch.value.search(debouncedSearchValue.value, searchOptions)
      const prefabMap = new Map(filtered.map((prefab) => [prefab.ID, prefab]))
      filtered = results.map((result) => prefabMap.get(result.id)).filter(Boolean) as Prefab[]
    }
  }

  return filtered
})

async function tryLoadMiniSearch() {
  if (miniSearch.value && isDataFromCache.value) {
    return
  }

  const startTime = performance.now()

  const minisearch = new MiniSearch({
    idField: 'ID',
    fields: ['Name', 'Path', 'Components'],
    searchOptions: {
      prefix: true,
      boost: {
        Name: 4,
        Components: 2,
        Path: 1,
      },
      fuzzy: 0.1,
    },
    tokenize: (text, fieldName) => {
      const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}_]+/u // from minisearch source + underscores
      const processed = text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .toLowerCase()
        .split(SPACE_OR_PUNCTUATION)
        .filter((token) => token.length > 1)

      processed.push(text.toLowerCase())

      if (text && fieldName == 'Components') {
        const split = text.split(',')
        split.forEach((word) => {
          processed.push(word.toLowerCase())
        })

        split
          .map((mod) => mod.match(/[A-Z]/g)?.join(''))
          .forEach((mod) => {
            if (mod && mod.length > 1) {
              processed.push(mod)
            }
          })
      }
      return Array.from(new Set(processed))
    },
  })

  await minisearch.addAllAsync(list.value, { chunkSize: 4000 }) // currently the most optimal chunk size

  console.log(`Initialized MiniSearch for Rust prefabs in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchPrefabs()

    list.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load prefabs:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load prefabs. Please try again later.'
  }
}

onMounted(async () => {
  await loadItems()
  await tryLoadMiniSearch()
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
      <SearchBar v-model="debouncedSearchValue" placeholder="Search prefabs..." :isSticky="true">
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #right>
          <OptionSelector v-model="selectedSearchType" :options="['OR', 'AND']" label="" />
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
          <template v-for="prefab in renderedList" :key="prefab.ID">
            <PrefabCard :id="prefab.ID.toString()" :prefab="prefab" @search-append="appendSearch" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
