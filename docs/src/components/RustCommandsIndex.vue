<script setup lang="ts">
import { URL_METDAT_RUST_COMMANDS } from '@/api/constants'
import RustCommandsViewer from './RustCommandsViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Rust Commands Reference</h1>
      <p>Up to date list of all pre-built-in Rust commands.</p>
      <ApiLinkToApi text="Rust Commands API" :url="URL_METDAT_RUST_COMMANDS" />
    </div>
    <RustCommandsViewer />
  </ApiIndex>
</template>
