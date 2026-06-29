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

/** Component types whose client widget is stateful — patching them in place disturbs the widget. */
const DYNAMIC_COMPONENTS = new Set(['Countdown', 'UnityEngine.UI.InputField'])

function isDynamic(el: CuiElement): boolean {
  return el.components.some((c) => DYNAMIC_COMPONENTS.has(c.type))
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
}

/**
 * Decide per element: patch in place, recreate, or leave running. `lastNames`/`lastParents`/
 * `lastContent` describe the previous push. Mutates the `update` flag on emitted `payload` elements.
 */
export function diffPreview(all: CuiElement[], lastNames: Set<string>, lastParents: Map<string, string>, lastContent: Map<string, string>): PreviewDiff {
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

  const payload = all.filter((el) => !untouched.has(el.name))
  for (const el of payload) {
    if (lastNames.has(el.name) && !mustCreate.has(el.name)) el.update = true
    else delete el.update // a recreated element must NOT carry a stale update flag
  }

  const liveNames = new Set(all.map((e) => e.name))
  const content = new Map<string, string>()
  for (const el of payload) content.set(el.name, contentKey(el))
  for (const n of untouched) content.set(n, lastContent.get(n)!) // carry forward — unchanged by definition

  return { payload, destroys: [...reparented, ...dynamicDestroys], liveNames, content }
}
