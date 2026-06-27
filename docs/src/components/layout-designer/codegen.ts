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
import type { DesignerElement, Provider, Vec2 } from './types'

/** Root parent for top-level panels. "Overlay" is the standard full-screen CUI layer. */
const ROOT_PARENT = 'Overlay'

/** Format a rounded number without a trailing ".0" or a stray "-0". */
function num(v: number, decimals: number): string {
  const r = round(v, decimals)
  return Object.is(r, -0) ? '0' : String(r)
}

/** Escape a value so it is safe inside a C# double-quoted string literal. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

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

function parentName(el: DesignerElement, names: Map<string, string>): string {
  return el.parentId ? names.get(el.parentId) ?? ROOT_PARENT : ROOT_PARENT
}

// --- Oxide CUI -----------------------------------------------------------------------

function genOxide(elements: DesignerElement[], names: Map<string, string>): string {
  const out: string[] = ['var container = new CuiElementContainer();', '']
  for (const el of elements) {
    out.push(
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
      `}, "${esc(parentName(el, names))}", "${esc(names.get(el.id)!)}");`,
      ''
    )
  }
  out.push('CuiHelper.AddUi(player, container);')
  return out.join('\n')
}

// --- Carbon LUI ----------------------------------------------------------------------

function genCarbon(elements: DesignerElement[], names: Map<string, string>): string {
  const out: string[] = ['using CUI cui = new CUI(CuiHandler);', '']
  for (const el of elements) {
    out.push(
      `cui.v2.CreatePanel("${esc(parentName(el, names))}",`,
      `    new LuiPosition(${lf(el.anchorMin.x, 4)}, ${lf(el.anchorMin.y, 4)}, ${lf(el.anchorMax.x, 4)}, ${lf(el.anchorMax.y, 4)}),`,
      `    new LuiOffset(${lf(el.offsetMin.x, 2)}, ${lf(el.offsetMin.y, 2)}, ${lf(el.offsetMax.x, 2)}, ${lf(el.offsetMax.y, 2)}),`,
      `    "${cuiColorString(el.props.color)}", "${esc(names.get(el.id)!)}");`,
      ''
    )
  }
  out.push('cui.v2.SendUi(player);')
  return out.join('\n')
}

// --- public --------------------------------------------------------------------------

/** Generate C# source for the given elements, targeting the chosen provider. */
export function generateCode(elements: DesignerElement[], provider: Provider): string {
  if (!elements.length) return '// Add a panel to generate code.'
  const names = buildNames(elements)
  if (provider === 'oxide') return genOxide(elements, names)
  if (provider === 'carbon') return genCarbon(elements, names)
  // both: Carbon compiles with the CARBON symbol defined; Oxide does not.
  return ['#if CARBON', genCarbon(elements, names), '#else', genOxide(elements, names), '#endif'].join('\n')
}
