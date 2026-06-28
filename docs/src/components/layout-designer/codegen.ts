// Code generation for the Layout Designer.
//
// Pure functions that turn the captured element tree into copy-paste-ready C#:
//   - Oxide  → CommunityEntity CUI (CuiElementContainer + CuiPanel + CuiHelper.AddUi)
//   - Carbon → LUI v2 fluent API (cui.v2.CreatePanel + cui.v2.SendUi)
//   - Both   → one file guarded by #if CARBON / #else so it compiles on either framework
//
// The designer stores everything in CUI-native convention already (anchors 0..1, offsets in
// reference px, +y up, color channels 0..1), so generation is a straight formatting pass — no
// coordinate math here. Keep it that way: geometry lives in geometry.ts.

import { cuiColorString, round } from './geometry'
import { CLIENT_PANELS, DEFAULT_TEXT_FONT, fontDef } from './types'
import type { ClientPanel, ClientPanelDef, CuiComponent, CuiElement, DesignerElement, Provider, Vec2 } from './types'

/** Format a rounded number without a trailing ".0" or a stray "-0". */
function num(v: number, decimals: number): string {
  const r = round(v, decimals)
  return Object.is(r, -0) ? '0' : String(r)
}

/** Escape a value so it is safe inside a C# double-quoted string literal (incl. newlines/tabs). */
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/** Integer for emitted C# (font sizes are whole px). */
const intStr = (v: number) => String(Math.max(1, Math.round(v)))

/** Same clamp as intStr, but as a number (AddUi JSON wants a numeric fontSize, not a string). */
const intNum = (v: number) => Math.max(1, Math.round(v))

// Anchors are fractions (need precision); offsets are reference px (usually whole, grid-snapped).
const anchorPair = (v: Vec2) => `${num(v.x, 4)} ${num(v.y, 4)}`
const offsetPair = (v: Vec2) => `${num(v.x, 2)} ${num(v.y, 2)}`
// LUI takes float args; 0.5 is a `double` literal in C# and won't implicitly narrow, so suffix `f`.
const lf = (v: number, decimals: number) => `${num(v, decimals)}f`

/**
 * Assign each element a stable, unique UI name. The element's display name is used verbatim
 * where possible (it doubles as the CUI/LUI element id and as the parent reference), with a
 * numeric suffix appended on collision so child→parent links stay unambiguous.
 */
function buildNames(elements: DesignerElement[]): Map<string, string> {
  const used = new Set<string>()
  const map = new Map<string, string>()
  for (const el of elements) {
    const base = (el.name || el.type || 'Element').trim() || 'Element'
    let name = base
    let i = 2
    while (used.has(name)) name = `${base} (${i++})`
    used.add(name)
    map.set(el.id, name)
  }
  return map
}

/** Resolve an element's parent: a named sibling, else the supplied root parent. */
function parentName(el: DesignerElement, names: Map<string, string>, rootParent: string): string {
  return el.parentId ? names.get(el.parentId) ?? rootParent : rootParent
}

/**
 * Emit order = parent-before-child (pre-order DFS), preserving sibling array order. CUI/LUI require
 * a parent to exist before a child attaches, but the element array can be non-topological after a
 * tree drag-reorder / bring-to-front (those move a node without its subtree). Ordering here makes
 * generation robust regardless of array order; sibling order (z-order) is kept via childrenByParent.
 */
function treeOrder(elements: DesignerElement[]): DesignerElement[] {
  const childrenByParent = new Map<string | null, DesignerElement[]>()
  for (const el of elements) {
    const arr = childrenByParent.get(el.parentId)
    if (arr) arr.push(el)
    else childrenByParent.set(el.parentId, [el])
  }
  const ordered: DesignerElement[] = []
  const seen = new Set<string>()
  const visit = (parentId: string | null) => {
    for (const el of childrenByParent.get(parentId) ?? []) {
      if (seen.has(el.id)) continue
      seen.add(el.id)
      ordered.push(el)
      visit(el.id)
    }
  }
  visit(null)
  // orphans (parentId points at a missing element) — keep them rather than silently drop
  for (const el of elements) if (!seen.has(el.id)) ordered.push(el)
  return ordered
}

