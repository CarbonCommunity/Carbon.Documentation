<script setup lang="ts">
import { URL_METDAT_RUST_ITEMS } from '@/api/constants'
import RustItemsViewer from './RustItemsViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Rust Items Reference</h1>
      <p>This section contains a comprehensive list of all items available in the game. Each item is listed with its unique ID, components, and file path.</p>
      <ApiLinkToApi text="Rust Items API" :url="URL_METDAT_RUST_ITEMS" />
    </div>
    <RustItemsViewer />
  </ApiIndex>
</template>
