<script setup lang="ts">
import { CompressedTag, fetchServerList, RegionTag, Server, ServerList } from '@/api/misc/server-list'
import InfinitePageScroll from '@/components/common/InfinitePageScroll.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { data as initialData } from '@/data-loaders/server-browser.data'
import { store } from '@/stores/server-browser-store'
import MiniSearch from 'minisearch'
import { computed, onMounted, shallowRef } from 'vue'
import ServerBrowserCard from './ServerBrowserCard.vue'
import ApiPageInfo from './common/ApiPageInfo.vue'
import ApiPageStateHandler from './common/ApiPageStateHandler.vue'
import OptionSelectorMany from './common/OptionSelectorMany.vue'
import SwitchSearchIcon from './common/SwitchSearchIcon.vue'

const serverListData = shallowRef<ServerList | null>(initialData)
const rustVersions = shallowRef<number[]>([])
const list = computed(() => serverListData.value?.Servers)

const isFetchedRest = shallowRef(false)
const isDataFromCache = shallowRef<boolean | null>(null)
const error = shallowRef<string>('')

const debouncedSearchValue = store.searchValue
const miniSearch = store.miniSearch
const useBasicSearch = store.useBasicSearch
const chosenCompressedTagsAnd = store.chosenCompressedTagsAnd
const chosenCompressedTagsOr = store.chosenCompressedTagsOr
const chosenRegionTags = store.chosenRegionTags
const playersRangeMin = store.playersRangeMin
const playersRangeMax = store.playersRangeMax
const chosenRustVersions = store.chosenRustVersions

const initialPageSize = 25
const pageSize = 50

const filteredList = computed(() => {
  if (!list.value || !list.value.length) {
    return []
  }

  let filtered = list.value

  if (debouncedSearchValue.value && debouncedSearchValue.value.includes('.')) {
    const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){1,4}\.?$/
    const trimmed = debouncedSearchValue.value.trim()
    if (trimmed.includes(':')) {
      const [ip, port] = trimmed.split(':')
      const portNumber = parseInt(port)
      if (!isNaN(portNumber) && portNumber > 0 && portNumber < 65536 && ipRegex.test(ip)) {
        return filtered.filter((server) => server.ip.startsWith(ip) && server.port.toString().startsWith(port))
      }
    }
    if (ipRegex.test(trimmed)) {
      return filtered.filter((server) => server.ip.startsWith(trimmed))
    }
  }
  if (isFetchedRest.value) {
    if (chosenRustVersions.value.length > 0) {
      filtered = filtered.filter((server) => {
        return chosenRustVersions.value.includes(server.rust_version)
      })
    }

    if (playersRangeMin.value > 0 || playersRangeMax.value > -1) {
      const minValid = playersRangeMin.value > 0 && playersRangeMin.value
      const maxValid = playersRangeMax.value > -1 && (playersRangeMax.value == 0 || playersRangeMax.value)
      filtered = filtered.filter((server) => {
        return (!minValid || server.players >= playersRangeMin.value) && (!maxValid || server.players <= playersRangeMax.value)
      })
    }

    if (chosenRegionTags.value && chosenRegionTags.value.length > 0) {
      filtered = filtered.filter((server) => {
        return chosenRegionTags.value.some((tag) => server.tags_set.has(tag))
      })
    }

    if (chosenCompressedTagsAnd.value.length && chosenCompressedTagsAnd.value.length > 0) {
      filtered = filtered.filter((server) => {
        return chosenCompressedTagsAnd.value.every((tag) => server.tags_set.has(tag))
      })
    }

    if (chosenCompressedTagsOr.value.length && chosenCompressedTagsOr.value.length > 0) {
      filtered = filtered.filter((server) => {
        return chosenCompressedTagsOr.value.some((tag) => server.tags_set.has(tag))
      })
    }
  }
  if (debouncedSearchValue.value) {
    if (!miniSearch.value || useBasicSearch.value) {
      filtered = filtered.filter(
        (server) =>
          server.hostname.toLowerCase().includes(debouncedSearchValue.value.toLowerCase()) ||
          server.map?.toLowerCase().includes(debouncedSearchValue.value.toLowerCase()) ||
          server.tags?.toLowerCase().includes(debouncedSearchValue.value.toLowerCase())
      )
    } else {
      const results = miniSearch.value.search(debouncedSearchValue.value)
      const serverMap = new Map(filtered.map((server) => [server.id, server]))
      filtered = results.map((result) => serverMap.get(result.id)).filter(Boolean) as Server[]
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
    idField: 'id',
    fields: ['hostname', 'tags', 'map'],
    searchOptions: {
      prefix: true,
      boost: {
        hostname: 4,
        tags: 2,
        map: 1,
      },
      fuzzy: 0.069,
      boostDocument: (_, _2, storedFields) => {
        // Handle missing/empty servers: 61.6% of servers are empty -> demote
        if (!storedFields?.players || storedFields.players == 0) {
          return 0.85 // Demote empty servers but keep them searchable
        }

        const players = storedFields.players as number

        /* Player Distribution Insights (from diagnostic data):
           totalServers: 13063
           emptyServers: 8046 (61.6%)
           Key percentiles:
             p75: 2 players    (75% of servers have ≤2 players)
             p90: 13 players   (90% have ≤13 players)
             p95: 47 players   (95% have ≤47 players)
             p99: 254 players  (99% have ≤254 players)
             max: 1062 players
           Design Philosophy:
             1. Different population tiers need distinct scaling:
               - Low-pop: Gentle boost to avoid over-ranking common servers
               - Mid-pop: Balanced boost for discoverability
               - High-pop: Significant boost for quality recognition
             2. Use exponential scaling (players^exponent) for natural curve:
               - Lower exponent = flatter curve (for high populations)
               - Higher exponent = steeper curve (for low populations)
             3. Tier thresholds based on actual distribution percentiles
             4. Optimize for computation efficiency (no chained conditionals)
        */

        // ELITE SERVERS (p99+ ≥250 players - top 1%)
        // - Exponent 0.28 creates gradual curve for very high populations
        // - Multiplier 0.82 provides strong baseline recognition
        // - Matches diagnostic data showing high-population clusters
        if (players >= 250) {
          return 1.0 + players ** 0.28 * 0.82
        }

        // POPULAR SERVERS (p95+ ≥47 players - top 5%)
        // - Exponent 0.35 balances growth recognition
        // - Multiplier 0.68 calibrated for 47-250 player range
        // - Avoids over-boosting while maintaining quality signal
        if (players >= 47) {
          return 1.0 + players ** 0.35 * 0.68
        }

        // ACTIVE SERVERS (p90+ ≥13 players - top 10%)
        // - Exponent 0.42 provides steeper initial curve
        // - Multiplier 0.55 prevents over-emphasis of low-mid pop
        // - Recognizes servers above empty/low-pop majority
        if (players >= 13) {
          return 1.0 + players ** 0.42 * 0.55
        }

        // LOW-POPULATION SERVERS (1-12 players)
        // - Exponent 0.5 (square root) for gentlest curve
        // - Multiplier 0.48 provides baseline visibility
        // - Avoids drowning out text relevance for common servers
        return 1.0 + players ** 0.5 * 0.48
      },
    },
    storeFields: ['players'],
    tokenize: (text, fieldName) => {
      const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}|]+/u // from minisearch source + pipes
      if (fieldName == 'tags') {
        return text.split(',').map((tag) => tag.trim().toLowerCase())
      }

      const processed: Set<string> = new Set()
      const tokens = text.split(SPACE_OR_PUNCTUATION)
      tokens.forEach((token) => {
        if (token.length <= 1) {
          return
        }

        const lowerToken = token.toLowerCase()
        processed.add(lowerToken)

        if (!/[A-Z]/.test(token)) {
          return
        }

        const modified = token.replace(/([a-z\d]{2})([A-Z])|([A-Z])([A-Z][a-z])/g, (_, g1, g2, g3, g4) => (g1 ? `${g1} ${g2}` : `${g3} ${g4}`))

        if (modified) {
          modified.split(' ').forEach((t) => {
            if (t.length > 1) {
              processed.add(t.toLowerCase())
            }
          })
        }
      })

      processed.add(text.toLowerCase())

      return Array.from(processed)
    },
  })

  await minisearch.addAllAsync(list.value ?? [], { chunkSize: 5000 }) // currently the most optimal chunk size

  const endTime = performance.now()
  console.log(`Initialized MiniSearch for server list in ${endTime - startTime}ms`)

  miniSearch.value = minisearch
}

