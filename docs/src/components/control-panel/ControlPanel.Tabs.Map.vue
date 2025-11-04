<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { selectedServer } from './ControlPanel.SaveLoad';

const blobTest = ref<string>('')

onMounted(() => {
  selectedServer.value?.setRpc('LoadMapImage', read => {
    blobTest.value = URL.createObjectURL(new Blob([read.bytes(read.int32())], { type: 'image/png' }))
  })
  selectedServer.value?.sendCall('LoadMapImage')
  console.log("init")
})
</script>
<template>
<div>
  Hello world
  <img :src="blobTest"/>
</div>
</template>
