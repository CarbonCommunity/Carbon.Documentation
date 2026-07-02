// Empty container / section element — a RectTransform-only node with no graphic. Used to group
// children (a section). Oxide: a CuiElement whose only component is the rect. Carbon:
// cui.v2.CreateEmptyContainer, positioned via a chained SetAnchorAndOffset (the create method itself
// takes no position). AddUi: a node with just the RectTransform (no primary component).

import { anchorPair, esc, fullStretch, nameRef, offExpr, offsetPair, parentRef, posExpr, staggeredBox } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import type { BaseElement, CuiComponent } from '../types'

/** An empty container carries no visual props — it groups children through its RectTransform alone. */
export type ContainerProps = Record<string, never>

export interface ContainerElement extends BaseElement {
  type: 'container'
  props: ContainerProps
}

function oxide(el: ContainerElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  return [
    'container.Add(new CuiElement',
    '{',
    `    Name = "${name}",`,
    `    Parent = "${parent}",`,
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

function carbon(el: ContainerElement, ctx: EmitContext): string[] {
  // CreateEmptyContainer(parent, name) takes no position — place it with a chained SetAnchorAndOffset.
  return [
    `cui.v2.CreateEmptyContainer("${esc(parentRef(el, ctx))}", "${esc(nameRef(el, ctx))}")`,
    `    .SetAnchorAndOffset(${posExpr(el)}, ${offExpr(el)});`,
    '',
  ]
}

function adduiComponents(): CuiComponent[] {
  // Rect-only: codegen appends the RectTransform, so this element has no primary component.
  return []
}

export const containerDefinition: ElementDefinition<ContainerElement> = {
  type: 'container',
  label: 'Container',
  create({ id, n, parentId, index }: CreateArgs): ContainerElement {
    return {
      id,
      name: `Container.${n}`,
      parentId,
      type: 'container',
      ...(parentId === null ? fullStretch() : staggeredBox(index, 120, 70)),
      props: {},
    }
  },
  cloneProps(el) {
    return { ...el.props }
  },
  oxide,
  carbon,
  adduiComponents,
}
