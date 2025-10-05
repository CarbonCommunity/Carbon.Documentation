<script lang="ts" setup>
import { computed, ref } from 'vue'
import { AssemblyName, loadProfile, currentProfile, ProfileTypes } from './ProfilerPanel.SaveLoad';
import { Minus, Plus } from 'lucide-vue-next'
const sortedAssemblies = computed(() => {
  if (!currentProfile.value) return []
  return [...currentProfile.value.Assemblies]
    .filter(a => {
      return !assemblyFilter.value || 
        a.Name?.DisplayName.toLowerCase().includes(assemblyFilter.value.toLowerCase())
    })
    .sort((a, b) => Number(b.Calls) - Number(a.Calls))
})

const sortedCalls = computed(() => {
  if (!currentProfile.value) return []
  return currentProfile.value.Calls
    .filter(c => {
      return selectedAssembly.value && c.AssemblyName === selectedAssembly.value
    })
    .filter(c => {
      return !callFilter.value || 
        c.MethodName.toLowerCase().includes(callFilter.value.toLowerCase())
    })
    .sort((a, b) => Number(b.Calls) - Number(a.Calls))
})
const selectedAssembly = ref<AssemblyName | null>(null)
const assemblyFilter = ref<string | null>(null)
const callFilter = ref<string | null>(null)
const assemblyOptions = ['Name', 'Time', 'Calls', 'Memory', 'Exceptions']
const assemblySort = ref<string | null>('Time')
const callOptions = ['Method', 'Calls', 'Time (Total)', 'Time (Own)', 'Memory (Total)', 'Memory (Own)', 'Exceptions (Total)', 'Exceptions (Own)']
const callSort = ref<string | null>('Calls')
</script>

<template>
  <div class="w-full h-full flex flex-col px-[200px] ">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold select-none">Profiler Panel</h2>
      <div class="flex space-x-2">
        <div v-if="!currentProfile" class="relative">
          <input id="fileInput" type="file" accept=".cprf" @change="loadProfile" class="hidden"/>
          <label for="fileInput" class="select-none inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer font-medium transition">
            <Plus :size="17"/>
            Load Profile
          </label>
        </div>
        <div v-if="currentProfile" class="relative">
          <button id="fileInput" accept=".cprf" @click="currentProfile = null" class="hidden"></button>
          <label for="fileInput" class="select-none inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded cursor-pointer font-medium transition">
            <Minus :size="17"/>
            Clear
          </label>
        </div>
      </div>
    </div>
    <div class="flex pl-5 h-full gap-x-5">
      <!-- Assemblies -->
      <div v-if="currentProfile" class="flex-1 py-5 basis-1/2 min-w-0 overflow-y-auto">
        <h2 class="select-none text-lg font-semibold mb-2">ASSEMBLIES ({{ currentProfile?.Assemblies.length.toLocaleString() }}) <span class="text-blue-300/40" v-if="currentProfile?.Assemblies.length != sortedAssemblies.length"> — {{ sortedAssemblies.length.toLocaleString() }} filtered</span></h2>
        <div class="flex">
          <input type="text" placeholder="Search..." v-model="assemblyFilter" class="w-full mb-3 p-2 bg-gray-800 text-gray-200 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          <div class="w-[75px] mb-3 p-2 bg-gray-800 text-gray-200 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <select v-model="assemblySort" class="bg-gray-800 text-center text-sm text-blue-300/60 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option v-for="option in assemblyOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="space-y-1">
          <div class="overflow-auto h-screen">
            <div v-for="(assembly, i) in sortedAssemblies"
              :key="i"
              class="flex items-center justify-between bg-gray-800/20 hover:bg-gray-700 text-white cursor-pointer"
              @click="selectedAssembly = selectedAssembly == assembly.Name ? null : assembly.Name">

              <div v-if="selectedAssembly == assembly.Name" class="w-[5px] bg-red-600 self-stretch"></div>

              <!-- Main content (left + right sections) -->
              <div class="flex justify-between w-full px-2 py-1">
                <!-- Left side -->
                <div class="flex flex-col">
                  <span class="font-semibold text-sm leading-tight">{{ assembly.Name?.DisplayName }}</span>
                  <span class="text-xs text-gray-100/70">
                    {{ assembly.getTotalTime() }} ({{ assembly.TotalTimePercentage.toFixed(1) }}%) |
                    {{ (assembly.Alloc / 1000n).toLocaleString() }} KB |
                    {{ assembly.TotalExceptions.toLocaleString() }} excep.
                  </span>
                </div>

                <!-- Right side -->
                <div class="flex flex-col items-end text-right text-gray-100/70">
                  <span class="uppercase text-xs font-semibold opacity-80">
                    {{ ProfileTypes[assembly.Name?.ProfileType] }}
                  </span>
                  <span class="text-xs font-bold">
                    {{ assembly.Calls.toLocaleString() }} calls
                  </span>
                </div>
              </div>
            </div>
            <div v-if="sortedAssemblies.length == 0" class="text-center text-sm text-blue-200/30">
              No available assemblies
            </div>
          </div>
        </div>
      </div>
      <!-- Calls -->
      <div v-if="currentProfile" class="flex-1 py-5 text-white basis-1/2 min-w-0 overflow-y-auto">
        <h2 class="select-none text-lg font-semibold mb-2">CALLS ({{ currentProfile?.Calls.length.toLocaleString() }}) <span class="text-blue-300/40" v-if="currentProfile?.Calls.length != sortedCalls.length"> — {{ sortedCalls.length.toLocaleString() }} filtered</span></h2>
        <div class="flex">
          <input type="text" placeholder="Search..." v-model="callFilter" class="w-full mb-3 p-2 bg-gray-800 text-gray-200 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          <div class="w-[75px] flex text-sm mb-3 p-2 bg-gray-800 text-gray-200 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            Sort:
            <select v-model="callSort" class="bg-gray-800 text-center text-sm text-blue-300/60 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option v-for="option in callOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="space-y-1">
          <div class="overflow-auto h-screen">
            <div v-for="(call, i) in sortedCalls" :key="i" class="flex justify-between items-center bg-gray-800/20 hover:bg-gray-700 text-white px-2 py-1 cursor-pointer">
              <div class="flex flex-col">
                <span class="font-semibold text-sm leading-tight">{{ call.MethodName }}</span>
                <span class="text-xs text-gray-100/70">
                  {{ call.getTotalTime() }} ({{ call.TotalTimePercentage.toFixed(1) }}%) | {{ call.getOwnTime() }} ({{ call.OwnTimePercentage.toFixed(1) }}%) | {{ call.TotalExceptions.toLocaleString() }} total / {{ call.OwnExceptions.toLocaleString() }} own excep.
                </span>
              </div>
              <div class="flex flex-col items-end text-right text-gray-100/70">
                <span class="text-xs opacity-80"><strong>{{ call.Calls.toLocaleString() }}</strong> calls</span>
                <span class="text-xs">{{ call.TotalAlloc / 1000n }} B total | {{ call.OwnAlloc / 1000n }} B own</span>
              </div>
            </div>
            <div v-if="sortedCalls.length == 0" class="text-center text-sm text-blue-200/30">
              No available calls
            </div>
           </div>
        </div>
      </div>
      <div v-if="currentProfile == null" class="w-screen text-center pt-[50px] text-blue-300/30 select-none">
        No profile selected. Press on <strong class="text-blue-300/60">+ Load Profile</strong> to get started!
      </div>

    </div>
  </div>
</template>

<style scoped>
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.05) transparent;
}
</style>
