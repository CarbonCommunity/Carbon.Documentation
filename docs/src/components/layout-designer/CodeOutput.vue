<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { generateCode } from './codegen'
import { cuiColorString, referenceWidth, round } from './geometry'
import { useDesigner } from './useDesigner'

const { elements, canvas, provider, resolvedRects, copyText } = useDesigner()

type Tab = 'code' | 'debug'
const tab = ref<Tab>('code')

// Primary output: copy-paste-ready C# for the selected provider.
const code = computed(() => generateCode(elements.value, provider.value, canvas.rootLayer))

// Debug view: the captured intermediate representation every generator reads from — the values
// in CUI-native form, handy for sanity-checking what the code above was built from.
const inventory = computed(() => {
  const rects = resolvedRects.value
  return {
    canvas: {
      aspect: canvas.aspect,
      rootLayer: canvas.rootLayer,
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

const active = computed(() => (tab.value === 'code' ? code.value : json.value))

const copied = ref(false)
async function copy() {
  // copyText falls back to execCommand when navigator.clipboard is unavailable
  // (insecure context — e.g. http on a LAN IP).
  if (await copyText(active.value)) {
    copied.value = true
    setTimeout(() => (copied.value = false), 1200)
  }
}
</script>

<template>
  <div class="ld-output">
    <div class="ld-out-head">
      <div class="ld-out-tabs" role="tablist">
        <button :class="{ active: tab === 'code' }" role="tab" @click="tab = 'code'">Code</button>
        <button :class="{ active: tab === 'debug' }" role="tab" @click="tab = 'debug'">Debug</button>
      </div>
      <button class="ld-out-copy" :title="copied ? 'Copied' : 'Copy'" @click="copy">
        <component :is="copied ? Check : Copy" :size="13" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <pre class="ld-out-body">{{ active }}</pre>
  </div>
</template>

<style scoped>
.ld-output {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.ld-out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ld-out-tabs {
  display: inline-flex;
  gap: 2px;
}

.ld-out-tabs button {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  padding: 4px 10px;
  border-radius: 4px;
}

.ld-out-tabs button:hover {
  color: var(--vp-c-text-1);
}

.ld-out-tabs button.active {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}

.ld-out-copy {
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

.ld-out-copy:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
}

.ld-out-body {
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
