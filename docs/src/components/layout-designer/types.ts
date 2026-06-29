// Data model for the Layout Designer.
//
// All positional values are stored in CUI-native convention so they map 1:1 to the
// values that will eventually be emitted as code:
//   - anchors  (anchorMin / anchorMax): 0..1, relative to the parent's rect
//   - offsets  (offsetMin / offsetMax): pixels, in the canvas reference space
//   - Y axis is BOTTOM-UP (origin bottom-left), exactly like Unity RectTransform / CUI
// The DOM (top-down) conversion happens only at render time in geometry.ts.

// Element types whose Props/Element interfaces live beside their behavior (elements/<type>.ts) are
// imported here purely to assemble the DesignerElement union below. Type-only — no runtime coupling.
import type { ButtonElement } from './elements/button'
import type { ContainerElement } from './elements/container'

export interface Vec2 {
  x: number
  y: number
}

/** Color channels in 0..1 (CUI format). */
export interface ColorRGBA {
  r: number
  g: number
  b: number
  a: number
}

export type ElementType = 'panel' | 'text' | 'container' | 'button'
// The addable-type list (label + order) is derived from the element registry — see
// elements/registry.ts (`ELEMENT_TYPES`). This file owns only the discriminated-union data model.
//
// Convention: an element type's Props/Element interface and behavior live in its own module under
// elements/ (e.g. elements/container.ts). This file imports the Element type and adds it to the
// DesignerElement union + the ElementType string below.

/** Target framework for code generation. */
export type Provider = 'oxide' | 'carbon' | 'both'

/** Rust client UI layer that the root of the layout attaches to. */
export type ClientPanel =
  | 'Overall'
  | 'Overlay'
  | 'OverlayNonScaled'
  | 'HudMenu'
  | 'Hud'
  | 'Under'
  | 'UnderNonScaled'
  | 'Inventory'
  | 'Crafting'
  | 'Contacts'
  | 'Clans'
  | 'TechTree'
  | 'Map'

export interface ClientPanelDef {
  id: ClientPanel
  label: string
  /** Oxide CUI parent string — root elements parent to this directly. */
  oxide: string
  /** Carbon `CUI.ClientPanels` enum member — used via `cui.v2.CreateParent(...)`. */
  carbon: string
}

/** Selectable root layers. `oxide` is the literal CUI parent string; `carbon` the enum member. */
export const CLIENT_PANELS: ClientPanelDef[] = [
  { id: 'Overlay', label: 'Overlay', oxide: 'Overlay', carbon: 'Overlay' },
  { id: 'OverlayNonScaled', label: 'Overlay (non-scaled)', oxide: 'OverlayNonScaled', carbon: 'OverlayNonScaled' },
  { id: 'Overall', label: 'Overall', oxide: 'Overall', carbon: 'Overall' },
  { id: 'HudMenu', label: 'Hud.Menu', oxide: 'Hud.Menu', carbon: 'HudMenu' },
  { id: 'Hud', label: 'Hud', oxide: 'Hud', carbon: 'Hud' },
  { id: 'Under', label: 'Under', oxide: 'Under', carbon: 'Under' },
  { id: 'UnderNonScaled', label: 'Under (non-scaled)', oxide: 'UnderNonScaled', carbon: 'UnderNonScaled' },
  { id: 'Inventory', label: 'Inventory', oxide: 'Inventory', carbon: 'Inventory' },
  { id: 'Crafting', label: 'Crafting', oxide: 'Crafting', carbon: 'Crafting' },
  { id: 'Contacts', label: 'Contacts', oxide: 'Contacts', carbon: 'Contacts' },
  { id: 'Clans', label: 'Clans', oxide: 'Clans', carbon: 'Clans' },
  { id: 'TechTree', label: 'TechTree', oxide: 'TechTree', carbon: 'TechTree' },
  { id: 'Map', label: 'Map', oxide: 'Map', carbon: 'Map' },
]

/**
 * Image fill layered over a panel's background. Only URL/raw images for now
 * (`CuiRawImageComponent` / `cui.v2.CreateUrlImage`); png/sprite/db/item variants come later.
 */
export interface ImageFill {
  kind: 'url'
  url: string
}

/**
 * Optional border. CUI has no border primitive, so codegen renders it as four edge subpanels
 * (top/bottom/left/right) nested in the panel — NOT a single wrapper behind it, which would bleed
 * through a translucent panel. Absent/null or width<=0 => no border.
 */
export interface PanelBorder {
  /** Border thickness in reference px. */
  width: number
  color: ColorRGBA
}

export interface PanelProps {
  /** Panel background color — or, when an image fill is set, the image's tint. */
  color: ColorRGBA
  /** Optional image fill. Absent/null => plain solid-color panel (unchanged legacy behavior). */
  image?: ImageFill | null
  /** Optional inset border, rendered as four edge subpanels at codegen time. */
  border?: PanelBorder | null
}

