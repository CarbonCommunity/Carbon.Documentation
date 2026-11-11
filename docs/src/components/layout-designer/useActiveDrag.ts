// Single shared canvas-drag router (perf fix E2). CanvasElement is instantiated once per element
// (recursively), so registering a window pointermove/pointerup in every instance meant N listeners
// firing on every pointer move with N-1 of them bailing immediately. Instead there is exactly ONE
// pointermove + one pointerup on the window, attached only while a drag is live and torn down as
// soon as it ends, routing to whichever element started the active drag. Pattern mirrors the
// existing pointer-based dock drag (useDockDrag.ts): lazily attach/detach around the live drag.
type DragHandlers = {
  move: (e: PointerEvent) => void
  up: (e: PointerEvent) => void
}

let active: DragHandlers | null = null

function onMove(e: PointerEvent) {
  active?.move(e)
}
function onUp(e: PointerEvent) {
  active?.up(e)
}

function detach() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}

/**
 * Route window pointer events to `handlers` for the duration of one drag. A fresh call supersedes
 * any previous active drag (a new pointerdown wins). Returns a stop() that ends this drag only if
 * it is still the active one — call it on pointerup AND on unmount so a component that disappears
 * mid-drag cannot leak the active drag or leave the shared listeners attached.
 */
export function beginActiveDrag(handlers: DragHandlers): () => void {
  if (!active) {
    // Non-passive to match the previous useEventListener defaults (the move handler mutates state).
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  active = handlers
  return () => {
    if (active === handlers) {
      active = null
      detach()
    }
  }
}
