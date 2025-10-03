<script lang="ts" setup>
import { message, chatContainer } from './ControlPanel.Chat'
import { selectedServer } from './ControlPanel.SaveLoad'
</script>

<template>
  <div
    v-if="selectedServer"
    ref="chatContainer"
    class="rounded p-4 font-mono text-sm"
    style="overflow: auto; align-content: end; background-color: var(--vp-code-copy-code-bg); min-height: 300px; max-height: 700px; scrollbar-width: none">
    <p v-for="(line, i) in selectedServer?.Chat" :key="i" v-html="line" style="white-space: pre-wrap; text-wrap-mode: nowrap"></p>
  </div>
  <div v-if="selectedServer?.hasPermission('chat_input')" class="flex gap-2" style="align-items: center; background-color: var(--vp-code-copy-code-bg); padding: 10px">
    <div style="color: var(--category-misc); font-family: monospace; user-select: none">SERVER</div>
    <input
      style="font-family: monospace; color: var(--docsearch-muted-color)"
      class="w-full"
      spellcheck="false"
      v-model="message"
      @keyup.enter='selectedServer?.sendMessage(message)'/>
    <button @click='selectedServer?.sendMessage(message)' class="r-send-button"><span style="user-select: none">Send</span></button>
  </div>

</template>

<style scoped>

</style>
