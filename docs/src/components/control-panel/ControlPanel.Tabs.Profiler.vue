<script lang="ts" setup>
import { Download, Play, Square, Trash2, X } from 'lucide-vue-next'
import { deleteProfile, loadProfile, toggleProfile} from './ControlPanel.Profiler'
import { selectedServer, save } from './ControlPanel.SaveLoad'
import { onMounted } from 'vue'

onMounted (() => {
  selectedServer.value?.sendCall('ProfilesList')
  selectedServer.value?.sendCall('ProfilesState')
})
</script>

<template>
  <div v-if="selectedServer?.hasPermission('profiler_edit')">
    <div class="flex pb-5 text-sm gap-x-1 items-center" v-if="selectedServer.ProfileState.IsEnabled && !selectedServer.ProfileState.HasCrashed">
      <button v-if="!selectedServer.ProfileState.IsProfiling" title="Start profiling with the selected flags" class="r-send-button !p-3 !text-green-400 !bg-green-800/20 hover:!bg-green-800/80 hover:!text-green-200" @click="toggleProfile(false)"><Play :size=18 /></button>
      <button v-if="selectedServer.ProfileState.IsProfiling" title="Stop and save the profile" class="r-send-button !p-3 !text-slate-400 !bg-slate-500/20 hover:!bg-slate-500/80 hover:!text-slate-200" @click="toggleProfile(false)"><Square :size=18 /></button>
      <button v-if="selectedServer.ProfileState.IsProfiling" title="Abort the profile" class="r-send-button !p-3 !text-red-400 !bg-red-800/20 hover:!bg-red-800/80 hover:!text-red-200 uppercase" @click="toggleProfile(true)"><X :size=18 /></button>
      <span class="flex ml-1 gap-x-1 bg-black/10 p-2">
        <div class="r-send-button !text-blue-400/50 !bg-red-800/0">FLAGS:</div>
        <button :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.CallMemory ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.CallMemory = !selectedServer.ProfileFlags.CallMemory; save()">Call Memory</button>
        <button :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.AdvancedMemory ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.AdvancedMemory = !selectedServer.ProfileFlags.AdvancedMemory; save()">Advanced Memory</button>
        <button :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.Timings ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.Timings = !selectedServer.ProfileFlags.Timings; save()">Timings</button>
        <button :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.Calls ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.Calls = !selectedServer.ProfileFlags.Calls; save()">Calls</button>
        <button :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.GCEvents ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.GCEvents = !selectedServer.ProfileFlags.GCEvents; save()">GC Events</button>
      </span>
    </div>
    <div class="flex pb-5 text-sm gap-x-1 items-center" v-if="!selectedServer.ProfileState.IsEnabled || selectedServer.ProfileState.HasCrashed">
      <button class="r-send-button select-none !text-red-400 !bg-red-800/20">
        <span v-if="selectedServer.ProfileState.HasCrashed">PROFILER CRASHED</span>
        <span v-if="!selectedServer.ProfileState.HasCrashed">PROFILER DISABLED</span>
      </button>
    </div>
  </div>
  <table tabindex="0" class="vp-doc table">
    <thead>
      <tr>
        <th class="vp-doc th">Profile</th>
        <th class="vp-doc th text-center">Size</th>
        <th class="vp-doc th">Created</th>
        <th class="vp-doc th">Actions</th>
      </tr>
    </thead>
    <tr v-for="file in selectedServer?.ProfileFiles" :key="file.FilePath">
      <td class="vp-doc td">
        {{ file.FileName }}
      </td>
      <td style="position: relative">
        {{ (new Number(file.Size / 1000n)).toLocaleString() }} KB
      </td>
      <td class="vp-doc td">
        {{ new Date(file.LastWriteTime * 1000).toLocaleDateString() }} {{ new Date(file.LastWriteTime * 1000).toLocaleTimeString() }}
      </td>
      <td class="vp-doc td flex gap-x-2">
        <button v-if="selectedServer?.hasPermission('profiler_load')" class="r-send-button !text-green-400 !bg-green-800/20 hover:!bg-green-800/80 hover:!text-green-200" @click="loadProfile(file)"><Download :size=20 /> Load</button>
        <button v-if="selectedServer?.hasPermission('profiler_edit')" class="r-send-button !text-red-400 !bg-red-800/20 hover:!bg-red-800/80 hover:!text-red-200" @click="deleteProfile(file)"><Trash2 :size=20 /> Delete</button>
      </td>
    </tr>
  </table>
</template>

<style scoped>

</style>
