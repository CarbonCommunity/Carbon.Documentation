<script setup lang="ts">
import type { ConVarRust } from '@/api/metadata/rust/convars'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { VPBadge } from 'vitepress/theme'

const { convar } = defineProps<{
  convar: ConVarRust
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2 flex-wrap">
      <VPBadge type="info" class="font-mono" :text="convar.Type" />
      <span class="font-mono">{{ convar.Name }}</span>
      <ButtonIconCopy :getTextToCopy="() => convar.Name" :title="`Copy convar`" class="opacity-60" />
      <div class="opacity-75">{{ convar.DefaultValue }}</div>
      <VPBadge v-if="convar.Saved" type="tip" :text="`Saved`" />
    </div>
    <span v-if="convar.Help" class="text-sm text-gray-600 dark:text-gray-400">
      {{ convar.Help }}
    </span>
  </div>
</template>
