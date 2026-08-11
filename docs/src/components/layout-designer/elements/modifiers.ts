// Cross-cutting element modifiers — CUI behavior components (cursor, keyboard, …) that can attach to
// ANY element, unlike the per-type props owned by each element module. Their emit therefore lives here
// and is invoked by the shared codegen assembly (genOxide / genCarbon / adduiElement), so element
// modules stay untouched and a modifier is added in exactly one place.

import { color, esc, lf, num } from './emit'
import type { CuiComponent, DesignerElement, DraggableModifier } from '../types'

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
  // Graphic-attached components (outline/draggable/slot) append to the element just added — its own
  // Components list — BEFORE the standalone cursor/keyboard elements below change what `container` ends with.
  const attach = (component: string, fields: string[]) => {
    if (!fields.length) {
      out.push(`container[container.Count - 1].Components.Add(new ${component}());`, '')
      return
    }
    out.push(`container[container.Count - 1].Components.Add(new ${component}`, '{', fields.map((f, i) => `    ${f}${i < fields.length - 1 ? ',' : ''}`).join('\n'), '});', '')
  }
  if (m.outline) {
    const o = m.outline
    attach('CuiOutlineComponent', [`Color = "${color(o.color)}"`, `Distance = "${distanceStr(o.distance)}"`, ...(o.useGraphicAlpha ? ['UseGraphicAlpha = true'] : [])])
  }
  if (m.draggable) attach('CuiDraggableComponent', draggableFields(el.modifiers!.draggable!, (k, v) => `${k} = ${v}`))
  if (m.slot) attach('CuiSlotComponent', m.slot.filter ? [`Filter = "${esc(m.slot.filter)}"`] : [])
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

/**
 * The set draggable fields, formatted via `fmt(key, value)` — used with C#-property style (`Key = val`)
 * for the Oxide component and named-arg style (`key: val`) for the Carbon chain. Only present fields are
 * emitted; the rest fall back to framework defaults. `keyCase` picks PascalCase (Oxide) vs camelCase.
 */
function draggableFields(d: DraggableModifier, fmt: (key: string, value: string) => string, keyCase: 'pascal' | 'camel' = 'pascal'): string[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const k = (name: string) => (keyCase === 'pascal' ? cap(name) : name)
  const out: string[] = []
  if (d.filter) out.push(fmt(k('filter'), `"${esc(d.filter)}"`))
  if (d.dropAnywhere !== undefined) out.push(fmt(k('dropAnywhere'), String(d.dropAnywhere)))
  if (d.keepOnTop !== undefined) out.push(fmt(k('keepOnTop'), String(d.keepOnTop)))
  if (d.limitToParent !== undefined) out.push(fmt(k('limitToParent'), String(d.limitToParent)))
  if (d.maxDistance !== undefined) out.push(fmt(k('maxDistance'), `${num(d.maxDistance, 2)}f`))
  if (d.allowSwapping !== undefined) out.push(fmt(k('allowSwapping'), String(d.allowSwapping)))
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
  if (m.draggable) chain += `.SetDraggable(${draggableFields(m.draggable, (k, v) => `${k}: ${v}`, 'camel').join(', ')})`
  if (m.slot) chain += `.SetSlot(${m.slot.filter ? `"${esc(m.slot.filter)}"` : ''})`
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
  if (m.draggable) {
    const d = m.draggable
    comps.push({
      type: 'Draggable',
      ...(d.filter ? { filter: d.filter } : {}),
      ...(d.dropAnywhere !== undefined ? { dropAnywhere: d.dropAnywhere } : {}),
      ...(d.keepOnTop !== undefined ? { keepOnTop: d.keepOnTop } : {}),
      ...(d.limitToParent !== undefined ? { limitToParent: d.limitToParent } : {}),
      ...(d.maxDistance !== undefined ? { maxDistance: d.maxDistance } : {}),
      ...(d.allowSwapping !== undefined ? { allowSwapping: d.allowSwapping } : {}),
    })
  }
  if (m.slot) comps.push({ type: 'Slot', ...(m.slot.filter ? { filter: m.slot.filter } : {}) })
  if (m.cursor) comps.push({ type: 'NeedsCursor' })
  if (m.keyboard) comps.push({ type: 'NeedsKeyboard' })
  return comps
}
