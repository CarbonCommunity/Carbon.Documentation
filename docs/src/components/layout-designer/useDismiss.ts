// Shared dismiss wiring for the context menus: close on outside pointerdown or Escape.
//
// The pointerdown listener MUST be capture-phase: canvas elements and tree rows call
// stopPropagation() on pointerdown, so a bubble-phase listener would never see clicks
// inside the layout and the menu would stay open.

import { useEventListener } from '@vueuse/core'

/**
 * Close a menu on outside click / Escape. `insideSelector` marks the menu's own DOM
 * (matched via closest(), so fixed-positioned flyouts carrying the class count as inside).
 * Right-presses are ignored — the contextmenu event (re)opens a menu elsewhere; don't fight it.
 */
export function useDismiss(insideSelector: string, onDismiss: () => void): void {
  useEventListener(
    window,
    'pointerdown',
    (e: PointerEvent) => {
      if (e.button === 2) return
      if (!(e.target as HTMLElement)?.closest(insideSelector)) onDismiss()
    },
    true,
  )
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') onDismiss()
  })
}
