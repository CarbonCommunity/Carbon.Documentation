<script setup lang="ts">
import type { Highlighter } from 'shiki'
import { useData } from 'vitepress'
import { inject, ShallowRef } from 'vue'

const highlighter = inject<Readonly<ShallowRef<Highlighter | null>>>('highlighter')
const data = useData()

const { code, language = 'csharp' } = defineProps<{
  code: string
  language?: string
}>()

function highlightCode(code: string, language: string): string {
  if (!highlighter || !highlighter.value) {
    return code
  }
  try {
    return highlighter.value.codeToHtml(code, {
      lang: language,
      theme: data.isDark.value ? 'github-dark' : 'github-light',
    })
  } catch (err) {
    console.error('Failed to highlight code:', err)
    return code
  }
}
</script>

<template>
  <div
    v-if="code && highlighter"
    v-html="highlightCode(code, language)"
    class="sm:text-sm text-xs bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto p-4"
  ></div>
</template>

<style scoped>
:deep(pre) {
  background: var(--vp-c-bg-soft) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  line-height: 1.5;
}

:deep(code .line.highlight) {
  background: var(--vp-c-bg) !important;
}
</style>
