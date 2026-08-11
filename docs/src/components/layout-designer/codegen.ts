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
// on `el.type`. Adding an element type only changes this file if it needs new cross-cutting plugin
// scaffolding: the remaining `el.type` branches are panel machinery (border expansion, image-DB
// preloads) and text data-source bindings, plus import recognition in parseCuiJson.

import { countdownDefinition } from './elements/countdown'
import { anchorPair, color as cuiColor, esc, lf, luiOff, nameRef, num, offExpr, offsetPair, parentRef } from './elements/emit'
import type { EmitContext } from './elements/emit'
import { inputDefinition } from './elements/input'
import { adduiModifierComponents, carbonModifierChain, oxideModifierLines } from './elements/modifiers'
import { definitionOf } from './elements/registry'
import { CLOSE_ROOT } from './elements/button'
import type { TabsElement } from './elements/tabs'
import { layoutContentSize, layoutSlot, scrollContentRect } from './elements/container'
import type { ContainerLayout } from './elements/container'
import { applyItemBindings, CLIENT_PANELS, resolveText, TEXT_ALIGNS, TEXT_FONTS } from './types'
import type { ClientPanel, ClientPanelDef, ColorRGBA, CuiElement, DataSource, DesignerElement, ImageFill, ListColumn, ListDataSource, PanelElement, PanelProps, Provider, TextAlign, TextFont, Vec2 } from './types'

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
 *
 * The client layer names (Overlay, Hud, …) are pre-reserved: a CUI element that shares a layer's
 * name shadows it in the client's panel lookup, and once that element is destroyed the name resolves
 * to a dead object — every later AddUi parenting to that layer silently draws nothing until the
 * client reconnects. Such elements get the normal collision suffix instead.
 */
const RESERVED_NAMES = new Set<string>(CLIENT_PANELS.flatMap((p) => [p.id, p.oxide]))

