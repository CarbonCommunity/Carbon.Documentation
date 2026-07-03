// Drag-docking interaction state (issue #6 Part 2b). Pointer-based (not HTML5 DnD) to match the
// divider-resize code and to keep working inside Teleport/PiP targets. A drag is armed on pointerdown
// over a pane header or a tool-window tab, promoted to a live drag once the pointer passes a small
// threshold, and committed on pointerup against whatever drop zone last reported a hover.
import { readonly, ref } from 'vue'
import type { DockSide, PaneId } from './dockTree'
import { useDock } from './useDock'

const dragging = ref<PaneId | null>(null) // the pane currently being dragged (null = idle)
const hover = ref<{ pane: PaneId; side: DockSide } | null>(null) // drop zone under the cursor
const pointer = ref({ x: 0, y: 0 }) // viewport cursor position, for the floating ghost

const THRESHOLD_SQ = 25 // ~5px before a press becomes a drag (so clicks still register)
let armed: { pane: PaneId; x: number; y: number } | null = null

function onMove(e: PointerEvent) {
  pointer.value = { x: e.clientX, y: e.clientY }
  if (armed && !dragging.value) {
    const dx = e.clientX - armed.x
    const dy = e.clientY - armed.y
    if (dx * dx + dy * dy > THRESHOLD_SQ) {
      dragging.value = armed.pane
      document.body.style.userSelect = 'none' // suppress text selection while dragging
    }
  }
}

function onUp() {
  if (dragging.value && hover.value && hover.value.pane !== dragging.value) {
    useDock().movePane(dragging.value, hover.value.pane, hover.value.side)
  }
  end()
}

function end() {
  armed = null
  dragging.value = null
  hover.value = null
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}

/** Arm a drag from a pane header / tab. Left button only; the drag goes live past the threshold. */
function startPaneDrag(pane: PaneId, e: PointerEvent) {
  if (e.button !== 0) return
  armed = { pane, x: e.clientX, y: e.clientY }
  pointer.value = { x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function setHover(pane: PaneId, side: DockSide) {
  hover.value = { pane, side }
}

/** Clear the hover only if it still points at `pane` (the next zone's pointerenter wins otherwise). */
function clearHover(pane: PaneId) {
  if (hover.value?.pane === pane) hover.value = null
}

export function useDockDrag() {
  return { dragging: readonly(dragging), hover: readonly(hover), pointer: readonly(pointer), startPaneDrag, setHover, clearHover }
}
