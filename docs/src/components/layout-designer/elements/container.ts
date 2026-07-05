// Empty container / section element — a RectTransform-only node with no graphic. Used to group
// children (a section). Oxide: a CuiElement whose only component is the rect. Carbon:
// cui.v2.CreateEmptyContainer, positioned via a chained SetAnchorAndOffset (the create method itself
// takes no position). AddUi: a node with just the RectTransform (no primary component).

import { anchorPair, esc, fullStretch, luiOff, luiPos, nameRef, offExpr, offsetPair, parentRef, posExpr, staggeredBox } from './emit'
import type { CreateArgs, ElementDefinition, EmitContext } from './emit'
import type { BaseElement, CuiComponent } from '../types'

/**
 * Editor-side auto-arrangement of a container's children. NOT a CUI component — no layout-group is
 * emitted (issue #1's scope note holds): applying it just WRITES each child's anchors/offsets into
 * slot rects, the same "fake padding writes offsets" philosophy as Place-in-parent. Generated code
 * stays plain anchor/offset calls, which is also what the repeat/template work (#5) will emit as a
 * `foreach` — this struct is the single source of the slot math both share.
 *
 * Slots are anchored to the container's TOP-LEFT corner and laid out in tree (sibling) order:
 * `direction` is the stacking axis, `itemsPerLine` wraps it into a grid (1 = simple stack).
 */
export interface ContainerLayout {
  direction: 'vertical' | 'horizontal'
  /** children per row (vertical) / per column (horizontal); 1 = a plain stack */
  itemsPerLine: number
  /** fixed slot size, reference px */
  itemWidth: number
  itemHeight: number
  /** gap between slots, px */
  gapX: number
  gapY: number
  /** inset from the container's top-left corner, px */
  padding: number
  /**
   * Make the container a real scroll view (a wire component, unlike the rest of this struct): the
   * box becomes the viewport and the slots live on a content rect sized to fit them (see
   * {@link layoutContentSize}), scrollable along the chosen axis. Absent/null => plain container.
   */
  scroll?: 'vertical' | 'horizontal' | 'both' | null
  /** Injected at emit time (codegen's annotateScroll) — never persisted or edited. */
  content?: { w: number; h: number }
}

/** The rect the slots span for `count` children — the scroll content size. */
export function layoutContentSize(l: ContainerLayout, count: number): { w: number; h: number } {
  const per = Math.max(1, Math.floor(l.itemsPerLine))
  const lines = Math.max(1, Math.ceil(count / per))
  const across = Math.min(Math.max(count, 1), per)
  const spanX = (n: number) => l.padding * 2 + n * l.itemWidth + (n - 1) * l.gapX
  const spanY = (n: number) => l.padding * 2 + n * l.itemHeight + (n - 1) * l.gapY
  return l.direction === 'vertical' ? { w: spanX(across), h: spanY(lines) } : { w: spanX(lines), h: spanY(across) }
}

/** Content-rect anchors/offsets per scroll axis: pinned to the viewport's top/left edge and extended
 *  to the content size along each scrolling axis (the AutoBuildSnapshot recipe). */
export function scrollContentRect(scroll: 'vertical' | 'horizontal' | 'both', c: { w: number; h: number }): {
  anchorMin: { x: number; y: number }
  anchorMax: { x: number; y: number }
  offsetMin: { x: number; y: number }
  offsetMax: { x: number; y: number }
} {
  if (scroll === 'vertical') return { anchorMin: { x: 0, y: 1 }, anchorMax: { x: 1, y: 1 }, offsetMin: { x: 0, y: -c.h }, offsetMax: { x: 0, y: 0 } }
  if (scroll === 'horizontal') return { anchorMin: { x: 0, y: 0 }, anchorMax: { x: 0, y: 1 }, offsetMin: { x: 0, y: 0 }, offsetMax: { x: c.w, y: 0 } }
  return { anchorMin: { x: 0, y: 1 }, anchorMax: { x: 0, y: 1 }, offsetMin: { x: 0, y: -c.h }, offsetMax: { x: c.w, y: 0 } }
}

/** The slot rect for child `i`, as top-left-anchored offsets (CUI y-up: top edge is negative-down). */
export function layoutSlot(l: ContainerLayout, i: number): { offsetMin: { x: number; y: number }; offsetMax: { x: number; y: number } } {
  const per = Math.max(1, Math.floor(l.itemsPerLine))
  const line = Math.floor(i / per)
  const inLine = i % per
  const col = l.direction === 'vertical' ? inLine : line
  const row = l.direction === 'vertical' ? line : inLine
  const x0 = l.padding + col * (l.itemWidth + l.gapX)
  const yTop = -(l.padding + row * (l.itemHeight + l.gapY))
  return { offsetMin: { x: x0, y: yTop - l.itemHeight }, offsetMax: { x: x0 + l.itemWidth, y: yTop } }
}

/** A container renders nothing — it groups children through its RectTransform alone. `layout`, when
 *  set, auto-arranges those children (editor concept only; see {@link ContainerLayout}). */
