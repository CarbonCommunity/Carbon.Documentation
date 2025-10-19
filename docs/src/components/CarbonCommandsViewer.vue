<script setup lang="ts">
import type { CommandCarbon } from '@/api/metadata/carbon/commands'
import { fetchCommandsCarbon } from '@/api/metadata/carbon/commands'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import OptionSelector from '@/components/common/OptionSelector.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { data as initialList } from '@/data-loaders/carbon-commands.data'
import { store } from '@/stores/carbon-commands-store'
import MiniSearch from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import CommandCard from './CarbonCommandCard.vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const list = shallowRef<CommandCarbon[]>(initialList)
const categories = shallowRef<string[]>([])

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const selectedCategory = store.chosenCategory

const initialPageSize = 25
const pageSize = 50

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }

  if (!debouncedSearchValue.value && selectedCategory.value == 'All') {
    return list.value
  }

  let filtered = list.value

  if (selectedCategory.value != 'All') {
    filtered = filtered.filter((command) => getCommandTypeText(command.AuthLevel) == selectedCategory.value)
  }

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (command) => command.Name.toLowerCase().includes(lowerCaseSearchValue) || command.Help?.toLowerCase().includes(lowerCaseSearchValue)
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const commandMap = new Map(filtered.map((command) => [command.Name, command]))
      filtered = results.map((result) => commandMap.get(result.id)).filter(Boolean) as CommandCarbon[]
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
    idField: 'Name',
    fields: ['Name', 'Help'],
    searchOptions: {
      prefix: true,
      boost: {
        Name: 3,
        Help: 1,
      },
      fuzzy: 0.2,
    },
    tokenize: (text, fieldName) => {
      // TODO: should be refactored in the future
      const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}_]+/u // from minisearch source + underscores
      const processed = text
        .toLowerCase()
        .split(SPACE_OR_PUNCTUATION)
        .filter((token) => token.length > 1)

      if (fieldName != 'Help') {
        processed.push(text.toLowerCase())
      }

      return Array.from(new Set(processed))
    },
  })

  minisearch.addAll(list.value)

  console.log(`Initialized MiniSearch for Carbon commands in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchCommandsCarbon()

    categories.value = [...new Set([...new Set(data.map((command) => command.AuthLevel))].map(getCommandTypeText))]

    list.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load carbon commands:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load carbon commands. Please try again later.'
  }
}

function getCommandTypeText(authLevel: number) {
  if (authLevel <= 0) {
    return 'User'
  }
  if (authLevel == 1) {
    return 'Moderator'
  }
  return 'Admin'
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
      <SearchBar v-model="debouncedSearchValue" placeholder="Search commads..." :isSticky="true">
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #right>
          <!-- TODO: to multipe options -->
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
          <template v-for="command in renderedList" :key="command.Name">
            <CommandCard :id="command.Name" :command="command" :commandTypeText="getCommandTypeText(command.AuthLevel)" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
