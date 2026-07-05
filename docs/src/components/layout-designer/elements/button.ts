// Button element — a colored, clickable element that runs a command. LUI's CreateButton takes no
// text, so a button's label is a real child Text element (seeded on add): it reuses the whole Text
// element, stays independently editable, and can even bind to a data source. Oxide's CuiButton can
// bundle a label, but we keep the child-label model so both frameworks render identically and every
// designer element maps to exactly one wire node.

import { anchorPair, color, esc, nameRef, offExpr, offsetPair, parentRef, posExpr, staggeredBox } from './emit'
import type { ChildFactory, CreateArgs, ElementDefinition, EmitContext } from './emit'
import type { BaseElement, ColorRGBA, CuiComponent } from '../types'

export interface ButtonProps {
  /** Button background color (and the Oxide button image tint). */
  color: ColorRGBA
  /** Console/chat command run on click. Empty = no command (a non-interactive colored box). */
  command: string
  /** Carbon command protection (Carbon-only; Oxide has no equivalent and ignores it). */
  isProtected: boolean
  /**
   * Element to destroy CLIENT-SIDE on click (CuiButton.Close / .SetButtonClose) — no server
   * round-trip. Holds the target's element ID, or CLOSE_ROOT for the generated root wrapper (the
   * whole menu); resolved to the generated name at emit. Empty/absent => nothing closes.
   */
  close?: string
  /**
   * "Switches tab": clicking runs the target tab view's command with this page index appended (the
   * generated handler re-renders with that page active). Overrides `command`. The button stays a
   * completely ordinary element — style it, move it, put it anywhere.
   */
  tabSwitch?: { target: string; page: number } | null
  /** Color while this button's page is the active one (only with tabSwitch). Alpha 0 = invisible
   *  when selected. Absent/null => no active styling. */
  activeColor?: ColorRGBA | null
}

/** props.close sentinel: close the transparent root wrapper codegen creates (the whole menu). */
export const CLOSE_ROOT = '__root__'

/** Resolve a button's close target to its generated wire name ('' = none). */
function closeRef(el: ButtonElement, ctx: EmitContext): string {
  if (!el.props.close) return ''
  if (el.props.close === CLOSE_ROOT) return ctx.rootParent
  return ctx.names.get(el.props.close) ?? ''
}

export interface ButtonElement extends BaseElement {
  type: 'button'
  props: ButtonProps
}

function oxide(el: ButtonElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  // CuiButton's Button block carries the command + color; the label is a separate child element.
  const close = closeRef(el, ctx)
  return [
    'container.Add(new CuiButton',
    '{',
    '    Button =',
    '    {',
    `        Command = "${esc(el.props.command)}",`,
    ...(close ? [`        Close = "${esc(close)}",`] : []),
    `        Color = "${color(el.props.color)}"`,
    '    },',
    '    RectTransform =',
    '    {',
    `        AnchorMin = "${anchorPair(el.anchorMin)}",`,
    `        AnchorMax = "${anchorPair(el.anchorMax)}",`,
    `        OffsetMin = "${offsetPair(el.offsetMin)}",`,
    `        OffsetMax = "${offsetPair(el.offsetMax)}"`,
    '    }',
    `}, "${parent}", "${name}");`,
    '',
  ]
}

function carbon(el: ButtonElement, ctx: EmitContext): string[] {
  // CreateButton(parent, pos, offset, command, color, isProtected, name); close chains SetButtonClose.
  const close = closeRef(el, ctx)
  return [
    `cui.v2.CreateButton("${esc(parentRef(el, ctx))}",`,
    `    ${posExpr(el)},`,
    `    ${offExpr(el)},`,
    `    "${esc(el.props.command)}", "${color(el.props.color)}", ${el.props.isProtected}, "${esc(nameRef(el, ctx))}")${close ? `` : `;`}`,
    ...(close ? [`    .SetButtonClose("${esc(close)}");`] : []),
    '',
  ]
}

function adduiComponents(el: ButtonElement, ctx: EmitContext): CuiComponent[] {
  const close = closeRef(el, ctx)
  return [{ type: 'UnityEngine.UI.Button', command: el.props.command, ...(close ? { close } : {}), color: color(el.props.color) }]
}

/** Seed a centered child Text label filling the button (reuses the Text element wholesale). */
function seedChildren(btn: ButtonElement, mk: ChildFactory) {
  const label = mk('text', btn.id)
  label.name = `${btn.name} Label`
  label.anchorMin = { x: 0, y: 0 }
  label.anchorMax = { x: 1, y: 1 }
  label.offsetMin = { x: 0, y: 0 }
  label.offsetMax = { x: 0, y: 0 }
  label.passthrough = true // grabbing the caption grabs the button; Alt-click to reach the caption
  if (label.type === 'text') label.props.text = 'Button'
  return [label]
}

export const buttonDefinition: ElementDefinition<ButtonElement> = {
  type: 'button',
  label: 'Button',
  create({ id, n, parentId, index, color: fill }: CreateArgs): ButtonElement {
    // A button is always a fixed-size box (never a full-stretch container), staggered on add.
    return { id, name: `Button.${n}`, parentId, type: 'button', ...staggeredBox(index, 80, 22), props: { color: fill, command: '', isProtected: true } }
  },
  cloneProps(el) {
    return {
      ...el.props,
      color: { ...el.props.color },
      ...(el.props.tabSwitch ? { tabSwitch: { ...el.props.tabSwitch } } : {}),
      ...(el.props.activeColor ? { activeColor: { ...el.props.activeColor } } : {}),
    }
  },
  seedChildren,
  oxide,
  carbon,
  adduiComponents,
}
