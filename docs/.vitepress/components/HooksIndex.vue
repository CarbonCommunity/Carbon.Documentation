<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Database, ExternalLink, Loader2, Search, CheckCircle2, Copy } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import { getHookFlagsText } from '@/shared/constants'
import { URL_METDAT_CARB_HOOKS } from '@/api/constants'
import '../theme/style.css'
import { fetchHooks } from '@/api/metadata/carbon/hooks'
import type { Hook } from '@/api/metadata/carbon/hooks'
import { watchDebounced } from '@vueuse/core'
import { getSingletonHighlighter } from 'shiki'
import type { Highlighter } from 'shiki'
import { useData } from 'vitepress'

const data = useData()

const isLoading = shallowRef(true)
const error = shallowRef<string | null>(null)

const highlighter = shallowRef<Highlighter | null>(null)

const hooks = shallowRef<Hook[]>([])

const categories = shallowRef<string[]>([])
const selectedCategory = shallowRef('all')
const showOxideHooks = shallowRef(true)
const showCarbonHooks = shallowRef(true)

const inputSearch = shallowRef('')
const debouncedInputSearch = shallowRef('')

const currentPage = shallowRef(1)
const pageSize = 25

const expandedHookSources = ref<Set<string>>(new Set())
const expandedHookExamples = ref<Set<string>>(new Set())

const copiedId = shallowRef<string | null>(null)

const filteredHooks = computed(() => {
  if (!hooks.value?.length) {
    return []
  }

  let filtered = hooks.value

  if (selectedCategory.value && selectedCategory.value != 'all') {
    filtered = filtered.filter((hook) => hook.Category == selectedCategory.value)
  }

  if (showOxideHooks.value != showCarbonHooks.value) {
    filtered = filtered.filter(
      (hook) => hook.OxideCompatible == showOxideHooks.value && hook.OxideCompatible != showCarbonHooks.value
    )
  } else if (!showOxideHooks.value && !showCarbonHooks.value) {
    filtered = []
  }

  if (debouncedInputSearch.value) {
    const searchLower = debouncedInputSearch.value.toLowerCase()
    const searchNumber = Number(searchLower)
    filtered = filtered.filter((hook) => {
      return (
        (hook.Name && hook.Name.toLowerCase().includes(searchLower)) ||
        (hook.Descriptions && hook.Descriptions.some((desc) => desc.toLowerCase().includes(searchLower))) ||
        hook.Id == searchNumber
      )
    })
  }

  return filtered
})

const renderedHooks = computed(() => {
  currentPage.value = Math.min(currentPage.value, Math.ceil(filteredHooks.value.length / pageSize))
  return filteredHooks.value.slice(0, currentPage.value * pageSize)
})

