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

export interface PanelProps {
  color: ColorRGBA
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
}

export const ASPECT_RATIOS: Record<AspectPreset, [number, number]> = {
  '16:9': [16, 9],
  '16:10': [16, 10],
  '21:9': [21, 9],
  '4:3': [4, 3],
  '32:9': [32, 9],
}

export const ASPECT_PRESETS = Object.keys(ASPECT_RATIOS) as AspectPreset[]
