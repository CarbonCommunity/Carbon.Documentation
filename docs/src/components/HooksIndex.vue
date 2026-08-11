<script setup lang="ts">
import { URL_METDAT_CARB_HOOKS } from '@/api/constants'
import { VPBadge } from 'vitepress/theme'
import ApiIndex from './common/ApiIndex.vue'
import ApiLinkToApi from './common/ApiLinkToApi.vue'
import HooksViewer from './HooksViewer.vue'
</script>

<template>
  <ApiIndex>
    <div class="mb-4 flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Carbon Hooks Reference</h1>
      <p>
        This section contains a comprehensive list of all hooks available in Carbon. Each hook is listed with its name, category, and compatibility information.
      </p>
      <p>
        By default, if hooks are not <VPBadge type="danger" text="Static" /> or <VPBadge type="danger" text="Patch" />, they're dynamically applied upon plugin
        subscription, otherwise inactive.
      </p>
      <ApiLinkToApi text="Hooks API" :url="URL_METDAT_CARB_HOOKS" />
    </div>
    <HooksViewer />
  </ApiIndex>
</template>