export interface ContainerProps {
  layout?: ContainerLayout | null
}

export interface ContainerElement extends BaseElement {
  type: 'container'
  props: ContainerProps
}

/** The active scroll config once codegen's annotateScroll injected the content size, else null. */
function scrollOf(el: ContainerElement): { axis: 'vertical' | 'horizontal' | 'both'; content: { w: number; h: number } } | null {
  const l = el.props.layout
  return l?.scroll && l.content ? { axis: l.scroll, content: l.content } : null
}

function oxide(el: ContainerElement, ctx: EmitContext): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  const scroll = scrollOf(el)
  const scrollLines = scroll
    ? (() => {
        const r = scrollContentRect(scroll.axis, scroll.content)
        return [
          '        new CuiScrollViewComponent',
          '        {',
          `            Vertical = ${scroll.axis !== 'horizontal'},`,
          `            Horizontal = ${scroll.axis !== 'vertical'},`,
          '            MovementType = ScrollRect.MovementType.Clamped,',
          '            ContentTransform = new CuiRectTransform',
          '            {',
          `                AnchorMin = "${anchorPair(r.anchorMin)}",`,
          `                AnchorMax = "${anchorPair(r.anchorMax)}",`,
          `                OffsetMin = "${offsetPair(r.offsetMin)}",`,
          `                OffsetMax = "${offsetPair(r.offsetMax)}"`,
          '            },',
          ...(scroll.axis !== 'horizontal' ? ['            VerticalScrollbar = new CuiScrollbar { AutoHide = true, Size = 12 },'] : []),
          ...(scroll.axis !== 'vertical' ? ['            HorizontalScrollbar = new CuiScrollbar { AutoHide = true, Size = 12 },'] : []),
          '        },',
        ]
      })()
    : []
  return [
    'container.Add(new CuiElement',
    '{',
    `    Name = "${name}",`,
    `    Parent = "${parent}",`,
    '    Components =',
    '    {',
    ...scrollLines,
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
  const scroll = scrollOf(el)
  if (scroll) {
    const r = scrollContentRect(scroll.axis, scroll.content)
    const contentPos = luiPos(r.anchorMin, r.anchorMax)
    const contentOff = luiOff(r.offsetMin, r.offsetMax)
    const bar = 'new LuiScrollbar { autoHide = true, size = 12 }'
    const bars = [
      ...(scroll.axis !== 'horizontal' ? [`verticalScrollOptions: ${bar}`] : []),
      ...(scroll.axis !== 'vertical' ? [`horizontalScrollOptions: ${bar}`] : []),
    ].join(', ')
    return [
      `cui.v2.CreateScrollView("${esc(parentRef(el, ctx))}", ${posExpr(el)}, ${offExpr(el)},`,
      `    ${scroll.axis !== 'horizontal'}, ${scroll.axis !== 'vertical'}, ${bars}, name: "${esc(nameRef(el, ctx))}")`,
      `    .SetScrollContent(${contentPos}, ${contentOff});`,
      '',
    ]
  }
  // CreateEmptyContainer takes no position (chain SetAnchorAndOffset) and — unlike every other
  // Create* — does NOT add itself to the build unless `add: true` is passed (LUI.cs: `if (add)
  // elements.Add(cont)`; the no-add form is a handle for referencing EXISTING panels). Omitting it
  // silently drops the container and everything parented inside from the payload.
  return [
    `cui.v2.CreateEmptyContainer("${esc(parentRef(el, ctx))}", "${esc(nameRef(el, ctx))}", true)`,
    `    .SetAnchorAndOffset(${posExpr(el)}, ${offExpr(el)});`,
    '',
  ]
}

function adduiComponents(el: ContainerElement): CuiComponent[] {
  const scroll = scrollOf(el)
  if (!scroll) return [] // rect-only: codegen appends the RectTransform, no primary component
  const r = scrollContentRect(scroll.axis, scroll.content)
  return [
    {
      type: 'UnityEngine.UI.ScrollView',
      vertical: scroll.axis !== 'horizontal',
      horizontal: scroll.axis !== 'vertical',
      movementType: 'Clamped',
      contentTransform: {
        anchormin: anchorPair(r.anchorMin),
        anchormax: anchorPair(r.anchorMax),
        offsetmin: offsetPair(r.offsetMin),
        offsetmax: offsetPair(r.offsetMax),
      },
      ...(scroll.axis !== 'horizontal' ? { verticalScrollbar: { autoHide: true, size: 12 } } : {}),
      ...(scroll.axis !== 'vertical' ? { horizontalScrollbar: { autoHide: true, size: 12 } } : {}),
    },
  ]
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
    return { ...el.props, ...(el.props.layout ? { layout: { ...el.props.layout } } : {}) }
  },
  oxide,
  carbon,
  adduiComponents,
  // A scroll view keeps client state (the scroll position) — recreate rather than patch in place.
  dynamicWireComponents: ['UnityEngine.UI.ScrollView'],
}
