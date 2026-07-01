// Pure geometry layer for the Layout Designer.
//
// Everything here is a pure function so the captured values can be trusted and unit-tested
// independently of the Vue rendering. CUI space is +y up (origin bottom-left); the DOM is
// +y down, so the y axis is flipped only when producing render boxes.

import type { CanvasConfig, ColorRGBA, DesignerElement, Rect, Vec2 } from './types'
import { ASPECT_RATIOS } from './types'

const MIN_SIZE = 1 // CUI px — keeps an element from inverting while dragging

// --- canvas dimensions ---------------------------------------------------------------
//
// Rust's CUI uses a Unity CanvasScaler with a fixed reference resolution (1280×720, i.e. 16:9) in
// **Expand** screen-match mode: the scale factor is `min(screenW/1280, screenH/720)`, so the canvas
// grows to never be smaller than the reference — it pins whichever dimension is MORE constrained.
//   - screen WIDER than 16:9  → height is pinned to the reference height; width grows.
//   - screen NARROWER (taller) → width is pinned to the reference width; height grows.
//   - exactly 16:9 → both are 1280×720.
// CRUCIALLY this reference is FIXED, not the screen resolution: Expand makes the logical canvas
// resolution-INDEPENDENT for a given aspect, so 16:9 is 1280×720 at 720p/1080p/1440p alike, 4:3 is
// always 1280×960, 32:9 always 2560×720. Only the ASPECT changes the logical size. So the reference
// height is a constant 720 — it must never track the screen resolution (doing so renders the design at
// the wrong scale vs. the game). Verified 1:1 in-game at 16:9 1440p and against 4:3 (1280×960) captures.

/** Reference aspect — Rust's CUI reference resolution is 1280×720. */
const REFERENCE_ASPECT = 16 / 9
/** Rust's CUI reference height in CUI px — fixed (see above), never the screen resolution. */
const REFERENCE_HEIGHT = 720

function screenAspect(cfg: CanvasConfig): number {
  const [aw, ah] = ASPECT_RATIOS[cfg.aspect]
  return aw / ah
}

/** Effective canvas width in CUI px at the chosen aspect (Expand: pinned to the reference width when
 *  the screen is narrower than 16:9, otherwise grows with the aspect). */
export function canvasWidth(cfg: CanvasConfig): number {
  const a = screenAspect(cfg)
  return a >= REFERENCE_ASPECT ? REFERENCE_HEIGHT * a : REFERENCE_HEIGHT * REFERENCE_ASPECT
}

/** Effective canvas height in CUI px at the chosen aspect (Expand: pinned to the reference height when
 *  the screen is wider than 16:9, otherwise grows as the screen gets taller). */
export function canvasHeight(cfg: CanvasConfig): number {
  const a = screenAspect(cfg)
  return a >= REFERENCE_ASPECT ? REFERENCE_HEIGHT : (REFERENCE_HEIGHT * REFERENCE_ASPECT) / a
}

/** Root canvas rect in CUI space. */
export function rootRect(cfg: CanvasConfig): Rect {
  return { x: 0, y: 0, w: canvasWidth(cfg), h: canvasHeight(cfg) }
}

export interface Display {
  displayW: number
  displayH: number
  /** on-screen pixels per CUI reference pixel */
  scale: number
}

/** Fit the reference canvas into the available container, preserving aspect ratio. */
export function canvasDisplay(containerW: number, containerH: number, cfg: CanvasConfig): Display {
  const refW = canvasWidth(cfg)
  const refH = canvasHeight(cfg)
  const scale = Math.max(0, Math.min(containerW / refW, containerH / refH))
  return { displayW: refW * scale, displayH: refH * scale, scale }
}

// --- resolving rects -----------------------------------------------------------------

