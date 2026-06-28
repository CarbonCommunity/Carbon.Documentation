<script setup lang="ts">
import { Check, Copy, PictureInPicture2, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { cuiColorString, referenceWidth, round } from './geometry'
import { usePopout } from './usePopout'
import { useDesigner } from './useDesigner'

const { elements, canvas, provider, resolvedRects, copyText } = useDesigner()

const { supported: popoutSupported, pipTarget, toggle: togglePopout, close: closePopout } = usePopout(() => 'Debug', { width: 460, height: 600 })

// The captured intermediate representation every generator reads from — the values in CUI-native
// form, handy for sanity-checking what the generated code was built from.
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

const copied = ref(false)
async function copy() {
  // copyText falls back to execCommand when navigator.clipboard is unavailable (insecure context).
  if (await copyText(debugCode.value)) {
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
          <span class="ld-out-title">Debug</span>
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
        <pre class="ld-out-body">{{ debugCode }}</pre>
      </div>
    </Teleport>
    <div v-if="pipTarget" class="ld-out-placeholder">
      <span>Debug panel popped out.</span>
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

.ld-out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ld-out-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.ld-out-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

.ld-out-pop {
  padding: 2px 5px;
}

.ld-out-body {
  margin: 0;
  padding: 10px;
  /* flex:1 + min-height:0 so the <pre> scrolls internally instead of stretching its column */
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
  white-space: pre;
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
</style>
