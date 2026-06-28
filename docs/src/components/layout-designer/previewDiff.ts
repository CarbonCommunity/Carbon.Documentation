// Live-preview snapshot diff (issue #3).
//
// The transport sends the whole element tree as one AddUi every debounced frame, with `update:true`
// on elements already on screen so they patch in place (no flicker). That works for moves/resizes/
// recolors — but NOT for a *reparent*: Rust CUI never re-attaches an existing element to a new parent
// on update, so an `update:true` reparent is silently ignored and the box stays where it was.
//
// Fix: a reparented element must be torn down and recreated. DestroyUi cascades on the client, so the
// element's whole subtree gets destroyed with it — every descendant must therefore be re-created too
// (sent without `update:true`), or they'd vanish. This module decides, per push, which elements patch
// in place vs. recreate, and which names to DestroyUi first. Pure + framework-free so it's unit-testable.

import type { CuiElement } from './types'

export interface PreviewDiff {
  /** The same payload, with `update:true` set on elements that patch in place. */
  payload: CuiElement[]
  /** Element names to DestroyUi BEFORE the AddUi — reparented elements (descendants cascade). */
  reparentDestroys: string[]
}

/**
 * Decide create-vs-update per element and which reparented subtrees to tear down first.
 * `lastNames` / `lastParents` describe the previous push (name → parent). Mutates the `update` flag
 * on `payload` elements in place and returns the destroy list.
 */
export function diffPreview(payload: CuiElement[], lastNames: Set<string>, lastParents: Map<string, string>): PreviewDiff {
  // children index over the NEW tree, for subtree expansion.
  const childrenOf = new Map<string, CuiElement[]>()
  for (const el of payload) {
    const arr = childrenOf.get(el.parent)
    if (arr) arr.push(el)
    else childrenOf.set(el.parent, [el])
  }

  // Reparented = previously sent under a different parent.
  const reparented: string[] = []
  for (const el of payload) {
    const prev = lastParents.get(el.name)
    if (prev !== undefined && prev !== el.parent) reparented.push(el.name)
  }

  // A reparented element's whole subtree is cascade-destroyed → must be re-created (no update).
  const mustCreate = new Set<string>()
  const expand = (name: string) => {
    if (mustCreate.has(name)) return
    mustCreate.add(name)
    for (const c of childrenOf.get(name) ?? []) expand(c.name)
  }
  for (const n of reparented) expand(n)

  for (const el of payload) {
    if (lastNames.has(el.name) && !mustCreate.has(el.name)) el.update = true
  }
  return { payload, reparentDestroys: reparented }
}
