<script setup lang="ts">
// Help dialog: a plain-language reference for every element type, image fill and modifier, plus a
// gallery of the bundled example layouts (with in-game screenshots where captured) and links to the
// upstream Carbon LUI / Oxide CUI docs. Opened from the menubar Help button; closes on backdrop / ✕ /
// Escape. Content is data-driven (the three *_HELP arrays) so entries track the tool's feature set.
import { useEventListener } from '@vueuse/core'
import { ExternalLink, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { EXAMPLE_LAYOUTS } from './examples'
import type { ExampleLayout } from './examples'
import { useDesigner } from './useDesigner'
import { comboLabel, KEY_ACTIONS, useKeybinds } from './useKeybinds'

const emit = defineEmits<{ close: [] }>()
const { loadExampleLayouts } = useDesigner()
const { bindingFor } = useKeybinds()

// Gallery screenshots live at public/layout-designer/examples/<id>.png. Only ids listed here have a
// file — add the id when you drop the PNG in. Gating on the set avoids firing 404s for missing shots.
// Sequences are APNG loops: drag-slot (6 frames, the chip dragged left → right), scroll-list
// (4 frames, the list scrolled top → bottom), countdown (4 frames, ticking 120 → 117).
const HAS_SHOT = new Set<string>([
  'panel',
  'text',
  'container',
  'button',
  'input',
  'countdown',
  'fill-url',
  'fill-sprite',
  'fill-itemicon',
  'fill-steamavatar',
  'fill-imagedb',
  'outline',
  'border',
  'drag-slot',
  'showcase-welcome',
  'layout-stack',
  'repeat-list',
  'scroll-list',
])
const shotSrc = (id: string) => `/layout-designer/examples/${id}.png`

// Click a gallery shot to enlarge it; Escape (or any click) dismisses the zoom before the modal.
const zoomed = ref<ExampleLayout | null>(null)

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (zoomed.value) zoomed.value = null
  else emit('close')
})

function loadAll() {
  loadExampleLayouts()
  emit('close')
}

const ELEMENTS: { name: string; desc: string }[] = [
  { name: 'Panel', desc: 'A solid colored box — the basic building block. Can also carry an image fill or an inset border.' },
  { name: 'Text', desc: 'A text label: content, font, size, color and 3×3 alignment.' },
  { name: 'Button', desc: 'A clickable box that runs a console command on click; its caption is a child Text element.' },
  { name: 'Input field', desc: 'A box the player can type into, submitting its text to a command.' },
  { name: 'Countdown', desc: 'A client-side timer that counts down, replacing %TIME_LEFT% in its text.' },
]
const CONTAINERS: { name: string; desc: string }[] = [
  { name: 'Empty container', desc: 'An invisible box (RectTransform only) used purely to group and position its children — a section/wrapper with no graphic.' },
  { name: 'Nesting', desc: 'Any element can hold children — drop elements onto a panel/button in the tree and they parent to it. The empty container is just the graphic-less version for pure grouping.' },
]
const FILLS: { name: string; desc: string }[] = [
  { name: 'URL image', desc: 'Downloads a remote image at runtime (any https image URL).' },
  { name: 'Sprite', desc: 'A built-in Rust client sprite by asset path, e.g. assets/content/ui/ui.background.tile.psd. Must be a real asset — an invalid path can crash the client CUI.' },
  { name: 'File (id)', desc: 'A stored image by its SQL data id — must be loaded server-side first.' },
  { name: 'Item icon', desc: "An item's inventory icon by item id (+ optional skin id)." },
  { name: 'Steam avatar', desc: "A player's Steam avatar by SteamID64 — the client fetches it, no preload needed." },
  { name: 'Image DB', desc: "A named image preloaded from a URL into the framework's image database on plugin load." },
]
const MODIFIERS: { name: string; desc: string }[] = [
  { name: 'Needs cursor', desc: 'Frees the mouse so the player can point and click the UI. Set one per menu.' },
  { name: 'Needs keyboard', desc: 'Captures keyboard focus — required for the player to type into an input field.' },
  { name: 'Outline', desc: 'A colored duplicate offset behind the graphic — a drop-shadow / glow for panels and text.' },
  { name: 'Draggable', desc: 'The player can drag this element around the screen. Pair with a Slot for drag-and-drop.' },
  { name: 'Slot (drop target)', desc: 'A drop zone that catches draggables — like an inventory cell. Filter controls what it accepts.' },
  { name: 'Border', desc: 'An inset frame, rendered as four thin edge panels inside the panel.' },
  { name: 'Move with parent', desc: 'Editor-only: clicking/dragging this on the canvas grabs its PARENT (e.g. a label filling a button). Alt-click still selects it.' },
]
// Live bindings (Settings can rebind the actions); arrow-nudge is fixed in LayoutDesigner.vue.
const SHORTCUTS = computed<{ name: string; desc: string }[]>(() => [
  ...KEY_ACTIONS.map((a) => ({ name: comboLabel(bindingFor(a.id)), desc: a.label })),
  { name: 'Arrows', desc: 'Nudge the selection by one grid step — Shift for five.' },
  { name: 'Alt+Click', desc: 'Select a pass-through element ("Move with parent") directly.' },
])
const PREVIEW_STEPS: { name: string; desc: string }[] = [
  { name: '1 · Connect', desc: 'Add your server in the Control Panel with Bridge enabled; the account needs the draw_ui permission.' },
  { name: '2 · Target', desc: 'Open Live preview, pick the server and a target player (awake or sleeping).' },
  { name: '3 · Edit', desc: 'Start previewing — every edit streams to their screen automatically. Running countdowns and inputs are only re-pushed when they actually change.' },
]
const DATA_SOURCES: { name: string; desc: string }[] = [
  { name: 'Text source', desc: 'A named string bound to Text elements via the inspector. The Class output declares it as a field; JSON and live preview inline the value.' },
]
const GALLERY_GROUPS: { title: string; items: ExampleLayout[] }[] = (
  [
    ['Elements', 'element'],
    ['Image fills', 'fill'],
    ['Modifiers', 'modifier'],
    ['Showcase', 'showcase'],
  ] as const
).map(([title, cat]) => ({ title, items: EXAMPLE_LAYOUTS.filter((e) => e.category === cat) }))
</script>

