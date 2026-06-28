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
import { CLIENT_PANELS, DEFAULT_TEXT_FONT, fontDef, TEXT_ALIGNS, TEXT_FONTS } from './types'
import type { ClientPanel, ClientPanelDef, ColorRGBA, CuiComponent, CuiElement, DesignerElement, PanelElement, Provider, TextAlign, TextFont, Vec2 } from './types'

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

// --- borders -------------------------------------------------------------------------

/** One edge subpanel of a panel's border (a child of the panel, anchored to the given edge). */
function borderStrip(el: PanelElement, side: string, color: ColorRGBA, anchorMin: Vec2, anchorMax: Vec2, offsetMin: Vec2, offsetMax: Vec2): PanelElement {
  return {
    id: `${el.id}.border-${side}`,
    name: `${el.name}.border-${side}`,
    parentId: el.id,
    anchorMin,
    anchorMax,
    offsetMin,
    offsetMax,
    type: 'panel',
    props: { color: { ...color }, image: null },
  }
}

/**
 * Expand each bordered panel into itself + four edge subpanels (top/bottom span the full width;
 * left/right fill the gap between them, so the corners aren't double-drawn). The strips are CHILDREN
 * of the panel — they ride along with it and only cover the frame, so a translucent panel doesn't
 * mesh with a border color behind it. Appended after all originals so they draw on top. No-op when no
 * panel has a border.
 */
function expandBorders(elements: DesignerElement[]): DesignerElement[] {
  const strips: DesignerElement[] = []
  for (const el of elements) {
    if (el.type !== 'panel' || !el.props.border || el.props.border.width <= 0) continue
    const b = el.props.border.width
    const c = el.props.border.color
    strips.push(
      borderStrip(el, 'top', c, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: -b }, { x: 0, y: 0 }),
      borderStrip(el, 'bottom', c, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: b }),
      borderStrip(el, 'left', c, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: b }, { x: b, y: -b }),
      borderStrip(el, 'right', c, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: -b, y: b }, { x: 0, y: -b }),
    )
  }
  return strips.length ? [...elements, ...strips] : elements
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
  const expanded = expandBorders(elements)
  const names = buildNames(expanded)
  const ordered = treeOrder(expanded)
  return ordered.map((el) => adduiElement(el, names, rootParent))
}

// --- public --------------------------------------------------------------------------

/** Generate C# source for the given elements, targeting the chosen provider + root layer. */
export function generateCode(elements: DesignerElement[], provider: Provider, rootLayer: ClientPanel = 'Overlay'): string {
  if (!elements.length) return '// Add an element to generate code.'
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  // Bordered panels expand into edge subpanels; names are built from this order (stable collision
  // suffixes); emission is parent-first.
  const expanded = expandBorders(elements)
  const names = buildNames(expanded)
  const ordered = treeOrder(expanded)
  if (provider === 'oxide') return genOxide(ordered, names, layer)
  if (provider === 'carbon') return genCarbon(ordered, names, layer)
  // both: Carbon compiles with the CARBON symbol defined; Oxide does not.
  return ['#if CARBON', genCarbon(ordered, names, layer), '#else', genOxide(ordered, names, layer), '#endif'].join('\n')
}

/** Indent every non-empty line by `spaces` (used to nest the UX snippet inside a method body). */
function indent(code: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return code
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n')
}

/**
 * Wrap the UX snippet in a minimal, compile-ready plugin shell — a `[ChatCommand("test")]` method on
 * a `TestPlugin`. Oxide/Carbon get their own usings/namespace/base class; `both` keeps the whole shell
 * `#if CARBON`-guarded (the UX body is already #if-split). Mirrors the confirmed skeleton.
 */
