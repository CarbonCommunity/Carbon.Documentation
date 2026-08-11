// Debug log for the Layout Designer's Debug pane. Aggregates two sources into one time-ordered stream:
//   - live-preview RPC actions (AddUi with its exact payload, DestroyUi by name, lifecycle notes) — the
//     only window into what actually goes over the wire (the Code panel's JSON tab shows the plain
//     layout, but the live payload differs: wrapped under the reserved preview root, `update:true` on
//     re-sends);
//   - console.warn / console.error emitted while the tool is open, so runtime problems surface in-tool.
// Capped ring buffer so long sessions stay bounded; Clear resets it.

import { ref } from 'vue'

export type DebugKind = 'AddUi' | 'DestroyUi' | 'warn' | 'error' | 'info'

export interface DebugEntry {
  id: number
  /** Wall-clock HH:MM:SS.mmm when it was recorded. */
  time: string
  kind: DebugKind
  /** One-line summary (e.g. "AddUi · 4 elements · 812 B"). */
  summary: string
  /** Optional full payload for expand/copy (pretty JSON for AddUi; a stack/args dump for warn/error). */
  detail?: string
}

/** Keep the newest N entries — a live preview can emit a call every edit, so this bounds memory. */
const MAX_ENTRIES = 300

const entries = ref<DebugEntry[]>([])
let seq = 0

function stamp(): string {
  const d = new Date()
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function push(kind: DebugKind, summary: string, detail?: string) {
  entries.value.push({ id: ++seq, time: stamp(), kind, summary, detail })
  if (entries.value.length > MAX_ENTRIES) entries.value.splice(0, entries.value.length - MAX_ENTRIES)
}

function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}

/** Log a live-preview AddUi send. `payload` is the CuiElement[] actually serialized to the RPC. */
function logAddUi(payload: unknown[]) {
  const json = JSON.stringify(payload, null, 2)
  const bytes = JSON.stringify(payload).length
  push('AddUi', `AddUi · ${payload.length} element${payload.length === 1 ? '' : 's'} · ${formatBytes(bytes)}`, json)
}

/** Log a live-preview DestroyUi send (tears down `name` and its subtree on the client). */
function logDestroyUi(name: string) {
  push('DestroyUi', `DestroyUi · ${name}`, name)
}

/** Log a lifecycle / connection note (preview start/stop, server/player change). */
function logInfo(message: string) {
  push('info', message)
}

// --- console capture -----------------------------------------------------------------
// Patch console.warn/error ONCE so runtime warnings/errors land in the Debug pane too. The originals are
// still called, so the browser console is unaffected. Installed on tool mount; safe to call repeatedly.

function argsToText(args: unknown[]): { summary: string; detail?: string } {
  const parts = args.map((a) => {
    if (a instanceof Error) return a.stack || `${a.name}: ${a.message}`
    if (typeof a === 'string') return a
    try {
      return JSON.stringify(a)
    } catch {
      return String(a)
    }
  })
  const full = parts.join(' ')
  const summary = full.length > 200 ? `${full.slice(0, 200)}…` : full
  return { summary, detail: full.length > 200 || full.includes('\n') ? full : undefined }
}

let consoleInstalled = false
export function installConsoleCapture() {
  if (consoleInstalled || typeof window === 'undefined') return
  consoleInstalled = true
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      const { summary, detail } = argsToText(args)
      push(level, summary, detail)
    }
  }
}

function clear() {
  entries.value = []
}

export function useDebugLog() {
  return { entries, logAddUi, logDestroyUi, logInfo, clear }
}
