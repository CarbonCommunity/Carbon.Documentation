<script setup lang="ts">
import { Server } from '@/api/misc/server-list'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { Map as MapIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const { server } = defineProps<{
  server: Server
}>()

interface ColorStop {
  r: number
  g: number
  b: number
}

interface ColorStops {
  [key: number]: ColorStop
}

const playerPercentage = computed(() => {
  return (server.players / server.maxplayers) * 100
})

const COLOR_STOPS: ColorStops = {
  0: { r: 16, g: 185, b: 129 }, // Emerald 500 - Empty
  60: { r: 16, g: 185, b: 129 }, // Emerald 500 - Still Green
  90: { r: 245, g: 158, b: 11 }, // Amber 500  - Getting Full
  100: { r: 245, g: 82, b: 11 }, // Amber 500  - Full but can join
}

const interpolateColor = computed(() => {
  const percentage = playerPercentage.value

  if (percentage <= 0) {
    return ''
  }

  if (percentage >= 100) {
    return 'rgb(239, 68, 68)'
  }

  let lower = 0
  let upper = 60
  if (percentage >= 60) {
    lower = 60
    upper = 90
  }
  if (percentage >= 90) {
    lower = 90
    upper = 100
  }

  const range = upper - lower
  const adjustedPercentage = (percentage - lower) / range

  const lowerColor = COLOR_STOPS[lower]
  const upperColor = COLOR_STOPS[upper]
  const r = Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * adjustedPercentage)
  const g = Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * adjustedPercentage)
  const b = Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * adjustedPercentage)

  return `rgb(${r}, ${g}, ${b})`
})

interface TagGroup {
  tags: Tag[]
  type: 'region' | 'wipe' | 'difficulty' | 'feature' | 'mod'
}

interface Tag {
  tag: string
  rawTag: string
}

const tagToRegion = new Map([
  ['NA', 'North America'],
  ['SA', 'South America'],
  ['EU', 'Europe'],
  ['WA', 'West Asia'],
  ['EA', 'East Asia'],
  ['OC', 'Oceania'],
  ['AF', 'Africa'],
])

const compressedTagToWipe = new Map([
  ['m', 'Monthly'],
  ['b', 'Biweekly'],
  ['w', 'Weekly'],
])

const compressedTagToDifficulty = new Map([
  ['v', 'Vanilla'],
  ['h', 'Hardcore'],
  ['s', 'Softcore'],
])

const compressedTagToFeature = new Map([
  ['p', 'PvE'],
  ['r', 'Roleplay'],
  ['c', 'Creative'],
  ['e', 'Minigame'],
  ['d', 'Combat Training'],
  ['i', 'Battlefield'],
  ['j', 'Battle Royale'],
  ['k', 'Build Server'],
  ['t', 'Tutorial'],
  ['q', 'Premium'],
])

const compressedTagToMod = new Map([
  ['z', 'Modded'],
  ['o', 'Oxide'],
  ['o^z', 'Oxide (m)'],
  ['y', 'Carbon'],
])

