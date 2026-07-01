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
//
// Per-element emit lives in elements/<type>.ts (the registry); this file owns the shared machinery
// the emitters depend on — naming, parent-before-child ordering, border expansion, data-source field
// emission — and dispatches to `definitionOf(el).oxide/carbon/adduiComponents` rather than branching
// on `el.type`. Adding an element type does not change this file.

import { anchorPair, esc, nameRef, offsetPair, parentRef } from './elements/emit'
import type { EmitContext } from './elements/emit'
import { adduiModifierComponents, carbonModifierChain, oxideModifierLines } from './elements/modifiers'
import { definitionOf } from './elements/registry'
import { CLIENT_PANELS, resolveText, TEXT_ALIGNS, TEXT_FONTS } from './types'
import type { ClientPanel, ClientPanelDef, ColorRGBA, CuiElement, DataSource, DesignerElement, ImageFill, PanelElement, Provider, TextAlign, TextFont, Vec2 } from './types'

// --- data-source fields --------------------------------------------------------------
//
// In the CODE outputs (Class / UX / Selected) a bound prop becomes a *reference* to a field holding
// the data-source value, with the field declared up top: a class member in the Class output
// (`private string Title = "...";`), or a local at the head of the snippet in UX / Selected
// (`string Title = "...";`). The JSON / live-preview path instead inlines the literal value
// (`resolveBindings` below), since the AddUi wire format has no place for a C# field. Only text
// sources are emitted today; `list` is reserved for the repeat/template work.

/** The data-source state an EmitContext needs — a structural subset for the field-decl helpers. */
type FieldCtx = Pick<EmitContext, 'sources' | 'fields'>

/**
 * Sanitise a data-source name into a valid C# identifier: each run of invalid chars becomes a single
 * `_` (so "Data 1" → "Data_1", not "Data1"); empty/leading-digit gets an `_` prefix.
 */
function sanitizeIdent(name: string): string {
  let s = name.replace(/[^A-Za-z0-9_]+/g, '_')
  if (!s || s === '_') return 'Field'
  if (/^[0-9]/.test(s)) s = `_${s}`
  return s
}

/** Map each TEXT data source to a unique C# field identifier (collision-suffixed). */
function fieldNames(sources: DataSource[]): Map<string, string> {
  const used = new Set<string>()
  const map = new Map<string, string>()
  for (const ds of sources) {
    if (ds.kind !== 'text') continue
    const base = sanitizeIdent(ds.name)
    let name = base
    let i = 2
    while (used.has(name)) name = `${base}${i++}`
    used.add(name)
    map.set(ds.id, name)
  }
  return map
}

/** Ids of data sources actually referenced by the given elements' bindings. */
function usedSourceIds(elements: DesignerElement[]): Set<string> {
  const s = new Set<string>()
  for (const el of elements) if (el.bindings) for (const id of Object.values(el.bindings)) s.add(id)
  return s
}

/**
 * Declaration lines for every text source in `usedIds`. `style:'field'` => class members
 * (`private string X = "v";`); `style:'local'` => snippet-local vars (`string X = "v";`).
 */
function genFieldDecls(ctx: FieldCtx, usedIds: Set<string>, style: 'field' | 'local'): string[] {
  const lines: string[] = []
  for (const ds of ctx.sources) {
    if (ds.kind !== 'text' || !usedIds.has(ds.id)) continue
    const ident = ctx.fields.get(ds.id)
    if (!ident) continue
    lines.push(`${style === 'field' ? 'private string ' : 'string '}${ident} = "${esc(ds.value)}";`)
  }
  return lines
}

/**
 * Inline-resolve every bound prop to its data-source value — the JSON / live-preview strategy (the
 * AddUi wire format has no field concept). Only bound elements are cloned; an unbound layout passes
 * through unchanged, so JSON for layouts with no data sources is byte-identical. (The code outputs use
 * a field reference instead, via `textExpr`.) Reserved for later: expanding `repeat` templates.
 */
function resolveBindings(elements: DesignerElement[], dataSources: DataSource[]): DesignerElement[] {
  if (!dataSources.length) return elements
  let changed = false
  const out = elements.map((el) => {
    if (el.type === 'text' && el.bindings?.text) {
      const value = resolveText(el, dataSources)
      if (value !== el.props.text) {
        changed = true
        return { ...el, props: { ...el.props, text: value } }
      }
    }
    return el
  })
  return changed ? out : elements
}

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

function genOxide(elements: DesignerElement[], ctx: EmitContext): string {
  // Oxide has no CreateParent equivalent — root elements parent to the layer string directly.
  const out: string[] = ['var container = new CuiElementContainer();', '']
  for (const el of elements) {
    out.push(...definitionOf(el).oxide(el, ctx))
    out.push(...oxideModifierLines(el, nameRef(el, ctx))) // cursor/keyboard as standalone child elements
  }
  out.push('CuiHelper.AddUi(player, container);')
  return out.join('\n')
}

