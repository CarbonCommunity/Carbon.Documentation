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

import { computed, ref, watch } from 'vue'
import { usePreview } from './usePreview'

/** `getDisplayMedia` exists only in a secure context (https / localhost) on supporting browsers. */
const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function'

const stream = ref<MediaStream | null>(null)
const starting = ref(false)
const error = ref<string | null>(null)
const active = computed(() => !!stream.value)

// Screen sharing is tied to the live in-game preview — it only makes sense while you're pushing the
// layout to the game and designing against the real scene. It can only start while previewing, and it
// stops automatically the moment previewing ends. The coupling lives here (a singleton), not in the
// pane component, so it still fires when the pane is hidden/closed.
const { previewing } = usePreview()
watch(previewing, (on) => {
  if (!on) stop()
})

function stop() {
  stream.value?.getTracks().forEach((t) => t.stop())
  stream.value = null
}

async function start() {
  if (!supported || starting.value || stream.value || !previewing.value) return
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
  return { supported, stream, active, starting, error, start, stop, previewing }
}
