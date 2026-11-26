<script setup lang="ts">
import { useUrlSearchParams } from '@vueuse/core'
import { Check, Copy, ExternalLink, GitBranch, GitCommitHorizontal, RefreshCw, X } from 'lucide-vue-next'
import { computed, onMounted, shallowRef, watch } from 'vue'
import InfinitePageScroll from './common/InfinitePageScroll.vue'
import SearchBar from './common/SearchBar.vue'
import { Commit } from './commits/Commits'
import BranchPicker from './commits/BranchPicker.vue'
import CommitAvatar from './commits/CommitAvatar.vue'
import { CommitData, loadCommitData, loadUpdates, REPOSITORIES, Repository, UpdateResult } from './commits/CommitsSource'

const params = useUrlSearchParams('history', { removeFalsyValues: true })

const data = shallowRef<CommitData | null>(null)
const allCommits = shallowRef<Commit[]>([])
const repositoryInfo = shallowRef<Map<string, Repository>>(new Map())
const updates = shallowRef<UpdateResult | null>(null)
const loading = shallowRef(true)
const refreshing = shallowRef(false)
const error = shallowRef<string>('')

const search = shallowRef<string>('')
const repoFilter = computed({
  get: () => (params.repo as string) ?? '',
  set: (value: string) => (params.repo = value),
})
const authorFilter = computed({
  get: () => (params.author as string) ?? '',
  set: (value: string) => (params.author = value),
})
const branchFilter = computed({
  get: () => (params.branch as string) ?? '',
  set: (value: string) => (params.branch = value),
})
const dayFilter = computed({
  get: () => (params.day as string) ?? '',
  set: (value: string) => (params.day = value),
})

// ---------- helpers ----------

function dayKey(date: Date | null) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayLabel(key: string) {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (key == dayKey(today)) return 'Today'
  if (key == dayKey(yesterday)) return 'Yesterday'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: y == today.getFullYear() ? undefined : 'numeric',
  })
}

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
function timeAgo(date: Date | null) {
  if (!date) return ''
  const seconds = (date.getTime() - Date.now()) / 1000
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
  return 'just now'
}

function sortByDate(list: Commit[]) {
  return list.sort((a, b) => (b.Date?.getTime() ?? 0) - (a.Date?.getTime() ?? 0))
}

function isDefaultBranch(repository: string, branch: string) {
  return repositoryInfo.value.get(repository)?.defaultBranch == branch
}

// ---------- filtering ----------

function matchesSearch(commit: Commit, term: string) {
  return (
    commit.Message.toLowerCase().includes(term) ||
    commit.Repository.toLowerCase().includes(term) ||
    commit.AuthorName.toLowerCase().includes(term) ||
    commit.Body.toLowerCase().includes(term) ||
    commit.Branches.some((x) => x.toLowerCase().includes(term)) ||
    commit.SHA.startsWith(term)
  )
}

// Everything except the day filter, so the heatmap keeps showing the whole year.
const filteredNoDay = computed(() => {
  const term = search.value?.trim().toLowerCase() ?? ''
  const branch = repoFilter.value ? branchFilter.value : ''
  return allCommits.value.filter(
    (x) =>
      (!repoFilter.value || x.Repository == repoFilter.value) &&
      (!branch || x.Branches.includes(branch)) &&
      (!authorFilter.value || x.AuthorName == authorFilter.value) &&
      (!term || matchesSearch(x, term))
  )
})

const filtered = computed(() => (dayFilter.value ? filteredNoDay.value.filter((x) => dayKey(x.Date) == dayFilter.value) : filteredNoDay.value))

const hasFilters = computed(() => !!(search.value || repoFilter.value || authorFilter.value || dayFilter.value))

function clearFilters() {
  search.value = ''
  repoFilter.value = ''
  branchFilter.value = ''
  authorFilter.value = ''
  dayFilter.value = ''
}

// ---------- branches ----------

