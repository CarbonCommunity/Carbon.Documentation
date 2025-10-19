<template>
  <div class="news-section-hero">
    <div class="news-section-hero-media">
      <img class="news-section-hero-img" :src="props.src" />
      <div class="absolute bottom-0 left-0 h-full w-full bg-gradient-to-b from-neutral-950/35 to-neutral-900/100"></div>
      <div class="absolute top-2 right-2 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
        Image credit: <a :href="props.src">{{ host }}</a>
      </div>
    </div>
    <div class="!mx-auto w-[80%] !max-w-screen-xl">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  src: string;
}

const host = computed(() => URL.canParse(props.src) ? new URL(props.src).hostname : props.src)
const props = defineProps<Props>()
</script>

<style>
.news-section-hero-img {
  transition-property: all;
  transition-duration: 1s;
  transform: scale(1.01);
}

.news-section-hero:hover .news-section-hero-img {
  transform: scale(1);
}


.news-section-hero {
  position: relative;
  margin-inline: calc(-1 * (100vw - 101%) / 2);
  padding-top: 0px;
  overflow: hidden;
  filter: saturate(0%);
  transition-property: all;
  transition-duration: 1s;
}

.news-section-hero:hover {
  filter: saturate(150%);
}

.news-section-hero-media {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.news-section-hero-media img {
  width: 100%;
  height: 100%;
  object-position: 5cqh;
  object-fit: cover;
  object-position: center;
  display: block;
  opacity: 100% !important;
}
</style>
