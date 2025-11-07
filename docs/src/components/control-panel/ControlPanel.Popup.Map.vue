<script lang="ts" setup>
import ServerMapImage from '../common/ServerMapImage.vue'

const props = defineProps<{
  src: string
  minScale?: number
  maxScale?: number
  initialScale?: number
  zoomStep?: number
  wheelZoomSpeed?: number
  server?: any,
  isFullscreen?: boolean
}>()

</script>

<template>
<div class="w-[95vw] h-[85vh]">
  <ServerMapImage
    :src="props.src"
    :initialScale="props.initialScale"
    :minScale=".5"
    :maxScale="5"
    :server="props.server"
    :isFullscreen="props.isFullscreen"/>
</div>
</template>
