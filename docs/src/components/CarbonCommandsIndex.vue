<script setup lang="ts">
import { URL_METDAT_CARB_COMMANDS } from '@/api/constants'
import CarbonCommandsViewer from './CarbonCommandsViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Carbon Commands Reference</h1>
      <p>Here's a full list of all currently available Carbon commands you can use.</p>
      <ApiLinkToApi text="Carbon Commands API" :url="URL_METDAT_CARB_COMMANDS" />
    </div>
    <CarbonCommandsViewer />
  </ApiIndex>
</template>
