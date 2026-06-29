// Element registry — the single place that knows the full set of element types.
//
// Each element's behavior lives in its own module (panel.ts, text.ts, …) as an `ElementDefinition`.
// This file collects them in display order and exposes lookup + the derived "Add element" list, so
// adding an element is: write one module, add one line here. codegen.ts and useDesigner.ts dispatch
// through `getDefinition`/`definitionOf` instead of `if (el.type === …)` chains.

import type { DesignerElement, ElementType } from '../types'
import type { ElementDefinition } from './emit'
import { panelDefinition } from './panel'
import { textDefinition } from './text'

/**
 * Widen a concrete `ElementDefinition<PanelElement>` to the broad `ElementDefinition` for storage in a
 * heterogeneous registry. Safe because every dispatch only ever calls a definition's methods with an
 * element whose `type` matches that definition (the runtime invariant the registry guarantees).
 */
function widen<E extends DesignerElement>(def: ElementDefinition<E>): ElementDefinition {
  return def as unknown as ElementDefinition
}

/** Every element definition, in the order shown by the "Add element" picker. */
export const ELEMENT_DEFINITIONS: ElementDefinition[] = [widen(panelDefinition), widen(textDefinition)]

const BY_TYPE = new Map<ElementType, ElementDefinition>(ELEMENT_DEFINITIONS.map((d) => [d.type, d]))

/** The definition for an element type. Throws on an unknown type (a programming error). */
export function getDefinition(type: ElementType): ElementDefinition {
  const def = BY_TYPE.get(type)
  if (!def) throw new Error(`No element definition registered for type "${type}"`)
  return def
}

/** The definition for a concrete element instance. */
export function definitionOf(el: DesignerElement): ElementDefinition {
  return getDefinition(el.type)
}

/** `{ type, label }` list driving the Add picker — derived so the registry stays the single source. */
export const ELEMENT_TYPES: { type: ElementType; label: string }[] = ELEMENT_DEFINITIONS.map((d) => ({ type: d.type, label: d.label }))
