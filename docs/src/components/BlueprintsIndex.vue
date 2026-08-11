<script setup lang="ts">
import { URL_METDAT_RUST_BLUEPRINTS } from '@/api/constants'
import BlueprintsViewer from './BlueprintsViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Rust Blueprints Reference</h1>
      <p>
        This section contains a comprehensive list of all crafting blueprints available in the game. Each blueprint shows the item details, crafting
        requirements, and research costs.
      </p>
      <ApiLinkToApi text="Blueprints API" :url="URL_METDAT_RUST_BLUEPRINTS" />
    </div>
    <BlueprintsViewer />
  </ApiIndex>
</template>