/** Unity `TextAnchor` members — the alignment of text within its box (vertical × horizontal). */
export type TextAlign =
  | 'UpperLeft'
  | 'UpperCenter'
  | 'UpperRight'
  | 'MiddleLeft'
  | 'MiddleCenter'
  | 'MiddleRight'
  | 'LowerLeft'
  | 'LowerCenter'
  | 'LowerRight'

/** Row-major (top→bottom, left→right) — drives the inspector's 3×3 alignment grid. */
export const TEXT_ALIGNS: TextAlign[] = [
  'UpperLeft',
  'UpperCenter',
  'UpperRight',
  'MiddleLeft',
  'MiddleCenter',
  'MiddleRight',
  'LowerLeft',
  'LowerCenter',
  'LowerRight',
]

/**
 * Font choice. Client-centric: the same Rust font asset is used by BOTH frameworks — Oxide sets
 * `CuiTextComponent.Font = "<file>"` and Carbon chains `.SetTextFont(CUI.Handler.FontTypes.<id>)`,
 * which resolve to the identical file. So there is no Oxide-vs-Carbon font split. `id` is the Carbon
 * `FontTypes` member; `oxide` is the matching filename; `css`/`weight` are a preview-only approximation.
 */
export type TextFont =
  | 'RobotoCondensedRegular'
  | 'RobotoCondensedBold'
  | 'PermanentMarker'
  | 'DroidSansMono'
  | 'PressStart'
  | 'LCD'
  | 'Poxel'

export interface FontDef {
  id: TextFont
  label: string
  oxide: string
  css: string
  weight?: number
}

export const DEFAULT_TEXT_FONT: TextFont = 'RobotoCondensedRegular'

export const TEXT_FONTS: FontDef[] = [
  { id: 'RobotoCondensedRegular', label: 'Roboto Condensed', oxide: 'robotocondensed-regular.ttf', css: "'Roboto Condensed', system-ui, sans-serif" },
  { id: 'RobotoCondensedBold', label: 'Roboto Condensed Bold', oxide: 'robotocondensed-bold.ttf', css: "'Roboto Condensed', system-ui, sans-serif", weight: 700 },
  { id: 'PermanentMarker', label: 'Permanent Marker', oxide: 'permanentmarker.ttf', css: "'Permanent Marker', 'Comic Sans MS', cursive" },
  { id: 'DroidSansMono', label: 'Droid Sans Mono', oxide: 'droidsansmono.ttf', css: "ui-monospace, 'Droid Sans Mono', monospace" },
  { id: 'PressStart', label: 'Press Start 2P', oxide: 'pressstart2p-regular.ttf', css: "'Press Start 2P', ui-monospace, monospace" },
  { id: 'LCD', label: 'LCD', oxide: 'lcd.ttf', css: "'LCD', ui-monospace, monospace" },
  { id: 'Poxel', label: 'Poxel', oxide: 'poxel.otf', css: "'Poxel', system-ui, sans-serif" },
]

/** Resolve a (possibly missing, for legacy layouts) font id to its definition; falls back to default. */
export function fontDef(id: TextFont | undefined | null): FontDef {
  return TEXT_FONTS.find((f) => f.id === id) ?? TEXT_FONTS[0]
}

export interface TextProps {
  /** Text (font) color, CUI channels 0..1. */
  color: ColorRGBA
  text: string
  /** Font size in reference px (CuiTextComponent.FontSize / LUI fontSize). */
  fontSize: number
  align: TextAlign
  /** Font asset (shared by both frameworks). Optional for legacy layouts → resolves to the default. */
  font?: TextFont
}

/** Fields shared by every element regardless of type. Extended by each element module's type. */
export interface BaseElement {
  id: string
  name: string
  /** null => positioned against the root canvas. */
  parentId: string | null
  anchorMin: Vec2
  anchorMax: Vec2
  offsetMin: Vec2
  offsetMax: Vec2
  /**
   * Optional prop bindings: maps an element prop path (e.g. `"text"`) to a {@link DataSource} id. A
   * bound prop draws its value from that data source instead of its literal. In the *Class* output
   * the source becomes a field the element references; every other path (UX / JSON / Selected / live
   * preview) inlines the resolved value. Absent => every prop is a literal (legacy behaviour).
   */
  bindings?: Record<string, string>
  /**
   * Reserved — not yet expanded. Marks this element as a template repeated once per item of a list
   * data source: the Class output will emit a `foreach`, while UX/preview will expand to one concrete
   * element per item (the item value inlined). Modelled now so the list → template → scrollable work
   * needs no model change later. Absent/null => a normal, single element.
   */
  repeat?: { source: string } | null
}

export interface PanelElement extends BaseElement {
  type: 'panel'
  props: PanelProps
}

export interface TextElement extends BaseElement {
  type: 'text'
  props: TextProps
}