const loadHooks = async () => {
  try {
    isLoading.value = true
    error.value = null

    const data = await fetchHooks()

    if (!data) {
      throw new Error('No data received from API')
    }

    const flatHooks: Hook[] = []

    data.forEach((hooks) => {
      flatHooks.push(...hooks)
    })

    if (flatHooks.length == 0) {
      throw new Error('No hooks found in the data')
    }

    hooks.value = flatHooks
    categories.value = Array.from(data.keys())
  } catch (err) {
    console.error('Failed to load hooks:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load hooks. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

function renderMoreHooks() {
  if (!filteredHooks || filteredHooks.value.length < currentPage.value * pageSize) {
    return
  }

  currentPage.value++
}

function handleScroll() {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
    renderMoreHooks()
  }
}

const getSanitizedAnchor = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const updateDebouncedSearch = (value: string) => {
  inputSearch.value = value

  if (value) {
    const hash = value.toLowerCase().replace(/\s+/g, '-')
    window.history.replaceState(null, '', `#${hash}`)
  } else {
    window.history.replaceState(null, '', window.location.pathname)
  }
}

const handleUrlSearch = () => {
  const hash = window.location.hash.slice(1)
  if (hash) {
    const searchTerm = decodeURIComponent(hash)
      .replace(/^hook-/, '')
      .replace(/-/g, ' ')
    const cleanTerm = searchTerm
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    debouncedInputSearch.value = cleanTerm
    updateDebouncedSearch(cleanTerm)
  }
}

function getCorrespondingTitleForHookFlag(flag: string): string {
  switch (flag) {
    case 'Static':
      return 'Permanently active if loaded once'
    case 'Patch':
      return "Permanently active Patch which don't necessarily execute hooks (modify game code)"
    case 'IgnoreChecksum':
      return 'Dynamically patched regardless of version '
    default:
      return ''
  }
}

function highlightCode(code: string, language = 'csharp'): string {
  if (!highlighter.value) {
    return code
  }
  const isDark = data.isDark.value
  try {
    return highlighter.value.codeToHtml(code, {
      lang: language,
      theme: isDark ? 'github-dark' : 'github-light',
    })
  } catch (err) {
    console.error('Failed to highlight code:', err)
    return code
  }
}

function getExampleCode(hook: Hook, highlighted: boolean): string {
  const code = `private ${hook.ReturnTypeName} ${hook.Name}(${hook.ParametersText})
{
    Puts("${hook.Name} has been called!");${
    hook.ReturnTypeName !== 'void'
      ? `
    return (${hook.ReturnTypeName})default;`
      : ''
  }
}`
  return highlighted ? highlightCode(code) : code
}

const copyToClipboard = async (text: string, id: string | null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

watch(
  () => window.location.hash,
  (newHash) => {
    if (newHash) {
      handleUrlSearch()
    }
  }
)

watchDebounced(
  inputSearch,
  () => {
    debouncedInputSearch.value = inputSearch.value
  },
  { debounce: 350, maxWait: 350 * 3 }
)

onMounted(async () => {
  await loadHooks()
  try {
    highlighter.value = await getSingletonHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['csharp'],
    })
  } catch (err) {
    console.error('Failed to load highlighter:', err)
  }
  handleUrlSearch()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Carbon Hooks Reference</h1>
    <p class="mb-4">
      This section contains a comprehensive list of all hooks available in Carbon. Each hook is listed with
      its name, category, and compatibility information.
    </p>
    <p class="mb-4">
      By default, if hooks are not <VPBadge type="danger" text="Static" /> or
      <VPBadge type="danger" text="Patch" />, they're dynamically applied upon plugin subscription, otherwise
      inactive.
    </p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a
          :href="URL_METDAT_CARB_HOOKS"
          target="_blank"
          class="vp-button medium brand flex items-center gap-2"
        >
          <Database :size="16" />
          Hooks API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="animate-spin" :size="24" />
      <span class="ml-2">Loading hooks...</span>
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-8 text-center">
      <div class="text-red-500 mb-4">{{ error }}</div>
    </div>

    <div v-else>
      <div
        class="mb-4 sticky min-[960px]:top-20 top-16 z-10 bg-zinc-100/40 dark:bg-gray-800/40 backdrop-blur-sm px-4 py-2 rounded-xl"
      >
        <div class="flex sm:flex-row flex-col sm:items-center items-start gap-4">
          <div class="flex items-center flex-1">
            <Search class="text-gray-400" :size="20" />
            <input
              type="text"
              v-model="inputSearch"
              @input="(event) => updateDebouncedSearch((event.target as HTMLInputElement)?.value)"
              placeholder="Search hooks..."
              class="px-4 py-2 w-full"
            />
          </div>
          <div class="flex flex-row gap-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">Category:</span>
              <select v-model="selectedCategory" class="px-3 py-2 bg-inherit">
                <option value="all" class="">All Hooks</option>
                <option class="" v-for="(category, index) in categories" :key="index" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
            <div class="flex flex-row items-center gap-2">
              <div class="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="chkBkFl1"
                  v-model="showOxideHooks"
                  class="w-4 h-4 accent-violet-600 focus:ring-2 ring-violet-500"
                />
                <label class="text-sm" for="chkBkFl1">Oxide</label>
              </div>
              <div class="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="chkBkFl2"
                  v-model="showCarbonHooks"
                  class="w-4 h-4 accent-violet-600 focus:ring-2 ring-violet-500"
                />
                <label class="text-sm" for="chkBkFl2">Carbon</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredHooks && filteredHooks.length">
        <div class="fixed bottom-4 sm:right-4 sm:left-auto left-1/2 z-10">
          <div
            class="text-sm text-gray-500 bg-zinc-100/40 dark:bg-gray-800/40 backdrop-blur-sm px-4 py-2 rounded-lg"
          >
            Rendering {{ renderedHooks.length }} of {{ filteredHooks.length }} filtered hooks,
            {{ hooks.length }} total hooks.
          </div>
        </div>
        <div class="flex flex-col gap-5 mt-4">
          <div v-for="hook in renderedHooks" :key="hook.FullName" :id="getSanitizedAnchor(hook.FullName)">
            <div>
              <div class="flex flex-col gap-1">
                <div class="flex sm:flex-row flex-col sm:items-center items-start gap-2">
                  <h5 class="text-lg font-medium">
                    <a
                      :href="`/references/hooks#${encodeURIComponent(hook.FullName)}`"
                      class="flex items-center gap-2"
                    >
                      <span>{{ hook.FullName }}</span>
                      <ExternalLink :size="14" class="opacity-60" />
                    </a>
                  </h5>
                  <div class="flex flex-wrap gap-1.5">
                    <VPBadge v-if="hook.Category" type="info" :text="hook.Category" title="Category" />
                    <template v-for="flag in getHookFlagsText(hook.Flags)" class="text-sm">
                      <VPBadge
                        v-if="hook.Flags"
                        type="danger"
                        :text="`${flag}`"
                        :title="getCorrespondingTitleForHookFlag(flag)"
                      />
                    </template>
                    <VPBadge
                      v-if="hook.OxideCompatible"
                      type="tip"
                      text="Oxide Compatible"
                      title="Indicates that this hook is compatible with Oxide"
                    />
                  </div>
                </div>
                <div class="flex flex-col text-sm text-gray-500">
                  <template v-for="(description, index) in hook.Descriptions" :key="index">
                    <span class="font-bold">{{ description }}</span>
                  </template>
                  <span v-if="hook.ReturnTypeName != 'void'"
                    >Returning a non-null value cancels default behavior.</span
                  >
                  <span v-if="hook.ReturnTypeName == 'void'">No return behavior.</span>
                </div>
              </div>
              <div class="mt-1 flex gap-2">
                <button
                  v-if="getExampleCode(hook, false)"
                  class="flex flex-row-reverse items-center text-xs px-2 py-1 text-gray-500 bg-gray-100 dark:bg-gray-800"
                  @click="
                    expandedHookExamples.has(hook.FullName)
                      ? expandedHookExamples.delete(hook.FullName)
                      : expandedHookExamples.add(hook.FullName)
                  "
                >
                  <span
                    @click.stop="copyToClipboard(getExampleCode(hook, false), 'examplecode' + hook.FullName)"
                  >
                    <component
                      :is="copiedId === 'examplecode' + hook.FullName ? CheckCircle2 : Copy"
                      class="ml-2"
                      :size="14"
                    />
                  </span>
                  {{ expandedHookExamples.has(hook.FullName) ? 'Hide Example' : 'Show Example' }}
                </button>
                <button
                  v-if="hook.MethodSource"
                  class="flex flex-row-reverse items-center text-xs px-2 py-1 text-gray-500 bg-gray-100 dark:bg-gray-800"
                  @click="
                    expandedHookSources.has(hook.FullName)
                      ? expandedHookSources.delete(hook.FullName)
                      : expandedHookSources.add(hook.FullName)
                  "
                >
                  <span @click.stop="copyToClipboard(hook.MethodSource, 'sourcecode' + hook.FullName)">
                    <component
                      :is="copiedId === 'sourcecode' + hook.FullName ? CheckCircle2 : Copy"
                      class="ml-2"
                      :size="14"
                    />
                  </span>
                  {{ expandedHookSources.has(hook.FullName) ? 'Hide Source' : 'Show Source' }}
                </button>
                <button
                  v-else
                  disabled
                  class="text-xs px-2 py-1 text-gray-500 rounded-lg bg-gray-100 dark:bg-gray-800"
                >
                  No method source
                </button>
                <button
                  v-if="hook.TargetName"
                  disabled
                  class="text-xs px-2 py-1 text-gray-500 bg-gray-100 dark:bg-gray-800"
                >
                  {{ hook.TargetName }}
                </button>
                <span v-if="hook.TargetName" class="text-xs px-0 py-1 text-gray-500">in</span>
                <button
                  v-if="hook.AssemblyName"
                  disabled
                  class="text-xs px-2 py-1 text-gray-500 bg-gray-100 dark:bg-gray-800"
                >
                  {{ hook.AssemblyName }}
                </button>
              </div>
              <Transition name="expand">
                <div
                  v-if="getExampleCode(hook, false) && highlighter && expandedHookExamples.has(hook.FullName)"
                >
                  <div
                    v-html="getExampleCode(hook, true)"
                    class="mt-2 text-sm bg-gray-100 dark:bg-gray-800 overflow-x-auto p-4"
                  ></div>
                </div>
              </Transition>
              <Transition name="expand">
                <div v-if="hook.MethodSource && highlighter && expandedHookSources.has(hook.FullName)">
                  <div
                    v-html="highlightCode(hook.MethodSource)"
                    class="mt-2 text-sm bg-gray-100 dark:bg-gray-800 overflow-x-auto p-4"
                  ></div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500">
        <p>No hooks found matching your search</p>
        <p v-if="hooks && hooks.length == 0" class="mt-2 text-sm">
          Debug: No hooks loaded. Check console for errors.
        </p>
        <p v-else-if="debouncedInputSearch" class="mt-2 text-sm">
          Debug: Search query "{{ debouncedInputSearch }}" returned no results.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.VPBadge {
  margin-left: 0;
  transform: none;
}

option {
  background-color: var(--vp-c-bg-soft);
}

:deep(pre) {
  background: var(--vp-c-bg-soft) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  line-height: 1.5;
}

:deep(code .line.highlight) {
  background: var(--vp-c-bg) !important;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.44, 1.1, 0.91, 0.94);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.expand-enter-active {
  transition-duration: 0.25s;
}

.expand-leave-active {
  transition-duration: 0.2s;
}
</style>
