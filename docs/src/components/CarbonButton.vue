<script setup lang="ts">
import { ExternalLinkIcon } from 'lucide-vue-next'
import { FunctionalComponent } from 'vue'

const { href, text, icon, external = true } = defineProps<{ href: string; text: string; icon?: FunctionalComponent; external?: boolean }>()
</script>

<template>
  <a
    :href="href"
    :target="external ? '_blank' : undefined"
    class="inline-flex flex-row items-center justify-center gap-2 bg-[--c-carbon-1] px-4 py-1 font-medium !text-white !no-underline !transition-colors hover:bg-[--c-carbon-2]"
  >
    <component v-if="icon" :is="icon" :size="18" />
    <span>
      {{ text }}
    </span>
    <ExternalLinkIcon v-if="external" :size="14" />
  </a>
</template>
