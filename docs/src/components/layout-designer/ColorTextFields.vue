<script setup lang="ts">
// RGBA + HEX text entry for a color — lives under every color picker so values can be pasted
// straight from Unity (`0.804 0.255 0.169 1`), a plugin's CUI strings, or web hex. Both fields,
// the picker and the canvas stay in sync; invalid input flags the field and keeps the last valid
// color (no data loss). The RGBA field shows CUI-native 0..1 form — exactly what codegen emits.
import { ref, watch } from 'vue'
import type { ColorRGBA } from './types'

const props = defineProps<{ modelValue: ColorRGBA }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ColorRGBA): void }>()

/**
 * `r g b a` / `r,g,b,a` with 3 or 4 components. Scale detection: a decimal point anywhere, or
 * every component <= 1, means 0..1 floats (Unity Color); otherwise 0..255 ints (Color32 / web).
 * A missing 4th component is full alpha.
 */
function parseRgba(text: string): ColorRGBA | null {
  const parts = text.trim().split(/[\s,]+/).filter(Boolean)
  if (parts.length < 3 || parts.length > 4) return null
  const nums = parts.map(Number)
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null
  const floats = parts.some((p) => p.includes('.')) || nums.every((n) => n <= 1)
  const scale = floats ? 1 : 255
  if (nums.some((n) => n > scale)) return null
  const [r, g, b, a] = nums.map((n) => n / scale)
  return { r, g, b, a: parts.length === 4 ? a : 1 }
}

/** `#RGB`, `#RRGGBB` or `#RRGGBBAA`, leading `#` optional; 3/6 digits mean opaque. */
function parseHex(text: string): ColorRGBA | null {
  let s = text.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = [...s].map((c) => c + c).join('')
  if (/^[0-9a-fA-F]{6}$/.test(s)) s += 'ff'
  if (!/^[0-9a-fA-F]{8}$/.test(s)) return null
  const ch = (i: number) => Number.parseInt(s.slice(i, i + 2), 16) / 255
  return { r: ch(0), g: ch(2), b: ch(4), a: ch(6) }
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000)
const formatRgba = (c: ColorRGBA) => `${fmt(c.r)} ${fmt(c.g)} ${fmt(c.b)} ${fmt(c.a)}`
const hx = (n: number) =>
  Math.round(Math.min(1, Math.max(0, n)) * 255)
    .toString(16)
    .padStart(2, '0')
const formatHex = (c: ColorRGBA) => `#${hx(c.r)}${hx(c.g)}${hx(c.b)}${hx(c.a)}`.toUpperCase()

const rgbaText = ref('')
const hexText = ref('')
const rgbaBad = ref(false)
const hexBad = ref(false)
let focused: 'rgba' | 'hex' | null = null

// Model → fields, except the one being typed in (reformatting under the cursor would fight input
// like "0."). The focused field re-normalizes itself on blur instead.
watch(
  () => props.modelValue,
  (c) => {
    if (focused !== 'rgba') {
      rgbaText.value = formatRgba(c)
      rgbaBad.value = false
    }
    if (focused !== 'hex') {
      hexText.value = formatHex(c)
      hexBad.value = false
    }
  },
  { deep: true, immediate: true },
)

function onRgbaInput(v: string) {
  rgbaText.value = v
  const c = parseRgba(v)
  rgbaBad.value = !c
  if (c) emit('update:modelValue', c)
}
function onHexInput(v: string) {
  hexText.value = v
  const c = parseHex(v)
  hexBad.value = !c
  if (c) emit('update:modelValue', c)
}
function onBlur() {
  focused = null
  // Snap back to the (last valid) model — normalizes formatting and discards invalid text.
  rgbaText.value = formatRgba(props.modelValue)
  hexText.value = formatHex(props.modelValue)
  rgbaBad.value = hexBad.value = false
}
</script>

<template>
  <div class="ld-color-text">
    <input
      class="ld-ctext"
      :class="{ invalid: rgbaBad }"
      :value="rgbaText"
      spellcheck="false"
      title="RGBA — 0-1 floats (Unity Color) or 0-255 ints, space or comma separated; alpha optional"
      @focus="focused = 'rgba'"
      @blur="onBlur()"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
      @input="onRgbaInput(($event.target as HTMLInputElement).value)"
    />
    <input
      class="ld-ctext ld-ctext-hex"
      :class="{ invalid: hexBad }"
      :value="hexText"
      spellcheck="false"
      title="HEX — #RGB, #RRGGBB or #RRGGBBAA (# optional); 6 digits = opaque"
      @focus="focused = 'hex'"
      @blur="onBlur()"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
      @input="onHexInput(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped>
.ld-color-text {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.ld-ctext {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  outline: none;
}

.ld-ctext-hex {
  flex: 0 0 84px;
}

.ld-ctext:focus {
  border-color: var(--c-carbon-1);
}

.ld-ctext.invalid {
  border-color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}
</style>
