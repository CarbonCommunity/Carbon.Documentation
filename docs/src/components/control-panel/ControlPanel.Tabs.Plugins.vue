<script lang="ts" setup>
import { selectedServer } from './ControlPanel.SaveLoad';
import { ref } from 'vue';
import { unloadPlugin, loadPlugin, refreshPlugins, pluginThinking } from './ControlPanel.Plugins';
import { Loader2 } from 'lucide-vue-next'

const pluginSearch = ref<string>('')
</script>

<template>
  <table tabindex="0" class="w-full border-collapse text-sm text-slate-300 overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.3)] backdrop-blur-sm">
    <thead class="bg-slate-800/70 text-slate-200 text-xs uppercase tracking-wider">
      <tr>
        <th class="px-3 py-2 text-right w-[150px]">Version</th>
        <th class="px-3 py-2 text-left">Plugin</th>
        <th class="px-3 py-2 text-center">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
        </td>
        <td>
          <input type="text" v-model="pluginSearch" placeholder="Search plugin..."
            class="w-64 px-3 py-1.5 bg-slate-800/40 border border-slate-700/60
                  text-sm text-slate-200 placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
                  transition-all duration-200 hover:bg-slate-700/50 shadow-inner"/>
          <button class="w-64 px-3 max-w-fit py-1.5 bg-slate-800/40 border border-slate-700/60
                  text-sm hover:text-slate-200 text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
                  transition-all duration-200 hover:bg-slate-700/50 shadow-inner" @click="refreshPlugins()">
            <span v-if="pluginThinking == 'refresh'"><Loader2 class="animate-spin" :size="14" /></span>
            <span v-else>Refresh</span>
          </button>
        </td>
      </tr>
      <tr v-for="plugin in selectedServer?.PluginsInfo?.sort((a, b) => a.Name.localeCompare(b.Name)).filter((x: any) => !pluginSearch || x.Name.toLowerCase().includes(pluginSearch.toLowerCase()))" :key="plugin.FileName" 
        :class="[ 'group transition-colors duration-200 border-t border-slate-800/50', plugin.IsUnloaded || plugin.Errors ? 'bg-red-400/5 opacity-60' : '' ]">
        <td class="text-slate-400/75 text-right">
          <span class="max-w-fit">{{ plugin.Version }}</span><br>
          <span class="max-w-fit text-slate-400/50 text-[12px]">{{ plugin.Author }}</span>
        </td>
        <td class="px-3 py-2">
          <span class="max-w-fit">{{ plugin.Name }}</span>
          <p v-html="plugin.Description" class="max-w-fit text-slate-400/50 text-[12px]"></p>
        </td>
        <td class="px-3 py-2 text-xs text-slate-400 font-mono text-center">
          <button
            v-if="selectedServer?.hasPermission('plugins_edit') && !plugin.IsUnloaded && !plugin.Errors"
            class="px-2 py-1.5 text-xs bg-red-800/30 hover:bg-red-700/60 text-red-300 hover:text-red-100 transition-all shadow-sm"
            @click="unloadPlugin(plugin.FileName)">
            <span v-if="pluginThinking == plugin.Name || pluginThinking == plugin.FileName"><Loader2 class="animate-spin" :size="16" /></span>
            <span v-else>Unload</span>
          </button>
          <button
            v-if="selectedServer?.hasPermission('plugins_edit') && plugin.IsUnloaded || plugin.Errors"
            class="px-2 py-1.5 text-xs bg-green-800/30 hover:bg-green-700/60 text-green-300 hover:text-green-100 transition-all shadow-sm"
            @click="loadPlugin(plugin.Name)">
            <span v-if="pluginThinking == plugin.Name || pluginThinking == plugin.FileName"><Loader2 class="animate-spin" :size="16" /></span>
            <span v-else>Load</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
