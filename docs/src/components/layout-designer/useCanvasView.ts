// Canvas view state — zoom + pan, shared by the canvas (wheel/drag/keys) and the toolbar zoom
// controls. Pure view state: never persisted, never part of undo history, layouts or exports.
// `zoom` multiplies the fit-to-pane scale (1 = fit); `pan` is the frame's screen-px offset from
// its flex-centered position.
import { reactive, ref } from 'vue'

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 8

const zoom = ref(1)
const pan = reactive({ x: 0, y: 0 })

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

/** Back to fit-to-pane, centered. */
function resetView() {
  zoom.value = 1
  pan.x = 0
  pan.y = 0
}

/**
 * Zoom about a fixed screen point given as an offset from the viewport centre (0,0 = centre —
 * used by the toolbar/keyboard; the wheel handler passes the cursor offset). Scaling the pan by
 * the zoom ratio keeps that point over the same layout spot, so the frame can never zoom itself
 * out of view.
 */
function zoomAt(offX: number, offY: number, factor: number) {
  const z1 = clampZoom(zoom.value * factor)
  const k = z1 / zoom.value
  if (k === 1) return
  pan.x = k * pan.x + (1 - k) * offX
  pan.y = k * pan.y + (1 - k) * offY
  zoom.value = z1
}

export function useCanvasView() {
  return { zoom, pan, zoomAt, resetView }
}