function buildNames(elements: DesignerElement[]): Map<string, string> {
  const used = new Set<string>(RESERVED_NAMES)
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

/**
 * Expand repeating layout containers: a container with a layout + `repeat` stamps its FIRST child
 * subtree once per row of the referenced list source. The original subtree becomes row 0 (its item
 * bindings resolved in place); rows 1..N are clones translated to their layout slots, with ids and
 * names suffixed `.{i}` — deterministic, so the live-preview differ patches items instead of
 * flashing the whole list. Mirrors expandBorders: a pure pre-pass producing synthetic elements;
 * layouts without a repeat pass through unchanged (byte-identical).
 */
/**
 * Append the row index to a template element's command (`kit.claim` -> `kit.claim 0`) so the
 * handler knows which item was clicked. One shared command per button, distinguished by argument —
 * matches the deduped stub, which parses args[0] back into the item index.
 */
function withItemIndexCommand<T extends DesignerElement>(el: T, i: number): T {
  const cmd = (el.props as { command?: string }).command
  if (!cmd) return el
  return { ...el, props: { ...el.props, command: `${cmd} ${i}` } } as T
}

function expandRepeats(elements: DesignerElement[], dataSources: DataSource[]): DesignerElement[] {
  const repeaters = elements.filter((e) => e.type === 'container' && e.props.layout && e.repeat?.source)
  if (!repeaters.length) return elements
  const kidsOf = (pid: string) => elements.filter((e) => e.parentId === pid)
  let out = elements
  for (const cont of repeaters) {
    if (cont.type !== 'container' || !cont.props.layout) continue
    const ds = dataSources.find((d) => d.id === cont.repeat!.source)
    if (ds?.kind !== 'list' || !ds.items.length) continue
    const template = kidsOf(cont.id)[0]
    if (!template) continue
    const subtree: DesignerElement[] = []
    const collect = (el: DesignerElement) => {
      subtree.push(el)
      for (const kid of kidsOf(el.id)) collect(kid)
    }
    collect(template)

    // Row 0: resolve the template's own item bindings + index its commands in place (same array
    // positions, same order).
    const row0 = new Map(subtree.map((el) => [el.id, withItemIndexCommand(applyItemBindings(el, ds.items[0]), 0)]))
    out = out.map((el) => row0.get(el.id) ?? el)

    // Rows 1..N: translated clones. Slots share a size, so a clone is the template shifted by the
    // slot delta (only the subtree ROOT moves; descendants are parent-relative already).
    const l = cont.props.layout
    const slot0 = layoutSlot(l, 0)
    const clones: DesignerElement[] = []
    for (let i = 1; i < ds.items.length; i++) {
      const slot = layoutSlot(l, i)
      const dx = slot.offsetMin.x - slot0.offsetMin.x
      const dy = slot.offsetMin.y - slot0.offsetMin.y
      for (const el of subtree) {
        const bound = withItemIndexCommand(applyItemBindings(el, ds.items[i]), i)
        const isRoot = el.id === template.id
        clones.push({
          ...bound,
          id: `${el.id}.${i}`,
          name: `${el.name}.${i}`,
          parentId: isRoot ? cont.id : `${el.parentId}.${i}`,
          offsetMin: isRoot ? { x: bound.offsetMin.x + dx, y: bound.offsetMin.y + dy } : bound.offsetMin,
          offsetMax: isRoot ? { x: bound.offsetMax.x + dx, y: bound.offsetMax.y + dy } : bound.offsetMax,
        } as DesignerElement)
      }
    }
    out = [...out, ...clones]
  }
  return out
}

/**
 * Inject each scrolling layout container's content size (see layoutContentSize) so its emitters can
 * write the ContentTransform / SetScrollContent without access to the element list: the count is the
 * repeated list's row count, or the static child count otherwise. Pure clone pre-pass like the
 * others; the injected `content` field is transient and never persisted.
 */
function annotateScroll(elements: DesignerElement[], dataSources: DataSource[]): DesignerElement[] {
  let changed = false
  const out = elements.map((el) => {
    if (el.type !== 'container' || !el.props.layout?.scroll) return el
    const ds = el.repeat?.source ? dataSources.find((d) => d.id === el.repeat!.source) : null
    const count = ds?.kind === 'list' ? ds.items.length : elements.filter((e) => e.parentId === el.id).length
    changed = true
    return { ...el, props: { ...el.props, layout: { ...el.props.layout, content: layoutContentSize(el.props.layout, count) } } }
  })
  return changed ? out : elements
}

/**
 * Tab views for the JSON/live-preview path: the ACTIVE page survives, inactive page subtrees are
 * dropped, and tab-switch buttons resolve concretely — command becomes `<command> <page>` and the
 * active page's button takes its active color. Runs FIRST so later passes (scroll annotation,
 * repeat expansion) only see the surviving page.
 */
function expandTabs(elements: DesignerElement[]): DesignerElement[] {
  const views = elements.filter((e) => e.type === 'tabs')
  if (!views.length) return elements
  const kidsOf = (pid: string) => elements.filter((e) => e.parentId === pid)
  const drop = new Set<string>()
  const activeByView = new Map<string, number>()
  for (const tv of views) {
    if (tv.type !== 'tabs') continue
    const pages = kidsOf(tv.id)
    if (!pages.length) continue
    const cur = Math.min(Math.max(tv.props.activeTab, 0), pages.length - 1)
    activeByView.set(tv.id, cur)
    pages.forEach((page, i) => {
      if (i === cur) return
      drop.add(page.id)
      const walk = (el: DesignerElement) => {
        for (const kid of kidsOf(el.id)) {
          drop.add(kid.id)
          walk(kid)
        }
      }
      walk(page)
    })
  }
  const cmdOf = new Map(views.map((v) => [v.id, v.type === 'tabs' ? v.props.command : '']))
  return elements
    .filter((e) => !drop.has(e.id))
    .map((el) => {
      if (el.type !== 'button' || !el.props.tabSwitch) return el
      const { target, page } = el.props.tabSwitch
      if (!cmdOf.has(target)) return el
      const isActive = activeByView.get(target) === page
      return {
        ...el,
        props: {
          ...el.props,
          command: isActive ? '' : `${cmdOf.get(target)} ${page}`,
          color: isActive && el.props.activeColor ? el.props.activeColor : el.props.color,
        },
      }
    })
}

/** The first tab view with pages, plus every page-subtree element id — the Class/UX code path emits
 *  those inside per-page local functions rather than the static pass. (One tab view per layout is
 *  supported in generated code; extra views render their active page statically.) */
function collectTabs(elements: DesignerElement[]): { tabs: TabsElement | null; pages: DesignerElement[]; pageSubtreeIds: Set<string> } {
  const tv = elements.find((e) => e.type === 'tabs')
  if (!tv || tv.type !== 'tabs') return { tabs: null, pages: [], pageSubtreeIds: new Set() }
  const kidsOf = (pid: string) => elements.filter((e) => e.parentId === pid)
  const pages = kidsOf(tv.id)
  const pageSubtreeIds = new Set<string>()
  for (const page of pages) {
    const walk = (el: DesignerElement) => {
      pageSubtreeIds.add(el.id)
      for (const kid of kidsOf(el.id)) walk(kid)
    }
    walk(page)
  }
  return { tabs: tv, pages, pageSubtreeIds }
}

/** For the CODE path: tab-switch buttons get their literal command (`<cmd> <page>`); the
 *  active-color conditional is applied afterwards by tabsColorTransform (needs emitted text). */
function resolveTabCommands(elements: DesignerElement[], tabs: TabsElement | null): DesignerElement[] {
  if (!tabs) return elements
  return elements.map((el) => {
    if (el.type !== 'button' || el.props.tabSwitch?.target !== tabs.id) return el
    // isProtected forced true: the generated handler is [ProtectedCommand] under Carbon, which only
    // hears the protected form (Community.Protect keeps the page-index argument intact).
    return { ...el, props: { ...el.props, command: `${tabs.props.command} ${el.props.tabSwitch.page}`, isProtected: true } }
  })
}

/** Any container that emits a scroll view — gates the extra `using UnityEngine.UI;` in the shell. */
function hasScrollContainers(elements: DesignerElement[]): boolean {
  return elements.some((el) => el.type === 'container' && !!el.props.layout?.scroll)
}

// --- repeat loops (Class/UX emission) --------------------------------------------------------------
//
// The code outputs don't stamp repeat rows concretely (that's the JSON/live-preview strategy — see
// expandRepeats): they declare the item struct + a List<T> field (Class) or an anonymous-typed local
// array (UX snippet — C# forbids type declarations inside a method) from the list source, then emit
// ONE parameterized copy of the template inside a for-loop: names gain an $"….{i}" suffix, bound
// props read `item.<Column>`, and the template root's offsets become col/row arithmetic — the same
// formula as layoutSlot, inlined as C#. The element emitters only produce literals, so the loop body
// is built by emitting sentinel-marked clones and rewriting the sentinels afterwards.

type RepeatLoop = { container: DesignerElement; ds: ListDataSource; subtree: DesignerElement[]; layout: ContainerLayout }

/** Repeating containers with a valid list + template, keyed by container id, plus the ids of every
 *  template-subtree element (the static pass must skip those — they only exist inside the loops). */
function collectRepeatLoops(elements: DesignerElement[], dataSources: DataSource[]): { loops: Map<string, RepeatLoop>; subtreeIds: Set<string> } {
  const loops = new Map<string, RepeatLoop>()
  const subtreeIds = new Set<string>()
  const kidsOf = (pid: string) => elements.filter((e) => e.parentId === pid)
  for (const cont of elements) {
    if (cont.type !== 'container' || !cont.props.layout || !cont.repeat?.source) continue
    const ds = dataSources.find((d) => d.id === cont.repeat.source)
    if (ds?.kind !== 'list' || !ds.items.length) continue
    const template = kidsOf(cont.id)[0]
    if (!template) continue
    const subtree: DesignerElement[] = []
    const collect = (el: DesignerElement) => {
      subtree.push(el)
      for (const kid of kidsOf(el.id)) collect(kid)
    }
    collect(template)
    for (const el of subtree) subtreeIds.add(el.id)
    // collect() is already parent-first; expandBorders appends the strips (children of their panels).
    loops.set(cont.id, { container: cont, ds, subtree: expandBorders(subtree), layout: cont.props.layout })
  }
  return { loops, subtreeIds }
}

// Sentinels the emitters pass through untouched; rewritten into C# expressions afterwards.
const LOOP_NAME_MARK = '\u0001' // appended to every subtree name → $"Name.{i}"
const LOOP_EXPR_OPEN = '\u0002' // wraps a string prop whose quoted literal becomes a bare expression
const LOOP_EXPR_CLOSE = '\u0003'
const LOOP_INT_BASE = 2100000000 // reserved item-id range; each use maps back to `item.<Column>`
const LOOP_IDX_MARK = '\u0004' // command suffix -> $"cmd {i}" (the row-index argument)

function csColumnType(kind: ListColumn['kind']): string {
  return kind === 'itemid' ? 'int' : 'string'
}

/** Unique C# identifiers (list field + item type) per list source, avoiding the text-field idents. */
function listIdents(loops: RepeatLoop[], taken: Iterable<string>): Map<string, { list: string; type: string }> {
  const used = new Set(taken)
  const map = new Map<string, { list: string; type: string }>()
  const claim = (base: string) => {
    const b = sanitizeIdent(base)
    let name = b
    let i = 2
    while (used.has(name)) name = `${b}${i++}`
    used.add(name)
    return name
  }
  for (const { ds } of loops) {
    if (!map.has(ds.id)) map.set(ds.id, { list: claim(ds.name), type: claim(ds.typeName) })
  }
  return map
}

function columnLiteral(col: ListColumn, row: Record<string, string>): string {
  const v = row[col.key] ?? ''
  return col.kind === 'itemid' ? String(Number.parseInt(v, 10) || 0) : `"${esc(v)}"`
}

/** Struct + `List<T>` field declarations (Class) or anonymous-typed local arrays (UX snippet). */
function genListDecls(loops: RepeatLoop[], idents: Map<string, { list: string; type: string }>, style: 'field' | 'local'): string[] {
  const lines: string[] = []
  const done = new Set<string>()
  for (const { ds } of loops) {
    if (done.has(ds.id)) continue
    done.add(ds.id)
    if (lines.length) lines.push('')
    const { list, type } = idents.get(ds.id)!
    const members = (row: Record<string, string>) => ds.columns.map((c) => `${sanitizeIdent(c.key)} = ${columnLiteral(c, row)}`).join(', ')
    if (style === 'field') {
      lines.push(`public struct ${type}`, '{')
      for (const c of ds.columns) lines.push(`    public ${csColumnType(c.kind)} ${sanitizeIdent(c.key)};`)
      lines.push('}', '')
      lines.push(`private List<${type}> ${list} = new()`, '{')
      for (const row of ds.items) lines.push(`    new ${type} { ${members(row)} },`)
      lines.push('};')
    } else {
      lines.push(`var ${list} = new[]`, '{')
      for (const row of ds.items) lines.push(`    new { ${members(row)} },`)
      lines.push('};')
    }
  }
  return lines
}

/** Loop-body clones: swap each item-bound prop for its `item.<Column>` expression sentinel. */
function loopClones(loop: RepeatLoop): { els: DesignerElement[]; intSubs: Map<string, string> } {
  const intSubs = new Map<string, string>()
  let nextInt = LOOP_INT_BASE
  const cols = new Map(loop.ds.columns.map((c) => [c.key, c]))
  const els = loop.subtree.map((el) => {
    const cmd = (el.props as { command?: string }).command
    if (!el.itemBindings && !cmd) return el
    const out = { ...el, props: { ...el.props } } as DesignerElement
    // Commands gain the row-index argument (mirrors withItemIndexCommand in the expanded paths).
    if (cmd) (out.props as { command: string }).command = `${cmd} ${LOOP_IDX_MARK}`
    for (const [path, key] of Object.entries(el.itemBindings ?? {})) {
      const col = cols.get(key)
      if (!col) continue
      const expr = `item.${sanitizeIdent(col.key)}`
      const image = (out.props as PanelProps).image
      if (path === 'text' && 'text' in out.props) {
        ;(out.props as { text: string }).text = `${LOOP_EXPR_OPEN}${expr}${LOOP_EXPR_CLOSE}`
      } else if (path === 'image.url' && image?.kind === 'url') {
        ;(out.props as PanelProps).image = { kind: 'url', url: `${LOOP_EXPR_OPEN}${expr}${LOOP_EXPR_CLOSE}` }
      } else if (path === 'image.itemId' && image?.kind === 'itemicon') {
        const sentinel = nextInt++
        intSubs.set(String(sentinel), expr)
        ;(out.props as PanelProps).image = { ...image, itemId: sentinel }
      }
    }
    return out
  })
  return { els, intSubs }
}

/** Rewrites turning the template root's slot-0 offset literals into col/row (or i) arithmetic. */
function rootOffsetSubs(loop: RepeatLoop, root: DesignerElement, provider: 'oxide' | 'carbon'): { from: string; to: string }[] {
  const l = loop.layout
  const per = Math.max(1, Math.floor(l.itemsPerLine))
  const grid = per > 1
  const pitchX = l.itemWidth + l.gapX
  const pitchY = l.itemHeight + l.gapY
  // Which counter moves each axis — mirrors layoutSlot's col/row derivation.
  const xVar = grid ? 'col' : l.direction === 'horizontal' ? 'i' : null
  const yVar = grid ? 'row' : l.direction === 'vertical' ? 'i' : null
  if (provider === 'carbon') {
    const x = (base: number) => (xVar ? `${lf(base, 2)} + ${xVar} * ${lf(pitchX, 2)}` : lf(base, 2))
    const y = (base: number) => (yVar ? `${lf(base, 2)} - ${yVar} * ${lf(pitchY, 2)}` : lf(base, 2))
    return [
      {
        from: offExpr(root),
        to: `new LuiOffset(${x(root.offsetMin.x)}, ${y(root.offsetMin.y)}, ${x(root.offsetMax.x)}, ${y(root.offsetMax.y)})`,
      },
    ]
  }
  const x = (base: number) => (xVar ? `{${num(base, 2)} + ${xVar} * ${num(pitchX, 2)}}` : num(base, 2))
  const y = (base: number) => (yVar ? `{${num(base, 2)} - ${yVar} * ${num(pitchY, 2)}}` : num(base, 2))
  const pair = (v: Vec2) => `$"${x(v.x)} ${y(v.y)}"`
  return [
    { from: `"${offsetPair(root.offsetMin)}"`, to: pair(root.offsetMin) },
    { from: `"${offsetPair(root.offsetMax)}"`, to: pair(root.offsetMax) },
  ]
}

/**
 * For a repeating SCROLL container, rewrite the content-rect literal (sized from the sample rows by
 * annotateScroll) into a runtime expression over the list's count, so the generated plugin scrolls
 * correctly however many rows the list holds. Only the stacking axis varies with the count; the
 * cross axis is bounded by items-per-line and stays a literal. Same exact-literal philosophy as the
 * loop sentinels: the from-string is the precise text the container emitter produced.
 */
function scrollCountSubs(loop: RepeatLoop, listIdent: string, countProp: 'Count' | 'Length', provider: 'oxide' | 'carbon'): { from: string; to: string } | null {
  const l = loop.layout
  if (!l.scroll || !l.content) return null // content injected by annotateScroll on the annotated pass
  const r = scrollContentRect(l.scroll, l.content)
  const per = Math.max(1, Math.floor(l.itemsPerLine))
  const vertical = l.direction === 'vertical' // stacking axis: vertical -> content height, horizontal -> width
  if (l.scroll === (vertical ? 'horizontal' : 'vertical')) return null // scrolling only the cross axis: literal is fine
  const pitch = vertical ? l.itemHeight + l.gapY : l.itemWidth + l.gapX
  const base = l.padding * 2 - (vertical ? l.gapY : l.gapX)
  const count = `${listIdent}.${countProp}`
  const lines = per > 1 ? `(${count} + ${per - 1}) / ${per}` : count
  if (provider === 'carbon') {
    const extent = `${lf(base, 2)} + ${lines} * ${lf(pitch, 2)}`
    const part = (v: number, replace: boolean, negate: boolean) => (replace ? (negate ? `-(${extent})` : extent) : lf(v, 2))
    return {
      from: luiOff(r.offsetMin, r.offsetMax), // exactly what the container emitter wrote
      to: `new LuiOffset(${part(r.offsetMin.x, false, false)}, ${part(r.offsetMin.y, vertical, true)}, ${part(r.offsetMax.x, !vertical, false)}, ${part(r.offsetMax.y, false, false)})`,
    }
  }
  const extent = `${num(base, 2)} + ${lines} * ${num(pitch, 2)}`
  if (vertical) return { from: `"${offsetPair(r.offsetMin)}"`, to: `$"${num(r.offsetMin.x, 2)} {-(${extent})}"` }
  return { from: `"${offsetPair(r.offsetMax)}"`, to: `$"{${extent}} ${num(r.offsetMax.y, 2)}"` }
}

/** One repeating container's for-loop: the parameterized template emitted once. */
function genLoopLines(
  loop: RepeatLoop,
  names: Map<string, string>,
  ctx: EmitContext,
  provider: 'oxide' | 'carbon',
  listIdent: string,
  countProp: 'Count' | 'Length',
): string[] {
  const { els, intSubs } = loopClones(loop)
  const loopNames = new Map(names)
  for (const el of loop.subtree) loopNames.set(el.id, `${names.get(el.id) ?? el.name}${LOOP_NAME_MARK}`)
  const loopCtx: EmitContext = { ...ctx, names: loopNames }
  const emitOne = (el: DesignerElement): string[] =>
    provider === 'oxide'
      ? [...definitionOf(el).oxide(el, loopCtx), ...oxideModifierLines(el, nameRef(el, loopCtx))]
      : withCarbonChain(definitionOf(el).carbon(el, loopCtx), carbonModifierChain(el))
  // The root's offsets become expressions; it emits first, and the subs' from-strings are its own
  // exact literals, so substituting on the root's lines alone can't touch a coincidental twin.
  let rootLines = emitOne(els[0])
  for (const s of rootOffsetSubs(loop, els[0], provider)) rootLines = rootLines.map((ln) => ln.replace(s.from, s.to))
  let body = [...rootLines, ...els.slice(1).flatMap(emitOne)]
  body = body.map((ln) =>
    ln
      .replace(/"([^"\u0001]*)\u0001([^"]*)"/g, (_m, a: string, b: string) => `$"${a}.{i}${b}"`)
      .replace(/"\u0002([^"\u0003]*)\u0003"/g, '$1')
      .replace(/"([^"\u0004]*)\u0004"/g, (_m, a: string) => `$"${a}{i}"`),
  )
  for (const [sentinel, expr] of intSubs) body = body.map((ln) => ln.split(sentinel).join(expr))
  while (body.length && body[body.length - 1] === '') body.pop()

  const l = loop.layout
  const per = Math.max(1, Math.floor(l.itemsPerLine))
  const locals: string[] = []
  if (els.some((e) => e.itemBindings && Object.keys(e.itemBindings).length)) locals.push(`var item = ${listIdent}[i];`)
  if (per > 1) {
    locals.push(l.direction === 'vertical' ? `int col = i % ${per};` : `int col = i / ${per};`)
    locals.push(l.direction === 'vertical' ? `int row = i / ${per};` : `int row = i % ${per};`)
  }
  return [
    `for (int i = 0; i < ${listIdent}.${countProp}; i++)`,
    '{',
    ...(locals.length ? [...locals.map((x) => `    ${x}`), ''] : []),
    ...body.map((x) => (x ? `    ${x}` : '')),
    '}',
    '',
  ]
}

