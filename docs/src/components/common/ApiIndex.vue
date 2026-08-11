<script setup lang="ts"></script>

<template>
  <div class="mx-auto max-w-screen-lg px-4 py-8">
    <slot />
  </div>
</template>

<style scoped>
:deep(.VPBadge) {
  margin-left: 0;
  transform: none;
}
</style>
