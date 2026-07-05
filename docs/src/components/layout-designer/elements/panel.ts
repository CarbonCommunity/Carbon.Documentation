// Panel element — a solid-color box, optionally an image fill (URL/raw image today) and/or an inset
// border. The border itself is expanded into four edge subpanels by codegen (expandBorders); those
// subpanels are plain color panels, so they emit through this same definition. Image-fill *variants*
// (sprite / png / item icon / …) extend `ImageFill.kind` and slot into the switches below.

import { color, cuiPanelLines, esc, fullStretch, nameRef, offExpr, parentRef, posExpr, staggeredBox } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import type { CuiComponent, PanelElement } from '../types'
import { adduiImageFill, carbonImageFill, oxideImageFill } from './fills'

/** Oxide: an image fill emits via its kind (see fills.ts); a plain panel is a CuiPanel (Image.Color). */
function oxide(el: PanelElement, ctx: EmitContext): string[] {
  if (el.props.image) return oxideImageFill(el, ctx, el.props.image)
  return cuiPanelLines(el, ctx, `Color = "${color(el.props.color)}"`)
}

/** Carbon: an image fill emits via its kind (see fills.ts); a plain panel is CreatePanel. */
function carbon(el: PanelElement, ctx: EmitContext): string[] {
  if (el.props.image) return carbonImageFill(el, ctx, el.props.image)
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  return [`cui.v2.CreatePanel("${parent}",`, `    ${posExpr(el)},`, `    ${offExpr(el)},`, `    "${color(el.props.color)}", "${name}");`, '']
}

function adduiComponents(el: PanelElement): CuiComponent[] {
  if (el.props.image) return [adduiImageFill(el.props.image, color(el.props.color))]
  return [{ type: 'UnityEngine.UI.Image', color: color(el.props.color) }]
}

export const panelDefinition: ElementDefinition<PanelElement> = {
  type: 'panel',
  label: 'Panel',
  create({ id, n, parentId, index, color: fill }: CreateArgs): PanelElement {
    const base = { id, name: `Panel.${n}`, parentId, type: 'panel' as const, props: { color: fill } }
    // Base/root panels fill the canvas; child panels default to a staggered centered box.
    return { ...base, ...(parentId === null ? fullStretch() : staggeredBox(index, 120, 70)) }
  },
  cloneProps(el) {
    return { ...el.props, color: { ...el.props.color }, image: el.props.image ? { ...el.props.image } : el.props.image }
  },
  oxide,
  carbon,
  adduiComponents,
}
