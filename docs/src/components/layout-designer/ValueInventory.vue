<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { cuiColorString, referenceWidth, round } from './geometry'
import { useDesigner } from './useDesigner'

const { elements, canvas, provider, resolvedRects } = useDesigner()

// The captured intermediate representation. This is the bridge to future code generation:
// every value the generator will ever need lives here, in CUI-native form.
const inventory = computed(() => {
  const rects = resolvedRects.value
  return {
    canvas: {
      aspect: canvas.aspect,
      referenceWidth: round(referenceWidth(canvas), 1),
      referenceHeight: canvas.referenceHeight,
    },
    provider: provider.value,
    elements: elements.value.map((el) => {
      const r = rects.get(el.id)
      return {
        name: el.name,
        type: el.type,
        parent: el.parentId ? elements.value.find((e) => e.id === el.parentId)?.name ?? null : null,
        anchorMin: [round(el.anchorMin.x), round(el.anchorMin.y)],
        anchorMax: [round(el.anchorMax.x), round(el.anchorMax.y)],
        offsetMin: [round(el.offsetMin.x), round(el.offsetMin.y)],
        offsetMax: [round(el.offsetMax.x), round(el.offsetMax.y)],
        color: cuiColorString(el.props.color),
        resolvedRect: r ? { x: round(r.x, 1), y: round(r.y, 1), w: round(r.w, 1), h: round(r.h, 1) } : null,
      }
    }),
  }
})

const json = computed(() => JSON.stringify(inventory.value, null, 2))

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(json.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1200)
  } catch {
    /* clipboard may be unavailable */
  }
}
</script>

<template>
  <div class="ld-inventory">
    <div class="ld-inv-head">
      <span>Captured values</span>
      <button class="ld-inv-copy" :title="copied ? 'Copied' : 'Copy JSON'" @click="copy">
        <component :is="copied ? Check : Copy" :size="13" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <pre class="ld-inv-body">{{ json }}</pre>
  </div>
</template>

<style scoped>
.ld-inventory {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.ld-inv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}

.ld-inv-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
}

.ld-inv-copy:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
}

.ld-inv-body {
  margin: 0;
  padding: 10px;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
  white-space: pre;
}
</style>
