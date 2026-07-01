<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AnchorWidget from './AnchorWidget.vue'
import InfoTip from './InfoTip.vue'
import { round } from './geometry'
import { TEXT_ALIGNS, TEXT_FONTS } from './types'
import type { ColorRGBA, DesignerElement, ImageFill, OutlineModifier, TextAlign, TextDataSource, TextFont } from './types'
import { useDesigner } from './useDesigner'

const { selected, selectedIds, elements, dataSources, descendantIds, update, reparent, rectOf, fill, snapSelection, textEditSignal, removeSelected, duplicateSelected, setBinding } =
  useDesigner()

// Focus + select the content field when asked (e.g. context-menu "Edit label text"), after it renders.
const textArea = ref<HTMLTextAreaElement | null>(null)
watch(textEditSignal, () =>
  nextTick(() => {
    textArea.value?.focus()
    textArea.value?.select()
  }),
)

// "Place in parent": a 3×3 grid that slams the element into a corner/edge/centre, plus an anchor-aware
// padding slider (re-applies the last-picked cell). Padding is "fake" — it just writes offsets.
const placePad = ref(0)
const lastPlace = ref<{ h: 'left' | 'center' | 'right'; v: 'top' | 'middle' | 'bottom' }>({ h: 'center', v: 'middle' })
const PLACE_CELLS = [
  ['left', 'top'],
  ['center', 'top'],
  ['right', 'top'],
  ['left', 'middle'],
  ['center', 'middle'],
  ['right', 'middle'],
  ['left', 'bottom'],
  ['center', 'bottom'],
  ['right', 'bottom'],
] as const
function onPlace(h: 'left' | 'center' | 'right', v: 'top' | 'middle' | 'bottom') {
  lastPlace.value = { h, v }
  snapSelection(h, v, placePad.value)
}
function onPadInput() {
  snapSelection(lastPlace.value.h, lastPlace.value.v, placePad.value)
}

// Plain-English summary of how the selected element responds to resizing.
const anchoringText = computed(() => {
  const el = selected.value
  if (!el) return ''
  const sx = el.anchorMin.x !== el.anchorMax.x
  const sy = el.anchorMin.y !== el.anchorMax.y
  const hpos = (v: number) => (v === 0 ? 'left' : v === 0.5 ? 'center' : v === 1 ? 'right' : `${round(v)}`)
  const vpos = (v: number) => (v === 1 ? 'top' : v === 0.5 ? 'middle' : v === 0 ? 'bottom' : `${round(v)}`)
  if (sx && sy) return 'Stretches with the parent in both directions — grows and shrinks to fill it (offsets act as margins).'
  if (sx) return `Stretches with the parent's width; pinned vertically to the ${vpos(el.anchorMin.y)}.`
  if (sy) return `Stretches with the parent's height; pinned horizontally to the ${hpos(el.anchorMin.x)}.`
  const h = hpos(el.anchorMin.x)
  const v = vpos(el.anchorMin.y)
  const where = h === 'center' && v === 'middle' ? 'center' : `${v} ${h}`
  return `Fixed size; pinned to the ${where} of the parent — it won't resize when the screen does.`
})

type VecField = 'anchorMin' | 'anchorMax' | 'offsetMin' | 'offsetMax'

function setVec(el: DesignerElement, field: VecField, axis: 'x' | 'y', raw: string) {
  const value = Number.parseFloat(raw)
  if (Number.isNaN(value)) return
  update(el.id, { [field]: { ...el[field], [axis]: value } })
}

function setName(el: DesignerElement, raw: string) {
  update(el.id, { name: raw })
}

// valid re-parent targets: anything that isn't the element itself or one of its descendants
const parentOptions = computed(() => {
  const el = selected.value
  if (!el) return []
  const blocked = new Set([el.id, ...descendantIds(el.id)])
  return elements.value.filter((e) => !blocked.has(e.id))
})

function onReparent(el: DesignerElement, raw: string) {
  reparent(el.id, raw === '' ? null : raw)
}