export function generateFullClass(elements: DesignerElement[], provider: Provider, rootLayer: ClientPanel = 'Overlay'): string {
  if (!elements.length) return '// Add an element to generate code.'
  const body = indent(generateCode(elements, provider, rootLayer), 8)
  const info = '[Info("Test Plugin", "hizen", "0.0.1")]'
  const desc = '[Description("Generated by the Carbon Layout Designer")]'
  const method = ['    [ChatCommand("test")]', '    private void TestCommand(BasePlayer player, string command, string[] args)', '    {', body, '    }']
  if (provider === 'both') {
    return [
      '#if CARBON',
      'using Carbon.Components;',
      'using static Carbon.Components.CUI;',
      '#else',
      'using Oxide.Game.Rust.Cui;',
      'using Oxide.Plugins;',
      '#endif',
      '',
      '#if CARBON',
      'namespace Carbon.Plugins;',
      '#else',
      'namespace Oxide.Plugins;',
      '#endif',
      '',
      info,
      desc,
      'public class TestPlugin :',
      '#if CARBON',
      '    CarbonPlugin',
      '#else',
      '    RustPlugin',
      '#endif',
      '{',
      ...method,
      '}',
    ].join('\n')
  }
  const carbon = provider === 'carbon'
  return [
    carbon ? 'using Carbon.Components;' : 'using Oxide.Game.Rust.Cui;',
    carbon ? 'using static Carbon.Components.CUI;' : 'using Oxide.Plugins;',
    '',
    carbon ? 'namespace Carbon.Plugins;' : 'namespace Oxide.Plugins;',
    '',
    info,
    desc,
    `public class TestPlugin : ${carbon ? 'CarbonPlugin' : 'RustPlugin'}`,
    '{',
    ...method,
    '}',
  ].join('\n')
}

/** The CUI `CuiElement[]` (the `CuiHelper.ToJson()` / AddUi wire format) as pretty JSON. */
export function generateJson(elements: DesignerElement[], rootLayer: ClientPanel = 'Overlay'): string {
  const arr = generateAddUiJson(elements, rootLayer)
  if (!arr.length) return '// Add an element to generate JSON.'
  return JSON.stringify(arr, null, 2)
}

/**
 * Emit just the chosen element(s) — no container/AddUi boilerplate. Names are still resolved across
 * the whole tree so parent references stay correct. Handy "what builds this box" view for the
 * selected element. `both` #if-splits like the full snippet.
 */
export function generateSelected(elements: DesignerElement[], selectedIds: string[], provider: Provider, rootLayer: ClientPanel = 'Overlay'): string {
  const HINT = '// Select an element on the canvas to see its code.'
  if (!selectedIds.length) return HINT
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  const expanded = expandBorders(elements)
  const names = buildNames(expanded)
  const root = rootContainerName(names)
  const sel = new Set(selectedIds)
  // include a selected panel's border subpanels (ids `${selectedId}.border-*`).
  const chosen = treeOrder(expanded).filter((el) => sel.has(el.id) || [...sel].some((s) => el.id.startsWith(`${s}.border-`)))
  if (!chosen.length) return HINT
  const oxide = () => chosen.flatMap((el) => oxideElement(el, names, layer)).join('\n').trimEnd()
  const carbon = () => chosen.flatMap((el) => carbonElement(el, names, root)).join('\n').trimEnd()
  if (provider === 'oxide') return oxide()
  if (provider === 'carbon') return carbon()
  return ['#if CARBON', carbon(), '#else', oxide(), '#endif'].join('\n')
}

// --- Import: CUI JSON -> elements (inverse of generateAddUiJson / the Oxide generator) -----------

/** Parse a "x y" pair into a Vec2, falling back per-axis on missing/non-numeric input. */
function parseVec(s: unknown, fallback: Vec2): Vec2 {
  if (typeof s !== 'string') return { ...fallback }
  const [x, y] = s.trim().split(/\s+/).map(Number)
  return { x: Number.isFinite(x) ? x : fallback.x, y: Number.isFinite(y) ? y : fallback.y }
}

/** Parse a "r g b a" CUI color (alpha optional → 1) into ColorRGBA. */
function parseColor(s: unknown, fallback: ColorRGBA): ColorRGBA {
  if (typeof s !== 'string') return { ...fallback }
  const p = s.trim().split(/\s+/).map(Number)
  const f = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d)
  return { r: f(p[0], fallback.r), g: f(p[1], fallback.g), b: f(p[2], fallback.b), a: f(p[3], 1) }
}