/** Splice a Carbon fluent modifier chain (`.AddCursor()…`) before the `;` of an element's Create call. */
function withCarbonChain(lines: string[], chain: string): string[] {
  if (!chain) return lines
  const out = [...lines]
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].endsWith(';')) {
      out[i] = `${out[i].slice(0, -1)}${chain};`
      break
    }
  }
  return out
}

// --- Carbon LUI ----------------------------------------------------------------------

function genCarbon(elements: DesignerElement[], names: Map<string, string>, layer: ClientPanelDef, base: FieldCtx): string {
  // Carbon attaches to a client panel via CreateParent; root elements then nest under it.
  const root = rootContainerName(names)
  const ctx: EmitContext = { names, rootParent: root, sources: base.sources, fields: base.fields }
  const out: string[] = [
    'using CUI cui = new CUI(CuiHandler);',
    '',
    `cui.v2.CreateParent(CUI.ClientPanels.${layer.carbon}, LuiPosition.Full, "${esc(root)}");`,
    '',
  ]
  for (const el of elements) out.push(...withCarbonChain(definitionOf(el).carbon(el, ctx), carbonModifierChain(el)))
  out.push('cui.v2.SendUi(player);')
  return out.join('\n')
}

// --- AddUi JSON (live preview, issue #3) ---------------------------------------------

/**
 * Build one CUI element as the wire `CuiElement` that `CuiHelper.AddUi` consumes. Same parent
 * resolution and anchor/offset formatting as the code emit, but the deserializer's JSON shape: the
 * element's primary component(s) (from its definition) plus a RectTransform. No string escaping here —
 * JSON.stringify handles that at send time. Bindings are pre-resolved by the caller, so primary
 * components read literal values.
 */
