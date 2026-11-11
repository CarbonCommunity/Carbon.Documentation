<script setup lang="ts">
import type { CommandCarbon } from '@/api/metadata/carbon/commands'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { VPBadge } from 'vitepress/theme'

const { command, commandTypeText } = defineProps<{
  command: CommandCarbon
  commandTypeText: string
}>()

function getBadgeType(commandTypeText: string) {
  if (commandTypeText == 'User') {
    return 'info'
  }
  if (commandTypeText == 'Moderator') {
    return 'warning'
  }
  return 'danger'
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex flex-row gap-2 items-center">
      <h3 class="font-mono">{{ command.Name }}</h3>
      <ButtonIconCopy
        :getTextToCopy="() => command.Name"
        :title="`Copy command name: ${command.Name}`"
        class="opacity-60"
      />
      <VPBadge :type="getBadgeType(commandTypeText)" :text="commandTypeText" />
    </div>
    <span v-if="command.Help" class="text-sm text-gray-600 dark:text-gray-400">
      {{ command.Help }}
    </span>
  </div>
</template>
