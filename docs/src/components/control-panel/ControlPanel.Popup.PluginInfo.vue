<script lang="ts" setup>
import { ref } from 'vue'
import { pluginDetails } from './ControlPanel.Plugins'
import { selectedServer } from './ControlPanel.SaveLoad'
import { Link, Link2 } from 'lucide-vue-next'
</script>

<template>
  <div>
    <table tabindex="0" class="w-full table-auto">
      <tr>
        <td class="info-title">Name</td>
        <td class="info-value">
          <a
            class="flex items-center gap-1 align-middle"
            :href="'https://codefling.com/search/?&q=' + pluginDetails?.name + '&type=downloads_file&quick=1&nodes=2&search_and_or=and&sortby=relevancy'"
            target="_blank"
            >{{ pluginDetails?.name }} <Link :size="14"
          /></a>
        </td>
      </tr>
      <tr>
        <td class="info-title">Uptime</td>
        <td class="info-value">
          {{ selectedServer?.formatDuration(pluginDetails?.uptime) }}
        </td>
      </tr>
      <tr>
        <td class="info-title">Compile Time</td>
        <td class="info-value">{{ pluginDetails?.compileTime }}ms</td>
      </tr>
      <tr>
        <td class="info-title">Int. CallHook Gen Time</td>
        <td class="info-value">{{ pluginDetails?.intCallHookGenTime }}ms</td>
      </tr>
      <tr>
        <td class="info-title">Has Internal Hook Override</td>
        <td class="info-value">
          {{ pluginDetails?.hasInternalHookOverride ? 'Yes' : 'No' }}
        </td>
      </tr>
      <tr>
        <td class="info-title">Memory Used</td>
        <td class="info-value">
          {{ selectedServer?.formatBytes(pluginDetails?.memoryUsed) }}
        </td>
      </tr>
      <tr>
        <td class="info-title">Has Conditionals</td>
        <td class="info-value">
          {{ pluginDetails?.hasConditionals ? 'Yes' : 'No' }}
        </td>
      </tr>
      <tr>
        <td class="info-title">Permissions</td>
        <td class="info-value">
          <span v-for="permission in pluginDetails?.permissions" v-bind:key="permission"> {{ permission }}<br /> </span>
          <span v-if="pluginDetails?.permissions.length == 0" class="select-none text-slate-400/50"> No permissions </span>
        </td>
      </tr>
    </table>

    <div class="mt-5">
      <table tabindex="0" class="w-full table-auto">
        <thead class="bg-slate-700/20 text-left backdrop-blur">
          <tr>
            <th class="info-title sticky top-0 z-10 text-center">ID</th>
            <th class="info-title sticky top-0 z-10">Hook Name</th>
            <th class="info-title sticky top-0 z-10 text-center">Time</th>
            <th class="info-title sticky top-0 z-10 text-center">Fires</th>
            <th class="info-title sticky top-0 z-10 text-center">Memory Usage</th>
            <th class="info-title sticky top-0 z-10 text-center">Lag Spikes</th>
            <th class="info-title sticky top-0 z-10 text-center">Async / Debugged</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="hook in pluginDetails?.hooks.sort((a, b) => b.fires - a.fires)" :key="hook.name">
            <td class="info-value text-center">{{ hook?.id }}</td>
            <td class="info-value">
              <a class="flex items-center gap-1 align-middle" :href="'../../references/hooks/?s=' + hook.name" target="_blank"
                >{{ hook?.name }} <Link :size="14"
              /></a>
            </td>
            <td class="info-value text-center">{{ hook?.time == 0 ? '' : hook?.time.toFixed(1).toLocaleString() + 'ms' }}</td>
            <td class="info-value text-center">{{ hook?.fires == 0 ? '' : hook?.fires.toLocaleString() }}</td>
            <td class="info-value text-center">{{ hook?.memoryUsage == 0 ? '' : selectedServer?.formatBytes(hook?.memoryUsage) }}</td>
            <td class="info-value text-center">{{ hook?.lagSpikes == 0 ? '' : hook?.lagSpikes.toLocaleString() }}</td>
            <td class="info-value text-center">{{ hook?.asyncOverloads.toLocaleString() }} / {{ hook?.debuggedOverloads.toLocaleString() }}</td>
          </tr>
        </tbody>
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
  padding: 8px 16px;
  padding: 8px 16px;
  font-size: 14px;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.2) transparent;
}
</style>
