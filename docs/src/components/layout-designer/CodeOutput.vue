<script setup lang="ts">
import { Check, Copy, PictureInPicture2, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { generateCode, generateFullClass, generateJson, generateSelected } from './codegen'
import { cuiColorString, referenceWidth, round } from './geometry'
import { usePopout } from './usePopout'
import { useDesigner } from './useDesigner'

const { elements, dataSources, canvas, provider, selectedIds, resolvedRects, copyText } = useDesigner()

// Emission level. Target (Oxide/Carbon/Both) applies to class/ux/selected; json + debug are
// provider-independent (json = the CUI wire format, debug = the captured IR).
type Tab = 'class' | 'ux' | 'json' | 'selected' | 'debug'
const TABS: { id: Tab; label: string }[] = [
  { id: 'class', label: 'Class' },
  { id: 'ux', label: 'UX' },
  { id: 'selected', label: 'Selected' },
  { id: 'json', label: 'JSON' },
  { id: 'debug', label: 'Debug' },
]
const PROVIDERS = [
  { value: 'oxide', label: 'Oxide' },
  { value: 'carbon', label: 'Carbon' },
  { value: 'both', label: 'Both' },
] as const
const tab = ref<Tab>('ux')
const targetApplies = computed(() => tab.value === 'class' || tab.value === 'ux' || tab.value === 'selected')

const { supported: popoutSupported, pipTarget, toggle: togglePopout, close: closePopout } = usePopout(() => 'Generated code', { width: 520, height: 640 })

// One computed per emission level (each only recomputes when its inputs change).
const uxCode = computed(() => generateCode(elements.value, provider.value, canvas.rootLayer, dataSources.value))
const classCode = computed(() => generateFullClass(elements.value, provider.value, canvas.rootLayer, dataSources.value))
const jsonCode = computed(() => generateJson(elements.value, canvas.rootLayer, dataSources.value))
const selectedCode = computed(() => generateSelected(elements.value, selectedIds.value, provider.value, canvas.rootLayer, dataSources.value))

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
        image: el.type === 'panel' && el.props.image ? { ...el.props.image } : null,
        text: el.type === 'text' ? { text: el.props.text, fontSize: el.props.fontSize, align: el.props.align } : null,
        resolvedRect: r ? { x: round(r.x, 1), y: round(r.y, 1), w: round(r.w, 1), h: round(r.h, 1) } : null,
      }
    }),
  }
})

const debugCode = computed(() => JSON.stringify(inventory.value, null, 2))

const active = computed(() => {
  switch (tab.value) {
    case 'class':
      return classCode.value
    case 'json':
      return jsonCode.value
    case 'selected':
      return selectedCode.value
    case 'debug':
      return debugCode.value
    default:
      return uxCode.value
  }
})

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
    <Teleport :to="pipTarget" :disabled="!pipTarget">
      <div class="ld-out-inner">
        <div class="ld-out-head">
          <div class="ld-out-tabs" role="tablist">
            <button v-for="t in TABS" :key="t.id" :class="{ active: tab === t.id }" role="tab" @click="tab = t.id">{{ t.label }}</button>
          </div>
          <div class="ld-out-actions">
            <select
              v-model="provider"
              class="ld-out-target"
              :disabled="!targetApplies"
              :title="targetApplies ? 'Target framework for the generated code' : 'Target applies to Class / UX / Selected'"
            >
              <option v-for="p in PROVIDERS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
            <button class="ld-out-copy" :title="copied ? 'Copied' : 'Copy'" @click="copy">
              <component :is="copied ? Check : Copy" :size="13" />
              {{ copied ? 'Copied' : 'Copy' }}
            </button>
            <button
              v-if="popoutSupported"
              class="ld-out-copy ld-out-pop"
              :title="pipTarget ? 'Pop back in' : 'Pop out into its own window'"
              @click="togglePopout"
            >
              <component :is="pipTarget ? X : PictureInPicture2" :size="13" />
            </button>
          </div>
        </div>
        <pre class="ld-out-body">{{ active }}</pre>
      </div>
    </Teleport>
    <div v-if="pipTarget" class="ld-out-placeholder">
      <span>Code panel popped out.</span>
      <button @click="closePopout"><X :size="12" /> Bring it back</button>
    </div>
  </div>
</template>

<style scoped>
.ld-output {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* the part that actually pops out (teleported into the PiP window); fills its host either way */
.ld-out-inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  height: 100%;
}

.ld-out-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ld-out-target {
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 2px 4px;
}

.ld-out-target:hover:not(:disabled) {
  border-color: var(--c-carbon-1);
}

.ld-out-target:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ld-out-pop {
  padding: 2px 5px;
}

.ld-out-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ld-out-placeholder button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  padding: 3px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.ld-out-placeholder button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--c-carbon-1);
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
  /* flex:1 + min-height:0 so the <pre> scrolls internally instead of stretching its column
     (matters when the panel is a flex-sized side column, not the fixed-height bottom dock) */
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
  white-space: pre;
}
</style>
