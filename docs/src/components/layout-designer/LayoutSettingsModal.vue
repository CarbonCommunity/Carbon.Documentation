<script setup lang="ts">
// File → Settings dialog: editor options plus a customizable keyboard-shortcut editor. Opened from the
// File menu; closes on backdrop click, the ✕, "Done", or Escape (Escape cancels a rebind first).
import { useEventListener } from '@vueuse/core'
import { RotateCcw, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { ASPECT_PRESETS } from './types'
import { useDesigner } from './useDesigner'
import { useDock } from './useDock'
import { KEY_ACTIONS, comboFromEvent, comboLabel, useKeybinds, type KeyActionId } from './useKeybinds'

const emit = defineEmits<{ close: [] }>()

const { canvas, setCanvas, gridSize, constrain, preserveHistory, historyLimitKb, historySteps, historyBytes, clearHistory } = useDesigner()
const { resetTree } = useDock()
const { bindingFor, setBinding, resetBinding, resetAll, conflict } = useKeybinds()

const GRID_SIZES = [1, 2, 4, 8, 16, 32]

// --- rebinding: click a combo, then the next key chord is captured ---
const recording = ref<KeyActionId | null>(null)
const recError = ref('')
function startRecord(id: KeyActionId) {
  recording.value = id
  recError.value = ''
}
// Capture phase + stopPropagation so a rebind never also fires the global shortcut it's recording.
useEventListener(
  window,
  'keydown',
  (e: KeyboardEvent) => {
    if (!recording.value) {
      if (e.key === 'Escape') emit('close')
      return
    }
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      recording.value = null
      return
    }
    const combo = comboFromEvent(e)
    if (!combo) return // waiting for a non-modifier key
    const clash = conflict(recording.value, combo)
    if (clash) {
      recError.value = `${comboLabel(combo)} is already used by "${KEY_ACTIONS.find((a) => a.id === clash)!.label}"`
      return
    }
    setBinding(recording.value, combo)
    recording.value = null
  },
  true,
)

function resetDefaults() {
  gridSize.value = 8
  constrain.value = true
  preserveHistory.value = false
  resetAll()
  resetTree()
}
</script>

<template>
  <div class="ld-modal-backdrop" @pointerdown.self="emit('close')">
    <div class="ld-modal" role="dialog" aria-label="Settings">
      <header class="ld-modal-head">
        <span>Settings</span>
        <button class="ld-modal-x" title="Close" @click="emit('close')"><X :size="16" /></button>
      </header>

      <div class="ld-modal-body">
        <section class="ld-set-section">
          <h3>Options</h3>
          <label class="ld-set-row ld-set-check">
            <input type="checkbox" v-model="preserveHistory" />
            <span>Preserve undo history across layout switches</span>
          </label>
          <div class="ld-set-row ld-set-sub">
            <span>Trim history above</span>
            <input class="ld-set-num" type="number" min="16" max="8192" step="16" v-model.number="historyLimitKb" />
            <span class="ld-set-unit">KB</span>
          </div>
          <label class="ld-set-row ld-set-check">
            <input type="checkbox" v-model="constrain" />
            <span>Bounds — keep elements inside their parent</span>
          </label>
          <div class="ld-set-row">
            <span>Aspect</span>
            <div class="ld-seg">
              <button v-for="a in ASPECT_PRESETS" :key="a" :class="{ active: canvas.aspect === a }" @click="setCanvas({ aspect: a })">{{ a }}</button>
            </div>
          </div>
          <div class="ld-set-row">
            <span>Snap grid</span>
            <div class="ld-seg">
              <button v-for="g in GRID_SIZES" :key="g" :class="{ active: gridSize === g }" @click="gridSize = g">{{ g }}</button>
            </div>
          </div>
          <div class="ld-set-row">
            <button class="ld-set-btn" @click="clearHistory">Clear undo history</button>
            <span class="ld-set-meta">{{ historySteps }} step{{ historySteps === 1 ? '' : 's' }} · {{ Math.round(historyBytes / 1024) }} KB</span>
          </div>
        </section>

        <section class="ld-set-section">
          <div class="ld-set-h3row">
            <h3>Keyboard shortcuts</h3>
            <button class="ld-set-link" @click="resetAll">Reset all</button>
          </div>
          <div v-for="a in KEY_ACTIONS" :key="a.id" class="ld-key-row">
            <span class="ld-key-label">{{ a.label }}</span>
            <button class="ld-key-combo" :class="{ recording: recording === a.id }" @click="startRecord(a.id)">
              {{ recording === a.id ? 'Press keys…' : comboLabel(bindingFor(a.id)) }}
            </button>
            <button class="ld-key-reset" title="Reset to default" @click="resetBinding(a.id)"><RotateCcw :size="13" /></button>
          </div>
          <div v-if="recError" class="ld-key-err">{{ recError }}</div>
          <div class="ld-set-note">Arrow keys nudge the selection (Shift = ×5). Esc cancels a rebind.</div>
        </section>
      </div>

      <footer class="ld-modal-foot">
        <button class="ld-set-btn" @click="resetDefaults">Reset to defaults</button>
        <button class="ld-set-btn primary" @click="emit('close')">Done</button>
      </footer>
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
  width: 460px;
  max-width: 100%;
  max-height: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
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
  padding: 6px 16px 10px;
  overflow-y: auto;
}

