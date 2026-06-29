// Panel element — a solid-color box, optionally an image fill (URL/raw image today) and/or an inset
// border. The border itself is expanded into four edge subpanels by codegen (expandBorders); those
// subpanels are plain color panels, so they emit through this same definition. Image-fill *variants*
// (sprite / png / item icon / …) extend `ImageFill.kind` and slot into the switches below.

import { anchorPair, color, esc, nameRef, offExpr, offsetPair, parentRef, posExpr } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import type { CuiComponent, PanelElement } from '../types'

/** Oxide: a URL fill is a CuiElement + CuiRawImageComponent; otherwise a CuiPanel (Image.Color). */
function oxide(el: PanelElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  if (el.props.image?.kind === 'url') {
    return [
      'container.Add(new CuiElement',
      '{',
      `    Name = "${name}",`,
      `    Parent = "${parent}",`,
      '    Components =',
      '    {',
      `        new CuiRawImageComponent { Url = "${esc(el.props.image.url)}", Color = "${color(el.props.color)}" },`,
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
  return [
    'container.Add(new CuiPanel',
    '{',
    `    Image = { Color = "${color(el.props.color)}" },`,
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

/** Carbon: a URL fill is CreateUrlImage; otherwise CreatePanel. */
function carbon(el: PanelElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const pos = posExpr(el)
  const off = offExpr(el)
  const c = color(el.props.color)
  if (el.props.image?.kind === 'url') {
    return [`cui.v2.CreateUrlImage("${parent}",`, `    ${pos},`, `    ${off},`, `    "${esc(el.props.image.url)}", "${c}", "${name}");`, '']
  }
  return [`cui.v2.CreatePanel("${parent}",`, `    ${pos},`, `    ${off},`, `    "${c}", "${name}");`, '']
}

function adduiComponents(el: PanelElement): CuiComponent[] {
  if (el.props.image?.kind === 'url') {
    return [{ type: 'UnityEngine.UI.RawImage', url: el.props.image.url, color: color(el.props.color) }]
  }
  return [{ type: 'UnityEngine.UI.Image', color: color(el.props.color) }]
}

export const panelDefinition: ElementDefinition<PanelElement> = {
  type: 'panel',
  label: 'Panel',
  create({ id, n, parentId, index, color: fill }: CreateArgs): PanelElement {
    const base = { id, name: `Panel.${n}`, parentId, type: 'panel' as const, props: { color: fill } }
    if (parentId === null) {
      // Base/root panels default to filling the canvas (full-stretch container).
      return { ...base, anchorMin: { x: 0, y: 0 }, anchorMax: { x: 1, y: 1 }, offsetMin: { x: 0, y: 0 }, offsetMax: { x: 0, y: 0 } }
    }
    // Child panels default to a centered fixed-size box, staggered so they don't fully overlap.
    const c = (index % 6) * 24
    const half = { w: 120, h: 70 }
    return {
      ...base,
      anchorMin: { x: 0.5, y: 0.5 },
      anchorMax: { x: 0.5, y: 0.5 },
      offsetMin: { x: -half.w + c, y: -half.h + c },
      offsetMax: { x: half.w + c, y: half.h + c },
    }
  },
  cloneProps(el) {
    return { ...el.props, color: { ...el.props.color }, image: el.props.image ? { ...el.props.image } : el.props.image }
  },
  oxide,
  carbon,
  adduiComponents,
}
