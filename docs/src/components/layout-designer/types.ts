// Data model for the Layout Designer.
//
// All positional values are stored in CUI-native convention so they map 1:1 to the
// values that will eventually be emitted as code:
//   - anchors  (anchorMin / anchorMax): 0..1, relative to the parent's rect
//   - offsets  (offsetMin / offsetMax): pixels, in the canvas reference space
//   - Y axis is BOTTOM-UP (origin bottom-left), exactly like Unity RectTransform / CUI
// The DOM (top-down) conversion happens only at render time in geometry.ts.

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

export type ElementType = 'panel' | 'text'

/** Addable element types, in the order shown by the toolbar's "Add" picker. */
export interface ElementTypeDef {
  type: ElementType
  label: string
}
export const ELEMENT_TYPES: ElementTypeDef[] = [
  { type: 'panel', label: 'Panel' },
  { type: 'text', label: 'Text' },
]

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

/** Fields shared by every element regardless of type. */
interface BaseElement {
  id: string
  name: string
  /** null => positioned against the root canvas. */
  parentId: string | null
  anchorMin: Vec2
  anchorMax: Vec2
  offsetMin: Vec2
  offsetMax: Vec2
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
export type DesignerElement = PanelElement | TextElement

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

export type CuiComponent = CuiImageComponent | CuiRawImageComponent | CuiTextComponent | CuiRectTransform

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