.ld-set-section {
  padding: 10px 0;
}
.ld-set-section + .ld-set-section {
  border-top: 1px solid var(--vp-c-divider);
}
.ld-set-section h3 {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}
.ld-set-h3row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ld-set-link {
  font-size: 12px;
  color: var(--c-carbon-1);
}
.ld-set-link:hover {
  text-decoration: underline;
}

.ld-set-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 30px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
.ld-set-row select {
  margin-left: auto;
}
.ld-set-check {
  cursor: pointer;
}
.ld-set-check input {
  flex-shrink: 0;
}
.ld-set-sub {
  padding-left: 24px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.ld-set-num {
  width: 64px;
  margin-left: auto;
  padding: 3px 6px;
  font: inherit;
  text-align: right;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.ld-set-unit {
  color: var(--vp-c-text-3);
}
.ld-set-meta {
  margin-left: auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
}

/* segmented control (Aspect / Snap grid) */
.ld-seg {
  display: inline-flex;
  margin-left: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  overflow: hidden;
}
.ld-seg button {
  padding: 3px 9px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  border-left: 1px solid var(--vp-c-divider);
}
.ld-seg button:first-child {
  border-left: none;
}
.ld-seg button:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
.ld-seg button.active {
  color: #fff;
  background: var(--c-carbon-1);
}

.ld-key-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}
.ld-key-label {
  flex: 1;
  color: var(--vp-c-text-1);
}
.ld-key-combo {
  min-width: 108px;
  padding: 3px 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.ld-key-combo:hover {
  border-color: var(--c-carbon-1);
  color: var(--vp-c-text-1);
}
.ld-key-combo.recording {
  color: var(--c-carbon-1);
  border-color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
.ld-key-reset {
  display: inline-flex;
  padding: 4px;
  border-radius: 4px;
  color: var(--vp-c-text-3);
}
.ld-key-reset:hover {
  color: var(--c-carbon-1);
  background: var(--c-carbon-soft);
}
.ld-key-err {
  margin-top: 6px;
  font-size: 12px;
  color: var(--vp-c-danger-1);
}
.ld-set-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ld-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--vp-c-divider);
}
.ld-set-btn {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
}
.ld-set-btn:hover {
  border-color: var(--c-carbon-1);
}
.ld-set-btn.primary {
  color: #fff;
  background: var(--c-carbon-1);
  border-color: var(--c-carbon-1);
}
.ld-set-btn.primary:hover {
  background: var(--c-carbon-3);
}
</style>
