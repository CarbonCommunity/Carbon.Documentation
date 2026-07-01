// Cross-cutting element modifiers — CUI behavior components (cursor, keyboard, …) that can attach to
// ANY element, unlike the per-type props owned by each element module. Their emit therefore lives here
// and is invoked by the shared codegen assembly (genOxide / genCarbon / adduiElement), so element
// modules stay untouched and a modifier is added in exactly one place.

import { color, esc, lf, num } from './emit'
import type { CuiComponent, DesignerElement } from '../types'

/** Outline distance as a CUI "x y" string / the pair used across the emit paths. */
const distanceStr = (d: { x: number; y: number }) => `${num(d.x, 2)} ${num(d.y, 2)}`

/**
 * Oxide: a standalone `CuiElement` per behavior component, parented to `name` so it lives and dies with
 * the host. NeedsCursor / NeedsKeyboard aren't fields on the typed `CuiPanel`/`CuiButton` shortcuts the
 * element modules emit, so they're their own elements here — which works for any host element type.
 */
export function oxideModifierLines(el: DesignerElement, name: string): string[] {
  const m = el.modifiers
  if (!m) return []
  const out: string[] = []
  // Outline is a component ON the graphic — append it to the element just added (its own components
  // list) BEFORE any standalone modifier elements below change what `container` ends with.
  if (m.outline) {
    const o = m.outline
    out.push(
      'container[container.Count - 1].Components.Add(new CuiOutlineComponent',
      '{',
      `    Color = "${color(o.color)}",`,
      `    Distance = "${distanceStr(o.distance)}"${o.useGraphicAlpha ? ',' : ''}`,
      ...(o.useGraphicAlpha ? ['    UseGraphicAlpha = true'] : []),
      '});',
      '',
    )
  }
  // Cursor/keyboard are behavior-only — emit as standalone child elements (works for any host type).
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
  if (m.outline) {
    const o = m.outline
    chain += `.SetOutline("${color(o.color)}", new Vector2(${lf(o.distance.x, 2)}, ${lf(o.distance.y, 2)})${o.useGraphicAlpha ? ', true' : ''})`
  }
  if (m.cursor) chain += '.AddCursor()'
  if (m.keyboard) chain += '.AddKeyboard()'
  return chain
}

/** AddUi wire components contributed by an element's modifiers (appended to its component list). */
export function adduiModifierComponents(el: DesignerElement): CuiComponent[] {
  const m = el.modifiers
  if (!m) return []
  const comps: CuiComponent[] = []
  if (m.outline) {
    comps.push({
      type: 'UnityEngine.UI.Outline',
      color: color(m.outline.color),
      distance: distanceStr(m.outline.distance),
      ...(m.outline.useGraphicAlpha ? { useGraphicAlpha: true } : {}),
    })
  }
  if (m.cursor) comps.push({ type: 'NeedsCursor' })
  if (m.keyboard) comps.push({ type: 'NeedsKeyboard' })
  return comps
}
