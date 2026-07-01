<script setup lang="ts">
// Help dialog: a plain-language reference for every element type, image fill and modifier, plus a
// gallery of the bundled example layouts (with in-game screenshots where captured) and links to the
// upstream Carbon LUI / Oxide CUI docs. Opened from the menubar Help button; closes on backdrop / ✕ /
// Escape. Content is data-driven (the three *_HELP arrays) so entries track the tool's feature set.
import { useEventListener } from '@vueuse/core'
import { ExternalLink, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { EXAMPLE_LAYOUTS } from './examples'
import { useDesigner } from './useDesigner'

const emit = defineEmits<{ close: [] }>()
const { loadExampleLayouts } = useDesigner()

// Gallery screenshots live at a path derived from the example id — drop a PNG named <id>.png into
// public/layout-designer/examples/ and it appears; ids with no file yet fall back to a placeholder.
const noShot = ref(new Set<string>())
const shotSrc = (id: string) => `/layout-designer/examples/${id}.png`
const onShotError = (id: string) => (noShot.value = new Set(noShot.value).add(id))

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
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
  { name: 'Empty container', desc: 'An invisible box used only to group and position its children.' },
]
const FILLS: { name: string; desc: string }[] = [
  { name: 'URL image', desc: 'Downloads a remote image at runtime (any https image URL).' },
  { name: 'Sprite', desc: 'A built-in Rust client sprite by asset path, e.g. assets/icons/gear.png.' },
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
          <div class="ld-help-gallery-head">
            <h3>Examples</h3>
            <button class="ld-help-btn" @click="loadAll">Load all into the editor</button>
          </div>
          <p class="ld-help-note">One layout per feature, in an “Examples” folder — open one to see how it's built, or view its in-game render below.</p>
          <div class="ld-help-gallery">
            <figure v-for="ex in EXAMPLE_LAYOUTS" :key="ex.id" class="ld-help-card">
              <div class="ld-help-shot">
                <img v-if="!noShot.has(ex.id)" :src="shotSrc(ex.id)" :alt="`${ex.name} in-game`" loading="lazy" @error="onShotError(ex.id)" />
                <span v-else class="ld-help-shot-empty">no screenshot yet</span>
              </div>
              <figcaption>
                <strong>{{ ex.name }}</strong>
                <span>{{ ex.hint }}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section class="ld-help-section ld-help-links">
          <h3>Official docs</h3>
          <a href="https://carbonmod.gg/devs/features/lightweight-ui" target="_blank" rel="noopener">Carbon LUI (cui.v2) <ExternalLink :size="12" /></a>
          <a href="https://docs.oxidemod.com/guides/developers/basic-cui/" target="_blank" rel="noopener">Oxide CUI <ExternalLink :size="12" /></a>
        </section>
      </div>
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
  width: 640px;
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
