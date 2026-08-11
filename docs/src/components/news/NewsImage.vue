<template>
  <div :style="{ height: props.h }" class="flex items-center justify-center overflow-hidden active:overflow-visible">
    <img class="news-image w-full h-auto object-contain" :src="props.src" :style="{ '--y': props.y }"/>
  </div>
</template>

<script setup lang="ts">
interface Props {
  src: string;
  h?: string;
  y?: string;
}

const props = defineProps<Props>()
</script>

<style scoped>
.news-image {
  filter: saturate(0);
  transform: translateY(var(--y, 0));
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
.news-image:hover {
  filter: saturate(1.2);
}
.news-image:active {
  filter: saturate(1.2);
  transform: translateY(var(--y, 0)) scale(1.75);
  position: relative;
  z-index: 99999;
}
</style>
