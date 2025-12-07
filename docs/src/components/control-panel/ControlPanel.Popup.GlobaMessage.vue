<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { save, servers } from './ControlPanel.SaveLoad'
import { Check, X } from 'lucide-vue-next';

const messageInput = ref<string>('');

const selectedServers = ref<string[]>([])

onMounted(() => {
  selectedServers.value.length = 0
  for (let i = 0; i < servers.value.length; i++) {
    const server = servers.value[i];
    if(server.IsConnected) {
      selectedServers.value.push(server.Address)
    }
  }
})

function sendMessage() {
  if(messageInput.value == '') {
    return
  }

  for (let i = 0; i < servers.value.length; i++) {
    const server = servers.value[i];
    if(server.IsConnected && selectedServers.value.includes(server.Address)) {
      server.PendingRequest = true
      server.sendMessage(messageInput.value)
    } else {
      server.LastGlobalCommandResult = ''
    }
  }
  save()
}

function clearLastCommand() {
  if(messageInput.value == '') {
    return
  }

  for (let i = 0; i < servers.value.length; i++) {
    const server = servers.value[i];
    server.LastGlobalCommand = ''
  }
  save()
  messageInput.value = ''
}

function toggleServer(server: string) {
  if(selectedServers.value.includes(server)) {
    selectedServers.value = selectedServers.value.filter(x => x != server)
  } else {
    selectedServers.value.push(server)
  }
}

</script>

<template>
<div class="w-full">
  <div class="flex mb-5 items-center gap-2">
    <span class="w-full flex px-3 py-1.5 bg-slate-800/40 border border-slate-700/60
            text-sm text-slate-200 placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
            transition-all duration-200 hover:bg-slate-700/50 shadow-inner" style="color: var(--category-misc);"><strong class="select-none px-2">></strong>
        <input class="text-slate-400 w-full" type="text" v-model="messageInput"  placeholder="Type in the command..." @keyup.enter='sendMessage'/>
        <button @click="clearLastCommand"><X :size="19"/></button>
      </span>
  </div>

  <div class="mt-5 max-h-[550px] overflow-y-auto overscroll-none custom-scrollbar">
    <table tabindex="0" class="table-auto w-full">
      <tr>
        <td class="info-title">
          Server
        </td>
        <td class="info-value">
          Response
        </td>
      </tr>
      <tr v-for="server in servers" :key="server.Address">
        <td class="info-title flex gap-2">
          <button class="px-2 py-1.5 text-xs bg-blue-800/30 hover:bg-blue-700/60 text-blue-300 hover:text-blue-100 shadow-sm w-9" @click="toggleServer(server.Address)"><Check v-if="selectedServers.includes(server.Address)" :size="20"/></button>
          <div class="grid">
            <span>{{ server.CachedHostname }}</span>
            <span class="text-xs/[15px] text-slate-500/75">{{ server.Address }}</span>
          </div>
        </td>
        <td class="info-value">
          <span v-html="server.LastGlobalCommandResult" style="white-space: pre-wrap; text-wrap-mode: nowrap"></span>
        </td>
      </tr>
    </table>
  </div>
</div>
</template>

<style scoped>
.info-title {
  color: rgb(148 163 184 / 0.7);
  background-color: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 8px 16px;
  font-size: 14px;
}

.info-value {
  color: rgb(255 255 255 / 0.7);
  border: 1px solid var(--vp-c-divider);
  padding: 8px 16px;  padding: 8px 16px;
  font-size: 14px;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.2) transparent;
}
</style>
