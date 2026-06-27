<script setup lang="ts">
import { computed } from 'vue'
import AnchorWidget from './AnchorWidget.vue'
import InfoTip from './InfoTip.vue'
import { round } from './geometry'
import type { ColorRGBA, DesignerElement } from './types'
import { useDesigner } from './useDesigner'

const { selected, selectedIds, elements, descendantIds, update, reparent, rectOf, fill, removeSelected, duplicateSelected } =
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

// --- fill (solid color vs URL image) ---
const fillMode = computed<'color' | 'image'>(() => (selected.value?.props.image ? 'image' : 'color'))

function setFillMode(el: DesignerElement, mode: 'color' | 'image') {
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
        <input type="text" placeholder="https://example.com/image.png" :value="selected.props.image?.url ?? ''" @change="setImageUrl(selected, ($event.target as HTMLInputElement).value)" />
      </label>

      <div class="ld-section-title">
        <span>{{ fillMode === 'image' ? 'Tint' : 'Color' }}</span>
        <InfoTip :text="fillMode === 'image' ? 'Color multiplied over the image (white = original colors, lower α = more transparent). Maps to the image Color arg / CuiRawImageComponent.Color.' : 'Panel background color and opacity (α). Stored as CUI 0–1 channels — see the \'r g b a\' string in the Captured values panel.'" />
      </div>
      <div class="ld-vec-row">
        <input class="ld-color" type="color" :value="toHex(selected.props.color)" title="Panel color" @input="setHex(selected, ($event.target as HTMLInputElement).value)" />
        <label class="ld-alpha">
          <span title="Opacity (alpha), 0–1">α</span>
          <input type="number" min="0" max="1" step="0.05" :value="round(selected.props.color.a)" @change="setAlpha(selected, ($event.target as HTMLInputElement).value)" />
        </label>
      </div>

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

.ld-color {
  width: 44px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: none;
}

.ld-alpha {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  flex: 1;
}

.ld-alpha input {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 4px 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
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
