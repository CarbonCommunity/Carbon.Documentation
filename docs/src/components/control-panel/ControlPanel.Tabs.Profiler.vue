<script lang="ts" setup>
import { Download, Loader2, Play, Square, Trash2, X } from 'lucide-vue-next'
import { deleteProfile, loadingToggle, loadProfile, toggleProfile} from './ControlPanel.Profiler'
import { selectedServer, save } from './ControlPanel.SaveLoad'
import { loadingProfile } from './ControlPanel.Profiler'
import { onMounted, onUnmounted, ref } from 'vue'

const timeout = ref<any | null>(null)

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

onMounted (() => {
  selectedServer.value?.sendCall('ProfilesList')
  selectedServer.value?.sendCall('ProfilesState')

  timeout.value = setInterval(() => {
    if(selectedServer.value == null || !selectedServer.value.ProfileState.IsProfiling) {
      return
    }
    selectedServer.value.ProfileState.Duration += 1
  }, 1000);
})
onUnmounted(() => {
  if(timeout.value != null) {
    clearTimeout(timeout.value)
    timeout.value = null
  }
})
</script>

<template>
  <div v-if="selectedServer?.hasPermission('profiler_edit')">
    <div class="flex pb-5 text-sm gap-x-1 items-center" v-if="selectedServer.ProfileState.IsEnabled && !selectedServer.ProfileState.HasCrashed">
      <button v-if="!selectedServer.ProfileState.IsProfiling" title="Start profiling with the selected flags" class="r-send-button !p-3 !text-green-400 !bg-green-800/20 hover:!bg-green-800/80 hover:!text-green-200" @click="toggleProfile(false, 1)"><Loader2 v-if="loadingToggle == 1" class="animate-spin" :size="18" /> <Play v-if="loadingToggle != 1" :size=18 /></button>
      <button v-if="selectedServer.ProfileState.IsProfiling" title="Stop and save the profile" class="r-send-button !p-3 !text-slate-400 !bg-slate-500/20 hover:!bg-slate-500/80 hover:!text-slate-200" @click="toggleProfile(false, 2)"><Loader2 v-if="loadingToggle == 2" class="animate-spin" :size="18" /><Square v-if="loadingToggle != 2" :size=18 />{{ selectedServer.formatDuration(selectedServer?.ProfileState.Duration) }}</button>
      <button v-if="selectedServer.ProfileState.IsProfiling" title="Abort the profile" class="r-send-button !p-3 !text-red-400 !bg-red-800/20 hover:!bg-red-800/80 hover:!text-red-200 uppercase" @click="toggleProfile(true, 3)"><Loader2 v-if="loadingToggle == 3" class="animate-spin" :size="18" /><X v-if="loadingToggle != 3" :size=18 /></button>
      <span :class="[ `flex ml-1 gap-x-1 bg-black/10 p-2`, selectedServer.ProfileState.IsProfiling ? `opacity-30` : '' ]">
        <div class="r-send-button !text-blue-400/50 !bg-red-800/0 !select-none !cursor-auto">FLAGS:</div>
        <button :disabled="selectedServer.ProfileState.IsProfiling" :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.CallMemory ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.CallMemory = !selectedServer.ProfileFlags.CallMemory; save()">Call Memory</button>
        <button :disabled="selectedServer.ProfileState.IsProfiling" :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.AdvancedMemory ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.AdvancedMemory = !selectedServer.ProfileFlags.AdvancedMemory; save()">Advanced Memory</button>
        <button :disabled="selectedServer.ProfileState.IsProfiling" :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.Timings ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.Timings = !selectedServer.ProfileFlags.Timings; save()">Timings</button>
        <button :disabled="selectedServer.ProfileState.IsProfiling" :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.Calls ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.Calls = !selectedServer.ProfileFlags.Calls; save()">Calls</button>
        <button :disabled="selectedServer.ProfileState.IsProfiling" :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.GCEvents ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.GCEvents = !selectedServer.ProfileFlags.GCEvents; save()">GC Events</button>
        <button :disabled="selectedServer.ProfileState.IsProfiling" :class="[ 'r-send-button !animate-none !transition-none hover:bg-blue-800/20', selectedServer.ProfileFlags.StackWalkAllocations ? '!bg-blue-800/50 !text-blue-400' : '!bg-blue-800/10 !text-blue-400/50' ]" @click="selectedServer.ProfileFlags.StackWalkAllocations = !selectedServer.ProfileFlags.StackWalkAllocations; save()">StackWalk Allocations</button>
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
        <th class="vp-doc th text-right">Protocol</th>
        <th class="vp-doc th">Profile</th>
        <th class="vp-doc th text-center">Duration</th>
        <th class="vp-doc th">Created</th>
        <th class="vp-doc th text-center">Size</th>
        <th class="vp-doc th text-center">Actions</th>
      </tr>
    </thead>
    <tr v-for="file in selectedServer?.ProfileFiles" :key="file.FilePath">
      <td :class="[ 'vp-doc td text-right', file.IsValid ? 'text-green-300/75' : 'text-red-400/50' ]">
        {{ file.Protocol }}
      </td>
      <td class="vp-doc td">
        {{ file.FileName }}
      </td>
      <td class="vp-doc td text-center text-white/60">
        {{ formatDuration(file.Duration) }}
      </td>
      <td class="vp-doc td text-white/60">
        {{ new Date(file.LastWriteTime * 1000).toLocaleDateString() }} {{ new Date(file.LastWriteTime * 1000).toLocaleTimeString() }}
      </td>
      <td class="text-center text-white/60">
        {{ (new Number(file.Size / 1000n)).toLocaleString() }} KB
      </td>
      <td class="vp-doc td flex gap-x-2">
        <button v-if="selectedServer?.hasPermission('profiler_load')" class="r-send-button !text-green-400 !bg-green-800/20 hover:!bg-green-800/80 hover:!text-green-200" @click="loadProfile(file)"><Loader2 v-if="loadingProfile == file" class="animate-spin" :size="20" /> <Download v-if="loadingProfile != file" :size=20 /> Load</button>
        <button v-if="selectedServer?.hasPermission('profiler_edit')" class="r-send-button !text-red-400 !bg-red-800/20 hover:!bg-red-800/80 hover:!text-red-200" @click="deleteProfile(file)"><Trash2 :size=20 /> Delete</button>
      </td>
    </tr>
  </table>
</template>

<style scoped>

</style>