// --- color helpers (CUI channels are 0..1) ---
function toHex(c: ColorRGBA): string {
  const h = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

function setHex(el: DesignerElement, hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return
  const n = Number.parseInt(m[1], 16)
  update(el.id, {
    props: {
      color: { ...el.props.color, r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 },
    },
  })
}

function setAlpha(el: DesignerElement, raw: string) {
  const a = Number.parseFloat(raw)
  if (Number.isNaN(a)) return
  update(el.id, { props: { color: { ...el.props.color, a } } })
}

// --- outline modifier ---
const outline = computed(() => selected.value?.modifiers?.outline ?? null)
const draggable = computed(() => selected.value?.modifiers?.draggable ?? null)
const slot = computed(() => selected.value?.modifiers?.slot ?? null)
function toggleDraggable(on: boolean) {
  const el = selected.value
  if (!el) return
  // Default to drop-anywhere so both frameworks make it freely draggable out of the box.
  update(el.id, { modifiers: { draggable: on ? { dropAnywhere: true } : null } })
}
function patchDraggable(patch: Partial<NonNullable<typeof draggable.value>>) {
  const el = selected.value
  if (!el?.modifiers?.draggable) return
  update(el.id, { modifiers: { draggable: { ...el.modifiers.draggable, ...patch } } })
}
function toggleSlot(on: boolean) {
  const el = selected.value
  if (!el) return
  update(el.id, { modifiers: { slot: on ? {} : null } })
}
function setSlotFilter(raw: string) {
  const el = selected.value
  if (!el?.modifiers?.slot) return
  update(el.id, { modifiers: { slot: { filter: raw.trim() || undefined } } })
}
function toggleOutline(on: boolean) {
  const el = selected.value
  if (!el) return
  update(el.id, { modifiers: { outline: on ? { color: { r: 0, g: 0, b: 0, a: 1 }, distance: { x: 1, y: -1 } } : null } })
}
function patchOutline(patch: Partial<OutlineModifier>) {
  const el = selected.value
  if (!el?.modifiers?.outline) return
  update(el.id, { modifiers: { outline: { ...el.modifiers.outline, ...patch } } })
}
function setOutlineHex(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const cur = outline.value
  if (!m || !cur) return
  const n = Number.parseInt(m[1], 16)
  patchOutline({ color: { ...cur.color, r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 } })
}
function setOutlineDistance(axis: 'x' | 'y', raw: string) {
  const v = Number.parseFloat(raw)
  const cur = outline.value
  if (Number.isNaN(v) || !cur) return
  patchOutline({ distance: { ...cur.distance, [axis]: v } })
}

// Per-type prop views (null unless the selection is that type) — keep template access type-safe.
const panelProps = computed(() => (selected.value?.type === 'panel' ? selected.value.props : null))
const textProps = computed(() => (selected.value?.type === 'text' ? selected.value.props : null))
const buttonProps = computed(() => (selected.value?.type === 'button' ? selected.value.props : null))

const inputProps = computed(() => (selected.value?.type === 'input' ? selected.value.props : null))
const countdownProps = computed(() => (selected.value?.type === 'countdown' ? selected.value.props : null))
// Text-bearing props shared by text / input / countdown (all have text + fontSize + font + align), so
// the content/font/size/align controls render once for any of them.
const textLikeProps = computed(() => {
  const el = selected.value
  if (el && (el.type === 'text' || el.type === 'input' || el.type === 'countdown')) return el.props
  return null
})
/** Heading for the shared content section, per type. */
const textSectionLabel = computed(() => (selected.value?.type === 'input' ? 'Input' : selected.value?.type === 'countdown' ? 'Countdown text' : 'Text'))

// --- button / input / countdown props (generic merge setters) ---
function setCommand(el: DesignerElement, raw: string) {
  update(el.id, { props: { command: raw } })
}
function setProtected(el: DesignerElement, on: boolean) {
  update(el.id, { props: { isProtected: on } })
}
function setIntProp(el: DesignerElement, key: string, raw: string, min = 0) {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < min) return
  update(el.id, { props: { [key]: n } })
}
function setFloatProp(el: DesignerElement, key: string, raw: string, min?: number) {
  const n = Number.parseFloat(raw)
  if (Number.isNaN(n) || (min !== undefined && n < min)) return
  update(el.id, { props: { [key]: n } })
}
function setBoolProp(el: DesignerElement, key: string, on: boolean) {
  update(el.id, { props: { [key]: on } })
}

// --- fill (panel only: solid color vs URL image) ---
const fillMode = computed<'color' | 'image'>(() => (panelProps.value?.image ? 'image' : 'color'))

function setFillMode(el: DesignerElement, mode: 'color' | 'image') {
  if (el.type !== 'panel') return
  if (mode === 'image') {
    if (el.props.image) return
    // Reset the color to an opaque white tint so the image shows at its true colors.
    update(el.id, { props: { image: { kind: 'url', url: '' }, color: { r: 1, g: 1, b: 1, a: 1 } } })
  } else {
    update(el.id, { props: { image: null } })
  }
}

function setImageUrl(el: DesignerElement, raw: string) {
  update(el.id, { props: { image: { kind: 'url', url: raw.trim() } } })
}

// Image-fill kind (url / sprite / png / item icon) + per-kind field setters. The panel color is the
// image tint for every kind. Switching kind resets to that kind's default fields.
type ImageKind = ImageFill['kind']
const IMAGE_KINDS: { id: ImageKind; label: string }[] = [
  { id: 'url', label: 'URL' },
  { id: 'sprite', label: 'Sprite' },
  { id: 'png', label: 'File (id)' },
  { id: 'itemicon', label: 'Item icon' },
  { id: 'steamavatar', label: 'Steam avatar' },
  { id: 'imagedb', label: 'Image DB' },
]
const IMAGE_DEFAULTS: Record<ImageKind, ImageFill> = {
  url: { kind: 'url', url: '' },
  sprite: { kind: 'sprite', sprite: '' },
  png: { kind: 'png', png: '' },
  itemicon: { kind: 'itemicon', itemId: 0, skinId: 0 },
  steamavatar: { kind: 'steamavatar', steamId: '' },
  imagedb: { kind: 'imagedb', dbName: '', url: '' },
}
const imageKind = computed<ImageKind>(() => panelProps.value?.image?.kind ?? 'url')

