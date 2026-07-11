// Editable keyboard shortcuts for the Layout Designer. Actions carry a default combo; the user can
// rebind them in Settings and the override is persisted. The keydown handler resolves an event to an
// action via `actionForCombo`, and the Settings modal edits bindings via `setBinding`/`resetBinding`.
import { useStorage } from '@vueuse/core'

export type KeyActionId = 'undo' | 'redo' | 'duplicate' | 'group' | 'ungroup' | 'delete' | 'zoomIn' | 'zoomOut' | 'zoomReset'

export interface KeyAction {
  id: KeyActionId
  label: string
  default: string
}

/** Rebindable commands, in display order. Arrow-key nudging stays fixed (it's directional, not a combo). */
export const KEY_ACTIONS: KeyAction[] = [
  { id: 'undo', label: 'Undo', default: 'mod+z' },
  { id: 'redo', label: 'Redo', default: 'mod+shift+z' },
  { id: 'duplicate', label: 'Duplicate', default: 'mod+d' },
  { id: 'group', label: 'Group selection', default: 'mod+g' },
  { id: 'ungroup', label: 'Ungroup selection', default: 'mod+shift+g' },
  { id: 'delete', label: 'Delete selection', default: 'delete' },
  // '=' is the unshifted key under '+' on common layouts (numpad '+' can be rebound to combo "+").
  { id: 'zoomIn', label: 'Zoom in', default: '=' },
  { id: 'zoomOut', label: 'Zoom out', default: '-' },
  { id: 'zoomReset', label: 'Zoom reset (fit)', default: '0' },
]

// id → combo override. Absent ⇒ the action's default. Module singleton so handler + modal share it.
const overrides = useStorage<Record<string, string>>('carbon-layout-designer:settings:keybinds', {})

/** Normalize a keyboard event to a combo like "mod+shift+z" (mod = Ctrl/Cmd). '' for a bare modifier. */
export function comboFromEvent(e: KeyboardEvent): string {
  let k = e.key.toLowerCase()
  if (k === 'control' || k === 'meta' || k === 'shift' || k === 'alt') return ''
  if (k === ' ') k = 'space'
  if (k === 'backspace') k = 'delete' // treat Backspace as Delete
  if (k === '+') k = '=' // '+' is Shift+'=' / numpad plus — fold onto the zoom-in default
  if (k === '_') k = '-'
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('mod')
  // For printable non-letter keys, e.key already reflects the shift layer (Shift+'=' is '+',
  // AZERTY digits NEED Shift) — including 'shift' would double-count it and make such defaults
  // unmatchable on some layouts. Letters keep it (shift+z vs z is a real distinction).
  if (e.shiftKey && !(k.length === 1 && !/[a-z]/.test(k))) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(k)
  return parts.join('+')
}

/** True when the event targets an editable control — shared guard for global key handlers. */
export function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/** Human-readable combo, e.g. "Ctrl+Shift+Z" / "Delete". */
export function comboLabel(combo: string): string {
  if (!combo) return '—'
  const map: Record<string, string> = {
    mod: 'Ctrl',
    shift: 'Shift',
    alt: 'Alt',
    delete: 'Delete',
    escape: 'Esc',
    space: 'Space',
    arrowleft: '←',
    arrowright: '→',
    arrowup: '↑',
    arrowdown: '↓',
  }
  return combo
    .split('+')
    .map((p) => map[p] ?? p.toUpperCase())
    .join('+')
}

export function useKeybinds() {
  const bindingFor = (id: KeyActionId) => overrides.value[id] ?? KEY_ACTIONS.find((a) => a.id === id)!.default
  const actionForCombo = (combo: string): KeyActionId | null => {
    if (!combo) return null
    return KEY_ACTIONS.find((a) => bindingFor(a.id) === combo)?.id ?? null
  }
  /** Another action already bound to `combo` (excluding `id`), or null. */
  const conflict = (id: KeyActionId, combo: string): KeyActionId | null =>
    KEY_ACTIONS.find((a) => a.id !== id && bindingFor(a.id) === combo)?.id ?? null
  const setBinding = (id: KeyActionId, combo: string) => (overrides.value = { ...overrides.value, [id]: combo })
  const resetBinding = (id: KeyActionId) => {
    const next = { ...overrides.value }
    delete next[id]
    overrides.value = next
  }
  const resetAll = () => (overrides.value = {})
  return { bindingFor, actionForCombo, conflict, setBinding, resetBinding, resetAll }
}
