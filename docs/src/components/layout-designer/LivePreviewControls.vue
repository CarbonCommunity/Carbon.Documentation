<script setup lang="ts">
import { Cast, Plus, RefreshCw } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import type { Server } from '@/components/control-panel/ControlPanel.SaveLoad'
import { usePreview } from './usePreview'

const {
  previewing,
  previewServer,
  previewPlayerId,
  connectedServers,
  players,
  canPreview,
  mayDraw,
  togglePreview,
  selectServer,
  selectPlayer,
  addAndConnect,
  initPreview,
} = usePreview()

const open = ref(false)
const adding = ref(false)
const addr = ref('')
const pass = ref('')

onMounted(() => initPreview())

function onServerChange(e: Event) {
  const address = (e.target as HTMLSelectElement).value
  selectServer(connectedServers.value.find((s: Server) => s.Address === address) ?? null)
}

function onPlayerChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  selectPlayer(v ? BigInt(v) : null)
}

function submitAdd() {
  if (!addr.value.trim()) return
  addAndConnect(addr.value.trim(), pass.value)
  addr.value = ''
  pass.value = ''
  adding.value = false
}

const serverLabel = (s: Server) => s.CachedHostname || s.Address
</script>

<template>
  <div class="lp-wrap">
    <button class="ld-btn" :class="{ live: previewing }" title="Live in-game preview" @click.stop="open = !open">
      <Cast :size="14" />
      <span>Live</span>
      <span v-if="previewing" class="lp-dot" />
    </button>

    <div v-if="open" class="lp-pop ld-menu-pop" @pointerdown.stop>
      <div class="lp-title">Live preview</div>

      <!-- server -->
      <label class="lp-field">
        <span class="lp-label">Server</span>
        <div class="lp-row">
          <select class="lp-select" :value="previewServer?.Address ?? ''" :disabled="!connectedServers.length" @change="onServerChange">
            <option value="" disabled>{{ connectedServers.length ? 'Select a server…' : 'No connected Bridge servers' }}</option>
            <option v-for="s in connectedServers" :key="s.Address" :value="s.Address">{{ serverLabel(s) }}</option>
          </select>
          <button class="ld-icon-btn" title="Add a server" @click="adding = !adding"><Plus :size="14" /></button>
        </div>
      </label>

      <!-- add-server mini-form (reuses the Control Panel data layer) -->
      <div v-if="adding" class="lp-add">
        <input v-model="addr" class="lp-select" type="text" placeholder="localhost:28507" @keyup.enter="submitAdd" />
        <input v-model="pass" class="lp-select" type="password" placeholder="password" @keyup.enter="submitAdd" />
        <button class="ld-btn lp-add-btn" @click="submitAdd">Add &amp; connect (Bridge)</button>
      </div>

      <!-- player -->
      <label class="lp-field">
        <span class="lp-label">Target player</span>
        <div class="lp-row">
          <select class="lp-select" :value="previewPlayerId != null ? String(previewPlayerId) : ''" :disabled="!previewServer" @change="onPlayerChange">
            <option value="" disabled>{{ players.length ? 'Select a player…' : 'No players online' }}</option>
            <option v-for="p in players" :key="String(p.SteamID)" :value="String(p.SteamID)">{{ p.DisplayName }}</option>
          </select>
          <button class="ld-icon-btn" title="Refresh players" :disabled="!previewServer?.IsConnected" @click="previewServer?.sendCall('Players')"><RefreshCw :size="13" /></button>
        </div>
      </label>

      <p v-if="previewServer && !mayDraw" class="lp-warn">This account lacks the <code>draw_ui</code> permission — the server may reject preview calls.</p>

      <!-- toggle -->
      <button class="ld-btn lp-toggle" :class="{ live: previewing }" :disabled="!canPreview" @click="togglePreview">
        {{ previewing ? 'Stop previewing' : 'Start previewing' }}
      </button>
      <p class="lp-hint">Pushes the layout live to the player and streams edits. Toggling off clears it.</p>
    </div>
  </div>
</template>

<style scoped>
.lp-wrap {
  position: relative;
}
.ld-btn.live {
  border-color: #41d18a;
  color: #41d18a;
}
.lp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #41d18a;
  box-shadow: 0 0 6px #41d18a;
}
.lp-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px;
  z-index: 40;
}
.lp-title {
  font-weight: 600;
  font-size: 12px;
  opacity: 0.7;
}
.lp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lp-label {
  font-size: 11px;
  opacity: 0.6;
}
.lp-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.lp-select {
  flex: 1;
  min-width: 0;
  padding: 5px 7px;
  font-size: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.lp-add {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 6px;
}
.lp-add-btn {
  justify-content: center;
}
.lp-toggle {
  justify-content: center;
  margin-top: 2px;
}
.lp-warn {
  font-size: 11px;
  color: #e0a23a;
  margin: 0;
}
.lp-hint {
  font-size: 11px;
  opacity: 0.5;
  margin: 0;
}
</style>
