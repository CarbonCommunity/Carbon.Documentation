// Tiny localStorage JSON helpers shared by the Layout Designer stores (useDesigner, useDock).
// All access is wrapped so SSR (no localStorage), quota errors and corrupt JSON degrade to the
// fallback on read and a silent no-op on write.

/** Read + JSON-parse `key`. Returns `fallback` when the key is missing, storage is unavailable, or the JSON is invalid. */
export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** JSON-stringify + write `value` under `key`; a silent no-op when storage is unavailable. */
export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}
