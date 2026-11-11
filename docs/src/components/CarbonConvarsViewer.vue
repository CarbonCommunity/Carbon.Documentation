<script setup lang="ts">
import type { ConVarCarbon } from '@/api/metadata/carbon/convars'
import { fetchConVarsCarbon } from '@/api/metadata/carbon/convars'
import CheckBox from '@/components/common/CheckBox.vue'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { data as initialList } from '@/data-loaders/carbon-convars.data'
import { store } from '@/stores/carbon-convars-store'
import MiniSearch from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import CarbonConvarCard from './CarbonConvarCard.vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const list = shallowRef<ConVarCarbon[]>(initialList)

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const isShowForcesModded = store.isShowForcesModded
const isShowRegularOnes = store.isShowRegularOnes

const initialPageSize = 25
const pageSize = 50

const filteredList = computed(() => {
  if (!list.value?.length) {
    return []
  }

  if (!isShowForcesModded.value && !isShowRegularOnes.value) {
    return []
  }

  if (!debouncedSearchValue.value && isShowForcesModded.value && isShowRegularOnes.value) {
    return list.value
  }

  let filtered = list.value

  if (isShowForcesModded.value != isShowRegularOnes.value) {
    filtered = filtered.filter((convar) => convar.ForceModded == isShowForcesModded.value)
  }

  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      const lowerCaseSearchValue = debouncedSearchValue.value.toLowerCase()
      filtered = filtered.filter(
        (convar) =>
          convar.Name.toLowerCase().includes(lowerCaseSearchValue) ||
          convar.DisplayName?.toLowerCase().includes(lowerCaseSearchValue) ||
          convar.Help?.toLowerCase().includes(lowerCaseSearchValue)
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const convarMap = new Map(filtered.map((convar) => [convar.Name, convar]))
      filtered = results.map((result) => convarMap.get(result.id)).filter(Boolean) as ConVarCarbon[]
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
    fields: ['Name', 'DisplayName', 'Help'],
    searchOptions: {
      prefix: true,
      boost: {
        Name: 3,
        DisplayName: 2,
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

  console.log(`Initialized MiniSearch for Carbon convars in ${performance.now() - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchConVarsCarbon()

    list.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache
  } catch (err) {
    console.error('Failed to load carbon convars:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load carbon convars. Please try again later.'
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
        <template #right>
          <div class="flex flex-row items-center gap-2">
            <CheckBox v-model="isShowForcesModded">
              <template #default>
                <span class="text-sm">Forces Modded</span>
              </template>
            </CheckBox>
            <CheckBox v-model="isShowRegularOnes">
              <template #default>
                <span class="text-sm">Regular</span>
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
          <template v-for="convar in renderedList" :key="convar.Name">
            <CarbonConvarCard :id="convar.Name" :convar="convar" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
