<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'

const { name, src, size = 36 } = defineProps<{
  name: string
  src?: string
  size?: number
}>()

const failed = shallowRef(false)
watch(
  () => src,
  () => (failed.value = false)
)

const initials = computed(() => {
  const parts = name
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (parts.length == 0) return '?'
  if (parts.length == 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})

// Stable colour per name.
const hue = computed(() => {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
})
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="name"
    loading="lazy"
    class="shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = true"
  />
  <span
    v-else
    class="initials inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px`, '--hue': hue }"
    :aria-label="name"
  >
    {{ initials }}
  </span>
</template>

<style scoped>
.initials {
  background: hsl(var(--hue) 45% 85%);
  color: hsl(var(--hue) 45% 28%);
}
:global(.dark) .initials {
  background: hsl(var(--hue) 35% 24%);
  color: hsl(var(--hue) 60% 80%);
}
</style>
