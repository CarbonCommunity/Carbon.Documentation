<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { Check, ChevronDown, ChevronRight, GitBranch, Search, X } from 'lucide-vue-next'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'

export interface BranchOption {
  name: string
  // Commits on this branch that aren't on the default branch (all commits for the default one)
  count: number
  // Time of the newest of those commits, 0 when there are none
  latest: number
  isDefault: boolean
}

const { options } = defineProps<{ options: BranchOption[] }>()
const selected = defineModel<string>({ required: true })

const RECENT_DAYS = 30

const open = shallowRef(false)
const query = shallowRef('')
const showMerged = shallowRef(false)
const activeIndex = shallowRef(0)

const root = useTemplateRef<HTMLElement>('root')
const input = useTemplateRef<HTMLInputElement>('input')
const list = useTemplateRef<HTMLElement>('list')
onClickOutside(root, () => (open.value = false))

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
function timeAgo(time: number) {
  if (!time) return ''
  const seconds = (time - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.trunc(seconds / size), unit)
  }
  return 'now'
}

const groups = computed(() => {
  const term = query.value.trim().toLowerCase()
  const recentSince = Date.now() - RECENT_DAYS * 86400_000
  const matching = options.filter((x) => !term || x.name.toLowerCase().includes(term))

  const result = [
    { key: 'default', label: 'Default', items: matching.filter((x) => x.isDefault) },
    { key: 'recent', label: `Active in the last ${RECENT_DAYS} days`, items: matching.filter((x) => !x.isDefault && x.count && x.latest >= recentSince) },
    { key: 'older', label: 'Older', items: matching.filter((x) => !x.isDefault && x.count && x.latest < recentSince) },
    { key: 'merged', label: 'Fully merged', items: matching.filter((x) => !x.isDefault && !x.count) },
  ]
  return result.filter((x) => x.items.length)
})

// Merged branches stay collapsed unless searching.
const mergedVisible = computed(() => showMerged.value || !!query.value.trim())
const mergedCount = computed(() => options.filter((x) => !x.isDefault && !x.count).length)

// Flat list of what the keyboard can move through: '' is "All branches".
const navigable = computed(() => {
  const names = query.value.trim() ? [] : ['']
  for (const group of groups.value) {
    if (group.key == 'merged' && !mergedVisible.value) continue
    names.push(...group.items.map((x) => x.name))
  }
  return names
})

function highlight(name: string) {
  const term = query.value.trim()
  if (!term) return [{ text: name, match: false }]
  const index = name.toLowerCase().indexOf(term.toLowerCase())
  if (index < 0) return [{ text: name, match: false }]
  return [
    { text: name.substring(0, index), match: false },
    { text: name.substring(index, index + term.length), match: true },
    { text: name.substring(index + term.length), match: false },
  ]
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    showMerged.value = !!options.find((x) => x.name == selected.value && !x.isDefault && !x.count)
    activeIndex.value = Math.max(0, navigable.value.indexOf(selected.value))
    await nextTick()
    input.value?.focus()
    scrollActiveIntoView()
  }
}

function choose(name: string) {
  selected.value = name
  open.value = false
}

function scrollActiveIntoView() {
  nextTick(() => list.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }))
}

function onKeydown(event: KeyboardEvent) {
  const count = navigable.value.length
  if (event.key == 'ArrowDown' || event.key == 'ArrowUp') {
    event.preventDefault()
    if (!count) return
    activeIndex.value = (activeIndex.value + (event.key == 'ArrowDown' ? 1 : -1) + count) % count
    scrollActiveIntoView()
  } else if (event.key == 'Enter') {
    event.preventDefault()
    if (count) choose(navigable.value[activeIndex.value])
  } else if (event.key == 'Escape') {
    open.value = false
  }
}

watch(query, () => (activeIndex.value = 0))

const label = computed(() => selected.value || `All branches`)
</script>

