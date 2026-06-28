<script setup lang="ts">
import { Check, Copy, PictureInPicture2, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { generateCode, generateFullClass, generateJson, generateSelected } from './codegen'
import { usePopout } from './usePopout'
import { useDesigner } from './useDesigner'

const { elements, dataSources, canvas, provider, selectedIds, copyText } = useDesigner()

// Emission level. Target (Oxide/Carbon/Both) applies to class/ux/selected; json is
// provider-independent (the CUI wire format). The captured IR lives in its own Debug pane.
type Tab = 'class' | 'ux' | 'json' | 'selected'
const TABS: { id: Tab; label: string }[] = [
  { id: 'class', label: 'Class' },
  { id: 'ux', label: 'UX' },
  { id: 'selected', label: 'Selected' },
  { id: 'json', label: 'JSON' },
]
// Display order/labels only; the stored provider value 'both' is unchanged (codegen reads the value).
const PROVIDERS = [
  { value: 'carbon', label: 'Carbon' },
  { value: 'oxide', label: 'Oxide' },
  { value: 'both', label: 'Hybrid' },
] as const
const tab = ref<Tab>('ux')
const targetApplies = computed(() => tab.value === 'class' || tab.value === 'ux' || tab.value === 'selected')

const { supported: popoutSupported, pipTarget, toggle: togglePopout, close: closePopout } = usePopout(() => 'Code', { width: 520, height: 640 })

// One computed per emission level (each only recomputes when its inputs change).
const uxCode = computed(() => generateCode(elements.value, provider.value, canvas.rootLayer, dataSources.value))
const classCode = computed(() => generateFullClass(elements.value, provider.value, canvas.rootLayer, dataSources.value))
const jsonCode = computed(() => generateJson(elements.value, canvas.rootLayer, dataSources.value))
const selectedCode = computed(() => generateSelected(elements.value, selectedIds.value, provider.value, canvas.rootLayer, dataSources.value))

const active = computed(() => {
  switch (tab.value) {
    case 'class':
      return classCode.value
    case 'json':
      return jsonCode.value
    case 'selected':
      return selectedCode.value
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
          <div class="ld-out-head-left">
            <select
              v-model="provider"
              class="ld-out-target"
              :disabled="!targetApplies"
              :title="targetApplies ? 'Target framework for the generated code' : 'Target applies to Class / UX / Selected'"
            >
              <option v-for="p in PROVIDERS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
            <div class="ld-out-tabs" role="tablist">
              <button v-for="t in TABS" :key="t.id" :class="{ active: tab === t.id }" role="tab" @click="tab = t.id">{{ t.label }}</button>
            </div>
          </div>
          <div class="ld-out-actions">
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

.ld-out-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
