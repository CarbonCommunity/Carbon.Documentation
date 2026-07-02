// Shared emit layer for the per-element registry.
//
// One module per element type lives beside this file (panel.ts, text.ts, …); each exports an
// `ElementDefinition` describing how to *create*, *clone*, and *emit* that element. The fragile,
// known-good machinery — geometry, naming, tree-ordering, borders, data-source field emission — stays
// in codegen.ts; element modules receive everything they need through an `EmitContext` plus the pure
// formatters below, so they never reach into codegen internals. This keeps adding an element to one
// small file and keeps the proven coordinate/format math in exactly one place.

import { cuiColorString, round } from '../geometry'
import { resolveText } from '../types'
import type { ColorRGBA, CuiComponent, DataSource, DesignerElement, ElementType, TextElement, Vec2 } from '../types'

// --- pure formatters (the single source for all numeric/string formatting) -----------

/** Format a rounded number without a trailing ".0" or a stray "-0". */
export function num(v: number, decimals: number): string {
  const r = round(v, decimals)
  return Object.is(r, -0) ? '0' : String(r)
}

/** Escape a value so it is safe inside a C# double-quoted string literal (incl. newlines/tabs). */
export function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/** Integer for emitted C# (font sizes are whole px). */
export const intStr = (v: number) => String(Math.max(1, Math.round(v)))
/** Same clamp as intStr, but as a number (AddUi JSON wants a numeric fontSize, not a string). */
export const intNum = (v: number) => Math.max(1, Math.round(v))

// Anchors are fractions (need precision); offsets are reference px (usually whole, grid-snapped).
export const anchorPair = (v: Vec2) => `${num(v.x, 4)} ${num(v.y, 4)}`
export const offsetPair = (v: Vec2) => `${num(v.x, 2)} ${num(v.y, 2)}`
// LUI takes float args; 0.5 is a `double` literal in C# and won't implicitly narrow, so suffix `f`.
export const lf = (v: number, decimals: number) => `${num(v, decimals)}f`

/** CUI "r g b a" color string. Re-exported so element modules have one import surface. */
export const color = cuiColorString

/** The `new LuiPosition(...)` expression for an element's anchors (Carbon LUI). */
export const posExpr = (el: DesignerElement) =>
  `new LuiPosition(${lf(el.anchorMin.x, 4)}, ${lf(el.anchorMin.y, 4)}, ${lf(el.anchorMax.x, 4)}, ${lf(el.anchorMax.y, 4)})`
/** The `new LuiOffset(...)` expression for an element's offsets (Carbon LUI). */
export const offExpr = (el: DesignerElement) =>
  `new LuiOffset(${lf(el.offsetMin.x, 2)}, ${lf(el.offsetMin.y, 2)}, ${lf(el.offsetMax.x, 2)}, ${lf(el.offsetMax.y, 2)})`

// --- per-generation context ----------------------------------------------------------

/**
 * Everything an element's emitters need that varies per generation: the resolved unique names, the
 * root parent (the Oxide layer string, or Carbon's root container, depending on target), and the
 * data-source state used to turn a bound prop into a field reference. Built once per target in
 * codegen.ts and threaded into every `ElementDefinition` emitter.
 */
export interface EmitContext {
  /** elementId -> unique UI name (collision-suffixed). */
  names: Map<string, string>
  /** Parent for root elements: the Oxide layer string, or Carbon's root container name. */
  rootParent: string
  /** All data sources in scope (for resolving a binding's value / fallback literal). */
  sources: DataSource[]
  /** dsId -> C# field identifier (sanitised, de-duped). Empty when there are no sources. */
  fields: Map<string, string>
}

/** This element's unique UI name (raw — callers escape for C# string literals). */
export function nameRef(el: DesignerElement, ctx: EmitContext): string {
  return ctx.names.get(el.id) ?? el.name
}

/**
 * Oxide CuiPanel lines whose `Image = { … }` body is `imageInner` (e.g. `Color = "1 1 1 1"` or
 * `Sprite = "…", Color = "…"`). Shared by the plain color panel and the sprite/png/item-icon fills.
 */