/** Resolve an element's rect (CUI space) given its parent's resolved rect. */
export function resolveRect(el: DesignerElement, parent: Rect): Rect {
  const left = parent.x + el.anchorMin.x * parent.w + el.offsetMin.x
  const right = parent.x + el.anchorMax.x * parent.w + el.offsetMax.x
  const bottom = parent.y + el.anchorMin.y * parent.h + el.offsetMin.y
  const top = parent.y + el.anchorMax.y * parent.h + el.offsetMax.y
  return { x: left, y: bottom, w: right - left, h: top - bottom }
}

export interface DomBox {
  left: number
  top: number
  width: number
  height: number
}

/**
 * DOM box (top-left origin, on-screen px) of an element relative to its parent's content
 * box. Used by the recursive renderer where each element is an absolutely-positioned div
 * inside its parent's div.
 */
export function localDomBox(el: DesignerElement, parentW: number, parentH: number, scale: number): DomBox {
  const left = el.anchorMin.x * parentW + el.offsetMin.x
  const right = el.anchorMax.x * parentW + el.offsetMax.x
  const bottom = el.anchorMin.y * parentH + el.offsetMin.y
  const top = el.anchorMax.y * parentH + el.offsetMax.y
  return {
    left: left * scale,
    top: (parentH - top) * scale, // flip y: DOM top = distance from parent's top edge
    width: (right - left) * scale,
    height: (top - bottom) * scale,
  }
}

// --- mutation transforms -------------------------------------------------------------
// Deltas are in CUI units (px in reference space), +y up. Callers convert screen px to
// CUI units by dividing by `scale` and negating dy (screen y is down).

export interface OffsetPatch {
  offsetMin: Vec2
  offsetMax: Vec2
}

export interface AnchorPatch extends OffsetPatch {
  anchorMin: Vec2
  anchorMax: Vec2
}

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** Move: shift both offsets equally; anchors unchanged. */
export function applyMove(el: DesignerElement, dxCui: number, dyCui: number): OffsetPatch {
  return {
    offsetMin: { x: el.offsetMin.x + dxCui, y: el.offsetMin.y + dyCui },
    offsetMax: { x: el.offsetMax.x + dxCui, y: el.offsetMax.y + dyCui },
  }
}

/**
 * Resize a single edge/corner; anchors unchanged. Guards against inversion. When `symmetric`
 * (Alt held), the opposite edge mirrors the drag so the box scales from its center.
 */
export function applyResize(
  el: DesignerElement,
  parentW: number,
  parentH: number,
  edge: ResizeEdge,
  dxCui: number,
  dyCui: number,
  symmetric = false
): OffsetPatch {
  let left = el.anchorMin.x * parentW + el.offsetMin.x
  let right = el.anchorMax.x * parentW + el.offsetMax.x
  let bottom = el.anchorMin.y * parentH + el.offsetMin.y
  let top = el.anchorMax.y * parentH + el.offsetMax.y

  if (symmetric) {
    if (edge.includes('w')) (left += dxCui), (right -= dxCui)
    if (edge.includes('e')) (right += dxCui), (left -= dxCui)
    if (edge.includes('s')) (bottom += dyCui), (top -= dyCui)
    if (edge.includes('n')) (top += dyCui), (bottom -= dyCui)
    if (right - left < MIN_SIZE) {
      const c = (left + right) / 2
      left = c - MIN_SIZE / 2
      right = c + MIN_SIZE / 2
    }
    if (top - bottom < MIN_SIZE) {
      const c = (bottom + top) / 2
      bottom = c - MIN_SIZE / 2
      top = c + MIN_SIZE / 2
    }
  } else {
    if (edge.includes('w')) left = Math.min(left + dxCui, right - MIN_SIZE)
    if (edge.includes('e')) right = Math.max(right + dxCui, left + MIN_SIZE)
    if (edge.includes('s')) bottom = Math.min(bottom + dyCui, top - MIN_SIZE)
    if (edge.includes('n')) top = Math.max(top + dyCui, bottom + MIN_SIZE)
  }

  return {
    offsetMin: { x: left - el.anchorMin.x * parentW, y: bottom - el.anchorMin.y * parentH },
    offsetMax: { x: right - el.anchorMax.x * parentW, y: top - el.anchorMax.y * parentH },
  }
}

