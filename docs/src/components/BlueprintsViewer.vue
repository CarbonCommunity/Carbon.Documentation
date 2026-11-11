<script setup lang="ts">
import { Blueprint, fetchBlueprints } from '@/api/metadata/rust/blueprints'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import OptionSelector from '@/components/common/OptionSelector.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { data as initialList } from '@/data-loaders/blueprints.data'
import { getItemCategoryNumber, getItemCategoryText } from '@/shared/constants'
import { store } from '@/stores/blueprints-store'
import MiniSearch from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import BlueprintCard from './BlueprintCard.vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const list = shallowRef<Blueprint[]>(initialList)
const categories = shallowRef<string[]>([])

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const selectedCategory = store.chosenCategory

const initialPageSize = 7
const pageSize = 10

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }

  if (!debouncedSearchValue.value && selectedCategory.value == 'All') {
    return list.value
  }

  let filtered = list.value

  if (selectedCategory.value != 'All') {
    const categoryNumber = getItemCategoryNumber(selectedCategory.value)
    filtered = filtered.filter((blueprint) => blueprint.Item.Category == categoryNumber)
  }

  const searchAsNumber = Number(debouncedSearchValue.value)
  if (!isNaN(searchAsNumber) && searchAsNumber) {
    const blueprint = filtered.filter((blueprint) => blueprint.Item.Id == searchAsNumber)
    if (blueprint.length > 0) {
      return blueprint
    }
  }

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (blueprint) =>
          blueprint.Item.ShortName.toLowerCase().includes(lowerCaseSearchValue) ||
          blueprint.Item.DisplayName.toLowerCase().includes(lowerCaseSearchValue) ||
          blueprint.Item.Description.toLowerCase().includes(lowerCaseSearchValue)
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const blueprintMap = new Map(filtered.map((blueprint) => [blueprint.Item.Id, blueprint]))
      filtered = results.map((result) => blueprintMap.get(result.id)).filter(Boolean) as Blueprint[]
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
    idField: 'Item.Id',
    fields: ['Item.ShortName', 'Item.DisplayName', 'Item.Description'],
    searchOptions: {
      prefix: true,
      boost: {
        'Item.ShortName': 3,
        'Item.DisplayName': 2,
        'Item.Description': 1,
      },
      fuzzy: 0.2,
    },
    tokenize: (text, fieldName) => {
      const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}_]+/u // from minisearch source + underscores
      const processed = text
        .toLowerCase()
        .split(SPACE_OR_PUNCTUATION)
        .filter((token) => token.length > 1)

      if (fieldName != 'Item.Description') {
        processed.push(text.toLowerCase())
      }

      return Array.from(new Set(processed))
    },
    extractField: (obj, fieldName) => {
      switch (fieldName) {
        case 'Item.Id':
          return obj.Item.Id
        case 'Item.ShortName':
          return obj.Item.ShortName
        case 'Item.DisplayName':
          return obj.Item.DisplayName
        case 'Item.Description':
          return obj.Item.Description
        default:
          return obj[fieldName]
      }
    },
  })

  minisearch.addAll(list.value)

  console.log(`Initialized MiniSearch for blueprints in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchBlueprints()

    categories.value = [
      ...new Set(
        [...new Set(data.map((blueprint) => blueprint.Item.Category).sort((a, b) => a - b))].map((category) => getItemCategoryText(category as number))
      ),
    ]

    list.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load blueprints:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load blueprints. Please try again later.'
  }
}

onMounted(async () => {
  await loadItems()
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
      <SearchBar v-model="debouncedSearchValue" placeholder="Search blueprints..." :isSticky="true">
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #right>
          <OptionSelector v-model="selectedCategory" :options="['All', ...categories]" label="Category:" />
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
          <template v-for="blueprint in renderedList" :key="blueprint.Item.Id">
            <BlueprintCard :id="blueprint.Item.ShortName" :blueprint="blueprint" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
