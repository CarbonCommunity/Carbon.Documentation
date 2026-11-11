// Local screen-share capture (issue #7).
//
// Wraps the browser Screen Capture API (`navigator.mediaDevices.getDisplayMedia`) so a user can share
// their OWN Rust window/screen into a pane and preview a layout against the real in-game scene. The
// stream is entirely LOCAL — it never leaves the browser, is not sent to any server, and no one else
// can see it. The picker (which window/screen/tab) is the browser's own; the API gives us no way to
// pre-select "Rust", so the user chooses it.
//
// Module-singleton (like usePreview) so the MediaStream survives the pane being re-docked, hidden, or
// popped out — only an explicit Stop (or the user revoking the share) ends it.

import { computed, ref } from 'vue'

/** `getDisplayMedia` exists only in a secure context (https / localhost) on supporting browsers. */
const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function'

const stream = ref<MediaStream | null>(null)
const starting = ref(false)
const error = ref<string | null>(null)
const active = computed(() => !!stream.value)

// --- design-over-scene compositing (#7) — view settings (not persisted); the pane's controls drive them ---
const asBackdrop = ref(false)
const layoutOpacity = ref(1) // 0..1 over the whole design (NOT per-element opacity — at 0 the design
// vanishes but selection chrome stays, so you can place boxes against the real game)
const videoOpacity = ref(1) // 0..1 of the backdrop video

// Manual alignment: the game viewport is an unknown sub-rectangle of the capture (OS title bar, window
// borders, monitor framing) and nothing in the stream says where. Each value trims that % off its
// edge; the remaining region is stretched to fill the canvas (top → drops a title bar).
const cropTop = ref(0)
const cropRight = ref(0)
const cropBottom = ref(0)
const cropLeft = ref(0)
function resetBackdropAlign() {
  cropTop.value = 0
  cropRight.value = 0
  cropBottom.value = 0
  cropLeft.value = 0
}

// Standalone (#7): capture works any time, independent of the live in-game preview.

function stop() {
  stream.value?.getTracks().forEach((t) => t.stop())
  stream.value = null
}

async function start() {
  if (!supported || starting.value || stream.value) return
  error.value = null
  starting.value = true
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    // The browser's own "Stop sharing" bar (or closing the shared window) ends the track — reflect it.
    s.getVideoTracks().forEach((t) => t.addEventListener('ended', stop))
    stream.value = s
  } catch (e) {
    const name = (e as DOMException)?.name
    // Dismissing the picker / denying permission isn't an error worth surfacing.
    if (name !== 'AbortError' && name !== 'NotAllowedError') error.value = (e as Error)?.message ?? 'Could not start screen share.'
  } finally {
    starting.value = false
  }
}

export function useScreenShare() {
  return { supported, stream, active, starting, error, start, stop, asBackdrop, layoutOpacity, videoOpacity, cropTop, cropRight, cropBottom, cropLeft, resetBackdropAlign }
}
