<script setup lang="ts">
// Screen-share pane (issue #7) — shows the user's locally captured screen/window in a <video>.
// All capture state lives in the useScreenShare singleton, so the stream survives re-dock / pop-out.
import { ref, watch } from 'vue'
import { useScreenShare } from './useScreenShare'

defineOptions({ name: 'ScreenSharePane' })

const { supported, stream, active, starting, error, start, stop, previewing } = useScreenShare()

const video = ref<HTMLVideoElement | null>(null)
// Bind the stream to the <video> whenever either changes (also re-binds after a re-dock remount).
watch(
  [stream, video],
  ([s, el]) => {
    if (el) el.srcObject = s ?? null
  },
  { immediate: true },
)
</script>

<template>
  <div class="ss-pane">
    <div v-if="!supported" class="ss-unsupported">
      <p>Screen sharing isn't available here.</p>
      <p class="ss-hint">It needs a browser that supports the Screen Capture API over a secure (HTTPS) connection.</p>
    </div>

    <template v-else>
      <div class="ss-bar">
        <button v-if="!active" class="ss-btn" :disabled="starting || !previewing" :title="previewing ? '' : 'Start a live preview first'" @click="start">
          {{ starting ? 'Choose a window…' : 'Share screen' }}
        </button>
        <button v-else class="ss-btn ss-stop" @click="stop">Stop sharing</button>
        <span v-if="active" class="ss-live"><span class="ss-dot" /> live · local only</span>
      </div>

      <div class="ss-stage">
        <!-- v-show (not v-if) so the element persists and keeps its srcObject while idle -->
        <video v-show="active" ref="video" class="ss-video" autoplay muted playsinline />
        <div v-if="!active && !previewing" class="ss-empty">
          <p>Screen sharing runs <strong>during a live preview</strong>.</p>
          <p class="ss-hint">Start a live preview (the <em>Live preview</em> button up top) to share your Rust window and design against the real scene. Sharing stops automatically when the preview does.</p>
        </div>
        <div v-else-if="!active" class="ss-empty">
          <p>Share your <strong>Rust window</strong> to preview a layout against the real scene.</p>
          <p class="ss-hint">
            Pick the Rust window in the browser prompt. If it shows black, run Rust in
            <strong>borderless windowed</strong> (exclusive fullscreen can't be captured) — or just share the whole monitor.
          </p>
          <p class="ss-priv">Local preview only — your screen is never uploaded, streamed, or seen by anyone but you.</p>
        </div>
      </div>

      <p v-if="error" class="ss-error">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.ss-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
  padding: 8px;
}

.ss-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.ss-btn {
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--c-carbon-1);
  border: 1px solid var(--c-carbon-1);
  border-radius: 4px;
  cursor: pointer;
}

.ss-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.ss-btn.ss-stop {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

.ss-btn.ss-stop:hover {
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

.ss-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}

.ss-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #36d399;
  box-shadow: 0 0 0 3px rgba(54, 211, 153, 0.18);
}

.ss-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0c0c0e;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.ss-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.ss-empty {
  max-width: 340px;
  padding: 16px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.ss-empty p {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.55;
}

.ss-hint {
  font-size: 11.5px !important;
  color: var(--vp-c-text-3);
}

.ss-priv {
  font-size: 11px !important;
  color: var(--vp-c-text-3);
  font-style: italic;
}

.ss-unsupported {
  padding: 20px;
  text-align: center;
  color: var(--vp-c-text-3);
}

.ss-error {
  flex: 0 0 auto;
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-danger-1);
}
</style>
