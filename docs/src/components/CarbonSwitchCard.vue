<script setup lang="ts">
import { Switch } from '@/api/metadata/carbon/switches'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'

const { switchValue } = defineProps<{
  switchValue: Switch
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <h3 class="font-mono">{{ switchValue.Name }}</h3>
      <ButtonIconCopy
        :getTextToCopy="() => switchValue.Name"
        :title="`Copy switch name: ${switchValue.Name}`"
        class="opacity-60"
      />
    </div>
    <span v-if="switchValue.Help" class="text-sm text-gray-600 dark:text-gray-400">
      {{ switchValue.Help }}
    </span>
  </div>
</template>