/** Map an Oxide font filename back to a known TextFont id (case-insensitive); undefined → default. */
function fontFromOxide(file: unknown): TextFont | undefined {
  if (typeof file !== 'string') return undefined
  return TEXT_FONTS.find((d) => d.oxide.toLowerCase() === file.toLowerCase())?.id
}

interface ParsedCui {
  elements: DesignerElement[]
  rootLayer: ClientPanel
}

/**
 * Parse a CUI `CuiElementContainer.ToJson()` payload — an array of `{ name, parent, components[] }` —
 * into designer elements. Returns null if the input isn't that shape (so callers can fall back to the
 * designer's own export format). Recognises Image (panel), RawImage with a url (image panel), and Text
 * (text element); a RectTransform supplies the geometry. Parents that name another element become
 * `parentId` links; parents that name a client layer (or anything unknown) become roots, and the most
 * common such layer is inferred as the canvas `rootLayer`.
 */
export function parseCuiJson(data: unknown): ParsedCui | null {
  if (!Array.isArray(data) || !data.length) return null
  if (!data.every((e) => e && typeof e === 'object' && Array.isArray((e as { components?: unknown }).components))) return null
  const arr = data as Array<{ name?: unknown; parent?: unknown; components: Array<Record<string, unknown>> }>

  // Pass 1: assign ids + map names so parent strings can resolve to parentIds.
  const nameToId = new Map<string, string>()
  const recs = arr.map((raw, i) => {
    const id = `el-${i + 1}`
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : `Element ${i + 1}`
    if (!nameToId.has(name)) nameToId.set(name, id)
    return { id, name, raw }
  })

  const layerVotes = new Map<string, number>()
  const elements: DesignerElement[] = []
  for (const { id, name, raw } of recs) {
    const comps = raw.components
    const rect = comps.find((c) => c.type === 'RectTransform')
    const base = {
      id,
      name,
      parentId: null as string | null,
      anchorMin: parseVec(rect?.anchormin, { x: 0, y: 0 }),
      anchorMax: parseVec(rect?.anchormax, { x: 1, y: 1 }),
      offsetMin: parseVec(rect?.offsetmin, { x: 0, y: 0 }),
      offsetMax: parseVec(rect?.offsetmax, { x: 0, y: 0 }),
    }
    const parent = typeof raw.parent === 'string' ? raw.parent : ''
    if (nameToId.has(parent) && nameToId.get(parent) !== id) {
      base.parentId = nameToId.get(parent)!
    } else if (parent) {
      layerVotes.set(parent, (layerVotes.get(parent) ?? 0) + 1) // root parents to a layer string
    }

    const text = comps.find((c) => c.type === 'UnityEngine.UI.Text')
    const rawImg = comps.find((c) => c.type === 'UnityEngine.UI.RawImage')
    const img = comps.find((c) => c.type === 'UnityEngine.UI.Image')
    if (text) {
      const align = text.align as TextAlign
      elements.push({
        ...base,
        type: 'text',
        props: {
          text: typeof text.text === 'string' ? text.text : '',
          fontSize: typeof text.fontSize === 'number' ? text.fontSize : 14,
          align: TEXT_ALIGNS.includes(align) ? align : 'MiddleCenter',
          color: parseColor(text.color, { r: 1, g: 1, b: 1, a: 1 }),
          font: fontFromOxide(text.font),
        },
      })
    } else if (rawImg && typeof rawImg.url === 'string') {
      elements.push({ ...base, type: 'panel', props: { color: parseColor(rawImg.color, { r: 1, g: 1, b: 1, a: 1 }), image: { kind: 'url', url: rawImg.url } } })
    } else {
      elements.push({ ...base, type: 'panel', props: { color: parseColor(img?.color, { r: 1, g: 1, b: 1, a: 1 }), image: null } })
    }
  }

  // Infer the root layer from the most-referenced layer string that matches a known client panel.
  let rootLayer: ClientPanel = 'Overlay'
  let best = 0
  for (const [layerStr, votes] of layerVotes) {
    const match = CLIENT_PANELS.find((p) => p.oxide === layerStr)
    if (match && votes > best) {
      best = votes
      rootLayer = match.id
    }
  }
  return { elements, rootLayer }
}