/**
 * Re-anchor an element to new anchors while keeping it visually in place (Unity's anchor-
 * preset behaviour). This is the relative <-> fixed transform: offsets are recomputed so
 * the resolved rect is unchanged.
 */
export function applyAnchorPreset(
  el: DesignerElement,
  parentW: number,
  parentH: number,
  anchorMin: Vec2,
  anchorMax: Vec2
): AnchorPatch {
  const left = el.anchorMin.x * parentW + el.offsetMin.x
  const right = el.anchorMax.x * parentW + el.offsetMax.x
  const bottom = el.anchorMin.y * parentH + el.offsetMin.y
  const top = el.anchorMax.y * parentH + el.offsetMax.y

  return {
    anchorMin: { ...anchorMin },
    anchorMax: { ...anchorMax },
    offsetMin: { x: left - anchorMin.x * parentW, y: bottom - anchorMin.y * parentH },
    offsetMax: { x: right - anchorMax.x * parentW, y: top - anchorMax.y * parentH },
  }
}

// --- snapping & bounds ---------------------------------------------------------------

/** Snap to the nearest grid multiple (grid <= 1 => snap to whole pixels; never fractional). */
export function snapTo(v: number, grid: number): number {
  if (!grid || grid <= 1) return Math.round(v)
  return Math.round(v / grid) * grid
}

/** Snap a move patch: align the min edge to the grid, keep the element's size exact. */
export function snapMovePatch(snapshot: DesignerElement, patch: OffsetPatch, grid: number): OffsetPatch {
  const wX = snapshot.offsetMax.x - snapshot.offsetMin.x
  const wY = snapshot.offsetMax.y - snapshot.offsetMin.y
  const minX = snapTo(patch.offsetMin.x, grid)
  const minY = snapTo(patch.offsetMin.y, grid)
  return { offsetMin: { x: minX, y: minY }, offsetMax: { x: minX + wX, y: minY + wY } }
}

export interface MoveSnapResult extends OffsetPatch {
  /** local parent-space x of the active vertical alignment guide (or null) */
  guideX: number | null
  /** local parent-space y of the active horizontal alignment guide (or null) */
  guideY: number | null
}

/**
 * Resolve a move with alignment snapping to the parent's edges and center. When the moved box's
 * left/center/right (or bottom/center/top) lands within `threshold` of the parent's
 * left/center/right (or bottom/center/top), it snaps exactly and reports the guide line. Axes
 * that don't align fall back to grid snapping.
 */
export function snapAndAlignMove(
  el: DesignerElement,
  dxCui: number,
  dyCui: number,
  parentW: number,
  parentH: number,
  grid: number,
  threshold: number,
  extraX: number[] = [],
  extraY: number[] = []
): MoveSnapResult {
  const sizeX = el.offsetMax.x - el.offsetMin.x
  const sizeY = el.offsetMax.y - el.offsetMin.y
  const rawMinX = el.offsetMin.x + dxCui
  const rawMinY = el.offsetMin.y + dyCui

  let left = el.anchorMin.x * parentW + rawMinX
  let right = el.anchorMax.x * parentW + rawMinX + sizeX
  let bottom = el.anchorMin.y * parentH + rawMinY
  let top = el.anchorMax.y * parentH + rawMinY + sizeY

  const align = (lo: number, hi: number, guides: number[]) => {
    const cands = [lo, (lo + hi) / 2, hi]
    let best = threshold
    let shift = 0
    let guide: number | null = null
    for (const c of cands)
      for (const g of guides) {
        const d = g - c
        if (Math.abs(d) < best) {
          best = Math.abs(d)
          shift = d
          guide = g
        }
      }
    return { shift, guide }
  }

  const ax = align(left, right, [0, parentW / 2, parentW, ...extraX])
  let offMinX: number
  let offMaxX: number
  if (ax.guide !== null) {
    left += ax.shift
    right += ax.shift
    offMinX = left - el.anchorMin.x * parentW
    offMaxX = right - el.anchorMax.x * parentW
  } else {
    offMinX = snapTo(rawMinX, grid)
    offMaxX = offMinX + sizeX
  }

  const ay = align(bottom, top, [0, parentH / 2, parentH, ...extraY])
  let offMinY: number
  let offMaxY: number
  if (ay.guide !== null) {
    bottom += ay.shift
    top += ay.shift
    offMinY = bottom - el.anchorMin.y * parentH
    offMaxY = top - el.anchorMax.y * parentH
  } else {
    offMinY = snapTo(rawMinY, grid)
    offMaxY = offMinY + sizeY
  }

  return {
    offsetMin: { x: offMinX, y: offMinY },
    offsetMax: { x: offMaxX, y: offMaxY },
    guideX: ax.guide,
    guideY: ay.guide,
  }
}