<template>
  <div ref="root" class="relative">
    <button type="button" class="trigger" :class="{ active: selected }" :aria-expanded="open" @click="toggle">
      <GitBranch :size="13" class="shrink-0" />
      <span class="max-w-[14rem] truncate font-mono">{{ label }}</span>
      <span v-if="!selected" class="opacity-60">{{ options.length }}</span>
      <X v-if="selected" :size="12" class="shrink-0 opacity-60 hover:opacity-100" title="Show all branches" @click.stop="choose('')" />
      <ChevronDown v-else :size="12" class="shrink-0 opacity-60 transition-transform" :class="{ 'rotate-180': open }" />
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open" class="popover" @keydown="onKeydown">
        <div class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <Search :size="14" class="shrink-0 text-zinc-400" />
          <input ref="input" v-model="query" type="text" placeholder="Find a branch…" class="w-full bg-transparent text-sm outline-none" />
        </div>

        <div ref="list" class="max-h-[22rem] overflow-y-auto py-1">
          <button
            v-if="!query.trim()"
            class="row"
            :data-active="navigable[activeIndex] == ''"
            @mouseenter="activeIndex = navigable.indexOf('')"
            @click="choose('')"
          >
            <Check :size="13" class="shrink-0" :class="selected ? 'invisible' : 'text-emerald-500'" />
            <span class="flex-1 truncate text-left font-medium">All branches</span>
            <span class="meta">{{ options.length }}</span>
          </button>

          <template v-for="group in groups" :key="group.key">
            <button v-if="group.key == 'merged' && !query.trim()" class="group-label hover:text-zinc-900 dark:hover:text-zinc-100" @click="showMerged = !showMerged">
              <ChevronRight :size="12" class="transition-transform" :class="{ 'rotate-90': showMerged }" />
              {{ group.label }} · {{ mergedCount }}
            </button>
            <div v-else class="group-label">{{ group.label }}</div>

            <template v-if="group.key != 'merged' || mergedVisible">
              <button
                v-for="branch in group.items"
                :key="branch.name"
                class="row"
                :data-active="navigable[activeIndex] == branch.name"
                :title="branch.name"
                @mouseenter="activeIndex = navigable.indexOf(branch.name)"
                @click="choose(branch.name)"
              >
                <Check :size="13" class="shrink-0" :class="selected == branch.name ? 'text-emerald-500' : 'invisible'" />
                <span class="flex-1 truncate text-left font-mono text-[12.5px]">
                  <template v-for="(part, i) in highlight(branch.name)" :key="i">
                    <mark v-if="part.match">{{ part.text }}</mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
                <span v-if="branch.latest" class="meta w-16 text-right">{{ timeAgo(branch.latest) }}</span>
                <span v-if="branch.count" class="count">{{ branch.count.toLocaleString() }}</span>
              </button>
            </template>
          </template>

          <div v-if="!groups.length" class="px-3 py-6 text-center text-xs text-zinc-500">No branches match “{{ query }}”</div>
        </div>

        <div class="border-t border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-500 dark:border-zinc-800">
          Counts are commits not on the default branch · ↑↓ to move, ↵ to pick
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.trigger {
  @apply inline-flex items-center gap-1.5 rounded-full border border-zinc-200 py-1 pl-3 pr-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100;
}
.trigger.active {
  @apply border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300;
}

.popover {
  @apply absolute left-0 top-full z-30 mt-2 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900;
}

.group-label {
  @apply flex w-full items-center gap-1 px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500;
}

.row {
  @apply flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300;
}
.row[data-active='true'] {
  @apply bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100;
}

.meta {
  @apply shrink-0 text-[11px] text-zinc-500;
}

.count {
  @apply min-w-[2.5rem] shrink-0 rounded-full bg-zinc-200/80 px-1.5 text-center text-[11px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300;
}
.row[data-active='true'] .count {
  @apply bg-zinc-300/80 dark:bg-zinc-700;
}

mark {
  @apply rounded-sm bg-amber-300/60 text-inherit dark:bg-amber-500/40;
}
</style>
