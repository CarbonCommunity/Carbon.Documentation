// Live-preview snapshot diff (issue #3).
//
// The transport sends the whole element tree as one AddUi every debounced frame, with `update:true`
// on elements already on screen so they patch in place (no flicker). That works for moves/resizes/
// recolors of *static* elements — but breaks two cases:
//
//  1. Reparent: Rust CUI never re-attaches an existing element to a new parent on update, so an
//     `update:true` reparent is silently ignored and the box stays where it was. Fix: tear the
//     element down and recreate it. DestroyUi cascades, so the whole subtree must be re-created too.
//
//  2. Stateful "dynamic" elements (a countdown's timer, an input field's typed value): patching their
//     component in place re-initialises the widget client-side — a countdown jumps/restarts, an input
//     loses focus/text. Fix: never `update` them. Leave an UNCHANGED dynamic element completely alone
//     (omit it from the AddUi so the running widget is untouched); when its own content changes,
//     destroy + recreate it cleanly.
//
// Pure + framework-free so it's unit-testable.

import type { CuiElement } from './types'
import { DYNAMIC_WIRE_COMPONENT_TYPES } from './elements/registry'
import { IMAGE_COMPONENT_TYPE, RAW_IMAGE_COMPONENT_TYPE } from './elements/fills'

// Which component types are stateful/source-bearing is declared next to where each is emitted
// (elements/countdown.ts, elements/input.ts, elements/fills.ts) and merged/re-exported via
// elements/registry.ts / elements/fills.ts, so a new element can't silently drift out of sync with
// this diff.

function isDynamic(el: CuiElement): boolean {
  return el.components.some((c) => DYNAMIC_WIRE_COMPONENT_TYPES.has(c.type))
}

/**
 * Signature of an image element's SOURCE (sprite / png / item / url / steam avatar) — NOT its color or
 * geometry. Rust CUI can patch an image's color/rect in place, but changing the source *type* on an
 * `update:true` re-send null-refs the client (RPC Error in AddUI). When this key changes we must
 * destroy + recreate the element instead of updating it. Returns null for non-image elements.
 */
function imageSourceKey(el: CuiElement): string | null {
  for (const c of el.components) {
    if (c.type === IMAGE_COMPONENT_TYPE) return `img|${c.sprite ?? ''}|${c.png ?? ''}|${c.itemid ?? ''}|${c.skinid ?? ''}`
    if (c.type === RAW_IMAGE_COMPONENT_TYPE) return `raw|${c.url ?? ''}|${c.png ?? ''}|${c.sprite ?? ''}|${c.steamid ?? ''}`
  }
  return null
}

/** Identity-relevant content (parent + components) for change detection. Excludes the `update` flag. */
function contentKey(el: CuiElement): string {
  return JSON.stringify({ parent: el.parent, components: el.components })
}

export interface PreviewDiff {
  /** Elements to AddUi, `update:true` set on in-place patches. Unchanged dynamics are omitted. */
  payload: CuiElement[]
  /** Names to DestroyUi BEFORE the AddUi: reparented subtrees + changed/recreated dynamic elements. */
  destroys: string[]
  /** Every name on screen after this push (payload ∪ untouched dynamics) — drives the vanished check. */
  liveNames: Set<string>
  /** name → contentKey for the next diff (covers payload + the dynamics left running). */
  content: Map<string, string>
  /** name → imageSourceKey for the next diff — detects an image whose source type changed. */
  imageSource: Map<string, string>
}

/**
 * Decide per element: patch in place, recreate, or leave running. `lastNames`/`lastParents`/
 * `lastContent`/`lastImageSource` describe the previous push. Mutates the `update` flag on emitted
 * `payload` elements.
 */
