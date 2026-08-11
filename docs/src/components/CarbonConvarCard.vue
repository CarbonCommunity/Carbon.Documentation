<script setup lang="ts">
import type { ConVarCarbon } from '@/api/metadata/carbon/convars'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import { VPBadge } from 'vitepress/theme'

const { convar } = defineProps<{
  convar: ConVarCarbon
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex sm:flex-row flex-col sm:items-center items-start gap-2">
      <div class="flex items-center gap-2">
        <h3 class="font-mono">{{ convar.Name }}</h3>
        <ButtonIconCopy
          :getTextToCopy="() => convar.Name"
          :title="`Copy convar name: ${convar.Name}`"
          class="opacity-60"
        />
      </div>
      <VPBadge
        v-if="convar.ForceModded"
        type="tip"
        :text="'Forces Modded'"
        title="When set to something else than default, this convar will force your server to be marked as modded."
      />
    </div>
    <span class="text-gray-600 dark:text-gray-400">
      {{ convar.DisplayName }}
    </span>
    <span v-if="convar.Help" class="text-sm text-gray-600 dark:text-gray-400">
      {{ convar.Help }}
    </span>
  </div>
</template>
