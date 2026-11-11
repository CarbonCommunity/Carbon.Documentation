<script setup lang="ts">
import { URL_METDAT_RUST_CONVARS } from '@/api/constants'
import RustConvarsViewer from './RustConvarsViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Rust Convars Reference</h1>
      <p>All available Rust console variables.</p>
      <ApiLinkToApi text="Rust Convars API" :url="URL_METDAT_RUST_CONVARS" />
    </div>
    <RustConvarsViewer />
  </ApiIndex>
</template>