function adduiElement(el: DesignerElement, ctx: EmitContext): CuiElement {
  const rect = {
    type: 'RectTransform' as const,
    anchormin: anchorPair(el.anchorMin),
    anchormax: anchorPair(el.anchorMax),
    offsetmin: offsetPair(el.offsetMin),
    offsetmax: offsetPair(el.offsetMax),
  }
  return {
    name: nameRef(el, ctx),
    parent: parentRef(el, ctx),
    components: [...definitionOf(el).adduiComponents(el, ctx), ...adduiModifierComponents(el), rect],
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
  opts: { rootParent?: string; dataSources?: DataSource[] } = {},
): CuiElement[] {
  if (!elements.length) return []
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  const rootParent = opts.rootParent ?? layer.oxide
  const expanded = expandBorders(resolveBindings(elements, opts.dataSources ?? []))
  const names = buildNames(expanded)
  const ordered = treeOrder(expanded)
  // JSON inlines bound values (resolveBindings above) — no fields needed in the wire format.
  const ctx: EmitContext = { names, rootParent, sources: [], fields: new Map() }
  return ordered.map((el) => adduiElement(el, ctx))
}

// --- public --------------------------------------------------------------------------

/**
 * Generate C# source for the given elements, targeting the chosen provider + root layer. A bound prop
 * emits a field reference; the field declarations are prepended as snippet-local vars
 * (`declStyle:'local'`, the default for a standalone UX snippet) or omitted (`declStyle:'none'`, used
 * when this is the body of a full class — there the class declares them as members instead).
 */
export function generateCode(
  elements: DesignerElement[],
  provider: Provider,
  rootLayer: ClientPanel = 'Overlay',
  dataSources: DataSource[] = [],
  opts: { declStyle?: 'local' | 'none' } = {},
): string {
  if (!elements.length) return '// Add an element to generate code.'
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  // Bordered panels expand into edge subpanels; names are built from this order (stable collision
  // suffixes); emission is parent-first. Bound props reference fields via the EmitContext.
  const expanded = expandBorders(elements)
  const names = buildNames(expanded)
  const ordered = treeOrder(expanded)
  const fieldCtx: FieldCtx = { sources: dataSources, fields: fieldNames(dataSources) }
  // Declarations for the sources this snippet actually uses, emitted once at the very top (for `both`,
  // before the #if — they are plain C# valid under either framework).
  const decls = (opts.declStyle ?? 'local') === 'local' ? genFieldDecls(fieldCtx, usedSourceIds(ordered), 'local') : []
  const head = decls.length ? [...decls, ''] : []
  const oxide = () => genOxide(ordered, { names, rootParent: layer.oxide, sources: dataSources, fields: fieldCtx.fields })
  const carbon = () => genCarbon(ordered, names, layer, fieldCtx)
  if (provider === 'oxide') return [...head, oxide()].join('\n')
  if (provider === 'carbon') return [...head, carbon()].join('\n')
  // both: Carbon compiles with the CARBON symbol defined; Oxide does not.
  return [...head, '#if CARBON', carbon(), '#else', oxide(), '#endif'].join('\n')
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
/** Distinct console-command names captured by button elements — the first token of each command
 *  string (anything after it is treated as arguments, so several buttons can share one handler). */
function buttonCommandNames(elements: DesignerElement[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const el of elements) {
    if (el.type !== 'button') continue
    const name = el.props.command.trim().split(/\s+/)[0]
    if (name && !seen.has(name)) {
      seen.add(name)
      names.push(name)
    }
  }
  return names
}

/** PascalCase C# handler name from a console command, e.g. `ui.close` -> `UiCloseCommand`. */
function commandMethodName(cmd: string): string {
  const pascal = cmd
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  return `${pascal || 'Button'}Command`
}

/** A `[ConsoleCommand]` handler stub per distinct button command — valid under both frameworks
 *  (Carbon is Oxide-command compatible), so no `#if` split is needed. Empty when no button binds one. */
function commandStubs(elements: DesignerElement[]): string[] {
  const names = buttonCommandNames(elements)
  return names.flatMap((cmd, i) => [
    ...(i > 0 ? [''] : []), // blank line between successive stubs
    `    [ConsoleCommand("${esc(cmd)}")]`,
    `    private void ${commandMethodName(cmd)}(ConsoleSystem.Arg arg)`,
    '    {',
    '        var player = arg.Player();',
    '        if (player == null) return;',
    `        // TODO: handle the "${esc(cmd)}" button`,
    '    }',
  ])
}

/** Distinct image-DB fills used by panels (deduped by name) — the images the plugin must preload. */
function imagedbFills(elements: DesignerElement[]): { dbName: string; url: string }[] {
  const seen = new Set<string>()
  const out: { dbName: string; url: string }[] = []
  for (const el of elements) {
    if (el.type !== 'panel' || el.props.image?.kind !== 'imagedb') continue
    const { dbName, url } = el.props.image
    if (dbName && !seen.has(dbName)) {
      seen.add(dbName)
      out.push({ dbName, url })
    }
  }
  return out
}

/** Carbon lifecycle that queues each image-DB fill into the ImageDatabaseModule on load. */
function carbonPreload(imgs: { dbName: string; url: string }[]): string[] {
  return [
    '    private void OnServerInitialized()',
    '    {',
    '        var imageDb = BaseModule.GetModule<ImageDatabaseModule>();',
    ...imgs.map((i) => `        imageDb.Queue("${esc(i.dbName)}", "${esc(i.url)}");`),
    '    }',
  ]
}

/** Oxide lifecycle that loads each image-DB fill via the ImageLibrary plugin on load. */
function oxidePreload(imgs: { dbName: string; url: string }[]): string[] {
  return [
    '    [PluginReference] private Plugin ImageLibrary;',
    '',
    '    private void OnServerInitialized()',
    '    {',
    ...imgs.map((i) => `        ImageLibrary?.Call("AddImage", "${esc(i.url)}", "${esc(i.dbName)}", 0UL);`),
    '    }',
  ]
}

/** The preload lifecycle method for the target (empty when no image-DB fills). `both` #if-splits it. */
function preloadLines(imgs: { dbName: string; url: string }[], provider: Provider): string[] {
  if (!imgs.length) return []
  if (provider === 'carbon') return carbonPreload(imgs)
  if (provider === 'oxide') return oxidePreload(imgs)
  return ['#if CARBON', ...carbonPreload(imgs), '#else', ...oxidePreload(imgs), '#endif']
}

export function generateFullClass(elements: DesignerElement[], provider: Provider, rootLayer: ClientPanel = 'Overlay', dataSources: DataSource[] = []): string {
  if (!elements.length) return '// Add an element to generate code.'
  // Data sources become `private` class fields (outside the method); the body references them, so the
  // snippet is generated with declStyle:'none' (no in-method locals). Plain C#, valid under either
  // framework, so the field block is emitted once even for `both`.
  const fieldCtx: FieldCtx = { sources: dataSources, fields: fieldNames(dataSources) }
  const fieldLines = genFieldDecls(fieldCtx, usedSourceIds(expandBorders(elements)), 'field')
  const members = fieldLines.length ? [...fieldLines.map((l) => `    ${l}`), ''] : []
  const body = indent(generateCode(elements, provider, rootLayer, dataSources, { declStyle: 'none' }), 8)
  const info = '[Info("Test Plugin", "hizen", "0.0.1")]'
  const desc = '[Description("Generated by the Carbon Layout Designer")]'
  const method = ['    [ChatCommand("test")]', '    private void TestCommand(BasePlayer player, string command, string[] args)', '    {', body, '    }']
  // Image-DB fills need a preload lifecycle; buttons that capture a command get a handler stub. Both go
  // after the builder method, each section separated by a blank line.
  const imgs = imagedbFills(elements)
  const sections = [method, preloadLines(imgs, provider), commandStubs(elements)].filter((s) => s.length)
  const methods = sections.flatMap((s, i) => (i === 0 ? s : ['', ...s]))
  if (provider === 'both') {
    return [
      '#if CARBON',
      'using Carbon.Components;',
      'using static Carbon.Components.CUI;',
      ...(imgs.length ? ['using Carbon.Modules;'] : []),
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
      ...members,
      ...methods,
      '}',
    ].join('\n')
  }
  const carbon = provider === 'carbon'
  return [
    carbon ? 'using Carbon.Components;' : 'using Oxide.Game.Rust.Cui;',
    carbon ? 'using static Carbon.Components.CUI;' : 'using Oxide.Plugins;',
    ...(carbon && imgs.length ? ['using Carbon.Modules;'] : []), // ImageDatabaseModule / BaseModule
    '',
    carbon ? 'namespace Carbon.Plugins;' : 'namespace Oxide.Plugins;',
    '',
    info,
    desc,
    `public class TestPlugin : ${carbon ? 'CarbonPlugin' : 'RustPlugin'}`,
    '{',
    ...members,
    ...methods,
    '}',
  ].join('\n')
}

/** The CUI `CuiElement[]` (the `CuiHelper.ToJson()` / AddUi wire format) as pretty JSON. */
export function generateJson(elements: DesignerElement[], rootLayer: ClientPanel = 'Overlay', dataSources: DataSource[] = []): string {
  const arr = generateAddUiJson(elements, rootLayer, { dataSources })
  if (!arr.length) return '// Add an element to generate JSON.'
  return JSON.stringify(arr, null, 2)
}

/**
 * Emit just the chosen element(s) — no container/AddUi boilerplate. Names are still resolved across
 * the whole tree so parent references stay correct. Handy "what builds this box" view for the
 * selected element. `both` #if-splits like the full snippet.
 */
export function generateSelected(elements: DesignerElement[], selectedIds: string[], provider: Provider, rootLayer: ClientPanel = 'Overlay', dataSources: DataSource[] = []): string {
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
  // Bound props reference fields; declare the locals the chosen elements use, once at the top.
  const fields = fieldNames(dataSources)
  const decls = genFieldDecls({ sources: dataSources, fields }, usedSourceIds(chosen), 'local')
  const head = decls.length ? [...decls, ''] : []
  const oxideCtx: EmitContext = { names, rootParent: layer.oxide, sources: dataSources, fields }
  const carbonCtx: EmitContext = { names, rootParent: root, sources: dataSources, fields }
  const oxide = () => chosen.flatMap((el) => definitionOf(el).oxide(el, oxideCtx)).join('\n').trimEnd()
  const carbon = () => chosen.flatMap((el) => definitionOf(el).carbon(el, carbonCtx)).join('\n').trimEnd()
  if (provider === 'oxide') return [...head, oxide()].join('\n')
  if (provider === 'carbon') return [...head, carbon()].join('\n')
  return [...head, '#if CARBON', carbon(), '#else', oxide(), '#endif'].join('\n')
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

    const btn = comps.find((c) => c.type === 'UnityEngine.UI.Button')
    const text = comps.find((c) => c.type === 'UnityEngine.UI.Text')
    const rawImg = comps.find((c) => c.type === 'UnityEngine.UI.RawImage')
    const img = comps.find((c) => c.type === 'UnityEngine.UI.Image')
    if (btn) {
      // A button node carries the command + color; any bundled label is dropped (we model labels as
      // child Text elements). Checked first so a CuiButton's own image doesn't read as a plain panel.
      elements.push({
        ...base,
        type: 'button',
        props: { color: parseColor(btn.color, { r: 1, g: 1, b: 1, a: 1 }), command: typeof btn.command === 'string' ? btn.command : '', isProtected: true },
      })
    } else if (text) {
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
    } else if (img) {
      // A plain Image may carry a non-color source (sprite / stored png / item icon); else color-only.
      let image: ImageFill | null = null
      if (typeof img.sprite === 'string' && img.sprite) image = { kind: 'sprite', sprite: img.sprite }
      else if (typeof img.png === 'string' && img.png) image = { kind: 'png', png: img.png }
      else if (img.itemid !== undefined) image = { kind: 'itemicon', itemId: Number(img.itemid) || 0, skinId: Number(img.skinid) || 0 }
      elements.push({ ...base, type: 'panel', props: { color: parseColor(img.color, { r: 1, g: 1, b: 1, a: 1 }), image } })
    } else {
      // No graphic component — a RectTransform-only node is an empty container / section.
      elements.push({ ...base, type: 'container', props: {} })
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
