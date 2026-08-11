<script setup lang="ts">
import { ref } from 'vue'
import { CircleHelp } from 'lucide-vue-next'

defineProps<{ text: string; size?: number }>()

// Position the bubble on hover/focus so it never spills off a viewport edge. These icons sit in
// toolbars/panels that can be near a screen edge — and the toolbar wraps on narrow screens, which
// pushes some icons close to the left edge where the default right-anchored bubble would clip.
// Measured against the icon's own window: a panel docked into the pop-out must clamp to the
// pop-out's viewport, not the main window's.
const MAX_W = 250
const bubble = ref<HTMLElement | null>(null)
const bubbleStyle = ref<Record<string, string>>({})
function place(e: Event) {
  const icon = e.currentTarget as HTMLElement
  const win = icon.ownerDocument.defaultView ?? window
  const r = icon.getBoundingClientRect()
  const pad = 8
  const w = Math.min(MAX_W, win.innerWidth - 2 * pad)
  // prefer right edge aligned with the icon (bubble grows leftward), then clamp into the viewport
  const left = Math.max(pad, Math.min(r.right - w, win.innerWidth - w - pad))
  // the bubble is laid out even while hidden (opacity: 0), so measure its height at the final
  // width to pick a side: below the icon when it fits, otherwise flipped above, clamped on-screen
  let h = 0
  const el = bubble.value
  if (el) {
    const prev = el.style.cssText
    el.style.cssText = `position: fixed; width: ${Math.round(w)}px; max-width: none;`
    h = el.offsetHeight
    el.style.cssText = prev
  }
  const fitsBelow = r.bottom + 6 + h <= win.innerHeight - pad
  const top = fitsBelow ? r.bottom + 6 : Math.max(pad, r.top - 6 - h)
  bubbleStyle.value = {
    position: 'fixed',
    top: `${Math.round(top)}px`,
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
    <span ref="bubble" class="ld-infotip-bubble" :style="bubbleStyle">{{ text }}</span>
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
