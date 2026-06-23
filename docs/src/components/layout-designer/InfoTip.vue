<script setup lang="ts">
import { CircleHelp } from 'lucide-vue-next'

defineProps<{ text: string; size?: number }>()
</script>

<template>
  <span class="ld-infotip" tabindex="0">
    <CircleHelp :size="size ?? 13" class="ld-infotip-icon" />
    <span class="ld-infotip-bubble">{{ text }}</span>
  </span>
</template>

<style scoped>
.ld-infotip {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
  color: var(--vp-c-text-3);
}

.ld-infotip:hover .ld-infotip-icon,
.ld-infotip:focus .ld-infotip-icon {
  color: var(--c-carbon-1);
}

.ld-infotip-bubble {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: max-content;
  max-width: 250px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 7px 9px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: normal;
  text-align: left;
  white-space: normal;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
  z-index: 60;
}

.ld-infotip:hover .ld-infotip-bubble,
.ld-infotip:focus .ld-infotip-bubble {
  opacity: 1;
}
</style>
