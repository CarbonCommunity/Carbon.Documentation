// Countdown element — a text whose `%TIME_LEFT%` placeholder is replaced with the remaining time,
// counting client-side from Start to End seconds; optionally runs a command at the end. Oxide: a
// CuiElement with a CuiTextComponent (the text) + a CuiCountdownComponent (the timer). Carbon:
// cui.v2.CreateCountdown (bundles both). The `color` prop is the text color.
//
// NOTE: the Carbon signature is exact (from the LUI docs). The Oxide CuiCountdownComponent field names
// (StartTime / EndTime / Step) and the AddUi "Countdown" component type are best-effort — verify
// in-game. `interval` is a Carbon-only client-refresh rate (no Oxide equivalent).

import { anchorPair, color, esc, intStr, lf, nameRef, offExpr, offsetPair, parentRef, posExpr, staggeredBox } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import { fontDef } from '../types'
import type { BaseElement, ColorRGBA, CuiComponent, TextAlign, TextFont } from '../types'

export interface CountdownProps {
  /** Text (font) color. */
  color: ColorRGBA
  /** Display text — `%TIME_LEFT%` is substituted with the formatted remaining time. */
  text: string
  fontSize: number
  font?: TextFont
  align: TextAlign
  /** Countdown bounds, in seconds. */
  startTime: number
  endTime: number
  /** Seconds decremented per tick. */
  step: number
  /** Client refresh interval in seconds (Carbon-only). */
  interval: number
  /** Optional command run when the countdown ends. */
  command: string
  /** Carbon command protection (Carbon-only). */
  isProtected: boolean
}

export interface CountdownElement extends BaseElement {
  type: 'countdown'
  props: CountdownProps
}

function oxide(el: CountdownElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const t = el.props
  return [
    'container.Add(new CuiElement',
    '{',
    `    Name = "${name}",`,
    `    Parent = "${parent}",`,
    '    Components =',
    '    {',
    '        new CuiTextComponent',
    '        {',
    `            Text = "${esc(t.text)}",`,
    `            FontSize = ${intStr(t.fontSize)},`,
    `            Font = "${fontDef(t.font).oxide}",`,
    `            Align = TextAnchor.${t.align},`,
    `            Color = "${color(t.color)}"`,
    '        },',
    '        new CuiCountdownComponent',
    '        {',
    `            StartTime = ${lf(t.startTime, 2)},`,
    `            EndTime = ${lf(t.endTime, 2)},`,
    `            Step = ${lf(t.step, 2)},`,
    `            Command = "${esc(t.command)}"`,
    '        },',
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

function carbon(el: CountdownElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const t = el.props
  // CreateCountdown(parent, pos, off, fontSize, color, text, alignment, startTime, endTime, step, interval, command, isProtected, name).
  const command = t.command ? `"${esc(t.command)}"` : 'null'
  return [
    `cui.v2.CreateCountdown("${parent}",`,
    `    ${posExpr(el)},`,
    `    ${offExpr(el)},`,
    `    ${intStr(t.fontSize)}, "${color(t.color)}", "${esc(t.text)}", TextAnchor.${t.align}, ${lf(t.startTime, 2)}, ${lf(t.endTime, 2)}, ${lf(t.step, 2)}, ${lf(t.interval, 2)}, ${command}, ${t.isProtected}, "${name}");`,
    '',
  ]
}

function adduiComponents(el: CountdownElement): CuiComponent[] {
  const t = el.props
  return [
    { type: 'UnityEngine.UI.Text', text: t.text, fontSize: Math.max(1, Math.round(t.fontSize)), font: fontDef(t.font).oxide, align: t.align, color: color(t.color) },
    { type: 'Countdown', startTime: t.startTime, endTime: t.endTime, step: t.step, command: t.command },
  ]
}

export const countdownDefinition: ElementDefinition<CountdownElement> = {
  type: 'countdown',
  label: 'Countdown',
  create({ id, n, parentId, index }: CreateArgs): CountdownElement {
    return {
      id,
      name: `Countdown.${n}`,
      parentId,
      type: 'countdown',
      ...staggeredBox(index, 90, 16),
      props: { color: { r: 1, g: 1, b: 1, a: 1 }, text: '%TIME_LEFT%', fontSize: 18, font: 'RobotoCondensedRegular', align: 'MiddleCenter', startTime: 60, endTime: 0, step: 1, interval: 1, command: '', isProtected: true },
    }
  },
  cloneProps(el) {
    return { ...el.props, color: { ...el.props.color } }
  },
  oxide,
  carbon,
  adduiComponents,
}