async function loadItems() {
  try {
    const { data, isFromCache } = await fetchServerList()

    serverListData.value = data

    isFetchedRest.value = true

    isDataFromCache.value = isFromCache

    rustVersions.value = Array.from(new Set(data.Servers.map((s) => s.rust_version))).toSorted((a, b) => b - a)
  } catch (err) {
    console.error('Failed to load servers:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load servers. Please try again later.'
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
      <SearchBar
        v-model="debouncedSearchValue"
        placeholder="Search servers... (hostname, IP, map, raw tags)"
        :isSticky="true"
        :isExpandable="true"
        :initialExpanded="true"
      >
        <template #icon>
          <SwitchSearchIcon v-model:useBasicSearch="useBasicSearch" />
        </template>
        <template #expandable>
          <div class="mt-4 flex flex-col flex-wrap justify-between gap-4 px-2 sm:flex-row">
            <OptionSelectorMany
              v-model="chosenCompressedTagsAnd"
              :option-key-values="Object.keys(CompressedTag).map((tag) => ({ key: CompressedTag[tag as keyof typeof CompressedTag], value: tag }))"
              label="Tags (and)"
            />
            <OptionSelectorMany
              v-model="chosenRegionTags"
              :option-key-values="Object.keys(RegionTag).map((tag) => ({ key: RegionTag[tag as keyof typeof RegionTag], value: tag }))"
              label="Region"
            />
            <OptionSelectorMany
              v-model="chosenCompressedTagsOr"
              :option-key-values="Object.keys(CompressedTag).map((tag) => ({ key: CompressedTag[tag as keyof typeof CompressedTag], value: tag }))"
              label="Tags (or)"
            />
            <OptionSelectorMany v-model="chosenRustVersions" :options="rustVersions" label="Rust version" />
            <div class="flex items-center gap-2 [&>input]:w-10 [&>input]:rounded-md [&>input]:text-center [&>input]:ring-1 [&>input]:ring-gray-500">
              <span>Players</span>
              <input type="number" title="Min" v-model="playersRangeMin" />
              <span>to</span>
              <input type="number" title="Max" v-model="playersRangeMax" />
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
        <!-- TODO: switch to virtual list -->
        <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          <template v-for="server in renderedList" :key="server.id">
            <ServerBrowserCard :server="server" />
          </template>
        </div>
      </InfinitePageScroll>
    </template>
  </ApiPageStateHandler>
</template>