function setImageKind(el: DesignerElement, kind: ImageKind) {
  if (el.type !== 'panel') return
  if (el.props.image?.kind === kind) return
  update(el.id, { props: { image: { ...IMAGE_DEFAULTS[kind] } } })
}
function setSteamId(el: DesignerElement, raw: string) {
  update(el.id, { props: { image: { kind: 'steamavatar', steamId: raw.trim() } } })
}
/** Image-DB fields keep the sibling intact (read the current image for the other value). */
function curImageDb(el: DesignerElement): { dbName: string; url: string } {
  return el.type === 'panel' && el.props.image?.kind === 'imagedb' ? el.props.image : { dbName: '', url: '' }
}
function setImageDbName(el: DesignerElement, raw: string) {
  update(el.id, { props: { image: { kind: 'imagedb', dbName: raw.trim(), url: curImageDb(el).url } } })
}
function setImageDbUrl(el: DesignerElement, raw: string) {
  update(el.id, { props: { image: { kind: 'imagedb', dbName: curImageDb(el).dbName, url: raw.trim() } } })
}
function setSprite(el: DesignerElement, raw: string) {
  update(el.id, { props: { image: { kind: 'sprite', sprite: raw.trim() } } })
}
function setPng(el: DesignerElement, raw: string) {
  update(el.id, { props: { image: { kind: 'png', png: raw.trim() } } })
}
/** Item-icon fields keep the other field intact (read the current image for the sibling value). */
function curItemIcon(el: DesignerElement): { itemId: number; skinId: number } {
  return el.type === 'panel' && el.props.image?.kind === 'itemicon' ? el.props.image : { itemId: 0, skinId: 0 }
}
function setItemId(el: DesignerElement, raw: string) {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return
  update(el.id, { props: { image: { kind: 'itemicon', itemId: n, skinId: curItemIcon(el).skinId } } })
}
function setSkinId(el: DesignerElement, raw: string) {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return
  update(el.id, { props: { image: { kind: 'itemicon', itemId: curItemIcon(el).itemId, skinId: n } } })
}

// --- border (panel only: optional inset frame → four edge subpanels at codegen time) ---
const DEFAULT_BORDER = { width: 2, color: { r: 0, g: 0, b: 0, a: 1 } }
const borderProps = computed(() => panelProps.value?.border ?? null)

function setBorderEnabled(el: DesignerElement, on: boolean) {
  if (el.type !== 'panel') return
  update(el.id, { props: { border: on ? { width: DEFAULT_BORDER.width, color: { ...DEFAULT_BORDER.color } } : null } })
}
function curBorder(el: DesignerElement) {
  return el.type === 'panel' && el.props.border ? el.props.border : DEFAULT_BORDER
}
function setBorderWidth(el: DesignerElement, raw: string) {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 0) return
  update(el.id, { props: { border: { width: n, color: { ...curBorder(el).color } } } })
}
function setBorderHex(el: DesignerElement, hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return
  const n = Number.parseInt(m[1], 16)
  const b = curBorder(el)
  update(el.id, { props: { border: { width: b.width, color: { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: b.color.a } } } })
}
function setBorderAlpha(el: DesignerElement, raw: string) {
  const a = Number.parseFloat(raw)
  if (Number.isNaN(a)) return
  const b = curBorder(el)
  update(el.id, { props: { border: { width: b.width, color: { ...b.color, a } } } })
}

// --- text props ---
function setText(el: DesignerElement, raw: string) {
  update(el.id, { props: { text: raw } })
}
function setFontSize(el: DesignerElement, raw: string) {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return
  update(el.id, { props: { fontSize: n } })
}
function setAlign(el: DesignerElement, align: TextAlign) {
  update(el.id, { props: { align } })
}
function setFont(el: DesignerElement, font: TextFont) {
  update(el.id, { props: { font } })
}

// --- text binding (data sources) ---
const textSources = computed(() => dataSources.value.filter((d): d is TextDataSource => d.kind === 'text'))
/** Currently-bound text data-source id for the selected element ('' = literal/unbound). */
const textBinding = computed(() => (selected.value?.type === 'text' ? selected.value.bindings?.text ?? '' : ''))
function setTextBinding(el: DesignerElement, dsId: string) {
  setBinding(el.id, 'text', dsId || null)
}

// Heading for the shared color picker: text color, or a panel's fill color / image tint.
const colorLabel = computed(() => (textProps.value ? 'Text color' : fillMode.value === 'image' ? 'Tint' : 'Color'))

// Whether the selected element exposes a `color` prop (containers don't — they're rect-only).
const hasColor = computed(() => !!selected.value && selected.value.type !== 'container')

const computedRect = computed(() => (selected.value ? rectOf(selected.value.id) : undefined))
</script>

