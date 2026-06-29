<script setup lang="ts">
import { computed } from 'vue'
import AnchorWidget from './AnchorWidget.vue'
import InfoTip from './InfoTip.vue'
import { round } from './geometry'
import { TEXT_ALIGNS, TEXT_FONTS } from './types'
import type { ColorRGBA, DesignerElement, TextAlign, TextDataSource, TextFont } from './types'
import { useDesigner } from './useDesigner'

const { selected, selectedIds, elements, dataSources, descendantIds, update, reparent, rectOf, fill, removeSelected, duplicateSelected, setBinding } =
  useDesigner()

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

// Per-type prop views (null unless the selection is that type) — keep template access type-safe.
const panelProps = computed(() => (selected.value?.type === 'panel' ? selected.value.props : null))
const textProps = computed(() => (selected.value?.type === 'text' ? selected.value.props : null))
const buttonProps = computed(() => (selected.value?.type === 'button' ? selected.value.props : null))

// --- button props ---
function setCommand(el: DesignerElement, raw: string) {
  update(el.id, { props: { command: raw } })
}
function setProtected(el: DesignerElement, on: boolean) {
  update(el.id, { props: { isProtected: on } })
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

      <!-- TEXT props -->
      <template v-if="textProps">
        <div class="ld-section-title">
          <span>Text</span>
          <InfoTip text="The label's content and how it sits in its box. Emitted as CuiLabel + CuiTextComponent (Oxide) / cui.v2.CreateText (Carbon). The font is RobotoCondensed (Rust's default)." />
        </div>
        <label v-if="textSources.length" class="ld-field">
          <span class="ld-field-label">Source <InfoTip text="Bind this label's text to a Data Source (a shared string). Bound text is driven by the source — edit it once in the Data Sources pane and every bound element updates. Pick (literal) to type text directly." /></span>
          <select :value="textBinding" @change="setTextBinding(selected, ($event.target as HTMLSelectElement).value)">
            <option value="">(literal text)</option>
            <option v-for="ds in textSources" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
          </select>
        </label>
        <label class="ld-field">
          <span class="ld-field-label">Content<span v-if="textBinding" class="ld-bound-tag">bound</span></span>
          <textarea
            class="ld-textarea"
            rows="2"
            :value="textProps.text"
            :disabled="!!textBinding"
            :placeholder="textBinding ? 'Driven by the bound data source' : ''"
            @change="setText(selected, ($event.target as HTMLTextAreaElement).value)"
          />
        </label>
        <label class="ld-field">
          <span class="ld-field-label">Font <InfoTip text="The Rust client font — the same asset for both frameworks. Emitted as CuiTextComponent.Font (Oxide) / .SetTextFont(CUI.Handler.FontTypes.X) (Carbon)." /></span>
          <select :value="textProps.font ?? 'RobotoCondensedRegular'" @change="setFont(selected, ($event.target as HTMLSelectElement).value as TextFont)">
            <option v-for="f in TEXT_FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </label>
        <div class="ld-vec-row">
          <span class="ld-vec-label">Size</span>
          <input class="ld-range" type="range" min="4" max="64" step="1" :value="textProps.fontSize" title="Font size" @input="setFontSize(selected, ($event.target as HTMLInputElement).value)" />
          <input class="ld-num" type="number" min="1" step="1" :value="textProps.fontSize" title="Font size in reference px" @change="setFontSize(selected, ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="ld-section-title">
          <span>Alignment <small>(in box)</small></span>
          <InfoTip text="Where the text sits within its box (Unity TextAnchor). Maps to CuiTextComponent.Align / the alignment arg of cui.v2.CreateText." />
        </div>
        <div class="ld-align-grid" role="group" aria-label="Text alignment">
          <button
            v-for="a in TEXT_ALIGNS"
            :key="a"
            :class="{ active: textProps.align === a }"
            :title="a"
            @click="setAlign(selected, a)"
          >
            <span class="ld-align-dot" />
          </button>
        </div>
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

      <!-- PANEL fill (solid color vs URL image) -->
      <template v-if="panelProps">
        <div class="ld-section-title">
          <span>Fill</span>
          <InfoTip text="What this panel renders: a solid color, or a raw image fetched from a URL (CuiRawImageComponent / cui.v2.CreateUrlImage). URL images download at runtime — for production prefer the image database." />
        </div>
        <div class="ld-segmented ld-fill-toggle" role="group" aria-label="Fill type">
          <button :class="{ active: fillMode === 'color' }" @click="setFillMode(selected, 'color')">Color</button>
          <button :class="{ active: fillMode === 'image' }" @click="setFillMode(selected, 'image')">Image (URL)</button>
        </div>
        <label v-if="fillMode === 'image'" class="ld-field">
          <span class="ld-field-label">Image URL <InfoTip text="The raw image URL. Emitted as CuiRawImageComponent.Url (Oxide) / the url arg of cui.v2.CreateUrlImage (Carbon)." /></span>
          <input type="text" placeholder="https://example.com/image.png" :value="panelProps.image?.url ?? ''" @change="setImageUrl(selected, ($event.target as HTMLInputElement).value)" />
        </label>
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