<template>
  <div class="ld-modal-backdrop" @pointerdown.self="emit('close')">
    <div class="ld-modal ld-help" role="dialog" aria-label="Help">
      <header class="ld-modal-head">
        <span>Help — elements, fills &amp; modifiers</span>
        <button class="ld-modal-x" title="Close" @click="emit('close')"><X :size="16" /></button>
      </header>

      <div class="ld-modal-body">
        <p class="ld-help-lead">
          Build a Rust CUI/LUI layout by adding <strong>elements</strong>, giving panels an
          <strong>image fill</strong>, and attaching <strong>modifiers</strong> for behavior. Hover any
          <span class="ld-help-tip-mark">?</span> in the inspector for the same notes in place.
        </p>

        <div class="ld-help-cols">
          <div class="ld-help-col">
            <section class="ld-help-section">
              <h3>Elements</h3>
              <dl>
                <template v-for="e in ELEMENTS" :key="e.name">
                  <dt>{{ e.name }}</dt>
                  <dd>{{ e.desc }}</dd>
                </template>
              </dl>
            </section>
            <section class="ld-help-section">
              <h3>Containers</h3>
              <dl>
                <template v-for="c in CONTAINERS" :key="c.name">
                  <dt>{{ c.name }}</dt>
                  <dd>{{ c.desc }}</dd>
                </template>
              </dl>
            </section>
            <section class="ld-help-section">
              <h3>Shortcuts <span class="ld-help-note">(rebind in Settings → Keyboard shortcuts)</span></h3>
              <dl>
                <template v-for="s in SHORTCUTS" :key="s.desc">
                  <dt>{{ s.name }}</dt>
                  <dd>{{ s.desc }}</dd>
                </template>
              </dl>
            </section>
          </div>
          <div class="ld-help-col">
            <section class="ld-help-section">
              <h3>Image fills <span class="ld-help-note">(a panel's <em>Image</em> mode — the panel color becomes the tint)</span></h3>
              <dl>
                <template v-for="f in FILLS" :key="f.name">
                  <dt>{{ f.name }}</dt>
                  <dd>{{ f.desc }}</dd>
                </template>
              </dl>
            </section>
            <section class="ld-help-section">
              <h3>Modifiers <span class="ld-help-note">(the inspector's <em>Behavior</em> section)</span></h3>
              <dl>
                <template v-for="m in MODIFIERS" :key="m.name">
                  <dt>{{ m.name }}</dt>
                  <dd>{{ m.desc }}</dd>
                </template>
              </dl>
            </section>
            <section class="ld-help-section">
              <h3>Live preview <span class="ld-help-note">(push the layout to a real player's screen)</span></h3>
              <dl>
                <template v-for="p in PREVIEW_STEPS" :key="p.name">
                  <dt>{{ p.name }}</dt>
                  <dd>{{ p.desc }}</dd>
                </template>
              </dl>
            </section>
            <section class="ld-help-section">
              <h3>Data sources</h3>
              <dl>
                <template v-for="ds in DATA_SOURCES" :key="ds.name">
                  <dt>{{ ds.name }}</dt>
                  <dd>{{ ds.desc }}</dd>
                </template>
              </dl>
            </section>
          </div>
        </div>

        <section class="ld-help-section">
          <div class="ld-help-gallery-head">
            <h3>Examples</h3>
            <a class="ld-help-btn" href="/layout-designer/examples/LayoutDesignerExamples.cs" download title="A generated Carbon plugin: /examples opens a tabbed in-game tour where every card below is rendered by the same code the designer generates for it">Download demo plugin (.cs)</a>
            <button class="ld-help-btn" @click="loadAll">Load all into the editor</button>
          </div>
          <p class="ld-help-note">One layout per feature plus a composed showcase, loaded into an “Examples” folder — open one to see how it's built, or view its in-game render below. The demo plugin bundles them all behind an in-game tab bar (<code>/examples</code>).</p>
          <template v-for="group in GALLERY_GROUPS" :key="group.title">
            <h4 v-if="group.items.length" class="ld-help-gallery-group">{{ group.title }}</h4>
            <div class="ld-help-gallery">
              <figure v-for="ex in group.items" :key="ex.id" class="ld-help-card">
                <div class="ld-help-shot">
                  <img v-if="HAS_SHOT.has(ex.id)" :src="shotSrc(ex.id)" :alt="`${ex.name} in-game — click to enlarge`" loading="lazy" class="ld-help-shot-click" title="Click to enlarge" @click="zoomed = ex" />
                  <span v-else class="ld-help-shot-empty">no screenshot yet</span>
                </div>
                <figcaption>
                  <strong>{{ ex.name }}</strong>
                  <span>{{ ex.hint }}</span>
                </figcaption>
              </figure>
            </div>
          </template>
        </section>

        <section class="ld-help-section ld-help-links">
          <h3>Official docs</h3>
          <a href="https://carbonmod.gg/devs/features/lightweight-ui" target="_blank" rel="noopener">Carbon LUI (cui.v2) <ExternalLink :size="12" /></a>
          <a href="https://docs.oxidemod.com/guides/developers/basic-cui/" target="_blank" rel="noopener">Oxide CUI <ExternalLink :size="12" /></a>
        </section>
      </div>
    </div>

    <div v-if="zoomed" class="ld-help-zoom" @click="zoomed = null">
      <figure>
        <img :src="shotSrc(zoomed.id)" :alt="`${zoomed.name} in-game`" />
        <figcaption>
          <strong>{{ zoomed.name }}</strong>
          <span>{{ zoomed.hint }}</span>
        </figcaption>
      </figure>
    </div>
  </div>
</template>

<style scoped>
.ld-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
}
.ld-modal {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.ld-help {
  width: 900px;
}
.ld-help-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 26px;
}
.ld-help-col {
  min-width: 0;
}
@media (max-width: 720px) {
  .ld-help-cols {
    grid-template-columns: 1fr;
  }
}
.ld-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-weight: 700;
  border-bottom: 1px solid var(--vp-c-divider);
}
.ld-modal-x {
  display: inline-flex;
  padding: 4px;
  border-radius: 4px;
  color: var(--vp-c-text-3);
}
.ld-modal-x:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
.ld-modal-body {
  padding: 12px 16px 16px;
  overflow-y: auto;
}
.ld-help-lead {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.ld-help-tip-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 50%;
  background: var(--c-carbon-soft);
  color: var(--c-carbon-1);
}
.ld-help-section {
  margin-bottom: 18px;
}
.ld-help-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
}
.ld-help-note {
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}
.ld-help-section dl {
  margin: 0;
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 4px 12px;
}
.ld-help-section dt {
  font-weight: 600;
  font-size: 13px;
}
.ld-help-section dd {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}
.ld-help-gallery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ld-help-btn {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--c-carbon-1);
}
.ld-help-btn:hover {
  background: var(--c-carbon-soft);
}
.ld-help-gallery-group {
  margin: 12px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ld-help-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 8px;
}
.ld-help-card {
  margin: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.ld-help-shot {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  background: #0d0e12;
}
.ld-help-shot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ld-help-shot-empty {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.ld-help-shot-click {
  cursor: zoom-in;
}
.ld-help-zoom {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(0, 0, 0, 0.78);
  cursor: zoom-out;
}
.ld-help-zoom figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* assets are exported at 1152px wide — cap there so the zoom never upscales */
  max-width: min(94vw, 1152px);
  max-height: 92vh;
}
.ld-help-zoom figure img {
  max-height: calc(92vh - 48px);
  object-fit: contain;
}
.ld-help-zoom img {
  width: 100%;
  height: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
.ld-help-zoom figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}
.ld-help-zoom figcaption strong {
  font-size: 13px;
  color: #fff;
}
.ld-help-zoom figcaption span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}
.ld-help-card figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 9px;
}
.ld-help-card figcaption strong {
  font-size: 12px;
}
.ld-help-card figcaption span {
  font-size: 11px;
  color: var(--vp-c-text-3);
  line-height: 1.35;
}
.ld-help-links a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 16px;
  font-size: 13px;
  color: var(--c-carbon-1);
}
</style>
