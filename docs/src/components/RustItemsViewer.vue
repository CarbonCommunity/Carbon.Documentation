<script setup lang="ts">
import { fetchItems, type Item } from '@/api/metadata/rust/items'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import OptionSelector from '@/components/common/OptionSelector.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import RustItemCard from '@/components/RustItemCard.vue'
import { data as initialList } from '@/data-loaders/rust-items.data'
import { getItemCategoryNumber, getItemCategoryText } from '@/shared/constants'
import { store } from '@/stores/rust-items-store'
import MiniSearch from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'
import CheckBox from '@/components/common/CheckBox.vue'
import { useUrlSearchParams } from '@vueuse/core'

const list = shallowRef<Item[]>(initialList)
const categories = shallowRef<string[]>([])

const params = useUrlSearchParams('history', {
  removeFalsyValues: true,
})

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const selectedCategory = store.chosenCategory
const dlcOnly = store.dlcOnly

const initialPageSize = 10
const pageSize = 15

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }

  if (!debouncedSearchValue.value && selectedCategory.value == 'All' && !dlcOnly.value) {
    return list.value
  }

  let filtered = list.value.filter((item) => !dlcOnly.value || item.SteamDlcItem != null || item.SteamStoreItem != null || item.RedirectOf != null)

  if (selectedCategory.value != 'All') {
    const categoryNumber = getItemCategoryNumber(selectedCategory.value)
    filtered = filtered.filter((item) => item.Category == categoryNumber)
  }

  const searchAsNumber = Number(debouncedSearchValue.value)
  if (!isNaN(searchAsNumber) && searchAsNumber) {
    const item = filtered.filter((item) => item.Id == searchAsNumber)
    if (item.length > 0) {
      return item
    }
  }

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.ShortName.toLowerCase().includes(lowerCaseSearchValue) ||
          item.DisplayName?.toLowerCase().includes(lowerCaseSearchValue) ||
          item.Description?.toLowerCase().includes(lowerCaseSearchValue) ||
          item.ItemMods?.map((s) => s.toLowerCase()).some((x) => x.includes(lowerCaseSearchValue))
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const itemMap = new Map(filtered.map((item) => [item.Id, item]))
      filtered = results.map((result) => itemMap.get(result.id)).filter(Boolean) as Item[]
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
    idField: 'Id',
    fields: ['ShortName', 'DisplayName', 'Description', 'ItemMods'],
    searchOptions: {
      prefix: true,
      boost: {
        ShortName: 4,
        DisplayName: 3,
        Description: 2,
        ItemMods: 1,
      },
      fuzzy: 0.2,
    },
    tokenize: (text, fieldName) => {
      const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}_]+/u // from minisearch source + underscores
      const processed = text
        .toLowerCase()
        .split(SPACE_OR_PUNCTUATION)
        .filter((token) => token.length > 1)

      if (fieldName == 'ShortName' || fieldName == 'DisplayName' || !fieldName) {
        processed.push(text.toLowerCase())
      }

      if (fieldName == 'ItemMods') {
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

  minisearch.addAll(list.value)

  console.log(`Initialized MiniSearch for items in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchItems()

    categories.value = [...[...new Set(data.map((item) => item.Category))].sort((a, b) => a - b).map(getItemCategoryText)]

    list.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load items:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load items. Please try again later.'
  }
}

onMounted(async () => {
  await loadItems()
  tryLoadMiniSearch()

  if (params.dlcsOnly) {
    /* @ts-expect-error as it is number */
    dlcOnly.value = params.dlcsOnly == 1
  }
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
      <SearchBar v-model="debouncedSearchValue" placeholder="Search items..." :isSticky="true">
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #right>
          <OptionSelector v-model="selectedCategory" :options="['All', ...categories]" label="Category:" />
          <div class="flex flex-row items-center gap-2">
            <CheckBox v-model="dlcOnly">
              <template #default>
                <span class="text-sm">DLCs Only</span>
              </template>
            </CheckBox>
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
          <template v-for="item in renderedList" :key="item.Id">
            <RustItemCard :id="item.ShortName" :item="item" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
