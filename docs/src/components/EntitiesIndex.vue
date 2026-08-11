<script setup lang="ts">
import { URL_METDAT_RUST_ENTITIES } from '@/api/constants'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
import EntitiesViewer from './EntitiesViewer.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Rust Entities Reference</h1>
      <p>
        This section contains a comprehensive list of all entity prefabs available in the game. Each entity is listed with its unique ID, components, and file
        path.
      </p>
      <ApiLinkToApi text="Entities API" :url="URL_METDAT_RUST_ENTITIES" />
    </div>
    <EntitiesViewer />
  </ApiIndex>
</template>
