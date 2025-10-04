<script lang="ts" setup>
import { showingChatColorPicker, message, chatContainer } from './ControlPanel.Chat'
import { selectedServer, save } from './ControlPanel.SaveLoad'
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
    <div :class="`max-w-${showingChatColorPicker ? '64' : '16'}`">
      <input class="w-full text-right" :style="{ color: selectedServer.ChatColor }" @keyup.enter="save()" @click="showingChatColorPicker = !showingChatColorPicker; save()" style="font-family: monospace;" spellcheck="false" v-model="selectedServer.ChatUsername"/>
      <div v-if="showingChatColorPicker" class="flex text-xs" style="color: var(--category-misc);">UserId: <input class="w-full text-right text-xs ml-1" @keyup.enter="save()" style="color: #fff; font-family: monospace;" spellcheck="false" v-model="selectedServer.ChatUserId"/></div> 
      <div v-if="showingChatColorPicker" class="flex text-xs" style="color: var(--category-misc);">Color: <input class="w-full text-right text-xs ml-1" @keyup.enter="save()" style="color: #fff; font-family: monospace;" spellcheck="false" v-model="selectedServer.ChatColor"/></div> 
    </div>
    <div class="select-none" style="color: var(--docsearch-muted-color)">:</div>
    <input
      autofocus
      style="font-family: monospace; color: var(--docsearch-muted-color)"
      class="w-full ml-2"
      spellcheck="false"
      v-model="message"
      @keyup.enter='selectedServer?.sendMessage(message)'/>
    <button @click='selectedServer?.sendMessage(message)' class="r-send-button"><span style="user-select: none">Send</span></button>
  </div>

</template>

<style scoped>

</style>
