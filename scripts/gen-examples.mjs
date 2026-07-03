// Regenerates docs/src/components/layout-designer/examples.ts from the real element factories,
// so the bundled example layouts always match the registry's current defaults (geometry, props,
// seeded children). Run via `npm run generate:examples` after changing element factories or the
// sample definitions below.
import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const registrySrc = path.join(rootDir, 'docs', 'src', 'components', 'layout-designer', 'elements', 'registry.ts')
const outputPath = path.join(rootDir, 'docs', 'src', 'components', 'layout-designer', 'examples.ts')

// The factories are TS — bundle the registry to a temp ESM module first.
const tmp = mkdtempSync(path.join(tmpdir(), 'ld-examples-'))
const bundle = path.join(tmp, 'registry.bundle.mjs')
execFileSync(path.join(rootDir, 'node_modules', '.bin', 'esbuild'), [registrySrc, '--bundle', '--format=esm', `--outfile=${bundle}`, '--log-level=error'])
const { getDefinition } = await import(`file://${bundle}`)

const V = (x, y) => ({ x, y })
// All card backdrops are FULLY OPAQUE — a translucent card lets the in-game world bleed through the
// example, which reads as broken rather than intentional. Translucency is demoed inside a card
// against a sibling panel instead (see the Panel example).
const BG = { r: 0.08, g: 0.09, b: 0.11, a: 1 }
const STRIP = { r: 0.12, g: 0.13, b: 0.16, a: 1 }
const WELL = { r: 0.05, g: 0.06, b: 0.08, a: 1 }
const WHITE = { r: 0.95, g: 0.95, b: 0.97, a: 1 }
const DIM = { r: 0.55, g: 0.58, b: 0.64, a: 1 }
const ORANGE = { r: 0.99, g: 0.35, b: 0.23, a: 1 }
const BLUE = { r: 0.2, g: 0.55, b: 0.85, a: 1 }
const GREEN = { r: 0.25, g: 0.7, b: 0.45, a: 1 }
const TINT = { r: 1, g: 1, b: 1, a: 1 }

// The Carbon logo as a plain PNG on the project's own default branch — a stable https source the
// Rust client can decode (it only handles png/jpg; the docs site's local logos are webp).
const LOGO_URL = 'https://raw.githubusercontent.com/CarbonCommunity/Carbon/main/NuGet-ICON.png'
/** Canonical example SteamID64 (Valve's STEAM_0:0:11101 test account) — not a real player's id. */
const AVATAR_ID = '76561197960287930'

/**
 * Each sample is a fresh mini-scene: ids restart at el-1, a solid card with a title strip and a dim
 * footer hint, then the subject element(s) built through the registry factory (so defaults stay
 * truthful) with targeted overrides. `opts.w/h` size the card; `opts.cardOver` merges into the card's
 * mk() overrides (e.g. cursor/keyboard modifiers so interactive examples work in-game).
 */
function layout(id, category, name, hint, build, opts = {}) {
  let n = 0
  const els = []
  const alloc = () => `el-${++n}`
  const mk = (type, parentId, over = {}) => {
    const el = getDefinition(type).create({ id: alloc(), n, parentId, index: els.length, color: over.color || ORANGE })
    if (over.geom) Object.assign(el, over.geom)
    if (over.props) el.props = { ...el.props, ...over.props }
    if (over.modifiers) el.modifiers = over.modifiers
    if (over.name) el.name = over.name
    els.push(el)
    const seeds = getDefinition(type).seedChildren?.(el, (t, pid) => getDefinition(t).create({ id: alloc(), n, parentId: pid, index: els.length, color: WHITE })) || []
    for (const s of seeds) {
      if (over.labelText && s.type === 'text') s.props.text = over.labelText
      els.push(s)
    }
    return el
  }
  const w = opts.w ?? 220
  const h = opts.h ?? 150
  const over = opts.cardOver ?? {}
  const card = mk('panel', null, {
    name: 'Card',
    geom: { anchorMin: V(0.5, 0.5), anchorMax: V(0.5, 0.5), offsetMin: V(-w, -h), offsetMax: V(w, h) },
    props: { color: BG },
    ...over,
    // Every card frees the mouse — browsing the examples in-game shouldn't fight the camera.
    modifiers: { cursor: true, ...(over.modifiers ?? {}) },
  })
  const head = mk('panel', card.id, { name: 'TitleStrip', geom: { anchorMin: V(0, 1), anchorMax: V(1, 1), offsetMin: V(0, -36), offsetMax: V(0, 0) }, props: { color: STRIP } })
  mk('text', head.id, {
    name: 'Title',
    geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(14, 0), offsetMax: V(-14, 0) },
    props: { color: ORANGE, text: name.toUpperCase(), fontSize: 15, font: 'RobotoCondensedBold', align: 'MiddleLeft' },
  })
  mk('text', card.id, {
    name: 'Hint',
    geom: { anchorMin: V(0, 0), anchorMax: V(1, 0), offsetMin: V(14, 8), offsetMax: V(-14, 26) },
    props: { color: DIM, text: hint, fontSize: 11, font: 'RobotoCondensedRegular', align: 'MiddleLeft' },
  })
  build(mk, card)
  return { id, name, hint, category, data: { elements: els, canvas: { aspect: '16:9', rootLayer: 'Overlay' } } }
}

