<template>
  <div :class="[{'mb-[200px]': !isMarginless}, 'news-section']">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  marginless?: boolean | string;
}

const props = defineProps<Props>()
const isMarginless = computed(() => props.marginless === true || props.marginless === 'true')
</script>

<style>
.news-section {
  padding: 25px !important;
  background-color: #131313d0;
  contain: inline-size;
}
.news-section p {
  margin: 0px !important;
}
</style>
