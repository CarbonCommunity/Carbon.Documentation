// Input field element — an editable field that runs a command (with the typed value appended) on
// submit. Bundles its own text (initial value + styling), unlike a button. Oxide: a CuiElement with a
// CuiInputFieldComponent. Carbon: cui.v2.CreateInput (color = text color, no background — put a panel
// behind it for a visible box). The `color` prop is the text color.
//
// NOTE: the Carbon signature is exact (from the LUI docs); the Oxide CuiInputFieldComponent field
// names (CharsLimit / IsPassword) are the documented Oxide names — verify in-game.

import { anchorPair, color, esc, intNum, intStr, nameRef, offExpr, offsetPair, parentRef, posExpr, staggeredBox } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import { fontDef } from '../types'
import type { BaseElement, ColorRGBA, CuiComponent, TextAlign, TextFont } from '../types'

export interface InputProps {
  /** Text (font) color. */
  color: ColorRGBA
  /** Initial field text. */
  text: string
  fontSize: number
  /** Font asset (Carbon's CreateInput defaults to RobotoCondensedBold). */
  font?: TextFont
  align: TextAlign
  /** Command run on submit (the typed value is appended as an argument). */
  command: string
  /** Max characters (0 = unlimited). */
  charLimit: number
  /** Carbon command protection (Carbon-only). */
  isProtected: boolean
  /** Mask the typed value. */
  password: boolean
}

export interface InputElement extends BaseElement {
  type: 'input'
  props: InputProps
}

const clampInt = (v: number) => Math.max(0, Math.round(v))

function oxide(el: InputElement, ctx: EmitContext): string[] {
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
    '        new CuiInputFieldComponent',
    '        {',
    `            Text = "${esc(t.text)}",`,
    `            FontSize = ${intStr(t.fontSize)},`,
    `            Font = "${fontDef(t.font).oxide}",`,
    `            Align = TextAnchor.${t.align},`,
    `            Color = "${color(t.color)}",`,
    `            CharsLimit = ${clampInt(t.charLimit)},`,
    `            Command = "${esc(t.command)}",`,
    `            IsPassword = ${t.password}`,
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

function carbon(el: InputElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const t = el.props
  // CreateInput(parent, pos, off, color, text, fontSize, command, charLimit, isProtected, font, alignment, name).
  // Password isn't a CreateInput parameter — LUI exposes it as the chainable .SetInputPassword(bool) modifier.
  const passwordChain = t.password ? '.SetInputPassword(true)' : ''
  return [
    `cui.v2.CreateInput("${parent}",`,
    `    ${posExpr(el)},`,
    `    ${offExpr(el)},`,
    `    "${color(t.color)}", "${esc(t.text)}", ${intStr(t.fontSize)}, "${esc(t.command)}", ${clampInt(t.charLimit)}, ${t.isProtected}, CUI.Handler.FontTypes.${fontDef(t.font).id}, TextAnchor.${t.align}, "${name}")${passwordChain};`,
    '',
  ]
}

function adduiComponents(el: InputElement): CuiComponent[] {
  const t = el.props
  return [
    {
      type: 'UnityEngine.UI.InputField',
      text: t.text,
      fontSize: intNum(t.fontSize),
      font: fontDef(t.font).oxide,
      align: t.align,
      color: color(t.color),
      characterLimit: clampInt(t.charLimit),
      command: t.command,
      ...(t.password ? { password: true } : {}),
    },
  ]
}

export const inputDefinition: ElementDefinition<InputElement> = {
  type: 'input',
  label: 'Input',
  create({ id, n, parentId, index }: CreateArgs): InputElement {
    return {
      id,
      name: `Input.${n}`,
      parentId,
      type: 'input',
      ...staggeredBox(index, 90, 16),
      props: { color: { r: 1, g: 1, b: 1, a: 1 }, text: '', fontSize: 14, font: 'RobotoCondensedBold', align: 'MiddleLeft', command: '', charLimit: 0, isProtected: true, password: false },
    }
  },
  cloneProps(el) {
    return { ...el.props, color: { ...el.props.color } }
  },
  oxide,
  carbon,
  adduiComponents,
  // Re-pushing the field on an `update:true` re-initialises it client-side, clearing typed text/focus.
  dynamicWireComponents: ['UnityEngine.UI.InputField'],
}
