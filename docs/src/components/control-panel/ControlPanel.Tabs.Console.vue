<script lang="ts" setup>
import { command, consoleContainer } from './ControlPanel.Console'
import { selectedServer } from './ControlPanel.SaveLoad'
</script>

<template>
  <div
    v-if="selectedServer"
    ref="consoleContainer"
    class="rounded p-4 font-mono text-sm"
    style="overflow: auto; align-content: end; background-color: var(--vp-code-copy-code-bg); min-height: 300px; max-height: 700px; scrollbar-width: none">
    <p v-for="(line, i) in selectedServer?.Logs" :key="i" v-html="line" style="white-space: pre-wrap; text-wrap-mode: nowrap"></p>
  </div>
  <div v-if="selectedServer && selectedServer.hasPermission('console_input')" class="flex gap-2" style="align-items: center; background-color: var(--vp-code-copy-code-bg); padding: 10px">
    <div style="color: var(--category-misc); font-family: monospace; font-weight: 900; user-select: none">></div>
    <input
      style="font-family: monospace; color: var(--docsearch-muted-color)"
      class="w-full"
      spellcheck="false"
      v-model="command"
      @keydown.up.prevent="selectedServer?.selectHistory(true)"
      @keydown.down.prevent="selectedServer?.selectHistory(false)"
      @keyup.enter="selectedServer?.sendCommand(command, 1)"
    />
    <button @click="selectedServer?.clearLogs()" class="r-send-button"><span style="user-select: none">Clear</span></button>
    <button @click="selectedServer?.sendCommand(command, 1)" class="r-send-button"><span style="user-select: none">Send</span></button>
  </div>
</template>

<style scoped>

</style>
