// Text / label element — CuiLabel (Oxide) / cui.v2.CreateText (Carbon). The font is the same Rust
// client asset under both frameworks (see types.ts TEXT_FONTS); Oxide emits the filename, Carbon
// chains .SetTextFont only for a non-default font. A bound `text` prop emits a field reference.

import { anchorPair, color, esc, intNum, intStr, nameRef, offExpr, offsetPair, parentRef, posExpr, textExpr } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import { DEFAULT_TEXT_FONT, fontDef } from '../types'
import type { CuiComponent, TextElement } from '../types'

function oxide(el: TextElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const t = el.props
  // CuiLabel bundles a CuiTextComponent (Text) + RectTransform. Font is the same Rust client asset
  // Carbon's FontTypes maps to, emitted as the filename here. A bound Text references its field.
  return [
    'container.Add(new CuiLabel',
    '{',
    '    Text =',
    '    {',
    `        Text = ${textExpr(el, ctx)},`,
    `        FontSize = ${intStr(t.fontSize)},`,
    `        Font = "${fontDef(t.font).oxide}",`,
    `        Align = TextAnchor.${t.align},`,
    `        Color = "${color(t.color)}"`,
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

function carbon(el: TextElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const t = el.props
  // CreateText(parent, pos, offset, fontSize, color, text, alignment, name). Font isn't a param —
  // LUI defaults to robotocondensed-regular; a non-default font is set by chaining .SetTextFont
  // (the FontTypes member resolves to the same file Oxide's Font string points at).
  const head = [
    `cui.v2.CreateText("${parent}",`,
    `    ${posExpr(el)},`,
    `    ${offExpr(el)},`,
    `    ${intStr(t.fontSize)}, "${color(t.color)}", ${textExpr(el, ctx)}, TextAnchor.${t.align}, "${name}")`,
  ]
  if ((t.font ?? DEFAULT_TEXT_FONT) === DEFAULT_TEXT_FONT) {
    head[head.length - 1] += ';'
    return [...head, '']
  }
  return [...head, `    .SetTextFont(CUI.Handler.FontTypes.${fontDef(t.font).id});`, '']
}

function adduiComponents(el: TextElement): CuiComponent[] {
  const t = el.props
  return [{ type: 'UnityEngine.UI.Text', text: t.text, fontSize: intNum(t.fontSize), font: fontDef(t.font).oxide, align: t.align, color: color(t.color) }]
}

export const textDefinition: ElementDefinition<TextElement> = {
  type: 'text',
  label: 'Text',
  create({ id, n, parentId, index }: CreateArgs): TextElement {
    // Text defaults to a centered fixed-size box (a title/label), staggered like child panels so
    // successive adds don't fully overlap. Color defaults to opaque white (the text color).
    const c = (index % 6) * 24
    const half = { w: 140, h: 24 }
    return {
      id,
      name: `Text.${n}`,
      parentId,
      type: 'text',
      anchorMin: { x: 0.5, y: 0.5 },
      anchorMax: { x: 0.5, y: 0.5 },
      offsetMin: { x: -half.w + c, y: -half.h + c },
      offsetMax: { x: half.w + c, y: half.h + c },
      props: { color: { r: 1, g: 1, b: 1, a: 1 }, text: 'New Text', fontSize: 14, align: 'MiddleCenter', font: 'RobotoCondensedRegular' },
    }
  },
  cloneProps(el) {
    return { ...el.props, color: { ...el.props.color } }
  },
  oxide,
  carbon,
  adduiComponents,
}
