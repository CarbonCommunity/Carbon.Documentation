<script setup lang="ts">
import { URL_SERVER_LIST } from '@/api/constants'
import ServerBrowserViewer from './ServerBrowserViewer.vue'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Carbon Server Browser</h1>
      <p>Browse and find Rust servers</p>
      <ApiLinkToApi text="Server List API" :url="URL_SERVER_LIST" />
    </div>
    <ServerBrowserViewer />
  </ApiIndex>
</template>