function epochToDate(epoch: number): string {
  const date = new Date(epoch * 1000)
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const processedTags = computed(() => {
  const tags = new Set(server.tags?.split(',').map((tag) => tag.trim()) || [])
  const result = {
    groups: [] as TagGroup[],
    displayTags: [] as Tag[],
  }

  const wipeGroup: TagGroup = { tags: [], type: 'wipe' }
  const difficultyGroup: TagGroup = { tags: [], type: 'difficulty' }
  const featureGroup: TagGroup = { tags: [], type: 'feature' }
  const modGroup: TagGroup = { tags: [], type: 'mod' }
  let region: Tag = { tag: '', rawTag: '' }

  for (const tag of tags) {
    if (tagToRegion.has(tag)) {
      region = { tag: tagToRegion.get(tag) || '', rawTag: tag }
      continue
    }

    if (tag.startsWith('^')) {
      const compressedTag = tag.slice(1)
      if (compressedTagToWipe.has(compressedTag)) {
        wipeGroup.tags.push({ tag: compressedTagToWipe.get(compressedTag) || '', rawTag: tag })
      } else if (compressedTagToDifficulty.has(compressedTag)) {
        difficultyGroup.tags.push({ tag: compressedTagToDifficulty.get(compressedTag) || '', rawTag: tag })
      } else if (compressedTagToFeature.has(compressedTag)) {
        featureGroup.tags.push({ tag: compressedTagToFeature.get(compressedTag) || '', rawTag: tag })
      } else if (compressedTagToMod.has(compressedTag)) {
        modGroup.tags.push({ tag: compressedTagToMod.get(compressedTag) || '', rawTag: tag })
      } else {
        result.displayTags.push({ tag, rawTag: tag })
      }
      continue
    }

    if (tag.startsWith('born')) {
      const epoch = parseInt(tag.slice(4))
      if (!isNaN(epoch) && epoch > 0) {
        result.displayTags.push({ tag: `WIPED: ${epochToDate(epoch)}`, rawTag: tag })
        continue
      }
    }

    if (tag.startsWith('ts')) {
      const teamSize = parseInt(tag.slice(2))
      if (!isNaN(teamSize)) {
        result.displayTags.push({ tag: `MAX TEAM: ${teamSize}`, rawTag: tag })
        continue
      }
    }

    if (
      !tag.startsWith('mp') &&
      !tag.startsWith('cp') &&
      !tag.startsWith('pt') &&
      !tag.startsWith('qp') &&
      !tag.startsWith('$r') &&
      !tag.startsWith('gm') &&
      !tag.startsWith('cs') &&
      !tag.startsWith('jp') &&
      !tag.startsWith('h') &&
      !tag.startsWith('stok')
    ) {
      result.displayTags.push({ tag, rawTag: tag })
    }
  }

  if (wipeGroup.tags.length) result.groups.push(wipeGroup)
  if (difficultyGroup.tags.length) result.groups.push(difficultyGroup)
  if (featureGroup.tags.length) result.groups.push(featureGroup)
  if (modGroup.tags.length) result.groups.push(modGroup)

  return {
    ...result,
    region,
  }
})
</script>

<template>
  <div class="server-card rounded-lg bg-zinc-100 dark:bg-zinc-900">
    <div class="flex h-full flex-col gap-2 p-3">
      <div class="flex items-start justify-between">
        <h3 class="line-clamp-4 pr-2 text-xs font-semibold leading-tight text-gray-800 dark:text-gray-200">
          {{ server.hostname }}
        </h3>
        <div class="rounded bg-zinc-200/70 px-2 py-1 text-xs font-medium tabular-nums dark:bg-zinc-800/70" :style="{ color: interpolateColor }">
          {{ server.players }}<span class="text-gray-500">/{{ server.maxplayers }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1 text-xs text-gray-500">
        <MapIcon :size="14" />
        <span class="truncate text-[0.7rem]">{{ server.map || 'Unknown Map' }}</span>
      </div>

      <div class="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div class="h-full rounded-full" :style="{ width: Math.min(playerPercentage, 100) + '%', backgroundColor: interpolateColor }"></div>
      </div>

      <div class="flex flex-wrap gap-x-1.5 gap-y-1">
        <span v-if="processedTags.region && processedTags.region.tag" class="tag tag-region" :title="processedTags.region.rawTag">
          {{ processedTags.region.tag }}
        </span>

        <template v-for="group in processedTags.groups" :key="group.type">
          <span v-for="tag in group.tags" :key="tag.rawTag" :class="['tag', `tag-${group.type}`]" :title="tag.rawTag">
            {{ tag.tag }}
          </span>
        </template>

        <span v-for="tag in processedTags.displayTags" :key="tag.rawTag" class="tag" :title="tag.rawTag">
          {{ tag.tag }}
        </span>
      </div>

      <div class="mt-auto flex flex-row flex-wrap items-center justify-between text-[0.7rem]">
        <div class="flex items-center gap-1 truncate font-mono text-gray-500">
          <span>{{ server.ip }}:{{ server.port }}</span>
          <ButtonIconCopy :getTextToCopy="() => `${server.ip}:${server.port}`" :size="12" :title="'Copy server address: ' + server.ip + ':' + server.port" />
        </div>
        <div class="whitespace-nowrap text-gray-600">Query: {{ server.query_port }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.server-card {
  @apply border border-zinc-300 transition-all duration-200 dark:border-zinc-800;
}

.server-card:hover {
  @apply border border-zinc-400 dark:border-zinc-700;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tag {
  @apply rounded-md border border-zinc-600/30 bg-zinc-500/10 px-1.5 py-0.5 text-[0.65rem] text-zinc-600 transition-colors dark:border-zinc-500/20 dark:bg-zinc-600/10 dark:text-zinc-400;
}

.tag:hover {
  @apply bg-black/[0.08] dark:bg-white/[0.08];
}

.tag-region {
  @apply border-blue-600/30 bg-blue-500/10 text-blue-600 dark:border-blue-500/20 dark:bg-blue-600/10 dark:text-blue-400;
}

.tag-wipe {
  @apply border-green-600/30 bg-green-500/10 text-green-600 dark:border-green-500/20 dark:bg-green-600/10 dark:text-green-400;
}

.tag-difficulty {
  @apply border-yellow-600/30 bg-yellow-500/10 text-yellow-600 dark:border-yellow-500/20 dark:bg-yellow-600/10 dark:text-yellow-400;
}

.tag-feature {
  @apply border-purple-600/30 bg-purple-500/10 text-purple-600 dark:border-purple-500/20 dark:bg-purple-600/10 dark:text-purple-400;
}

.tag-mod {
  @apply border-red-600/30 bg-red-500/10 text-red-600 dark:border-red-500/20 dark:bg-red-600/10 dark:text-red-400;
}
</style>