/** Discriminated on `type` — narrow with `el.type === 'text'` to reach type-specific props. */
export type DesignerElement = PanelElement | TextElement | ContainerElement | ButtonElement

// --- Data sources --------------------------------------------------------------------
//
// A data source is a named, typed static value that lives ALONGSIDE the element tree. In the
// generated *Class* output it becomes a field on the plugin — a shared string, or a collection a
// "template" element repeats over — and bound elements reference it. On every other path (the UX
// snippet, the AddUi JSON, the Selected view, and the live preview) the value is INLINED per element
// (and, for lists, per item), so the preview always ships plain static CUI. Deliberately small for
// now: `text` is wired end-to-end; `list` is modelled for the forthcoming repeat/template work.

export type DataSourceKind = 'text' | 'list'

interface BaseDataSource {
  id: string
  /** Display name; doubles as the generated C# field identifier (sanitised at codegen time). */
  name: string
  kind: DataSourceKind
}

/** A shared string — e.g. a title or label reused by several text elements. */
export interface TextDataSource extends BaseDataSource {
  kind: 'text'
  value: string
}

/** A static collection — the sample items a template element repeats over (see `BaseElement.repeat`). */
export interface ListDataSource extends BaseDataSource {
  kind: 'list'
  items: string[]
}

/** Discriminated on `kind`. Narrow with `ds.kind === 'text'` to reach kind-specific fields. */
export type DataSource = TextDataSource | ListDataSource

/**
 * Resolve a text element's effective text: the value of its bound text data source if it has one and
 * the source exists, otherwise the element's own literal `text` prop. Pure — shared by the canvas
 * render and the inline codegen paths so they always agree on what the element displays.
 */
export function resolveText(el: DesignerElement, sources: DataSource[]): string {
  if (el.type !== 'text') return ''
  const dsId = el.bindings?.text
  if (dsId) {
    const ds = sources.find((s) => s.id === dsId)
    if (ds?.kind === 'text') return ds.value
  }
  return el.props.text
}

// --- AddUi wire types ----------------------------------------------------------------
//
// The exact JSON shape `CuiHelper.AddUi(player, json)` consumes on the server: a
// CuiElementContainer is just a `CuiElement[]`. These are the canonical types for the
// live-preview transport (issue #3) — `generateAddUiJson` emits them, the diff engine
// consumes them, and the RPC payload ships them verbatim. Field names are the lowercase
// keys the Rust/Oxide CUI deserializer expects; do not rename them.

/** RectTransform component — anchors as "x y" fractions, offsets as "x y" reference px. */
export interface CuiRectTransform {
  type: 'RectTransform'
  anchormin: string
  anchormax: string
  offsetmin: string
  offsetmax: string
}

/** Solid-color panel fill. */
export interface CuiImageComponent {
  type: 'UnityEngine.UI.Image'
  color: string
}

/** URL/raw image fill — `color` is the image tint. */
export interface CuiRawImageComponent {
  type: 'UnityEngine.UI.RawImage'
  url: string
  color: string
}

/** Text component (a CuiLabel expands to this + a RectTransform). */
export interface CuiTextComponent {
  type: 'UnityEngine.UI.Text'
  text: string
  fontSize: number
  font: string
  align: TextAlign
  color: string
}

/** Clickable button — `color` is the button image color; `command` runs on click. */
export interface CuiButtonComponent {
  type: 'UnityEngine.UI.Button'
  command: string
  color: string
}

export type CuiComponent = CuiImageComponent | CuiRawImageComponent | CuiTextComponent | CuiButtonComponent | CuiRectTransform

/**
 * One CUI element. `update: true` patches the element in place (no destroy/recreate, no flicker) —
 * the live-preview transport sets it on every steady-state upsert so re-sending the full snapshot
 * never flashes. Omitted (falsy) on a fresh create.
 */
export interface CuiElement {
  name: string
  parent: string
  components: CuiComponent[]
  update?: boolean
}

/** A resolved rectangle in CUI space (x,y = bottom-left corner, +y up). */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type AspectPreset = '16:9' | '16:10' | '21:9' | '4:3' | '32:9'

/**
 * The canvas models Rust's "match height" canvas scaler: the reference height is
 * constant (720) and the reference width grows with the aspect ratio. This makes the
 * relative-vs-fixed behaviour faithful — fixed-px offsets keep their size across
 * aspect ratios while relative anchors reflow as the width changes.
 */
export interface CanvasConfig {
  referenceHeight: number
  aspect: AspectPreset
  /** Rust client UI layer the root attaches to (drives the generated parent). */
  rootLayer: ClientPanel
}

export const ASPECT_RATIOS: Record<AspectPreset, [number, number]> = {
  '16:9': [16, 9],
  '16:10': [16, 10],
  '21:9': [21, 9],
  '4:3': [4, 3],
  '32:9': [32, 9],
}

export const ASPECT_PRESETS = Object.keys(ASPECT_RATIOS) as AspectPreset[]