/** Snap a resize patch: align each dragged edge to the grid. */
export function snapResizePatch(patch: OffsetPatch, grid: number): OffsetPatch {
  return {
    offsetMin: { x: snapTo(patch.offsetMin.x, grid), y: snapTo(patch.offsetMin.y, grid) },
    offsetMax: { x: snapTo(patch.offsetMax.x, grid), y: snapTo(patch.offsetMax.y, grid) },
  }
}

/**
 * Constrain a patch so the element's resolved rect stays within [0,parentW] x [0,parentH].
 * For a move (keepSize) the whole box is shifted back in; for a resize the dragged edges are
 * clamped. Offsets are then recomputed from the clamped edges.
 */
export function clampPatchToParent(
  el: DesignerElement,
  patch: OffsetPatch,
  parentW: number,
  parentH: number,
  keepSize: boolean
): OffsetPatch {
  let left = el.anchorMin.x * parentW + patch.offsetMin.x
  let right = el.anchorMax.x * parentW + patch.offsetMax.x
  let bottom = el.anchorMin.y * parentH + patch.offsetMin.y
  let top = el.anchorMax.y * parentH + patch.offsetMax.y

  if (keepSize) {
    const w = right - left
    const h = top - bottom
    // Contain each axis: an element that fills or exceeds the parent is pinned flush, so Bounds holds it
    // in place. (To move a full-bleed label, grab its parent via "Move with parent", or turn Bounds off.)
    if (w <= parentW) {
      if (left < 0) (right -= left), (left = 0)
      if (right > parentW) (left -= right - parentW), (right = parentW)
    } else {
      left = 0
      right = w
    }
    if (h <= parentH) {
      if (bottom < 0) (top -= bottom), (bottom = 0)
      if (top > parentH) (bottom -= top - parentH), (top = parentH)
    } else {
      bottom = 0
      top = h
    }
  } else {
    left = Math.max(0, Math.min(left, parentW - MIN_SIZE))
    right = Math.min(parentW, Math.max(right, left + MIN_SIZE))
    bottom = Math.max(0, Math.min(bottom, parentH - MIN_SIZE))
    top = Math.min(parentH, Math.max(top, bottom + MIN_SIZE))
  }

  return {
    offsetMin: { x: left - el.anchorMin.x * parentW, y: bottom - el.anchorMin.y * parentH },
    offsetMax: { x: right - el.anchorMax.x * parentW, y: top - el.anchorMax.y * parentH },
  }
}

// --- formatting helpers --------------------------------------------------------------

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/** Round to a sensible number of decimals for display/inventory. */
export function round(v: number, decimals = 3): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** CSS color string from CUI 0..1 channels. */
export function cssColor(c: ColorRGBA): string {
  const to255 = (v: number) => Math.round(clamp01(v) * 255)
  return `rgba(${to255(c.r)}, ${to255(c.g)}, ${to255(c.b)}, ${round(clamp01(c.a), 3)})`
}

/** CUI color string ("r g b a", channels 0..1) — the literal value used in CUI/LUI code. */
export function cuiColorString(c: ColorRGBA): string {
  return `${round(c.r)} ${round(c.g)} ${round(c.b)} ${round(c.a)}`
}
