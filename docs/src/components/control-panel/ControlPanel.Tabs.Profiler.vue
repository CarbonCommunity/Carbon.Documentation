<script lang="ts" setup>
import { Download, Play, Square, Trash2 } from 'lucide-vue-next'
import { deleteProfile, loadProfile, toggleProfile} from './ControlPanel.Profiler'
import { selectedServer } from './ControlPanel.SaveLoad'
import { onMounted } from 'vue'

onMounted (() => {
  selectedServer.value?.sendCall('ProfilesList')
  selectedServer.value?.sendCall('ProfilesState')
})
</script>

<template>
  <div v-if="selectedServer?.hasPermission('profiler_edit')" class="flex pb-5 text-sm">
    <button v-if="!selectedServer.ProfileState.IsProfiling" class="r-send-button !text-green-400 !bg-green-800/20 hover:!bg-green-800/80 hover:!text-green-200" @click="toggleProfile(false)"><Play :size=18 /> Start Profile</button>
    <button v-if="selectedServer.ProfileState.IsProfiling" class="r-send-button !text-slate-400 !bg-slate-500/20 hover:!bg-slate-500/80 hover:!text-slate-200" @click="toggleProfile(false)"><Square :size=18 /> End Profile</button>
    <button v-if="selectedServer.ProfileState.IsProfiling" class="r-send-button !text-red-400 !bg-red-800/20 hover:!bg-red-800/80 hover:!text-red-200" @click="toggleProfile(true)"><Square :size=18 /> Cancel</button>
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
