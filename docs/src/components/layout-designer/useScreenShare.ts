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

// --- design-over-scene compositing (#7) ---
// Render the captured stream as a backdrop *behind the canvas* and fade the design over it. These are
// view settings (not persisted) shared via the singleton so the pane's controls drive the canvas.
const asBackdrop = ref(false) // composite the stream behind the design canvas
const layoutOpacity = ref(1) // 0..1 opacity of the whole design overlay (NOT per-element opacity — at
// 0 the design vanishes but selection chrome stays, so you can place boxes against the real game)
const videoOpacity = ref(1) // 0..1 opacity of the backdrop video itself

// Manual backdrop alignment — the game viewport sits at an unknown offset/scale inside the capture
// (window borders, title bar, borderless, monitor-vs-window all differ), and nothing in the stream
// tells us where, so the user registers it by eye against the canvas frame.
const backdropFit = ref<'contain' | 'cover' | 'fill'>('contain') // object-fit base before transform
const backdropZoom = ref(1) // uniform scale multiplier
const backdropX = ref(0) // pan, % of the frame width
const backdropY = ref(0) // pan, % of the frame height
function resetBackdropAlign() {
  backdropFit.value = 'contain'
  backdropZoom.value = 1
  backdropX.value = 0
  backdropY.value = 0
}

// Screen sharing is standalone (#7): a user can capture their Rust window any time — it no longer
// requires a live in-game preview to be running (that coupling was removed so the capture, and the
// design-over-scene compositing it powers, work on their own).

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
  return { supported, stream, active, starting, error, start, stop, asBackdrop, layoutOpacity, videoOpacity, backdropFit, backdropZoom, backdropX, backdropY, resetBackdropAlign }
}