// Branches of the selected repository: default first, then by most recent commit.
// Branches fully merged into the default branch have no commits of their own and go last.
const branchOptions = computed(() => {
  const repo = repositoryInfo.value.get(repoFilter.value)
  if (!repo) return []

  const stats = new Map<string, { count: number; latest: number }>()
  for (const commit of allCommits.value) {
    if (commit.Repository != repo.name) continue
    for (const branch of commit.Branches) {
      const entry = stats.get(branch) ?? { count: 0, latest: 0 }
      entry.count++
      entry.latest = Math.max(entry.latest, commit.Date?.getTime() ?? 0)
      stats.set(branch, entry)
    }
  }

  return [...repo.branches.keys()]
    .map((name) => ({ name, count: stats.get(name)?.count ?? 0, latest: stats.get(name)?.latest ?? 0, isDefault: name == repo.defaultBranch }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.latest - a.latest || a.name.localeCompare(b.name))
})

const selectedBranchIsDefault = computed(() => isDefaultBranch(repoFilter.value, branchFilter.value))
const selectedBranchMerged = computed(() => !!branchFilter.value && branchOptions.value.find((x) => x.name == branchFilter.value)?.count === 0)

function selectRepo(repo: string) {
  if (repoFilter.value == repo) return
  repoFilter.value = repo
  branchFilter.value = ''
}

function selectBranch(repository: string, branch: string) {
  selectRepo(repository)
  branchFilter.value = branch
}

watch(branchFilter, () => (dayFilter.value = ''))

// ---------- message bodies ----------

const expanded = shallowRef(new Set<string>())
function toggleExpanded(sha: string) {
  const next = new Set(expanded.value)
  if (!next.delete(sha)) next.add(sha)
  expanded.value = next
}

// ---------- stats & facets ----------

const repositories = computed(() => {
  const counts = new Map<string, number>()
  for (const commit of allCommits.value) counts.set(commit.Repository, (counts.get(commit.Repository) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
})

const contributors = computed(() => {
  const map = new Map<string, { name: string; avatar: string; url: string; count: number }>()
  for (const commit of allCommits.value) {
    if (repoFilter.value && commit.Repository != repoFilter.value) continue
    const entry = map.get(commit.AuthorName)
    if (entry) {
      entry.count++
      if (!entry.avatar && commit.AuthorAvatar) entry.avatar = commit.AuthorAvatar
    } else {
      map.set(commit.AuthorName, { name: commit.AuthorName, avatar: commit.AuthorAvatar, url: commit.AuthorUrl, count: 1 })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})

const stats = computed(() => {
  const list = filtered.value
  const authors = new Set(list.map((x) => x.AuthorName)).size
  const branches = new Set(list.flatMap((x) => x.Branches.map((b) => `${x.Repository}/${b}`))).size
  const now = Date.now()
  const last30 = list.filter((x) => x.Date && now - x.Date.getTime() < 30 * 86400_000).length
  return [
    { label: 'Commits', value: list.length.toLocaleString() },
    { label: 'Branches', value: branches.toLocaleString() },
    { label: 'Contributors', value: authors.toLocaleString() },
    { label: 'Last 30 days', value: last30.toLocaleString() },
    { label: 'Latest', value: list.length ? timeAgo(list[0].Date) : '—' },
  ]
})

// ---------- activity heatmap (last 53 weeks) ----------

const heatmap = computed(() => {
  const counts = new Map<string, number>()
  for (const commit of filteredNoDay.value) {
    const key = dayKey(commit.Date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 52 * 7 - today.getDay())
  const weeks: { key: string; date: Date; count: number; future: boolean }[][] = []
  const months: { label: string; column: number }[] = []
  let max = 0
  let total = 0

  for (let w = 0; w < 53; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
      const key = dayKey(date)
      const count = counts.get(key) ?? 0
      const future = date > today
      if (!future) {
        max = Math.max(max, count)
        total += count
      }
      if (date.getDate() == 1 && !future) months.push({ label: date.toLocaleDateString(undefined, { month: 'short' }), column: w })
      week.push({ key, date, count, future })
    }
    weeks.push(week)
  }
  return { weeks, months, max, total }
})

function heatLevel(count: number) {
  if (count == 0) return 0
  const max = heatmap.value.max
  return Math.min(4, Math.ceil((count / max) * 4))
}

function toggleDay(key: string, count: number) {
  if (count == 0) return
  dayFilter.value = dayFilter.value == key ? '' : key
}

// ---------- grouping ----------

function groupByDay(list: Commit[]) {
  const groups: { key: string; commits: Commit[] }[] = []
  for (const commit of list) {
    const key = dayKey(commit.Date)
    const last = groups[groups.length - 1]
    if (last && last.key == key) last.commits.push(commit)
    else groups.push({ key, commits: [commit] })
  }
  return groups
}

const dayTotals = computed(() => {
  const totals = new Map<string, number>()
  for (const commit of filtered.value) {
    const key = dayKey(commit.Date)
    totals.set(key, (totals.get(key) ?? 0) + 1)
  }
  return totals
})

// ---------- copy sha ----------

const copiedSha = shallowRef('')
async function copySha(sha: string) {
  try {
    await navigator.clipboard.writeText(sha)
    copiedSha.value = sha
    setTimeout(() => {
      if (copiedSha.value == sha) copiedSha.value = ''
    }, 1500)
  } catch {
    /* clipboard unavailable */
  }
}

// ---------- loading ----------

// Commits from GitHub carry account logins; reuse them for other commits by the same author.
function applyKnownLogins(commits: Commit[]) {
  const logins = new Map<string, string>()
  for (const commit of commits) {
    if (commit.AuthorUrl && !logins.has(commit.AuthorName)) logins.set(commit.AuthorName, commit.AuthorUrl.substring('https://github.com/'.length))
  }
  for (const commit of commits) {
    const login = logins.get(commit.AuthorName)
    if (login && !commit.AuthorUrl) commit.setLogin(login)
  }
}

async function refresh(force: boolean) {
  if (!data.value) return
  refreshing.value = true
  try {
    const repoNames = data.value.repositories.size ? [...data.value.repositories.keys()] : REPOSITORIES
    updates.value = await loadUpdates(data.value, repoNames, force)
    const merged = [...updates.value.commits, ...data.value.commits]
    applyKnownLogins(merged)
    allCommits.value = sortByDate(merged)
    repositoryInfo.value = new Map(data.value.repositories)
  } finally {
    refreshing.value = false
  }
}

const syncLabel = computed(() => {
  if (refreshing.value) return 'Syncing with GitHub…'
  if (!updates.value) return ''
  const { failedRepositories, skippedBranches, fetchedAt } = updates.value
  if (failedRepositories.length) return `GitHub unavailable for ${failedRepositories.join(', ')} (likely rate limited)`
  if (skippedBranches) return `${skippedBranches} branch${skippedBranches == 1 ? '' : 'es'} not synced yet (GitHub rate limit)`
  return `Synced with GitHub ${timeAgo(fetchedAt)}`
})

const syncHealthy = computed(() => !!updates.value && !updates.value.failedRepositories.length && !updates.value.skippedBranches)

onMounted(async () => {
  // Older links used ?search=
  if (params.search) {
    search.value = params.search as string
    params.search = ''
  }

  try {
    data.value = await loadCommitData()
    allCommits.value = data.value.commits
    repositoryInfo.value = new Map(data.value.repositories)
  } catch (e) {
    error.value = (e as Error).message
    return
  } finally {
    loading.value = false
  }
  await refresh(false)
})
</script>

<template>
  <div class="commits mx-auto w-full max-w-5xl px-4 pb-24 pt-10 sm:px-6">
    <!-- Header -->
    <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <GitCommitHorizontal :size="30" class="text-emerald-500" />
          Commits
        </h1>
        <p class="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Every change made across the
          <a href="https://github.com/CarbonCommunity" target="_blank">CarbonCommunity</a>
          repositories, on every branch, newest first.
        </p>
      </div>
      <div v-if="!loading && !error" class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span class="relative flex h-2 w-2">
          <span v-if="syncHealthy" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full" :class="refreshing ? 'bg-zinc-400' : syncHealthy ? 'bg-emerald-500' : 'bg-amber-500'"></span>
        </span>
        <span>{{ syncLabel }}</span>
        <button
          class="ml-1 rounded-md p-1.5 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          title="Sync again with GitHub"
          :disabled="refreshing"
          @click="refresh(true)"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': refreshing }" />
        </button>
      </div>
    </header>

    <!-- Error -->
    <div v-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-600 dark:text-red-300">
      Couldn't load commits: {{ error }}
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="animate-pulse space-y-4">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div v-for="i in 5" :key="i" class="h-20 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60"></div>
      </div>
      <div class="h-36 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60"></div>
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-zinc-200/40 dark:bg-zinc-800/40"></div>
    </div>

    <template v-else>
      <!-- Stats -->
      <section class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div v-for="stat in stats" :key="stat.label" class="panel px-4 py-3">
          <div class="text-xs uppercase tracking-wider text-zinc-500">{{ stat.label }}</div>
          <div class="mt-1 text-2xl font-semibold tabular-nums">{{ stat.value }}</div>
        </div>
      </section>

      <!-- Activity -->
      <section class="panel mb-6 p-4">
        <div class="mb-3 flex items-baseline justify-between text-sm">
          <span class="font-semibold">Activity</span>
          <span class="text-xs text-zinc-500">{{ heatmap.total.toLocaleString() }} commits in the last year · click a day to filter</span>
        </div>
        <div class="overflow-x-auto pb-1">
          <div class="heatmap inline-grid">
            <div class="relative col-span-full mb-1 h-4 text-[10px] text-zinc-500">
              <span v-for="month in heatmap.months" :key="month.column" class="absolute" :style="{ left: `${month.column * 14}px` }">{{
                month.label
              }}</span>
            </div>
            <div class="flex gap-[3px]">
              <div v-for="(week, w) in heatmap.weeks" :key="w" class="flex flex-col gap-[3px]">
                <button
                  v-for="day in week"
                  :key="day.key"
                  class="cell"
                  :class="[`level-${heatLevel(day.count)}`, { invisible: day.future, selected: dayFilter == day.key, 'cursor-default': day.count == 0 }]"
                  :title="`${day.count} commit${day.count == 1 ? '' : 's'} on ${day.date.toDateString()}`"
                  @click="toggleDay(day.key, day.count)"
                ></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Filters -->
      <SearchBar v-model="search" placeholder="Search by message, author, branch or SHA…" is-sticky class="mb-4" />

      <section class="mb-6 flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button class="chip" :class="{ active: !repoFilter }" @click="selectRepo('')">All repositories</button>
          <button
            v-for="repo in repositories"
            :key="repo.name"
            class="chip"
            :class="{ active: repoFilter == repo.name }"
            @click="selectRepo(repoFilter == repo.name ? '' : repo.name)"
          >
            {{ repo.name }} <span class="opacity-60">{{ repo.count.toLocaleString() }}</span>
          </button>

          <BranchPicker v-if="repoFilter && branchOptions.length" v-model="branchFilter" :options="branchOptions" />
        </div>

        <div v-if="repoFilter && branchFilter && !selectedBranchIsDefault" class="notice">
          <GitBranch :size="14" class="mt-0.5 shrink-0" />
          <span v-if="selectedBranchMerged">
            <b>{{ branchFilter }}</b> is fully merged: all of its commits are already on <b>{{ repositoryInfo.get(repoFilter)?.defaultBranch }}</b>.
            <button class="font-semibold underline-offset-2 hover:underline" @click="branchFilter = ''">Show all branches</button>
          </span>
          <span v-else>
            Showing commits on <b>{{ branchFilter }}</b> that aren't on <b>{{ repositoryInfo.get(repoFilter)?.defaultBranch }}</b>.
            <button class="font-semibold underline-offset-2 hover:underline" @click="branchFilter = ''">Show all branches</button>
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="person in contributors"
            :key="person.name"
            class="avatar-chip"
            :class="{ active: authorFilter == person.name, dimmed: authorFilter && authorFilter != person.name }"
            :title="`${person.name} · ${person.count.toLocaleString()} commits`"
            @click="authorFilter = authorFilter == person.name ? '' : person.name"
          >
            <CommitAvatar :name="person.name" :src="person.avatar" :size="28" />
          </button>
        </div>

        <div v-if="hasFilters" class="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>Showing {{ filtered.length.toLocaleString() }} of {{ allCommits.length.toLocaleString() }}</span>
          <span v-if="repoFilter && branchFilter" class="tag">branch: {{ branchFilter }}</span>
          <span v-if="authorFilter" class="tag">author: {{ authorFilter }}</span>
          <span v-if="dayFilter" class="tag">day: {{ dayLabel(dayFilter) }}</span>
          <button class="inline-flex items-center gap-1 font-medium hover:text-zinc-900 dark:hover:text-zinc-100" @click="clearFilters">
            <X :size="12" /> Clear filters
          </button>
        </div>
      </section>

      <!-- Empty -->
      <div v-if="filtered.length == 0 && !selectedBranchMerged" class="panel p-10 text-center text-sm text-zinc-500">
        No commits match these filters.
        <button class="ml-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400" @click="clearFilters">Reset</button>
      </div>

      <!-- Timeline -->
      <InfinitePageScroll v-else-if="filtered.length" :list="filtered" :page-size="60" v-slot="{ renderedList }">
        <section v-for="group in groupByDay(renderedList)" :key="group.key" class="mb-8">
          <h2 class="day-heading">
            <span>{{ dayLabel(group.key) }}</span>
            <span class="text-xs font-normal text-zinc-500">{{ dayTotals.get(group.key)?.toLocaleString() }} commit{{ dayTotals.get(group.key) == 1 ? '' : 's' }}</span>
          </h2>

          <ol class="panel divide-y divide-zinc-200/70 overflow-hidden dark:divide-zinc-800">
            <li v-for="commit in group.commits" :key="commit.Repository + commit.SHA" class="commit-row group">
              <component :is="commit.AuthorUrl ? 'a' : 'span'" :href="commit.AuthorUrl || undefined" target="_blank" class="shrink-0" :title="commit.AuthorName">
                <CommitAvatar :name="commit.AuthorName" :src="commit.AuthorAvatar" :size="36" />
              </component>

              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-2">
                  <a :href="commit.CommitUrl" target="_blank" class="message" :title="commit.Message">{{ commit.Message || '(no message)' }}</a>
                  <button
                    v-if="commit.Body"
                    class="expand"
                    :class="{ open: expanded.has(commit.SHA) }"
                    :title="expanded.has(commit.SHA) ? 'Hide description' : 'Show description'"
                    @click="toggleExpanded(commit.SHA)"
                  >
                    …
                  </button>
                </div>
                <pre v-if="commit.Body && expanded.has(commit.SHA)" class="body">{{ commit.Body }}</pre>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                  <button class="font-medium text-zinc-700 hover:underline dark:text-zinc-300" @click="authorFilter = commit.AuthorName">
                    {{ commit.AuthorName }}
                  </button>
                  <span>committed</span>
                  <span :title="commit.Date?.toLocaleString()">{{ timeAgo(commit.Date) }}</span>
                  <span class="opacity-40">·</span>
                  <button class="repo-tag" @click="selectRepo(commit.Repository)">{{ commit.Repository }}</button>
                  <button
                    v-for="branch in commit.Branches.slice(0, 2)"
                    :key="branch"
                    class="branch-tag"
                    :class="{ default: isDefaultBranch(commit.Repository, branch) }"
                    :title="`Show ${branch}`"
                    @click="selectBranch(commit.Repository, branch)"
                  >
                    <GitBranch :size="10" />{{ branch }}
                  </button>
                  <span v-if="commit.Branches.length > 2" class="text-[11px]" :title="commit.Branches.slice(2).join(', ')">+{{ commit.Branches.length - 2 }} more</span>
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-1 self-center">
                <div class="sha-group">
                  <button class="sha" :title="`Copy ${commit.SHA}`" @click="copySha(commit.SHA)">
                    <span class="font-mono">{{ commit.ShortSHA }}</span>
                    <Check v-if="copiedSha == commit.SHA" :size="12" class="text-emerald-500" />
                    <Copy v-else :size="12" class="opacity-50" />
                  </button>
                  <a :href="commit.CommitUrl" target="_blank" class="sha-link" title="Open on GitHub"><ExternalLink :size="12" /></a>
                </div>
              </div>
            </li>
          </ol>
        </section>
      </InfinitePageScroll>
    </template>
  </div>
</template>

<style scoped>
.panel {
  @apply rounded-xl border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/40;
}

.chip {
  @apply rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100;
}
.chip.active {
  @apply border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300;
}

.avatar-chip {
  @apply rounded-full ring-2 ring-transparent transition-all hover:scale-110;
}
.avatar-chip.active {
  @apply ring-emerald-500;
}
.avatar-chip.dimmed {
  @apply opacity-30 hover:opacity-100;
}

.tag {
  @apply rounded-md bg-zinc-200/70 px-2 py-0.5 dark:bg-zinc-800;
}

.day-heading {
  @apply mb-2 flex items-baseline justify-between border-none px-1 pt-0 text-sm font-semibold text-zinc-700 dark:text-zinc-300;
  margin-top: 0;
  letter-spacing: normal;
  line-height: 1.5;
}

.commit-row {
  @apply flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40;
  margin: 0;
  list-style: none;
}

.message {
  @apply block min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100;
  text-decoration: none !important;
}
.message:hover {
  @apply text-emerald-600 dark:text-emerald-400;
}

.repo-tag {
  @apply rounded bg-zinc-200/70 px-1.5 py-px font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700;
}

.branch-tag {
  @apply inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-px font-mono text-sky-700 hover:bg-sky-500/20 dark:text-sky-300;
  font-size: 11px;
}
.branch-tag.default {
  @apply bg-zinc-200/70 text-zinc-500 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700;
}

.notice {
  @apply flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs text-sky-800 dark:text-sky-200;
}

.expand {
  @apply shrink-0 rounded bg-zinc-200/80 px-1.5 text-xs font-bold leading-4 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700;
}
.expand.open {
  @apply bg-emerald-500/20 text-emerald-700 dark:text-emerald-300;
}

.body {
  @apply mt-2 whitespace-pre-wrap break-words rounded-md border-l-2 border-zinc-300 bg-transparent py-1 pl-3 font-sans text-xs leading-5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400;
  margin-bottom: 0;
}

.sha-group {
  @apply flex items-center overflow-hidden rounded-md border border-zinc-200 text-xs dark:border-zinc-700;
}
.sha {
  @apply flex items-center gap-1.5 px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800;
}
.sha-link {
  @apply border-l border-zinc-200 px-1.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100;
}

.cell {
  @apply h-[11px] w-[11px] rounded-[2px] outline-offset-1;
}
.cell.selected {
  outline: 2px solid theme('colors.emerald.500');
}
.level-0 {
  @apply bg-zinc-200 dark:bg-zinc-800;
}
.level-1 {
  @apply bg-emerald-200 dark:bg-emerald-900;
}
.level-2 {
  @apply bg-emerald-300 dark:bg-emerald-700;
}
.level-3 {
  @apply bg-emerald-500 dark:bg-emerald-500;
}
.level-4 {
  @apply bg-emerald-700 dark:bg-emerald-300;
}

.commits ol {
  padding-left: 0;
  margin: 0;
}
</style>