<template>
  <div class="ld-inspector">
    <div v-if="selectedIds.length === 0" class="ld-empty">No element selected.<br />Click a box on the canvas.</div>

    <div v-else-if="selectedIds.length > 1" class="ld-multi">
      <div class="ld-multi-count">{{ selectedIds.length }} elements selected</div>
      <p class="ld-help-intro">Drag to move them together, or use the arrow keys to nudge. Per-element properties are hidden while multiple are selected.</p>
      <div class="ld-multi-actions">
        <button @click="duplicateSelected()">Duplicate</button>
        <button class="danger" @click="removeSelected()">Delete</button>
      </div>
    </div>

    <template v-else-if="selected">
      <label class="ld-field">
        <span class="ld-field-label">Name <InfoTip text="The CUI element name. Used to reference this element in generated code and as its parent name for children." /></span>
        <input type="text" :value="selected.name" @change="setName(selected, ($event.target as HTMLInputElement).value)" />
      </label>

      <label class="ld-field">
        <span class="ld-field-label">Parent <InfoTip text="Which element this box lives inside. Its anchors are measured against the parent's rectangle. Re-parenting keeps the box in the same on-screen spot." /></span>
        <select :value="selected.parentId ?? ''" @change="onReparent(selected, ($event.target as HTMLSelectElement).value)">
          <option value="">(root canvas)</option>
          <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
      </label>

      <label v-if="selected.parentId" class="ld-passthrough">
        <input type="checkbox" :checked="!!selected.passthrough" @change="update(selected.id, { passthrough: ($event.target as HTMLInputElement).checked })" />
        <span>Move with parent <InfoTip text="Clicking or dragging this element on the canvas grabs its PARENT instead — useful for a label that fills its button. Alt-click still selects this element, and the element tree always reaches it directly." /></span>
      </label>

      <div class="ld-behavior">
        <span class="ld-field-label">Behavior <InfoTip text="Extra CUI components on this element. Needs cursor frees the mouse so the player can click the UI; Needs keyboard captures typing (required to type into an input field). Usually set on the root panel." /></span>
        <label class="ld-passthrough">
          <input type="checkbox" :checked="!!selected.modifiers?.cursor" @change="update(selected.id, { modifiers: { cursor: ($event.target as HTMLInputElement).checked } })" />
          <span>Needs cursor</span>
        </label>
        <label class="ld-passthrough">
          <input type="checkbox" :checked="!!selected.modifiers?.keyboard" @change="update(selected.id, { modifiers: { keyboard: ($event.target as HTMLInputElement).checked } })" />
          <span>Needs keyboard</span>
        </label>
        <label class="ld-passthrough">
          <input type="checkbox" :checked="!!outline" @change="toggleOutline(($event.target as HTMLInputElement).checked)" />
          <span>Outline</span>
        </label>
        <div v-if="outline" class="ld-outline">
          <input class="ld-color" type="color" :value="toHex(outline.color)" title="Outline color" @input="setOutlineHex(($event.target as HTMLInputElement).value)" />
          <label class="ld-outline-dist">X <input type="number" step="0.5" :value="outline.distance.x" @input="setOutlineDistance('x', ($event.target as HTMLInputElement).value)" /></label>
          <label class="ld-outline-dist">Y <input type="number" step="0.5" :value="outline.distance.y" @input="setOutlineDistance('y', ($event.target as HTMLInputElement).value)" /></label>
          <label class="ld-passthrough" title="Fade the outline with the graphic's alpha">
            <input type="checkbox" :checked="!!outline.useGraphicAlpha" @change="patchOutline({ useGraphicAlpha: ($event.target as HTMLInputElement).checked })" />
            <span>α</span>
          </label>
        </div>
        <label class="ld-passthrough">
          <input type="checkbox" :checked="!!draggable" @change="toggleDraggable(($event.target as HTMLInputElement).checked)" />
          <span>Draggable</span>
        </label>
        <div v-if="draggable" class="ld-outline">
          <label class="ld-passthrough" title="Player can only drag within the parent rectangle">
            <input type="checkbox" :checked="!!draggable.limitToParent" @change="patchDraggable({ limitToParent: ($event.target as HTMLInputElement).checked })" />
            <span>Limit to parent</span>
          </label>
          <label class="ld-passthrough" title="Can be dropped anywhere, not only on a matching slot">
            <input type="checkbox" :checked="draggable.dropAnywhere !== false" @change="patchDraggable({ dropAnywhere: ($event.target as HTMLInputElement).checked })" />
            <span>Drop anywhere</span>
          </label>
        </div>
        <label class="ld-passthrough">
          <input type="checkbox" :checked="!!slot" @change="toggleSlot(($event.target as HTMLInputElement).checked)" />
          <span>Slot (drop target)</span>
        </label>
        <div v-if="slot" class="ld-outline">
          <label class="ld-outline-dist">Filter <input type="text" :value="slot.filter ?? ''" placeholder="(any)" @input="setSlotFilter(($event.target as HTMLInputElement).value)" /></label>
        </div>
      </div>

      <div class="ld-place">
        <span class="ld-field-label">Place in parent <InfoTip text="Slam the selection into a corner, edge or centre of its parent. Padding isn't a real CUI property — it just writes this element's offsets: a stretched (fill) axis is inset on both sides, a pinned axis is pushed that far off its edge, and a centred axis ignores it." /></span>
        <div class="ld-place-row">
          <div class="ld-place-grid">
            <button v-for="[h, v] in PLACE_CELLS" :key="`${h}-${v}`" :title="`${v} ${h}`" @click="onPlace(h, v)" />
          </div>
          <div class="ld-place-pad">
            <div class="ld-place-pad-head"><span>Padding</span><b>{{ placePad }}px</b></div>
            <input type="range" min="0" max="64" step="1" v-model.number="placePad" @input="onPadInput" />
          </div>
        </div>
      </div>

      <div class="ld-section-title">
        <span>Anchoring <small>(resize behavior)</small></span>
        <InfoTip text="Anchors decide how this box repositions and stretches when the screen size or parent changes. Setting them doesn't move the box now — it changes how it will react. Switch the Aspect buttons up top to watch it." />
      </div>
      <p class="ld-help-intro">How this box reacts when the screen / parent resizes. Set each axis, then switch the Aspect buttons up top to watch it.</p>
      <AnchorWidget />

      <p class="ld-anchoring-desc">{{ anchoringText }}</p>

      <div class="ld-fill-row">
        <span class="ld-fill-label">Fill</span>
        <button title="Stretch to fill the parent (zero offsets)" @click="fill(selected.id, 'both')">Parent</button>
        <button title="Stretch to fill the parent's width" @click="fill(selected.id, 'x')">Width</button>
        <button title="Stretch to fill the parent's height" @click="fill(selected.id, 'y')">Height</button>
      </div>

      <div class="ld-section-title">
        <span>Anchors <small>(0–1, relative to parent)</small></span>
        <InfoTip text="AnchorMin / AnchorMax are the box's bottom-left and top-right corners as a fraction of the parent (0 = left/bottom, 1 = right/top). Equal min & max on an axis = pinned point; min 0 / max 1 = stretches across that axis." />
      </div>
      <div class="ld-vec-row">
        <span class="ld-vec-label">Min</span>
        <input type="number" step="0.01" :value="round(selected.anchorMin.x)" @change="setVec(selected, 'anchorMin', 'x', ($event.target as HTMLInputElement).value)" />
        <input type="number" step="0.01" :value="round(selected.anchorMin.y)" @change="setVec(selected, 'anchorMin', 'y', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="ld-vec-row">
        <span class="ld-vec-label">Max</span>
        <input type="number" step="0.01" :value="round(selected.anchorMax.x)" @change="setVec(selected, 'anchorMax', 'x', ($event.target as HTMLInputElement).value)" />
        <input type="number" step="0.01" :value="round(selected.anchorMax.y)" @change="setVec(selected, 'anchorMax', 'y', ($event.target as HTMLInputElement).value)" />
      </div>

      <div class="ld-section-title">
        <span>Offsets <small>(px, reference space)</small></span>
        <InfoTip text="OffsetMin / OffsetMax are pixel nudges from the anchors, measured in the reference resolution. With a pinned anchor they set the box's size and position; with stretched anchors they act as margins from the parent's edges." />
      </div>
      <div class="ld-vec-row">
        <span class="ld-vec-label">Min</span>
        <input type="number" step="1" :value="round(selected.offsetMin.x)" @change="setVec(selected, 'offsetMin', 'x', ($event.target as HTMLInputElement).value)" />
        <input type="number" step="1" :value="round(selected.offsetMin.y)" @change="setVec(selected, 'offsetMin', 'y', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="ld-vec-row">
        <span class="ld-vec-label">Max</span>
        <input type="number" step="1" :value="round(selected.offsetMax.x)" @change="setVec(selected, 'offsetMax', 'x', ($event.target as HTMLInputElement).value)" />
        <input type="number" step="1" :value="round(selected.offsetMax.y)" @change="setVec(selected, 'offsetMax', 'y', ($event.target as HTMLInputElement).value)" />
      </div>

      <!-- TEXT-bearing props: text, input, and countdown all share content / font / size / align -->
      <template v-if="textLikeProps">
        <div class="ld-section-title">
          <span>{{ textSectionLabel }}</span>
          <InfoTip text="The content and how it sits in its box. Text → CuiLabel / cui.v2.CreateText; Input → CuiInputFieldComponent / cui.v2.CreateInput; Countdown → CuiTextComponent + CuiCountdownComponent / cui.v2.CreateCountdown. The font asset is shared by both frameworks." />
        </div>
        <label v-if="textSources.length && textProps" class="ld-field">
          <span class="ld-field-label">Source <InfoTip text="Bind this label's text to a Data Source (a shared string). Bound text is driven by the source — edit it once in the Data Sources pane and every bound element updates. Pick (literal) to type text directly." /></span>
          <select :value="textBinding" @change="setTextBinding(selected, ($event.target as HTMLSelectElement).value)">
            <option value="">(literal text)</option>
            <option v-for="ds in textSources" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
          </select>
        </label>
        <label class="ld-field">
          <span class="ld-field-label">
            <template v-if="countdownProps">Format text<InfoTip text="Shown as the countdown text; the substring %TIME_LEFT% is replaced with the formatted remaining time." /></template>
            <template v-else>Content</template>
            <span v-if="textBinding" class="ld-bound-tag">bound</span>
          </span>
          <textarea
            ref="textArea"
            class="ld-textarea"
            rows="2"
            :value="textLikeProps.text"
            :disabled="!!textBinding"
            :placeholder="countdownProps ? 'e.g. %TIME_LEFT%' : textBinding ? 'Driven by the bound data source' : ''"
            @change="setText(selected, ($event.target as HTMLTextAreaElement).value)"
          />
        </label>
        <label class="ld-field">
          <span class="ld-field-label">Font <InfoTip text="The Rust client font — the same asset for both frameworks. Emitted as the Font/.SetTextFont arg." /></span>
          <select :value="textLikeProps.font ?? 'RobotoCondensedRegular'" @change="setFont(selected, ($event.target as HTMLSelectElement).value as TextFont)">
            <option v-for="f in TEXT_FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </label>
        <div class="ld-vec-row">
          <span class="ld-vec-label">Size</span>
          <input class="ld-range" type="range" min="4" max="64" step="1" :value="textLikeProps.fontSize" title="Font size" @input="setFontSize(selected, ($event.target as HTMLInputElement).value)" />
          <input class="ld-num" type="number" min="1" step="1" :value="textLikeProps.fontSize" title="Font size in reference px" @change="setFontSize(selected, ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="ld-section-title">
          <span>Alignment <small>(in box)</small></span>
          <InfoTip text="Where the text sits within its box (Unity TextAnchor)." />
        </div>
        <div class="ld-align-grid" role="group" aria-label="Text alignment">
          <button
            v-for="a in TEXT_ALIGNS"
            :key="a"
            :class="{ active: textLikeProps.align === a }"
            :title="a"
            @click="setAlign(selected, a)"
          >
            <span class="ld-align-dot" />
          </button>
        </div>
      </template>

      <!-- INPUT extras (command + char limit + password); text/font/size/align are shared above -->
      <template v-if="inputProps">
        <div class="ld-section-title">
          <span>Input field</span>
          <InfoTip text="An editable field. On submit it runs the command with the typed value appended. Emitted as CuiInputFieldComponent (Oxide) / cui.v2.CreateInput (Carbon). The Content above is the initial text; the color above is the text color." />
        </div>
        <label class="ld-field">
          <span class="ld-field-label">Command <InfoTip text="Command run when the player submits the field; the input value is appended as an argument." /></span>
          <input type="text" placeholder="e.g. myplugin.setname" :value="inputProps.command" @change="setCommand(selected, ($event.target as HTMLInputElement).value)" />
        </label>
        <div class="ld-vec-row">
          <span class="ld-vec-label" title="Character limit (0 = unlimited)">Limit</span>
          <input class="ld-num" type="number" min="0" step="1" :value="inputProps.charLimit" title="Character limit (0 = unlimited)" @change="setIntProp(selected, 'charLimit', ($event.target as HTMLInputElement).value)" />
          <label class="ld-border-enable">
            <input type="checkbox" :checked="inputProps.password" @change="setBoolProp(selected, 'password', ($event.target as HTMLInputElement).checked)" />
            <span>Password</span>
          </label>
        </div>
        <label class="ld-border-enable">
          <input type="checkbox" :checked="inputProps.isProtected" @change="setProtected(selected, ($event.target as HTMLInputElement).checked)" />
          <span>Protected</span>
          <InfoTip text="Carbon command protection (Carbon-only; Oxide ignores it)." />
        </label>
      </template>

      <!-- COUNTDOWN extras (timer + command); text/font/size/align are shared above -->
      <template v-if="countdownProps">
        <div class="ld-section-title">
          <span>Countdown timer</span>
          <InfoTip text="Counts from Start to End seconds, client-side, substituting %TIME_LEFT% in the text. Runs the command when it reaches the end. Emitted as CuiCountdownComponent (Oxide) / cui.v2.CreateCountdown (Carbon)." />
        </div>
        <div class="ld-vec-row">
          <span class="ld-vec-label" title="Start time (seconds)">Start</span>
          <input class="ld-num" type="number" step="1" :value="countdownProps.startTime" title="Start time (seconds)" @change="setFloatProp(selected, 'startTime', ($event.target as HTMLInputElement).value)" />
          <span class="ld-vec-label" title="End time (seconds)">End</span>
          <input class="ld-num" type="number" step="1" :value="countdownProps.endTime" title="End time (seconds)" @change="setFloatProp(selected, 'endTime', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="ld-vec-row">
          <span class="ld-vec-label" title="Step (seconds per tick)">Step</span>
          <input class="ld-num" type="number" min="0" step="0.1" :value="countdownProps.step" title="Step — seconds decremented per tick" @change="setFloatProp(selected, 'step', ($event.target as HTMLInputElement).value, 0)" />
          <span class="ld-vec-label" title="Client refresh interval (Carbon)">Int.</span>
          <input class="ld-num" type="number" min="0" step="0.1" :value="countdownProps.interval" title="Client refresh interval in seconds (Carbon only)" @change="setFloatProp(selected, 'interval', ($event.target as HTMLInputElement).value, 0)" />
        </div>
        <label class="ld-field">
          <span class="ld-field-label">Command <InfoTip text="Optional command run when the countdown reaches the end. Leave empty for none." /></span>
          <input type="text" placeholder="(none)" :value="countdownProps.command" @change="setCommand(selected, ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="ld-border-enable">
          <input type="checkbox" :checked="countdownProps.isProtected" @change="setProtected(selected, ($event.target as HTMLInputElement).checked)" />
          <span>Protected</span>
          <InfoTip text="Carbon command protection (Carbon-only; Oxide ignores it)." />
        </label>
      </template>

      <!-- BUTTON props (command + Carbon command protection); the label is a child Text element -->
      <template v-if="buttonProps">
        <div class="ld-section-title">
          <span>Button</span>
          <InfoTip text="The command run on click. Emitted as CuiButton.Button.Command (Oxide) / cui.v2.CreateButton (Carbon). The button's label is a child Text element — select it in the tree to edit the wording, font, or bind it to a data source." />
        </div>
        <label class="ld-field">
          <span class="ld-field-label">Command <InfoTip text="Console/chat command sent when the button is clicked. Leave empty for a non-interactive colored box." /></span>
          <input type="text" placeholder="e.g. myplugin.action" :value="buttonProps.command" @change="setCommand(selected, ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="ld-border-enable">
          <input type="checkbox" :checked="buttonProps.isProtected" @change="setProtected(selected, ($event.target as HTMLInputElement).checked)" />
          <span>Protected</span>
          <InfoTip text="Carbon command protection (Carbon-only; Oxide ignores it). Wraps the command so it can't be triggered by spoofed client input. Maps to the isProtected arg of cui.v2.CreateButton." />
        </label>
      </template>

      <!-- PANEL fill (solid color vs image — url / sprite / file / item icon) -->
      <template v-if="panelProps">
        <div class="ld-section-title">
          <span>Fill</span>
          <InfoTip text="What this panel renders: a solid color, or an image. Image kinds map to the framework's creators — URL (CuiRawImageComponent / CreateUrlImage), Sprite (Image.Sprite / CreateSprite), File by data id (Image.Png / CreateImage), Item icon (Image.ItemId / CreateItemIcon). The panel color is the image tint." />
        </div>
        <div class="ld-segmented ld-fill-toggle" role="group" aria-label="Fill type">
          <button :class="{ active: fillMode === 'color' }" @click="setFillMode(selected, 'color')">Color</button>
          <button :class="{ active: fillMode === 'image' }" @click="setFillMode(selected, 'image')">Image</button>
        </div>
        <template v-if="fillMode === 'image'">
          <label class="ld-field">
            <span class="ld-field-label">Image source <InfoTip text="Where the image comes from. URL downloads at runtime; Sprite is a Rust client asset path; File is a stored image's SQL data id; Item icon renders an item's inventory icon by item id (+ optional skin id)." /></span>
            <select :value="imageKind" @change="setImageKind(selected, ($event.target as HTMLSelectElement).value as 'url')">
              <option v-for="k in IMAGE_KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
            </select>
          </label>
          <label v-if="imageKind === 'url'" class="ld-field">
            <span class="ld-field-label">Image URL <InfoTip text="The raw image URL. Emitted as CuiRawImageComponent.Url (Oxide) / the url arg of cui.v2.CreateUrlImage (Carbon)." /></span>
            <input type="text" placeholder="https://example.com/image.png" :value="panelProps.image?.kind === 'url' ? panelProps.image.url : ''" @change="setImageUrl(selected, ($event.target as HTMLInputElement).value)" />
          </label>
          <label v-else-if="imageKind === 'sprite'" class="ld-field">
            <span class="ld-field-label">Sprite path <InfoTip text="A Rust client sprite asset path (e.g. assets/icons/examplemap.png). Emitted as CuiImageComponent.Sprite (Oxide) / cui.v2.CreateSprite (Carbon)." /></span>
            <input type="text" placeholder="assets/icons/example.png" :value="panelProps.image?.kind === 'sprite' ? panelProps.image.sprite : ''" @change="setSprite(selected, ($event.target as HTMLInputElement).value)" />
          </label>
          <label v-else-if="imageKind === 'png'" class="ld-field">
            <span class="ld-field-label">File data id <InfoTip text="The SQL data id of a stored image (e.g. from ImageLibrary / FileStorage). Emitted as CuiImageComponent.Png (Oxide) / cui.v2.CreateImage (Carbon). The image must be loaded server-side first." /></span>
            <input type="text" placeholder="e.g. 123456789" :value="panelProps.image?.kind === 'png' ? panelProps.image.png : ''" @change="setPng(selected, ($event.target as HTMLInputElement).value)" />
          </label>
          <template v-else-if="imageKind === 'itemicon'">
            <div class="ld-vec-row">
              <span class="ld-vec-label" title="Item id">Item</span>
              <input class="ld-num" type="number" step="1" :value="panelProps.image?.kind === 'itemicon' ? panelProps.image.itemId : 0" title="Item id (the item's numeric id)" @change="setItemId(selected, ($event.target as HTMLInputElement).value)" />
              <span class="ld-vec-label" title="Skin id">Skin</span>
              <input class="ld-num" type="number" step="1" :value="panelProps.image?.kind === 'itemicon' ? panelProps.image.skinId : 0" title="Skin id (0 = default skin)" @change="setSkinId(selected, ($event.target as HTMLInputElement).value)" />
            </div>
            <p class="ld-help-intro">Item icon by id. Emitted as CuiImageComponent.ItemId/SkinId (Oxide) / cui.v2.CreateItemIcon (Carbon, no tint).</p>
          </template>
          <label v-else-if="imageKind === 'steamavatar'" class="ld-field">
            <span class="ld-field-label">SteamID64 <InfoTip text="A player's SteamID64. Renders their Steam avatar — CuiRawImageComponent.SteamId (Oxide) / cui.v2.CreateSteamAvatar (Carbon). No preload needed; the client fetches it." /></span>
            <input type="text" inputmode="numeric" placeholder="76561198000000000" :value="panelProps.image?.kind === 'steamavatar' ? panelProps.image.steamId : ''" @change="setSteamId(selected, ($event.target as HTMLInputElement).value)" />
          </label>
          <template v-else-if="imageKind === 'imagedb'">
            <label class="ld-field">
              <span class="ld-field-label">Image name <InfoTip text="A name you assign the image in the framework's image database. Emitted as cui.v2.CreateImageFromDb (Carbon) / an ImageLibrary GetImage reference (Oxide). The plugin lifecycle preloads it from the URL below." /></span>
              <input type="text" placeholder="e.g. my_logo" :value="panelProps.image?.kind === 'imagedb' ? panelProps.image.dbName : ''" @change="setImageDbName(selected, ($event.target as HTMLInputElement).value)" />
            </label>
            <label class="ld-field">
              <span class="ld-field-label">Preload URL <InfoTip text="Where the image is downloaded from at plugin load. The generated Class output queues it into the image DB under the name above; the designer preview renders straight from this URL." /></span>
              <input type="text" placeholder="https://example.com/logo.png" :value="panelProps.image?.kind === 'imagedb' ? panelProps.image.url : ''" @change="setImageDbUrl(selected, ($event.target as HTMLInputElement).value)" />
            </label>
          </template>
        </template>
      </template>

      <template v-if="hasColor">
        <div class="ld-section-title">
          <span>{{ colorLabel }}</span>
          <InfoTip :text="textProps ? 'The text (font) color and opacity (α). Maps to CuiTextComponent.Color / the color arg of cui.v2.CreateText.' : fillMode === 'image' ? 'Color multiplied over the image (white = original colors, lower α = more transparent). Maps to the image Color arg / CuiRawImageComponent.Color.' : 'Panel background color and opacity (α). Stored as CUI 0–1 channels — see the \'r g b a\' string in the Captured values panel.'" />
        </div>
        <div class="ld-vec-row">
          <input class="ld-color" type="color" :value="toHex(selected.props.color)" :title="colorLabel" @input="setHex(selected, ($event.target as HTMLInputElement).value)" />
          <span class="ld-vec-label ld-alpha-label" title="Opacity (alpha), 0–1">α</span>
          <input class="ld-range" type="range" min="0" max="1" step="0.01" :value="selected.props.color.a" title="Opacity (alpha)" @input="setAlpha(selected, ($event.target as HTMLInputElement).value)" />
          <input class="ld-num" type="number" min="0" max="1" step="0.05" :value="round(selected.props.color.a)" @change="setAlpha(selected, ($event.target as HTMLInputElement).value)" />
        </div>
      </template>

      <!-- PANEL border (optional inset frame → four edge subpanels) -->
      <template v-if="panelProps">
        <div class="ld-section-title">
          <label class="ld-border-enable">
            <input type="checkbox" :checked="!!borderProps" @change="setBorderEnabled(selected, ($event.target as HTMLInputElement).checked)" />
            <span>Border</span>
          </label>
          <InfoTip text="Optional inset border. CUI has no border primitive, so it's emitted as four edge subpanels (top/bottom/left/right) inside the panel — width in reference px. Toggling it sends/removes those panels in the live preview." />
        </div>
        <div v-if="borderProps" class="ld-vec-row">
          <input class="ld-color" type="color" :value="toHex(borderProps.color)" title="Border color" @input="setBorderHex(selected, ($event.target as HTMLInputElement).value)" />
          <span class="ld-vec-label" title="Border width (reference px)">w</span>
          <input class="ld-num" type="number" min="0" step="1" :value="borderProps.width" title="Border width (px)" @change="setBorderWidth(selected, ($event.target as HTMLInputElement).value)" />
          <span class="ld-vec-label ld-alpha-label" title="Opacity (alpha), 0–1">α</span>
          <input class="ld-num" type="number" min="0" max="1" step="0.05" :value="round(borderProps.color.a)" title="Border opacity" @change="setBorderAlpha(selected, ($event.target as HTMLInputElement).value)" />
        </div>
      </template>

      <div v-if="computedRect" class="ld-resolved">
        <span>
          Resolved (CUI px): x {{ round(computedRect.x, 1) }}, y {{ round(computedRect.y, 1) }},
          w {{ round(computedRect.w, 1) }}, h {{ round(computedRect.h, 1) }}
        </span>
        <InfoTip text="The box's final rectangle after anchors + offsets are applied, in reference pixels. x,y is the bottom-left corner and y is measured upward (CUI convention)." />
      </div>
    </template>
  </div>
