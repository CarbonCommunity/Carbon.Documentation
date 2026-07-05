// Tab view element — NOT native CUI, a designer convenience with two halves:
//
//  1. THIS element: the swappable content container. Its direct children are PAGES (any subtree;
//     the child's name is the page label). Only the active page exists on the client at a time —
//     the generated command handler clears the container's contents and rewrites it with the
//     chosen page.
//  2. Tab BUTTONS: ordinary button elements ANYWHERE in the layout (a strip above the box, all
//     four corners, whatever) with a "Switches tab" binding (target tab view + page index) and an
//     optional active color. They stay fully free-form — restyle or rearrange them like any other
//     element; the binding only supplies the generated command (`<command> <page>`) and the
//     active-vs-inactive coloring.
//
// On the wire the element is a rect-only container. Page selection is produced by codegen:
// expandTabs (JSON/live preview — active page only, buttons resolved concretely) and the tabs
// emission in generateCode (Class/UX — per-page local functions + a switch over the runtime `tab`).

import { anchorPair, esc, fullStretch, nameRef, offExpr, offsetPair, parentRef, posExpr, staggeredBox } from './emit'
import type { CreateArgs, ChildFactory, ElementDefinition, EmitContext } from './emit'
import type { BaseElement, CuiComponent } from '../types'

export interface TabsProps {
  /** Console command the switch buttons run with the page index appended; the generated handler
   *  re-renders with that page active. One command per tab view. */
  command: string
  /** Which page is active on the canvas / in the preview (generated code always starts at 0). */
  activeTab: number
}

export interface TabsElement extends BaseElement {
  type: 'tabs'
  props: TabsProps
}

/** The rect pages are slammed to on reflow: the whole container (tab buttons live OUTSIDE, as
 *  ordinary elements, so pages own the full box). */
export function tabsPageRect(_props: TabsProps): {
  anchorMin: { x: number; y: number }
  anchorMax: { x: number; y: number }
  offsetMin: { x: number; y: number }
  offsetMax: { x: number; y: number }
} {
  return { anchorMin: { x: 0, y: 0 }, anchorMax: { x: 1, y: 1 }, offsetMin: { x: 0, y: 0 }, offsetMax: { x: 0, y: 0 } }
}

// The wire node is a rect-only container (pages fill it entirely).
function oxide(el: TabsElement, ctx: EmitContext): string[] {
  return [
    'container.Add(new CuiElement',
    '{',
    `    Name = "${esc(nameRef(el, ctx))}",`,
    `    Parent = "${esc(parentRef(el, ctx))}",`,
    '    Components =',
    '    {',
    '        new CuiRectTransformComponent',
    '        {',
    `            AnchorMin = "${anchorPair(el.anchorMin)}",`,
    `            AnchorMax = "${anchorPair(el.anchorMax)}",`,
    `            OffsetMin = "${offsetPair(el.offsetMin)}",`,
    `            OffsetMax = "${offsetPair(el.offsetMax)}"`,
    '        }',
    '    }',
    '});',
    '',
  ]
}

function carbon(el: TabsElement, ctx: EmitContext): string[] {
  return [
    `cui.v2.CreateEmptyContainer("${esc(parentRef(el, ctx))}", "${esc(nameRef(el, ctx))}")`,
    `    .SetAnchorAndOffset(${posExpr(el)}, ${offExpr(el)});`,
    '',
  ]
}

function adduiComponents(): CuiComponent[] {
  return [] // rect-only; codegen appends the RectTransform
}

/** Seed a WORKING starter: two empty pages inside, and a small bar of two real switch buttons above
 *  the box — ordinary elements the user restyles or scatters freely. */
function seedChildren(tabs: TabsElement, mk: ChildFactory) {
  const out = []
  for (const n of [1, 2]) {
    const page = mk('container', tabs.id)
    page.name = `Page ${n}`
    Object.assign(page, { anchorMin: { x: 0, y: 0 }, anchorMax: { x: 1, y: 1 }, offsetMin: { x: 0, y: 0 }, offsetMax: { x: 0, y: 0 } })
    out.push(page)
  }
  // the bar sits just above the box, in the same parent
  const bar = mk('container', tabs.parentId)
  bar.name = `${tabs.name} Bar`
  Object.assign(bar, {
    anchorMin: { ...tabs.anchorMin },
    anchorMax: { ...tabs.anchorMax },
    offsetMin: { x: tabs.offsetMin.x, y: tabs.offsetMax.y + 2 },
    offsetMax: { x: tabs.offsetMax.x, y: tabs.offsetMax.y + 26 },
  })
  out.push(bar)
  for (const n of [1, 2]) {
    const btn = mk('button', bar.id)
    btn.name = `${tabs.name} Tab ${n}`
    Object.assign(btn, { anchorMin: { x: (n - 1) * 0.5, y: 0 }, anchorMax: { x: n * 0.5, y: 1 }, offsetMin: { x: n === 1 ? 0 : 1, y: 0 }, offsetMax: { x: n === 1 ? -1 : 0, y: 0 } })
    if (btn.type === 'button') {
      btn.props.color = { r: 0.12, g: 0.13, b: 0.16, a: 1 }
      btn.props.tabSwitch = { target: tabs.id, page: n - 1 }
      btn.props.activeColor = { r: 0.99, g: 0.35, b: 0.23, a: 1 }
    }
    out.push(btn)
    const label = mk('text', btn.id)
    label.name = `${btn.name} Label`
    Object.assign(label, { anchorMin: { x: 0, y: 0 }, anchorMax: { x: 1, y: 1 }, offsetMin: { x: 0, y: 0 }, offsetMax: { x: 0, y: 0 } })
    label.passthrough = true
    if (label.type === 'text') {
      label.props.text = `Page ${n}`
      label.props.fontSize = 12
    }
    out.push(label)
  }
  return out
}

export const tabsDefinition: ElementDefinition<TabsElement> = {
  type: 'tabs',
  label: 'Tab view',
  create({ id, n, parentId }: CreateArgs): TabsElement {
    return {
      id,
      name: `Tabs.${n}`,
      parentId,
      type: 'tabs',
      ...(parentId === null ? fullStretch() : staggeredBox(0, 160, 110)),
      props: { command: 'ui.tab', activeTab: 0 },
    }
  },
  cloneProps(el) {
    return { ...el.props }
  },
  seedChildren,
  oxide,
  carbon,
  adduiComponents,
}
