<script setup lang="ts">
import type { CommandRust } from '@/api/metadata/rust/commands'
import { fetchCommandsRust } from '@/api/metadata/rust/commands'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { data as initialList } from '@/data-loaders/rust-commands.data'
import { store } from '@/stores/rust-commands-store'
import MiniSearch from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import RustCommandCard from './RustCommandCard.vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const list = shallowRef<CommandRust[]>(initialList)

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch

const initialPageSize = 30
const pageSize = 50

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }

  if (!debouncedSearchValue.value) {
    return list.value
  }

  let filtered = list.value

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (command) => command.Name.toLowerCase().includes(lowerCaseSearchValue) || command.Help?.toLowerCase().includes(lowerCaseSearchValue)
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const commandMap = new Map(filtered.map((command) => [command.Name, command]))
      filtered = results.map((result) => commandMap.get(result.id)).filter(Boolean) as CommandRust[]
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

  console.log(`Initialized MiniSearch for Rust commands in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchCommandsRust()

    list.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load rust commands:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load rust commands. Please try again later.'
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
      <SearchBar v-model="debouncedSearchValue" placeholder="Search convars..." :isSticky="true">
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #right> </template>
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
            <RustCommandCard :id="command.Name" :command="command" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
