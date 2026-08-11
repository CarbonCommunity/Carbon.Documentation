<script setup lang="ts">
import { URL_METDAT_CARB_CONVARS } from '@/api/constants'
import CarbonConvarsViewer from './CarbonConvarsViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Carbon Convars Reference</h1>
      <p>Here's a full list of all currently available CarbonAuto variables you can use to expand on what Rust already provides.</p>
      <ApiLinkToApi text="Carbon ConVars API" :url="URL_METDAT_CARB_CONVARS" />
    </div>
    <CarbonConvarsViewer />
  </ApiIndex>
</template>
