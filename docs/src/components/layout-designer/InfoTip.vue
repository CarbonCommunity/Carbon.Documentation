<script setup lang="ts">
import { ref } from 'vue'
import { CircleHelp } from 'lucide-vue-next'

defineProps<{ text: string; size?: number }>()

// Position the bubble on hover/focus so it never spills off a viewport edge. These icons sit in
// toolbars/panels that can be near a screen edge — and the toolbar wraps on narrow screens, which
// pushes some icons close to the left edge where the default right-anchored bubble would clip.
const MAX_W = 250
const bubbleStyle = ref<Record<string, string>>({})
function place(e: Event) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const pad = 8
  const w = Math.min(MAX_W, window.innerWidth - 2 * pad)
  // prefer right edge aligned with the icon (bubble grows leftward), then clamp into the viewport
  const left = Math.max(pad, Math.min(r.right - w, window.innerWidth - w - pad))
  bubbleStyle.value = {
    position: 'fixed',
    top: `${Math.round(r.bottom + 6)}px`,
    left: `${Math.round(left)}px`,
    right: 'auto',
    width: `${Math.round(w)}px`,
    maxWidth: 'none',
  }
}
</script>

<template>
  <span class="ld-infotip" tabindex="0" @pointerenter="place" @focus="place">
    <CircleHelp :size="size ?? 13" class="ld-infotip-icon" />
    <span class="ld-infotip-bubble" :style="bubbleStyle">{{ text }}</span>
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
