<script setup lang="ts">
import { URL_METDAT_RUST_PREFABS } from '@/api/constants'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
import PrefabsViewer from './PrefabsViewer.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Rust Prefab Reference</h1>
      <p>
        This section contains a comprehensive list of all prefabs available in the game. Each prefab is listed with its unique ID, components, and file path.
      </p>
      <ApiLinkToApi text="Prefabs API" :url="URL_METDAT_RUST_PREFABS" />
    </div>
    <PrefabsViewer />
  </ApiIndex>
</template>