/** A container name not already taken by an element (for Carbon's CreateParent root). */
function rootContainerName(names: Map<string, string>): string {
  const taken = new Set(names.values())
  let name = 'Container'
  let i = 2
  while (taken.has(name)) name = `Container (${i++})`
  return name
}

// --- Oxide CUI -----------------------------------------------------------------------

/** Emit a single Oxide element. Text → CuiLabel; URL fills → raw-image CuiElement; else CuiPanel. */
function oxideElement(el: DesignerElement, names: Map<string, string>, layer: ClientPanelDef): string[] {
  const parent = esc(parentName(el, names, layer.oxide))
  const name = esc(names.get(el.id)!)
  if (el.type === 'text') {
    const t = el.props
    // CuiLabel bundles a CuiTextComponent (Text) + RectTransform. Font is the same Rust client asset
    // Carbon's FontTypes maps to, emitted as the filename here.
    return [
      'container.Add(new CuiLabel',
      '{',
      '    Text =',
      '    {',
      `        Text = "${esc(t.text)}",`,
      `        FontSize = ${intStr(t.fontSize)},`,
      `        Font = "${fontDef(t.font).oxide}",`,
      `        Align = TextAnchor.${t.align},`,
      `        Color = "${cuiColorString(t.color)}"`,
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
  if (el.props.image?.kind === 'url') {
    // Raw/URL images use CuiRawImageComponent (the panel's Color becomes the image tint).
    return [
      'container.Add(new CuiElement',
      '{',
      `    Name = "${name}",`,
      `    Parent = "${parent}",`,
      '    Components =',
      '    {',
      `        new CuiRawImageComponent { Url = "${esc(el.props.image.url)}", Color = "${cuiColorString(el.props.color)}" },`,
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
    `    Image = { Color = "${cuiColorString(el.props.color)}" },`,
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

function genOxide(elements: DesignerElement[], names: Map<string, string>, layer: ClientPanelDef): string {
  // Oxide has no CreateParent equivalent — root elements parent to the layer string directly.
  const out: string[] = ['var container = new CuiElementContainer();', '']
  for (const el of elements) out.push(...oxideElement(el, names, layer))
  out.push('CuiHelper.AddUi(player, container);')
  return out.join('\n')
}

// --- Carbon LUI ----------------------------------------------------------------------

function genCarbon(elements: DesignerElement[], names: Map<string, string>, layer: ClientPanelDef): string {
  // Carbon attaches to a client panel via CreateParent; root elements then nest under it.
  const root = rootContainerName(names)
  const out: string[] = [
    'using CUI cui = new CUI(CuiHandler);',
    '',
    `cui.v2.CreateParent(CUI.ClientPanels.${layer.carbon}, LuiPosition.Full, "${esc(root)}");`,
    '',
  ]
  for (const el of elements) out.push(...carbonElement(el, names, root))
  out.push('cui.v2.SendUi(player);')
  return out.join('\n')
}

/** Emit a single Carbon LUI element. Text → CreateText; URL fills → CreateUrlImage; else CreatePanel. */
function carbonElement(el: DesignerElement, names: Map<string, string>, root: string): string[] {
  const parent = esc(parentName(el, names, root))
  const name = esc(names.get(el.id)!)
  const pos = `new LuiPosition(${lf(el.anchorMin.x, 4)}, ${lf(el.anchorMin.y, 4)}, ${lf(el.anchorMax.x, 4)}, ${lf(el.anchorMax.y, 4)})`
  const off = `new LuiOffset(${lf(el.offsetMin.x, 2)}, ${lf(el.offsetMin.y, 2)}, ${lf(el.offsetMax.x, 2)}, ${lf(el.offsetMax.y, 2)})`
  if (el.type === 'text') {
    const t = el.props
    // CreateText(parent, pos, offset, fontSize, color, text, alignment, name). Font isn't a param —
    // LUI defaults to robotocondensed-regular; a non-default font is set by chaining .SetTextFont
    // (the FontTypes member resolves to the same file Oxide's Font string points at).
    const head = [
      `cui.v2.CreateText("${parent}",`,
      `    ${pos},`,
      `    ${off},`,
      `    ${intStr(t.fontSize)}, "${cuiColorString(t.color)}", "${esc(t.text)}", TextAnchor.${t.align}, "${name}")`,
    ]
    if ((t.font ?? DEFAULT_TEXT_FONT) === DEFAULT_TEXT_FONT) {
      head[head.length - 1] += ';'
      return [...head, '']
    }
    return [...head, `    .SetTextFont(CUI.Handler.FontTypes.${fontDef(t.font).id});`, '']
  }
  const color = cuiColorString(el.props.color)
  if (el.props.image?.kind === 'url') {
    // CreateUrlImage(parent, pos, offset, url, color/tint, name).
    return [`cui.v2.CreateUrlImage("${parent}",`, `    ${pos},`, `    ${off},`, `    "${esc(el.props.image.url)}", "${color}", "${name}");`, '']
  }
  return [`cui.v2.CreatePanel("${parent}",`, `    ${pos},`, `    ${off},`, `    "${color}", "${name}");`, '']
}

// --- AddUi JSON (live preview, issue #3) ---------------------------------------------

/**
 * Build one CUI element as the wire `CuiElement` that `CuiHelper.AddUi` consumes. Mirrors
 * `oxideElement` 1:1 (same parent resolution, same anchor/offset/color formatting) but emits the
 * deserializer's JSON shape instead of C# source: a primary component (Image / RawImage / Text)
 * plus a RectTransform. No string escaping here — JSON.stringify handles that at send time.
 */
function adduiElement(el: DesignerElement, names: Map<string, string>, rootParent: string): CuiElement {
  const rect = {
    type: 'RectTransform' as const,
    anchormin: anchorPair(el.anchorMin),
    anchormax: anchorPair(el.anchorMax),
    offsetmin: offsetPair(el.offsetMin),
    offsetmax: offsetPair(el.offsetMax),
  }
  let primary: CuiComponent
  if (el.type === 'text') {
    const t = el.props
    primary = {
      type: 'UnityEngine.UI.Text',
      text: t.text,
      fontSize: intNum(t.fontSize),
      font: fontDef(t.font).oxide,
      align: t.align,
      color: cuiColorString(t.color),
    }
  } else if (el.props.image?.kind === 'url') {
    // Raw/URL image — the panel's color becomes the image tint (matches oxideElement).
    primary = { type: 'UnityEngine.UI.RawImage', url: el.props.image.url, color: cuiColorString(el.props.color) }
  } else {
    primary = { type: 'UnityEngine.UI.Image', color: cuiColorString(el.props.color) }
  }
  return {
    name: names.get(el.id)!,
    parent: parentName(el, names, rootParent),
    components: [primary, rect],
  }
}

/**
 * Generate the live-preview payload: the element tree as a `CuiElement[]` ready for
 * `CuiHelper.AddUi`. Same naming/ordering guarantees as `generateCode` (stable collision-suffixed
 * names, parent-before-child emit order). Root elements parent to the layer's Oxide string, exactly
 * like the Oxide generator. Pass `opts.rootParent` to re-parent the layout's roots somewhere else —
 * the live preview points them at the reserved root `layoutdesigner.preview` so the whole tree can be
 * torn down with one `DestroyUi`. The per-element `update` flag is applied by the caller (the preview
 * transport, which owns the name diff). Returns `[]` for an empty layout (nothing to send).
 */
export function generateAddUiJson(
  elements: DesignerElement[],
  rootLayer: ClientPanel = 'Overlay',
  opts: { rootParent?: string } = {},
): CuiElement[] {
  if (!elements.length) return []
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  const rootParent = opts.rootParent ?? layer.oxide
  const names = buildNames(elements)
  const ordered = treeOrder(elements)
  return ordered.map((el) => adduiElement(el, names, rootParent))
}

// --- public --------------------------------------------------------------------------

/** Generate C# source for the given elements, targeting the chosen provider + root layer. */
export function generateCode(elements: DesignerElement[], provider: Provider, rootLayer: ClientPanel = 'Overlay'): string {
  if (!elements.length) return '// Add an element to generate code.'
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  // Names are built from the original order (stable collision suffixes); emission is parent-first.
  const names = buildNames(elements)
  const ordered = treeOrder(elements)
  if (provider === 'oxide') return genOxide(ordered, names, layer)
  if (provider === 'carbon') return genCarbon(ordered, names, layer)
  // both: Carbon compiles with the CARBON symbol defined; Oxide does not.
  return ['#if CARBON', genCarbon(ordered, names, layer), '#else', genOxide(ordered, names, layer), '#endif'].join('\n')
}
