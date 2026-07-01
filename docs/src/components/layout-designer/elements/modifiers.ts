// Cross-cutting element modifiers — CUI behavior components (cursor, keyboard, …) that can attach to
// ANY element, unlike the per-type props owned by each element module. Their emit therefore lives here
// and is invoked by the shared codegen assembly (genOxide / genCarbon / adduiElement), so element
// modules stay untouched and a modifier is added in exactly one place.

import { esc } from './emit'
import type { CuiComponent, DesignerElement } from '../types'

/**
 * Oxide: a standalone `CuiElement` per behavior component, parented to `name` so it lives and dies with
 * the host. NeedsCursor / NeedsKeyboard aren't fields on the typed `CuiPanel`/`CuiButton` shortcuts the
 * element modules emit, so they're their own elements here — which works for any host element type.
 */
export function oxideModifierLines(el: DesignerElement, name: string): string[] {
  const m = el.modifiers
  if (!m) return []
  const out: string[] = []
  const add = (suffix: string, component: string) => {
    out.push(
      'container.Add(new CuiElement',
      '{',
      `    Name = "${esc(name)}_${suffix}",`,
      `    Parent = "${esc(name)}",`,
      `    Components = { new ${component}() }`,
      '});',
      '',
    )
  }
  if (m.cursor) add('cursor', 'CuiNeedsCursorComponent')
  if (m.keyboard) add('keyboard', 'CuiNeedsKeyboardComponent')
  return out
}

/** Carbon: the fluent `.AddCursor()` / `.AddKeyboard()` suffix chained onto the element's Create call. */
export function carbonModifierChain(el: DesignerElement): string {
  const m = el.modifiers
  if (!m) return ''
  let chain = ''
  if (m.cursor) chain += '.AddCursor()'
  if (m.keyboard) chain += '.AddKeyboard()'
  return chain
}

/** AddUi wire components contributed by an element's modifiers (appended to its component list). */
export function adduiModifierComponents(el: DesignerElement): CuiComponent[] {
  const m = el.modifiers
  if (!m) return []
  const comps: CuiComponent[] = []
  if (m.cursor) comps.push({ type: 'NeedsCursor' })
  if (m.keyboard) comps.push({ type: 'NeedsKeyboard' })
  return comps
}