</template>

<style scoped>
.ld-inspector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.ld-empty {
  color: var(--vp-c-text-3);
  font-size: 13px;
  text-align: center;
  padding: 24px 8px;
  line-height: 1.6;
}

.ld-multi {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ld-multi-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.ld-multi-actions {
  display: flex;
  gap: 8px;
}

.ld-multi-actions button {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.ld-multi-actions button:hover {
  border-color: var(--c-carbon-1);
}

.ld-border-enable {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.ld-border-enable input {
  cursor: pointer;
}

.ld-passthrough {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 0 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.ld-passthrough input {
  cursor: pointer;
  flex-shrink: 0;
}

.ld-behavior {
  margin: 2px 0 10px;
}
.ld-behavior .ld-passthrough {
  margin: 4px 0 0;
}
.ld-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0 20px;
}
.ld-outline .ld-outline-dist {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.ld-outline .ld-outline-dist input {
  width: 44px;
}
.ld-outline .ld-passthrough {
  margin: 0;
}

.ld-place {
  margin: 2px 0 10px;
}
.ld-place-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 6px;
}
.ld-place-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  width: 66px;
  height: 66px;
  padding: 3px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  flex-shrink: 0;
}
.ld-place-grid button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
}
.ld-place-grid button:hover {
  border-color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
.ld-place-pad {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.ld-place-pad-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}
.ld-place-pad-head b {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
.ld-place-pad input[type='range'] {
  width: 100%;
}

.ld-multi-actions button.danger:hover {
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

.ld-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.ld-field input,
.ld-field select {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 4px 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

/* A bound text prop is read-only — its value comes from the data source. */
.ld-field textarea:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ld-bound-tag {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.ld-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-top: 6px;
}

.ld-section-title small {
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.ld-field-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ld-help-intro {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.ld-anchoring-desc {
  margin: 0;
  padding: 7px 9px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  background: rgba(125, 211, 252, 0.08);
  border-left: 2px solid rgba(125, 211, 252, 0.7);
  border-radius: 2px;
}

.ld-fill-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ld-fill-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
}

.ld-fill-row button {
  flex: 1;
  padding: 5px 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
}

.ld-fill-row button:hover {
  border-color: var(--c-carbon-1);
  color: var(--vp-c-text-1);
}

.ld-vec-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ld-vec-label {
  width: 28px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ld-vec-row input[type='number'] {
  width: 100%;
  min-width: 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 4px 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.ld-fill-toggle {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}

.ld-fill-toggle button {
  flex: 1;
  padding: 5px 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-divider);
}

.ld-fill-toggle button:last-child {
  border-right: none;
}

.ld-fill-toggle button:hover {
  color: var(--vp-c-text-1);
}

.ld-fill-toggle button.active {
  background: var(--c-carbon-1);
  color: #fff;
}

.ld-textarea {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 4px 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}

/* 3×3 alignment picker — grid position maps to the TextAnchor (top-left = UpperLeft, …) */
.ld-align-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  width: 90px;
}

.ld-align-grid button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
}

.ld-align-grid button:hover {
  border-color: var(--c-carbon-1);
}

.ld-align-grid button.active {
  background: var(--c-carbon-1);
  border-color: var(--c-carbon-1);
}

.ld-align-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.ld-align-grid button.active .ld-align-dot {
  background: #fff;
}

.ld-color {
  width: 44px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: none;
}

.ld-alpha-label {
  width: auto;
  flex-shrink: 0;
}

/* slider + numeric entry pair (font size, alpha) */
.ld-vec-row input.ld-range {
  flex: 1;
  min-width: 36px;
  width: auto;
  margin: 0;
  accent-color: var(--c-carbon-1);
  cursor: pointer;
}

.ld-vec-row input.ld-num {
  flex: 0 0 auto;
  width: 52px;
}

.ld-resolved {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}
</style>