export function diffPreview(all: CuiElement[], lastNames: Set<string>, lastParents: Map<string, string>, lastContent: Map<string, string>, lastImageSource: Map<string, string>): PreviewDiff {
  // children index over the tree, for subtree (cascade) expansion.
  const childrenOf = new Map<string, CuiElement[]>()
  for (const el of all) {
    const arr = childrenOf.get(el.parent)
    if (arr) arr.push(el)
    else childrenOf.set(el.parent, [el])
  }

  // Reparented = previously sent under a different parent → recreate (CUI won't reparent on update).
  const reparented: string[] = []
  for (const el of all) {
    const prev = lastParents.get(el.name)
    if (prev !== undefined && prev !== el.parent) reparented.push(el.name)
  }

  // mustCreate = elements that must be re-created (no `update`). A destroyed element cascade-removes
  // its whole subtree on the client, so every descendant of a recreated node is recreated too.
  const mustCreate = new Set<string>()
  const expand = (name: string) => {
    if (mustCreate.has(name)) return
    mustCreate.add(name)
    for (const c of childrenOf.get(name) ?? []) expand(c.name)
  }
  for (const n of reparented) expand(n)

  // Dynamic elements: leave unchanged ones running (omit); recreate changed/new ones.
  const untouched = new Set<string>() // unchanged dynamics — kept on screen, omitted from the payload
  const dynamicDestroys: string[] = []
  for (const el of all) {
    if (!isDynamic(el)) continue
    const existed = lastNames.has(el.name)
    const unchanged = existed && !mustCreate.has(el.name) && lastContent.get(el.name) === contentKey(el)
    if (unchanged) {
      untouched.add(el.name)
    } else {
      expand(el.name) // recreate it (and its subtree); no `update`
      if (existed) dynamicDestroys.push(el.name)
    }
  }

  // Image source-type change: patching an image whose source (sprite/png/item/url/steam) changed
  // null-refs the client, so recreate it. Common when the same-named element differs between two
  // layouts (e.g. switching example tabs during a live preview: Panel.3 sprite → item icon).
  const imageDestroys: string[] = []
  for (const el of all) {
    const key = imageSourceKey(el)
    if (key == null) continue
    if (lastNames.has(el.name) && !mustCreate.has(el.name) && lastImageSource.get(el.name) !== undefined && lastImageSource.get(el.name) !== key) {
      expand(el.name)
      imageDestroys.push(el.name)
    }
  }

  const payload = all.filter((el) => !untouched.has(el.name))
  for (const el of payload) {
    if (lastNames.has(el.name) && !mustCreate.has(el.name)) el.update = true
    else delete el.update // a recreated element must NOT carry a stale update flag
  }

  const liveNames = new Set(all.map((e) => e.name))
  const content = new Map<string, string>()
  const imageSource = new Map<string, string>()
  for (const el of payload) {
    content.set(el.name, contentKey(el))
    const key = imageSourceKey(el)
    if (key != null) imageSource.set(el.name, key)
  }
  for (const n of untouched) {
    content.set(n, lastContent.get(n)!) // carry forward — unchanged by definition
    const prev = lastImageSource.get(n)
    if (prev !== undefined) imageSource.set(n, prev)
  }

  return { payload, destroys: [...reparented, ...dynamicDestroys, ...imageDestroys], liveNames, content, imageSource }
}

/**
 * Per-send byte budget for one AddUi JSON string. The server reads it with a hard cap
 * (WebControlPanel RPC_AddUi's `read.String(maxValue: 256000)`) and silently drops anything over,
 * so stay well under it — the margin also absorbs the bytes-vs-UTF-16 length difference.
 */
export const ADDUI_CHUNK_BYTES = 200_000

/**
 * Serialize `elements` into one or more AddUi JSON array strings, each within `maxBytes`. Splitting
 * at element boundaries keeps every chunk valid standalone JSON, and the input is already in
 * parent-before-child order (treeOrder), so chunks sent sequentially never reference a parent the
 * client hasn't seen. Concatenating the parsed chunks reproduces the input exactly. A single element
 * larger than the budget is emitted as its own oversized chunk (nothing smaller is valid) — the
 * caller can detect that by re-measuring. Empty input → no chunks (nothing to send).
 */
export function chunkAddUiJson(elements: CuiElement[], maxBytes = ADDUI_CHUNK_BYTES): string[] {
  const enc = new TextEncoder()
  const chunks: string[] = []
  let parts: string[] = []
  let size = 2 // '[' + ']'
  for (const el of elements) {
    const part = JSON.stringify(el)
    const bytes = enc.encode(part).length
    if (parts.length && size + bytes + 1 > maxBytes) {
      chunks.push(`[${parts.join(',')}]`)
      parts = []
      size = 2
    }
    parts.push(part)
    size += bytes + (parts.length > 1 ? 1 : 0)
  }
  if (parts.length) chunks.push(`[${parts.join(',')}]`)
  return chunks
}
