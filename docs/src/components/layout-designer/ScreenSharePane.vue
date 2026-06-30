<script setup lang="ts">
// Screen-share pane (issue #7) — shows the user's locally captured screen/window in a <video>.
// All capture state lives in the useScreenShare singleton, so the stream survives re-dock / pop-out.
import { ref, watch } from 'vue'
import { useScreenShare } from './useScreenShare'

defineOptions({ name: 'ScreenSharePane' })

const { supported, stream, active, starting, error, start, stop, asBackdrop, layoutOpacity, videoOpacity } = useScreenShare()
const pct = (v: number) => `${Math.round(v * 100)}%`

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
        <button v-if="!active" class="ss-btn" :disabled="starting" @click="start">
          {{ starting ? 'Choose a window…' : 'Share screen' }}
        </button>
        <button v-else class="ss-btn ss-stop" @click="stop">Stop sharing</button>
        <span v-if="active" class="ss-live"><span class="ss-dot" /> live · local only</span>
      </div>

      <!-- design-over-scene compositing controls (#7): render the capture behind the design canvas -->
      <div v-if="active" class="ss-compose">
        <label class="ss-check">
          <input type="checkbox" v-model="asBackdrop" />
          Show behind canvas
        </label>
        <div v-if="asBackdrop" class="ss-sliders">
          <label class="ss-slider">
            <span>Layout opacity <b>{{ pct(layoutOpacity) }}</b></span>
            <input type="range" min="0" max="1" step="0.01" v-model.number="layoutOpacity" />
          </label>
          <label class="ss-slider">
            <span>Backdrop opacity <b>{{ pct(videoOpacity) }}</b></span>
            <input type="range" min="0" max="1" step="0.01" v-model.number="videoOpacity" />
          </label>
          <p class="ss-hint">Layout opacity fades the whole design (not element opacity) — drop it to 0 to place boxes against the real game.</p>
        </div>
      </div>

      <div class="ss-stage">
        <!-- v-show (not v-if) so the element persists and keeps its srcObject while idle -->
        <video v-show="active" ref="video" class="ss-video" autoplay muted playsinline />
        <div v-if="!active" class="ss-empty">
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

.ss-compose {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.ss-check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.ss-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ss-slider {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11.5px;
  color: var(--vp-c-text-2);
}

.ss-slider b {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}

.ss-slider input[type='range'] {
  width: 100%;
  accent-color: var(--c-carbon-1);
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
