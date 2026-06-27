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

export type ElementType = 'panel'

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

export interface PanelProps {
  /** Panel background color — or, when an image fill is set, the image's tint. */
  color: ColorRGBA
  /** Optional image fill. Absent/null => plain solid-color panel (unchanged legacy behavior). */
  image?: ImageFill | null
}

export interface DesignerElement {
  id: string
  type: ElementType
  name: string
  /** null => positioned against the root canvas. */
  parentId: string | null
  anchorMin: Vec2
  anchorMax: Vec2
  offsetMin: Vec2
  offsetMax: Vec2
  props: PanelProps
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
