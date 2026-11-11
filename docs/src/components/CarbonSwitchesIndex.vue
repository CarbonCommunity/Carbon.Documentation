<script setup lang="ts">
import { URL_METDAT_CARB_SWITCHES } from '@/api/constants'
import CarbonSwitchesViewer from './CarbonSwitchesViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Carbon Convars Reference</h1>
      <p>Here's a full list of all currently available Carbon switches you can use.</p>
      <ApiLinkToApi text="Carbon Switches API" :url="URL_METDAT_CARB_SWITCHES" />
    </div>
    <CarbonSwitchesViewer />
  </ApiIndex>
</template>
