<script setup lang="ts">
import type { CommandRust } from '@/api/metadata/rust/commands'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { VPBadge } from 'vitepress/theme'

const { command } = defineProps<{
  command: CommandRust
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex flex-row gap-2 items-center flex-wrap">
      <h3 class="font-mono">{{ command.Name }}</h3>
      <ButtonIconCopy :getTextToCopy="() => command.Name" title="Copy command" class="opacity-60" />
      <VPBadge v-if="command.ServerUser" type="info" :text="`Server User`" />
      <VPBadge v-if="command.Client" type="danger" :text="`Client`" />
    </div>
    <span v-if="command.Help" class="text-sm text-gray-600 dark:text-gray-400">
      {{ command.Help }}
    </span>
  </div>
</template>
