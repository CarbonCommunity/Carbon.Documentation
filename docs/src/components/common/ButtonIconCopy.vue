<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { CheckCircle2, Copy } from 'lucide-vue-next'
import { shallowRef } from 'vue'

const { getTextToCopy, size = 14 } = defineProps<{
  getTextToCopy: () => string
  size?: number
}>()

const isCopiedRecently = shallowRef(false)

const { start: startCopiedTimeout, stop: stopCopiedTimeout } = useTimeoutFn(
  () => {
    isCopiedRecently.value = false
  },
  2000,
  { immediate: false }
)

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    isCopiedRecently.value = true
    stopCopiedTimeout()
    startCopiedTimeout()
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function handleCopy() {
  const text = getTextToCopy()
  copyToClipboard(text)
}
</script>

<template>
  <button title="Copy to clipboard" @click.stop="handleCopy" @keydown.enter.prevent="handleCopy" @keydown.space.prevent="handleCopy">
    <component :is="isCopiedRecently ? CheckCircle2 : Copy" :size="size" />
  </button>
</template>