/**
 * The generated root container's name (Carbon's CreateParent root / the Oxide+JSON wrapper).
 * `preferred` is the layout's configured name — blank/whitespace falls back to "Container" — and
 * the result is uniquified against the element names, the reserved client layer names (a root
 * literally named "Overlay" would shadow the real layer and its DestroyUi would target the layer —
 * see RESERVED_NAMES), and any caller-supplied extra names (the live preview's reserved root, the
 * tab/repeat-expanded name set on the wire-format paths).
 */
function rootContainerName(names: Map<string, string>, preferred?: string, alsoTaken?: Iterable<string>): string {
  const taken = new Set<string>([...RESERVED_NAMES, ...names.values(), ...(alsoTaken ?? [])])
  const base = (preferred ?? '').trim() || 'Container'
  let name = base
  let i = 2
  while (taken.has(name)) name = `${base} (${i++})`
  return name
}

// --- Oxide CUI -----------------------------------------------------------------------

function genOxide(
  elements: DesignerElement[],
  ctx: EmitContext,
  rootDecl: { name: string; layer: string },
  emitAfter?: (el: DesignerElement, ctx: EmitContext) => string[],
  transformEl?: (el: DesignerElement, lines: string[]) => string[],
): string {
  // Mirror of Carbon's CreateParent: a transparent full-bleed root attached to the layer, with every
  // element inside it — one DestroyUi on the root removes the whole menu (see the Hide command).
  const out: string[] = [
    'var container = new CuiElementContainer();',
    '',
    'container.Add(new CuiElement',
    '{',
    `    Name = "${esc(rootDecl.name)}",`,
    `    Parent = "${esc(rootDecl.layer)}",`,
    '    Components =',
    '    {',
    '        new CuiRectTransformComponent { AnchorMin = "0 0", AnchorMax = "1 1" }',
    '    }',
    '});',
    '',
  ]
  for (const el of elements) {
    const lines = definitionOf(el).oxide(el, ctx)
    out.push(...(transformEl ? transformEl(el, lines) : lines))
    out.push(...oxideModifierLines(el, nameRef(el, ctx))) // cursor/keyboard as standalone child elements
    if (emitAfter) out.push(...emitAfter(el, ctx)) // a repeating container's for-loop follows it
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

function genCarbon(
  elements: DesignerElement[],
  names: Map<string, string>,
  root: string,
  layer: ClientPanelDef,
  base: FieldCtx,
  emitAfter?: (el: DesignerElement, ctx: EmitContext) => string[],
  transformEl?: (el: DesignerElement, lines: string[]) => string[],
): string {
  // Carbon attaches to a client panel via CreateParent; root elements then nest under it.
  const ctx: EmitContext = { names, rootParent: root, sources: base.sources, fields: base.fields }
  const out: string[] = [
    'using var cui = new CUI(CuiHandler);',
    '',
    `cui.v2.CreateParent(CUI.ClientPanels.${layer.carbon}, LuiPosition.Full, "${esc(root)}");`,
    '',
  ]
  for (const el of elements) {
    const lines = withCarbonChain(definitionOf(el).carbon(el, ctx), carbonModifierChain(el))
    out.push(...(transformEl ? transformEl(el, lines) : lines))
    if (emitAfter) out.push(...emitAfter(el, ctx)) // a repeating container's for-loop follows it
  }
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
    // RectTransform FIRST — Carbon's LUI builds every element as an empty container (RectTransform)
    // and then adds its graphic, so the transform exists before the graphic is set up. Some graphics
    // (item icons) need that ordering: with the Image first the client sizes the icon against a
    // not-yet-present RectTransform and null-refs the AddUi RPC. Colour panels are order-agnostic.
    components: [rect, ...definitionOf(el).adduiComponents(el, ctx), ...adduiModifierComponents(el)],
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
  opts: { rootParent?: string; dataSources?: DataSource[]; rootName?: string } = {},
): CuiElement[] {
  if (!elements.length) return []
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  const rootParent = opts.rootParent ?? layer.oxide
  const expanded = expandBorders(resolveBindings(expandRepeats(annotateScroll(expandTabs(elements), opts.dataSources ?? []), opts.dataSources ?? []), opts.dataSources ?? []))
  const names = buildNames(expanded)
  const ordered = treeOrder(expanded)
  // The same transparent full-bleed root the code outputs create (one DestroyUi removes everything).
  // The root name must MATCH the C# outputs' (they uniquify over the unexpanded, all-pages tree —
  // expandTabs drops inactive pages here, so a rootName colliding with an element on another page
  // would otherwise suffix differently per tab), stay clear of this payload's expanded clone names,
  // and never equal the parent it attaches under (the live preview's reserved root).
  const canonical = buildNames(expandBorders(annotateScroll(elements, opts.dataSources ?? [])))
  const root = rootContainerName(canonical, opts.rootName, [...names.values(), rootParent])
  const rootEl: CuiElement = {
    name: root,
    parent: rootParent,
    components: [{ type: 'RectTransform', anchormin: '0 0', anchormax: '1 1', offsetmin: '0 0', offsetmax: '0 0' }],
  }
  // JSON inlines bound values (resolveBindings above) — no fields needed in the wire format.
  const ctx: EmitContext = { names, rootParent: root, sources: [], fields: new Map() }
  return [rootEl, ...ordered.map((el) => adduiElement(el, ctx))]
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
  opts: { declStyle?: 'local' | 'none'; rootName?: string } = {},
): string {
  if (!elements.length) return '// Add an element to generate code.'
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  // Repeat templates emit as for-loops (genLoopLines) right after their container; everything else
  // is the static pass. Bordered panels expand into edge subpanels; names are built over ALL real
  // elements (stable collision suffixes shared by statics and loop bodies); emission is parent-first.
  // Bound props reference fields via the EmitContext. With no repeats this is exactly the legacy
  // single-pass path (statics === elements), byte-identical.
  const annotated0 = annotateScroll(elements, dataSources)
  const { tabs: tabView, pages, pageSubtreeIds } = collectTabs(annotated0)
  const annotated = resolveTabCommands(annotated0, tabView)
  const { loops, subtreeIds } = collectRepeatLoops(annotated, dataSources)
  const expandedAll = expandBorders(annotated)
  const names = buildNames(expandedAll)
  const excluded = (e: DesignerElement) => subtreeIds.has(e.id) || pageSubtreeIds.has(e.id)
  const ordered = treeOrder(loops.size || tabView ? expandBorders(annotated.filter((e) => !excluded(e))) : expandedAll)
  const fieldCtx: FieldCtx = { sources: dataSources, fields: fieldNames(dataSources) }
  const style = opts.declStyle ?? 'local'
  const idents = listIdents([...loops.values()], fieldCtx.fields.values())
  // Declarations for the sources this snippet actually uses, emitted once at the very top (for `both`,
  // before the #if — they are plain C# valid under either framework).
  const tabDecl = style === 'local' && tabView ? [`int tab = 0; // active page; the "${esc(tabView.props.command)}" handler re-renders with the clicked page`] : []
  const textDecls = style === 'local' ? genFieldDecls(fieldCtx, usedSourceIds(treeOrder(expandedAll)), 'local') : []
  const listDecls = style === 'local' ? genListDecls([...loops.values()], idents, 'local') : []
  const decls = [...tabDecl, ...(tabDecl.length && (textDecls.length || listDecls.length) ? [''] : []), ...textDecls, ...(textDecls.length && listDecls.length ? [''] : []), ...listDecls]
  const head = decls.length ? [...decls, ''] : []
  const countProp = style === 'local' ? 'Length' : 'Count'
  const loopsFor =
    (provider2: 'oxide' | 'carbon') =>
    (el: DesignerElement, ctx: EmitContext): string[] => {
      const loop = loops.get(el.id)
      return loop ? genLoopLines(loop, names, ctx, provider2, idents.get(loop.ds.id)!.list, countProp) : []
    }
  // A repeating scroll container's content extent becomes a runtime Count/Length expression.
  const scrollFor =
    (provider2: 'oxide' | 'carbon') =>
    (el: DesignerElement, lines: string[]): string[] => {
      const loop = loops.get(el.id)
      const sub = loop ? scrollCountSubs(loop, idents.get(loop.ds.id)!.list, countProp, provider2) : null
      return sub ? lines.map((ln) => ln.replace(sub.from, sub.to)) : lines
    }
  // A tab-switch button with an active color emits it as a `tab == N ? active : base` conditional.
  const tabColorFor = (el: DesignerElement, lines: string[]): string[] => {
    if (!tabView || el.type !== 'button' || el.props.tabSwitch?.target !== tabView.id || !el.props.activeColor) return lines
    const from = `"${cuiColor(el.props.color)}"`
    const to = `tab == ${el.props.tabSwitch.page} ? "${cuiColor(el.props.activeColor)}" : ${from}`
    let done = false
    return lines.map((ln) => {
      if (done || !ln.includes(from)) return ln
      done = true
      return ln.replace(from, to)
    })
  }
  const transformFor = (provider2: 'oxide' | 'carbon') => {
    const scroll = scrollFor(provider2)
    return (el: DesignerElement, lines: string[]) => tabColorFor(el, scroll(el, lines))
  }
  // The tab view emits its pages as LOCAL FUNCTIONS + a switch over `tab`, right after the container
  // itself. Local functions keep this valid in both the Class body and the UX snippet.
  const tabsFor =
    (provider2: 'oxide' | 'carbon') =>
    (el: DesignerElement, ctx: EmitContext): string[] => {
      if (!tabView || el.id !== tabView.id || !pages.length) return []
      const transform = transformFor(provider2)
      const usedM = new Set<string>()
      const methodNames = pages.map((pg) => {
        const base = `Build${sanitizeIdent(pg.name)}`
        let m = base
        let k = 2
        while (usedM.has(m)) m = `${base}${k++}`
        usedM.add(m)
        return m
      })
      const kidsOf = (pid: string) => annotated.filter((e2) => e2.parentId === pid)
      const out: string[] = []
      pages.forEach((pg, i) => {
        const pageEls: DesignerElement[] = []
        const collect = (e2: DesignerElement) => {
          pageEls.push(e2)
          for (const kid of kidsOf(e2.id)) collect(kid)
        }
        collect(pg)
        const pageOrdered = treeOrder(expandBorders(pageEls.filter((e2) => !subtreeIds.has(e2.id))))
        const lines: string[] = []
        for (const pe of pageOrdered) {
          const raw =
            provider2 === 'oxide'
              ? [...definitionOf(pe).oxide(pe, ctx), ...oxideModifierLines(pe, nameRef(pe, ctx))]
              : withCarbonChain(definitionOf(pe).carbon(pe, ctx), carbonModifierChain(pe))
          lines.push(...transform(pe, raw))
          const loop = loops.get(pe.id)
          if (loop) lines.push(...genLoopLines(loop, names, ctx, provider2, idents.get(loop.ds.id)!.list, countProp))
        }
        while (lines.length && lines[lines.length - 1] === '') lines.pop()
        out.push(`void ${methodNames[i]}()`, '{', ...lines.map((x) => (x ? `    ${x}` : '')), '}', '')
      })
      out.push('switch (tab)', '{', ...pages.map((_pg, i) => `    case ${i}: ${methodNames[i]}(); break;`), '}', '')
      return out
    }
  const emitAfterFor = (provider2: 'oxide' | 'carbon') => {
    const loopsHook = loopsFor(provider2)
    const tabsHook = tabsFor(provider2)
    return (el: DesignerElement, ctx: EmitContext) => [...loopsHook(el, ctx), ...tabsHook(el, ctx)]
  }
  const hooks = loops.size > 0 || !!tabView
  const root = rootContainerName(names, opts.rootName)
  const oxide = () =>
    genOxide(ordered, { names, rootParent: root, sources: dataSources, fields: fieldCtx.fields }, { name: root, layer: layer.oxide }, hooks ? emitAfterFor('oxide') : undefined, hooks ? transformFor('oxide') : undefined)
  const carbon = () => genCarbon(ordered, names, root, layer, fieldCtx, hooks ? emitAfterFor('carbon') : undefined, hooks ? transformFor('carbon') : undefined)
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

/** Distinct console-command names captured by command-bearing elements (button click, input submit,
 *  countdown end — any element whose props carry a `command`) — the first token of each command
 *  string (anything after it is treated as arguments, so several elements can share one handler). */
function commandNames(elements: DesignerElement[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const el of elements) {
    // a tab view's command gets the dedicated TabCommand handler; a tab-switch button's own command
    // is overridden by the switch, so neither should produce a generic stub
    if (el.type === 'tabs' || (el.type === 'button' && el.props.tabSwitch)) continue
    if (!('command' in el.props) || typeof el.props.command !== 'string') continue
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

/** A `[ConsoleCommand]` handler stub per distinct command — valid under both frameworks
 *  (Carbon is Oxide-command compatible), so no `#if` split is needed. Empty when no element binds one. */
/** Base commands sent by at least one PROTECTED element. Carbon-protected buttons send
 *  Community.Protect(command) on the wire, so their handlers must be [ProtectedCommand] — a plain
 *  [ConsoleCommand] never hears them. Oxide has no protection concept. */
function protectedCommands(elements: DesignerElement[]): Set<string> {
  const out = new Set<string>()
  for (const el of elements) {
    const props = el.props as { command?: string; isProtected?: boolean }
    if (typeof props.command !== 'string' || !props.command.trim()) continue
    if (props.isProtected !== false) out.add(props.command.trim().split(/\s+/)[0])
  }
  return out
}

/** The command attribute line(s) for a stub/handler, per provider and protection. */
function commandAttribute(cmd: string, provider: Provider, isProtected: boolean, indent = '    '): string[] {
  const prot = `${indent}[ProtectedCommand("${esc(cmd)}")]`
  const cons = `${indent}[ConsoleCommand("${esc(cmd)}")]`
  if (!isProtected || provider === 'oxide') return [cons]
  if (provider === 'carbon') return [prot]
  return ['#if CARBON', prot, '#else', cons, '#endif']
}

function commandStubs(elements: DesignerElement[], provider: Provider, indexedCommands: Set<string> = new Set()): string[] {
  const prot = protectedCommands(elements)
  const names = commandNames(elements)
  // PascalCasing is lossy ("ui.open" and "ui_open" both become UiOpenCommand), so dedupe the METHOD
  // names too — a numeric suffix on later collisions keeps the generated class compiling.
  const used = new Set<string>()
  return names.flatMap((cmd, i) => {
    const base = commandMethodName(cmd)
    let method = base
    let n = 2
    while (used.has(method)) method = `${base}${n++}`
    used.add(method)
    // A command fired from a repeating template carries the clicked row as its first argument.
    const indexed = indexedCommands.has(cmd)
    return [
      ...(i > 0 ? [''] : []), // blank line between successive stubs
      ...commandAttribute(cmd, provider, prot.has(cmd)),
      `    private void ${method}(ConsoleSystem.Arg arg)`,
      '    {',
      '        var player = arg.Player();',
      '        if (player == null) return;',
      ...(indexed ? ['        var index = arg.GetInt(0); // which list item was clicked'] : []),
      `        // TODO: handle the "${esc(cmd)}" button${indexed ? ' for item [index]' : ''}`,
      '    }',
    ]
  })
}

/** Base commands that live inside a repeating template — their stubs parse the row-index argument. */
function indexedCommandsOf(loops: Map<string, RepeatLoop>): Set<string> {
  const out = new Set<string>()
  for (const loop of loops.values()) {
    for (const el of loop.subtree) {
      const cmd = (el.props as { command?: string }).command
      if (cmd) out.add(cmd)
    }
  }
  return out
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

/**
 * Wrap the UX snippet in a minimal, compile-ready plugin shell — `[ChatCommand("show")]` builds and
 * sends the UI (destroying any previous instance first, so re-running never stacks copies) and
 * `[ChatCommand("hide")]` destroys the transparent root every element hangs off. Oxide/Carbon get
 * their own usings/namespace/base class; `both` keeps the whole shell `#if CARBON`-guarded (the UX
 * body is already #if-split). Mirrors the confirmed skeleton.
 */
export function generateFullClass(elements: DesignerElement[], provider: Provider, rootLayer: ClientPanel = 'Overlay', dataSources: DataSource[] = [], rootName?: string): string {
  if (!elements.length) return '// Add an element to generate code.'
  // Data sources become `private` class fields (outside the method); the body references them, so the
  // snippet is generated with declStyle:'none' (no in-method locals). Plain C#, valid under either
  // framework, so the field block is emitted once even for `both`.
  const fieldCtx: FieldCtx = { sources: dataSources, fields: fieldNames(dataSources) }
  const { loops } = collectRepeatLoops(elements, dataSources)
  const listLines = genListDecls([...loops.values()], listIdents([...loops.values()], fieldCtx.fields.values()), 'field')
  const textLines = genFieldDecls(fieldCtx, usedSourceIds(expandBorders(elements)), 'field')
  const fieldLines = [...textLines, ...(textLines.length && listLines.length ? [''] : []), ...listLines]
  const members = fieldLines.length ? [...fieldLines.map((l) => (l ? `    ${l}` : l)), ''] : []
  const body = indent(generateCode(elements, provider, rootLayer, dataSources, { declStyle: 'none', rootName }), 8)
  const info = '[Info("Test Plugin", "hizen", "0.0.1")]'
  const desc = '[Description("Generated by the Carbon Layout Designer")]'
  // The same root name generateCode gives the transparent wrapper (identical names recipe).
  const root = rootContainerName(buildNames(expandBorders(annotateScroll(elements, dataSources))), rootName)
  const { tabs: shellTabs } = collectTabs(elements)
  const hide = [
    '    [ChatCommand("hide")]',
    '    private void HideCommand(BasePlayer player, string command, string[] args)',
    '    {',
    `        CuiHelper.DestroyUi(player, "${esc(root)}"); // the root removes the whole menu`,
    '    }',
  ]
  // With a tab view, the body moves into Render(player, tab): the switch-button command re-renders
  // with the clicked page (the tab container is cleared and rewritten along with the rest).
  const method = shellTabs
    ? [
        '    [ChatCommand("show")]',
        '    private void ShowCommand(BasePlayer player, string command, string[] args) => Render(player, 0);',
        '',
        ...hide,
        '',
        ...commandAttribute(shellTabs.props.command, provider, true),
        '    private void TabCommand(ConsoleSystem.Arg arg)',
        '    {',
        '        var player = arg.Player();',
        '        if (player == null) return;',
        '        Render(player, arg.GetInt(0));',
        '    }',
        '',
        '    private void Render(BasePlayer player, int tab)',
        '    {',
        `        CuiHelper.DestroyUi(player, "${esc(root)}"); // replace any previous instance`,
        '',
        body,
        '    }',
      ]
    : [
        '    [ChatCommand("show")]',
        '    private void ShowCommand(BasePlayer player, string command, string[] args)',
        '    {',
        `        CuiHelper.DestroyUi(player, "${esc(root)}"); // replace any previous instance`,
        '',
        body,
        '    }',
        '',
        ...hide,
      ]
  // Image-DB fills need a preload lifecycle; elements that capture a command (button/input/countdown)
  // get a handler stub. Both go after the builder method, each section separated by a blank line.
  const imgs = imagedbFills(elements)
  const sections = [method, preloadLines(imgs, provider), commandStubs(elements, provider, indexedCommandsOf(loops))].filter((s) => s.length)
  const methods = sections.flatMap((s, i) => (i === 0 ? s : ['', ...s]))
  if (provider === 'both') {
    return [
      ...(loops.size ? ['using System.Collections.Generic;'] : []), // List<T> item lists
      'using Oxide.Game.Rust.Cui;', // Cui* types; under Carbon via the Oxide-compat shim
      '#if CARBON',
      'using Carbon.Components;',
      ...(imgs.length ? ['using Carbon.Modules;'] : []),
      ...(hasScrollContainers(elements) ? ['#else', 'using UnityEngine.UI;'] : []), // ScrollRect.MovementType (oxide emit only)
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
    ...(loops.size ? ['using System.Collections.Generic;'] : []), // List<T> item lists
    ...(!carbon && hasScrollContainers(elements) ? ['using UnityEngine.UI;'] : []), // ScrollRect.MovementType
    ...(carbon ? ['using Carbon.Components;'] : []),
    'using Oxide.Game.Rust.Cui;', // Cui* types; under Carbon via the Oxide-compat shim
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
export function generateJson(elements: DesignerElement[], rootLayer: ClientPanel = 'Overlay', dataSources: DataSource[] = [], rootName?: string): string {
  const arr = generateAddUiJson(elements, rootLayer, { dataSources, rootName })
  if (!arr.length) return '// Add an element to generate JSON.'
  return JSON.stringify(arr, null, 2)
}

/**
 * Emit just the chosen element(s) — no container/AddUi boilerplate. Names are still resolved across
 * the whole tree so parent references stay correct. Handy "what builds this box" view for the
 * selected element. `both` #if-splits like the full snippet.
 */
export function generateSelected(elements: DesignerElement[], selectedIds: string[], provider: Provider, rootLayer: ClientPanel = 'Overlay', dataSources: DataSource[] = [], rootName?: string): string {
  const HINT = '// Select an element on the canvas to see its code.'
  if (!selectedIds.length) return HINT
  const layer = CLIENT_PANELS.find((p) => p.id === rootLayer) ?? CLIENT_PANELS[0]
  const expanded = expandBorders(expandRepeats(annotateScroll(expandTabs(elements), dataSources), dataSources))
  const names = buildNames(expanded)
  // Root uniquified over the unexpanded all-pages tree so the Selected snippet's parent references
  // agree with the Class/Code outputs (see the matching note in generateAddUiJson).
  const root = rootContainerName(buildNames(expandBorders(annotateScroll(elements, dataSources))), rootName, names.values())
  const sel = new Set(selectedIds)
  // include a selected panel's border subpanels (ids `${selectedId}.border-*`).
  const chosen = treeOrder(expanded).filter((el) => sel.has(el.id) || [...sel].some((s) => el.id.startsWith(`${s}.border-`)))
  if (!chosen.length) return HINT
  // Bound props reference fields; declare the locals the chosen elements use, once at the top.
  const fields = fieldNames(dataSources)
  const decls = genFieldDecls({ sources: dataSources, fields }, usedSourceIds(chosen), 'local')
  const head = decls.length ? [...decls, ''] : []
  const oxideCtx: EmitContext = { names, rootParent: root, sources: dataSources, fields }
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
  /** The stripped wrapper's name when it isn't the "Container" default — preserves round-trips. */
  rootName: string
}

/**
 * Parse a CUI `CuiElementContainer.ToJson()` payload — an array of `{ name, parent, components[] }` —
 * into designer elements. Returns null if the input isn't that shape (so callers can fall back to the
 * designer's own export format). Recognises Image (panel), RawImage with a url or steamid (image /
 * steam-avatar panel), Text (text element), InputField (input), and a Text+Countdown pair (countdown);
 * a RectTransform supplies the geometry. Parents that name another element become
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
  const layerParented: string[] = [] // ids whose parent was a layer string, not another element
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
      layerParented.push(id)
    }

    const btn = comps.find((c) => c.type === 'UnityEngine.UI.Button')
    const inputField = comps.find((c) => c.type === 'UnityEngine.UI.InputField')
    const countdown = comps.find((c) => c.type === 'Countdown')
    const text = comps.find((c) => c.type === 'UnityEngine.UI.Text')
    const rawImg = comps.find((c) => c.type === 'UnityEngine.UI.RawImage')
    const img = comps.find((c) => c.type === 'UnityEngine.UI.Image')
    if (btn) {
      // A button node carries the command + color; any bundled label is dropped (we model labels as
      // child Text elements). Checked first so a CuiButton's own image doesn't read as a plain panel.
      // `close` holds a wire NAME here; it is remapped to an element id (or CLOSE_ROOT) after the
      // synthetic-root strip below, once we know which element that name resolves to.
      elements.push({
        ...base,
        type: 'button',
        props: {
          color: parseColor(btn.color, { r: 1, g: 1, b: 1, a: 1 }),
          command: typeof btn.command === 'string' ? btn.command : '',
          isProtected: true,
          ...(typeof btn.close === 'string' && btn.close ? { close: nameToId.get(btn.close) ?? btn.close } : {}),
        },
      })
    } else if (inputField) {
      // Input field bundles its own text + styling plus command/charLimit. The wire has no
      // isProtected (and older exports lack password), so absent fields keep the create() defaults.
      const defaults = inputDefinition.create({ id, n: 0, parentId: null, index: 0, color: { r: 1, g: 1, b: 1, a: 1 } }).props
      const align = inputField.align as TextAlign
      elements.push({
        ...base,
        type: 'input',
        props: {
          ...defaults,
          text: typeof inputField.text === 'string' ? inputField.text : defaults.text,
          fontSize: typeof inputField.fontSize === 'number' ? inputField.fontSize : defaults.fontSize,
          font: fontFromOxide(inputField.font),
          align: TEXT_ALIGNS.includes(align) ? align : defaults.align,
          color: parseColor(inputField.color, defaults.color),
          command: typeof inputField.command === 'string' ? inputField.command : defaults.command,
          charLimit: typeof inputField.characterLimit === 'number' ? inputField.characterLimit : defaults.charLimit,
          // Oxide serializes IsPassword as `password`; older exports omit it → keep the default.
          password: typeof inputField.password === 'boolean' ? inputField.password : defaults.password,
        },
      })
    } else if (countdown) {
      // Text + Countdown pair: the Text sibling supplies the label/styling, the Countdown the timer.
      // Checked before the plain-Text branch (a countdown always carries a Text too). `interval` and
      // isProtected aren't in the wire, so they fall back to the create() defaults.
      const defaults = countdownDefinition.create({ id, n: 0, parentId: null, index: 0, color: { r: 1, g: 1, b: 1, a: 1 } }).props
      const align = text?.align as TextAlign
      elements.push({
        ...base,
        type: 'countdown',
        props: {
          ...defaults,
          text: typeof text?.text === 'string' ? text.text : defaults.text,
          fontSize: typeof text?.fontSize === 'number' ? text.fontSize : defaults.fontSize,
          font: fontFromOxide(text?.font),
          align: TEXT_ALIGNS.includes(align) ? align : defaults.align,
          color: parseColor(text?.color, defaults.color),
          startTime: typeof countdown.startTime === 'number' ? countdown.startTime : defaults.startTime,
          endTime: typeof countdown.endTime === 'number' ? countdown.endTime : defaults.endTime,
          step: typeof countdown.step === 'number' ? countdown.step : defaults.step,
          command: typeof countdown.command === 'string' ? countdown.command : defaults.command,
        },
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
    } else if (rawImg && typeof rawImg.steamid === 'string') {
      // A RawImage sourced by steamid (no url) is a steam-avatar fill.
      elements.push({ ...base, type: 'panel', props: { color: parseColor(rawImg.color, { r: 1, g: 1, b: 1, a: 1 }), image: { kind: 'steamavatar', steamId: rawImg.steamid } } })
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

  // Strip a synthetic full-bleed root wrapper — our own exports emit one (and many plugins hand-roll
  // the same pattern): a rect-only, full-stretch, zero-offset container parented to the layer, with
  // everything else inside it. The designer re-applies it at generation time, so keeping it would
  // nest the imported tree one level deep and re-exporting would wrap it twice. Its layer vote stays,
  // which is what resolves rootLayer below.
  let rootName = ''
  if (layerParented.length === 1) {
    const wrapper = elements.find(
      (el) =>
        el.id === layerParented[0] &&
        el.type === 'container' &&
        el.anchorMin.x === 0 &&
        el.anchorMin.y === 0 &&
        el.anchorMax.x === 1 &&
        el.anchorMax.y === 1 &&
        el.offsetMin.x === 0 &&
        el.offsetMin.y === 0 &&
        el.offsetMax.x === 0 &&
        el.offsetMax.y === 0 &&
        elements.every((o) => o.id === el.id || o.parentId !== null),
    )
    if (wrapper) {
      // A custom wrapper name is layout config, not an element — carry it into canvas.rootName so
      // exporting again emits the same root. Only the exact "Container" default stays implicit —
      // "Container (N)" is captured as-is: whether it came from the collision suffix or was typed
      // deliberately, re-exporting it re-derives the identical name, so the round-trip is stable
      // either way. Trimmed because rootContainerName trims (untrimmed capture could never re-emit).
      const captured = wrapper.name.trim()
      if (captured && captured !== 'Container') rootName = captured
      elements.splice(elements.indexOf(wrapper), 1)
      for (const el of elements) {
        if (el.parentId === wrapper.id) el.parentId = null
        if (el.type === 'button' && el.props.close === wrapper.id) el.props.close = CLOSE_ROOT
      }
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
  return { elements, rootLayer, rootName }
}