export function cuiPanelLines(el: DesignerElement, ctx: EmitContext, imageInner: string): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  return [
    'container.Add(new CuiPanel',
    '{',
    `    Image = { ${imageInner} },`,
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

/**
 * Oxide CuiElement + CuiRawImageComponent lines whose component body is `rawInner` (e.g.
 * `Url = "…", Color = "…"`). Shared by the URL fill (and future SteamId raw images).
 */
export function cuiRawImageLines(el: DesignerElement, ctx: EmitContext, rawInner: string): string[] {
  const parent = esc(parentRef(el, ctx))
  const name = esc(nameRef(el, ctx))
  return [
    'container.Add(new CuiElement',
    '{',
    `    Name = "${name}",`,
    `    Parent = "${parent}",`,
    '    Components =',
    '    {',
    `        new CuiRawImageComponent { ${rawInner} },`,
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

/** This element's parent reference: a named sibling, else the supplied root parent (raw). */
export function parentRef(el: DesignerElement, ctx: EmitContext): string {
  return el.parentId ? ctx.names.get(el.parentId) ?? ctx.rootParent : ctx.rootParent
}

/**
 * C# expression for a text element's `text`: a bound field reference (no quotes), else a quoted,
 * escaped literal. Mirrors the data-source field-emission strategy used by the code outputs.
 */
export function textExpr(el: TextElement, ctx: EmitContext): string {
  const dsId = el.bindings?.text
  if (dsId && ctx.fields.has(dsId)) return ctx.fields.get(dsId)!
  return `"${esc(resolveText(el, ctx.sources))}"`
}

// --- element definition contract -----------------------------------------------------

/** Args the store passes to an element's `create` factory. */
export interface CreateArgs {
  /** Pre-allocated unique element id (`el-N`). */
  id: string
  /** The numeric part of the id — used to build a default display name (`Panel.N`). */
  n: number
  /** Parent element id, or null for a root-canvas element. */
  parentId: string | null
  /** elements.length at creation time — drives default-color cycling and child staggering. */
  index: number
  /** A cycled palette color the store hands in (used as a panel's default fill). */
  color: ColorRGBA
}

/** The four rect fields an element factory must produce — shared default-geometry shape. */
export interface BoxGeometry {
  anchorMin: Vec2
  anchorMax: Vec2
  offsetMin: Vec2
  offsetMax: Vec2
}

/** Full-stretch geometry: fills the parent with zero offsets (the default for a root container). */
export function fullStretch(): BoxGeometry {
  return { anchorMin: { x: 0, y: 0 }, anchorMax: { x: 1, y: 1 }, offsetMin: { x: 0, y: 0 }, offsetMax: { x: 0, y: 0 } }
}

/**
 * A centered, fixed-size box (half-extents `halfW`×`halfH` in reference px), staggered by creation
 * `index` so successive adds don't fully overlap. Shared default for child panels / text / containers.
 */
export function staggeredBox(index: number, halfW: number, halfH: number): BoxGeometry {
  const c = (index % 6) * 24
  return {
    anchorMin: { x: 0.5, y: 0.5 },
    anchorMax: { x: 0.5, y: 0.5 },
    offsetMin: { x: -halfW + c, y: -halfH + c },
    offsetMax: { x: halfW + c, y: halfH + c },
  }
}

/** Build a default child element of `type` parented under `parentId` (store-backed id allocation). */
export type ChildFactory = (type: ElementType, parentId: string) => DesignerElement

/**
 * The behavior of one element type, in one place. `E` narrows to the concrete element so every method
 * is type-safe. Emitters return the same line arrays / wire components the old inline branches did.
 */
export interface ElementDefinition<E extends DesignerElement = DesignerElement> {
  type: E['type']
  /** Display label for the "Add element" picker. */
  label: string
  /** Create a new element with this type's sensible defaults. */
  create(args: CreateArgs): E
  /** Deep-clone this element's props (for duplicate / drag snapshots). */
  cloneProps(el: E): E['props']
  /**
   * Optional related elements to add right after this one (e.g. a button's label). Returned elements
   * are appended to the tree as-is; use `mk` to build a default child of any type, then customise it.
   */
  seedChildren?(parent: E, mk: ChildFactory): DesignerElement[]
  /** Oxide CUI emit — C# lines (with the trailing '' separator the generator joins on). */
  oxide(el: E, ctx: EmitContext): string[]
  /** Carbon LUI emit — C# lines (with the trailing '' separator). */
  carbon(el: E, ctx: EmitContext): string[]
  /** Primary AddUi-wire components for this element; codegen appends the shared RectTransform. */
  adduiComponents(el: E, ctx: EmitContext): CuiComponent[]
}