const C = (min, max) => ({ anchorMin: V(0.5, 0.5), anchorMax: V(0.5, 0.5), offsetMin: min, offsetMax: max })

const samples = [
  // --- elements ---------------------------------------------------------------------
  layout('panel', 'element', 'Panel', 'Solid boxes are the building block — the last one is translucent over a sibling, not the game.', (mk, card) => {
    mk('panel', card.id, { name: 'Solid.A', geom: C(V(-180, -55), V(-70, 55)), props: { color: ORANGE } })
    mk('panel', card.id, { name: 'Solid.B', geom: C(V(-55, -55), V(55, 55)), props: { color: BLUE } })
    mk('panel', card.id, { name: 'Solid.C', geom: C(V(70, -55), V(180, 55)), props: { color: GREEN } })
    mk('panel', card.id, { name: 'Dimmer', geom: C(V(10, -75), V(196, 5)), props: { color: { r: 0.05, g: 0.06, b: 0.08, a: 0.65 } } })
  }),
  layout('text', 'element', 'Text', 'Content, font, size, color and a 3x3 alignment grid.', (mk, card) => {
    mk('text', card.id, { name: 'Font.Regular', geom: C(V(-190, 32), V(190, 62)), props: { color: WHITE, text: 'Roboto Condensed — the Rust default', fontSize: 16, font: 'RobotoCondensedRegular', align: 'MiddleLeft' } })
    mk('text', card.id, { name: 'Font.Bold', geom: C(V(-190, 2), V(190, 32)), props: { color: WHITE, text: 'Roboto Condensed Bold for emphasis', fontSize: 16, font: 'RobotoCondensedBold', align: 'MiddleLeft' } })
    mk('text', card.id, { name: 'Font.Marker', geom: C(V(-190, -30), V(190, 2)), props: { color: ORANGE, text: 'Permanent Marker for flavor', fontSize: 15, font: 'PermanentMarker', align: 'MiddleLeft' } })
    mk('text', card.id, { name: 'Font.Pixel', geom: C(V(-190, -62), V(190, -30)), props: { color: BLUE, text: 'PRESS START 2P', fontSize: 11, font: 'PressStart', align: 'MiddleRight' } })
  }),
  layout('container', 'element', 'Container', 'The wrapper has no graphic — select it in the tree and move all four chips at once.', (mk, card) => {
    const grid = mk('container', card.id, { name: 'ChipGrid', geom: C(V(-90, -70), V(90, 60)) })
    const chip = (nm, aMin, aMax, color) => mk('panel', grid.id, { name: nm, geom: { anchorMin: aMin, anchorMax: aMax, offsetMin: V(4, 4), offsetMax: V(-4, -4) }, props: { color } })
    chip('Chip.TL', V(0, 0.5), V(0.5, 1), ORANGE)
    chip('Chip.TR', V(0.5, 0.5), V(1, 1), BLUE)
    chip('Chip.BL', V(0, 0), V(0.5, 0.5), GREEN)
    chip('Chip.BR', V(0.5, 0), V(1, 0.5), STRIP)
  }),
  layout(
    'button',
    'element',
    'Button',
    'Runs a console command on click; the caption is a child Text. Needs cursor frees the mouse.',
    (mk, card) => {
      mk('button', card.id, { name: 'Confirm', geom: C(V(-150, -30), V(-10, 10)), props: { color: ORANGE, command: 'ui.demo confirm' }, labelText: 'CONFIRM' })
      mk('button', card.id, { name: 'Cancel', geom: C(V(10, -30), V(150, 10)), props: { color: STRIP, command: 'ui.demo cancel' }, labelText: 'Cancel' })
    },
    {},
  ),
  layout(
    'input',
    'element',
    'Input field',
    'Submits typed text to a command. Needs keyboard captures focus; the second field masks input.',
    (mk, card) => {
      const well = (nm, y0, y1) => mk('panel', card.id, { name: nm, geom: C(V(-170, y0), V(170, y1)), props: { color: WELL } })
      const w1 = well('Well.Name', 12, 48)
      mk('input', w1.id, { name: 'Input.Name', geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(10, 0), offsetMax: V(-10, 0) }, props: { color: WHITE, text: 'type here...', command: 'ui.demo name', charLimit: 32, align: 'MiddleLeft' } })
      const w2 = well('Well.Pass', -40, -4)
      mk('input', w2.id, { name: 'Input.Password', geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(10, 0), offsetMax: V(-10, 0) }, props: { color: WHITE, text: 'hunter2', command: 'ui.demo pass', charLimit: 32, align: 'MiddleLeft', password: true } })
    },
    { cardOver: { modifiers: { keyboard: true } } },
  ),
  layout('countdown', 'element', 'Countdown', 'A client-side timer — %TIME_LEFT% in the text is replaced as it counts 120 down to 0.', (mk, card) => {
    mk('countdown', card.id, { name: 'Timer', geom: C(V(-140, -35), V(140, 45)), props: { color: WHITE, text: '%TIME_LEFT%', fontSize: 42, font: 'RobotoCondensedBold', align: 'MiddleCenter', startTime: 120, endTime: 0, step: 1 } })
  }),

  // --- image fills ------------------------------------------------------------------
  layout('fill-url', 'fill', 'Image: URL', 'Any https png/jpg, downloaded by the client at runtime. Panel color is the tint.', (mk, card) => {
    mk('panel', card.id, { name: 'Logo', geom: C(V(-55, -65), V(55, 45)), props: { color: TINT, image: { kind: 'url', url: LOGO_URL } } })
  }),
  layout('fill-sprite', 'fill', 'Image: Sprite', 'A built-in client sprite by asset path, tinted three ways. Invalid paths can crash the client.', (mk, card) => {
    const sprite = 'assets/content/ui/ui.background.tile.psd'
    mk('panel', card.id, { name: 'Sprite.Warm', geom: C(V(-180, -55), V(-70, 55)), props: { color: ORANGE, image: { kind: 'sprite', sprite } } })
    mk('panel', card.id, { name: 'Sprite.Cool', geom: C(V(-55, -55), V(55, 55)), props: { color: BLUE, image: { kind: 'sprite', sprite } } })
    mk('panel', card.id, { name: 'Sprite.Plain', geom: C(V(70, -55), V(180, 55)), props: { color: TINT, image: { kind: 'sprite', sprite } } })
  }),
  layout('fill-itemicon', 'fill', 'Image: Item icon', "An item's inventory icon by item id (+ optional skin id) — here, the Tool Cupboard.", (mk, card) => {
    const well = mk('panel', card.id, { name: 'IconWell', geom: C(V(-60, -70), V(60, 50)), props: { color: WELL } })
    mk('panel', well.id, { name: 'Icon.TC', geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(10, 10), offsetMax: V(-10, -10) }, props: { color: TINT, image: { kind: 'itemicon', itemId: -97956382, skinId: 0 } } })
  }),
  layout('fill-steamavatar', 'fill', 'Image: Steam avatar', "A player's avatar by SteamID64 — fetched by the client, no server preload needed.", (mk, card) => {
    const frame = mk('panel', card.id, { name: 'AvatarFrame', geom: C(V(-58, -68), V(58, 48)), props: { color: STRIP } })
    mk('panel', frame.id, { name: 'Avatar', geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(4, 4), offsetMax: V(-4, -4) }, props: { color: TINT, image: { kind: 'steamavatar', steamId: AVATAR_ID } } })
  }),
  layout('fill-imagedb', 'fill', 'Image: Image DB', 'A named image preloaded into the image database on plugin load — see the generated lifecycle.', (mk, card) => {
    mk('panel', card.id, { name: 'DbLogo', geom: C(V(-55, -65), V(55, 45)), props: { color: TINT, image: { kind: 'imagedb', dbName: 'carbon_logo', url: LOGO_URL } } })
  }),

  // --- modifiers --------------------------------------------------------------------
  layout('outline', 'modifier', 'Outline', 'A colored duplicate offset behind the graphic — glow on text, drop shadow on panels.', (mk, card) => {
    mk('text', card.id, { name: 'Glow', geom: C(V(-190, 10), V(190, 60)), props: { color: WHITE, text: 'OUTLINED HEADLINE', fontSize: 26, font: 'RobotoCondensedBold', align: 'MiddleCenter' }, modifiers: { outline: { color: ORANGE, distance: V(1.5, -1.5) } } })
    mk('panel', card.id, { name: 'Shadowed', geom: C(V(-70, -70), V(70, -10)), props: { color: BLUE }, modifiers: { outline: { color: { r: 0, g: 0, b: 0, a: 0.9 }, distance: V(4, -4) } } })
  }),
  layout('border', 'modifier', 'Border', 'An inset frame drawn as four edge panels — width and color per panel.', (mk, card) => {
    mk('panel', card.id, { name: 'Framed.Thin', geom: C(V(-180, -60), V(-70, 55)), props: { color: STRIP, border: { width: 1, color: DIM } } })
    mk('panel', card.id, { name: 'Framed.Accent', geom: C(V(-55, -60), V(55, 55)), props: { color: STRIP, border: { width: 3, color: ORANGE } } })
    mk('panel', card.id, { name: 'Framed.Chunky', geom: C(V(70, -60), V(180, 55)), props: { color: WELL, border: { width: 6, color: BLUE } } })
  }),
  layout(
    'drag-slot',
    'modifier',
    'Draggable & Slot',
    'Drag the orange chip between the two wells — slots catch draggables with a matching filter.',
    (mk, card) => {
      const slotWell = (nm, x0, x1) => mk('panel', card.id, { name: nm, geom: C(V(x0, -55), V(x1, 45)), props: { color: WELL }, modifiers: { slot: { filter: 'demo.chip' } } })
      const left = slotWell('Slot.Left', -170, -30)
      slotWell('Slot.Right', 30, 170)
      mk('panel', left.id, { name: 'Chip', geom: { anchorMin: V(0.5, 0.5), anchorMax: V(0.5, 0.5), offsetMin: V(-40, -40), offsetMax: V(40, 40) }, props: { color: ORANGE }, modifiers: { draggable: { filter: 'demo.chip', dropAnywhere: false } } })
    },
    {},
  ),

  // --- showcase ---------------------------------------------------------------------
  layout(
    'showcase-welcome',
    'showcase',
    'Showcase: Welcome panel',
    'Everything composed: fills, fonts, buttons, a countdown footer — a template to pick apart.',
    (mk, card) => {
      const head = mk('panel', card.id, { name: 'Header', geom: { anchorMin: V(0, 1), anchorMax: V(1, 1), offsetMin: V(12, -102), offsetMax: V(-12, -44) }, props: { color: STRIP } })
      const av = mk('panel', head.id, { name: 'HeaderAvatar', geom: { anchorMin: V(0, 0.5), anchorMax: V(0, 0.5), offsetMin: V(8, -21), offsetMax: V(50, 21) }, props: { color: TINT, image: { kind: 'steamavatar', steamId: AVATAR_ID } } })
      mk('panel', av.id, { name: 'AvatarRing', geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(-2, -2), offsetMax: V(2, 2) }, props: { color: { r: 0, g: 0, b: 0, a: 0 }, border: { width: 2, color: ORANGE } } })
      mk('text', head.id, { name: 'Welcome', geom: { anchorMin: V(0, 0.5), anchorMax: V(1, 1), offsetMin: V(60, -2), offsetMax: V(-10, 0) }, props: { color: WHITE, text: 'Welcome back, survivor', fontSize: 16, font: 'RobotoCondensedBold', align: 'MiddleLeft' } })
      mk('text', head.id, { name: 'Sub', geom: { anchorMin: V(0, 0), anchorMax: V(1, 0.5), offsetMin: V(60, 2), offsetMax: V(-10, 2) }, props: { color: DIM, text: 'Your daily kit is ready to claim.', fontSize: 12, font: 'RobotoCondensedRegular', align: 'MiddleLeft' } })
      const body = mk('panel', card.id, { name: 'KitRow', geom: C(V(-248, -52), V(248, 26)), props: { color: WELL } })
      mk('panel', body.id, { name: 'KitIcon', geom: { anchorMin: V(0, 0.5), anchorMax: V(0, 0.5), offsetMin: V(10, -28), offsetMax: V(66, 28) }, props: { color: TINT, image: { kind: 'itemicon', itemId: -97956382, skinId: 0 } } })
      mk('text', body.id, { name: 'KitText', geom: { anchorMin: V(0, 0), anchorMax: V(1, 1), offsetMin: V(76, 0), offsetMax: V(-160, 0) }, props: { color: WHITE, text: 'Starter kit — building plan, tools and a Tool Cupboard.', fontSize: 13, font: 'RobotoCondensedRegular', align: 'MiddleLeft' } })
      mk('button', body.id, { name: 'Claim', geom: { anchorMin: V(1, 0.5), anchorMax: V(1, 0.5), offsetMin: V(-148, -20), offsetMax: V(-10, 20) }, props: { color: ORANGE, command: 'kit.claim daily' }, labelText: 'CLAIM KIT' })
      mk('text', card.id, { name: 'WipeLabel', geom: { anchorMin: V(0, 0), anchorMax: V(0.5, 0), offsetMin: V(14, 30), offsetMax: V(0, 48) }, props: { color: DIM, text: 'Next wipe in', fontSize: 12, font: 'RobotoCondensedRegular', align: 'MiddleLeft' } })
      mk('countdown', card.id, { name: 'WipeTimer', geom: { anchorMin: V(0, 0), anchorMax: V(0.5, 0), offsetMin: V(88, 26), offsetMax: V(240, 52) }, props: { color: ORANGE, text: '%TIME_LEFT%', fontSize: 18, font: 'RobotoCondensedBold', align: 'MiddleLeft', startTime: 3600, endTime: 0, step: 1 } })
      mk('button', card.id, { name: 'Dismiss', geom: { anchorMin: V(1, 0), anchorMax: V(1, 0), offsetMin: V(-110, 26), offsetMax: V(-14, 54) }, props: { color: STRIP, command: 'ui.demo dismiss' }, labelText: 'Dismiss' })
    },
    { w: 264, h: 174 },
  ),
]

const header = `// Bundled example layouts for the Layout Designer — one card per element / fill / modifier plus a
// composed showcase, each a self-labeled mini scene on a solid backdrop (translucency would let the
// in-game world bleed through). Powers File > Load examples and the Help gallery.
// GENERATED by scripts/gen-examples.mjs (npm run generate:examples) — regenerate rather than hand-edit.

import type { LayoutData } from './useDesigner'

export interface ExampleLayout {
  id: string
  name: string
  hint: string
  category: 'element' | 'fill' | 'modifier' | 'showcase'
  data: LayoutData
  /** Gallery screenshot (in-game render), added once captured. */
  image?: string
}

export const EXAMPLE_LAYOUTS: ExampleLayout[] = `

await fs.writeFile(outputPath, header + JSON.stringify(samples, null, 2) + '\n')
await fs.rm(tmp, { recursive: true, force: true })
console.log(`wrote ${path.relative(rootDir, outputPath)} (${samples.length} examples)`)
