<script lang="ts" setup>
import { computed, ref } from 'vue'
import { AssemblyName, loadProfile, currentProfile, ProfileTypes, Assembly, Call, Memory } from './ProfilerPanel.SaveLoad';
import { Minus, Plus } from 'lucide-vue-next'
const sortedAssemblies = computed(() => {
  if (!currentProfile.value) return []
  return [...currentProfile.value.Assemblies]
    .filter(a => {
      return !assemblyFilter.value || 
        a.Name?.DisplayName.toLowerCase().includes(assemblyFilter.value.toLowerCase())
    })
    .sort((a, b) => {
      switch(assemblySort.value) {
        case "Name":
          return a.Name?.DisplayName.localeCompare(b.Name?.DisplayName)
        case "Time":
          return Number(b.TotalTime) - Number(a.TotalTime)
        case "Calls":
          return Number(b.Calls) - Number(a.Calls)
        case "Memory":
          return Number(b.Alloc) - Number(a.Alloc)
        case "Exceptions":
          return Number(b.TotalExceptions) - Number(a.TotalExceptions)
      }
      return 0
    })
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
    .sort((a, b) => {
      switch(callSort.value) {
        case "Method":
          return a.MethodName.localeCompare(b.MethodName)
        case "Calls":
          return Number(b.Calls) - Number(a.Calls)
        case "Time (Total)":
          return Number(b.TotalTime) - Number(a.TotalTime)
        case "Time (Own)":
          return Number(b.OwnTime) - Number(a.OwnTime)
        case "Memory (Total)":
          return Number(b.TotalAlloc) - Number(a.TotalAlloc)
        case "Memory (Own)":
          return Number(b.OwnAlloc) - Number(a.OwnAlloc)
        case "Exceptions (Total)":
          return Number(b.TotalExceptions) - Number(a.TotalExceptions)
        case "Exceptions (Own)":
          return Number(b.OwnExceptions) - Number(a.OwnExceptions)
      }
      return 0
    })
})

const sortedMemory = computed(() => {
  if (!currentProfile.value) return []
  return [...currentProfile.value.Memory]
    .filter(a => {
      return !memoryFilter.value || 
        a.ClassName.toLowerCase().includes(memoryFilter.value.toLowerCase())
    })
    .sort((a, b) => {
      switch(memorySort.value) {
        case "Type":
          return a.ClassName.localeCompare(b.ClassName)
        case "Allocations":
          return Number(b.Allocations) - Number(a.Allocations)
        case "Memory":
          return Number(b.TotalAllocSize) - Number(a.TotalAllocSize)
      }
      return 0
    })
})

const selectedAssembly = ref<AssemblyName | null>(null)
const assemblyFilter = ref<string | null>(null)
const callFilter = ref<string | null>(null)
const memoryFilter = ref<string | null>(null)
const assemblyOptions = ['Name', 'Time', 'Calls', 'Memory', 'Exceptions']
const assemblySort = ref<string | null>('Time')
const memoryOptions = ['Type', 'Allocations', 'Memory']
const memorySort = ref<string | null>('Allocations')
const callOptions = ['Method', 'Calls', 'Time (Total)', 'Time (Own)', 'Memory (Total)', 'Memory (Own)', 'Exceptions (Total)', 'Exceptions (Own)']
const callSort = ref<string | null>('Calls')
const calmColor = '#3882d1'
const intenseColor = '#d13b38'

function getAssemblyPercentage(assembly: Assembly) : number {
  if(currentProfile.value == null || currentProfile.value.Assemblies.length == 0) {
    return 0
  }
  const firstAssembly = sortedAssemblies.value[0]

  switch(assemblySort.value) {
    case "Name":
      return 0
    case "Time":
      return (Number(assembly.TotalTime) / Number(firstAssembly.TotalTime)) * 100
    case "Calls":
      return (Number(assembly.Calls) / Number(firstAssembly.Calls)) * 100
    case "Memory":
      return (Number(assembly.Alloc) / Number(firstAssembly.Alloc)) * 100
    case "Exceptions":
      return (Number(assembly.TotalExceptions) / Number(firstAssembly.TotalExceptions)) * 100
  }
  return 0
}

function getCallPercentage(call: Call) : number {
  if(currentProfile.value == null || currentProfile.value.Calls.length == 0) {
    return 0
  }
  const firstCall = sortedCalls.value[0]
  switch(callSort.value) {
    case "Method":
      return 0
    case "Calls":
      return (Number(call.Calls) / Number(firstCall.Calls)) * 100
    case "Time (Total)":
      return (Number(call.TotalTime) / Number(firstCall.TotalTime)) * 100
    case "Time (Own)":
      return (Number(call.OwnTime) / Number(firstCall.OwnTime)) * 100
    case "Memory (Total)":
      return (Number(call.TotalAlloc) / Number(firstCall.TotalAlloc)) * 100
    case "Memory (Own)":
      return (Number(call.OwnAlloc) / Number(firstCall.OwnAlloc)) * 100
    case "Exceptions (Total)":
      return (Number(call.TotalExceptions) / Number(firstCall.TotalExceptions)) * 100
    case "Exceptions (Own)":
      return (Number(call.OwnExceptions) / Number(firstCall.OwnExceptions)) * 100
  }
  return 0
}

function getMemoryPercentage(memory: Memory) : number {
  if(currentProfile.value == null || currentProfile.value.Memory.length == 0) {
    return 0
  }
  const firstMemory = sortedMemory.value[0]

  switch(memorySort.value) {
    case "Type":
      return 0
    case "Allocations":
      return (Number(memory.Allocations) / Number(firstMemory.Allocations)) * 100
    case "Memory":
      return (Number(memory.TotalAllocSize) / Number(firstMemory.TotalAllocSize)) * 100
  }
  return 0
}

function lerpColor(color1: string, color2: string, t: number): string {
  t = Math.min(1, Math.max(0, t))

  const c1 = parseInt(color1.slice(1), 16)
  const c2 = parseInt(color2.slice(1), 16)

  const r1 = (c1 >> 16) & 0xff
  const g1 = (c1 >> 8) & 0xff
  const b1 = c1 & 0xff

  const r2 = (c2 >> 16) & 0xff
  const g2 = (c2 >> 8) & 0xff
  const b2 = c2 & 0xff

  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

</script>

<template>
  <div class="w-full h-full flex flex-col px-[10px] ">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold select-none">Profiler Panel</h2>
      <div class="flex space-x-2">
        <div v-if="!currentProfile" class="relative">
          <input id="fileInput" type="file" accept=".cprf" @change="loadProfile" class="hidden"/>
          <label for="fileInput" class="select-none inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 cursor-pointer font-medium transition">
            <Plus :size="17"/>
            Load Profile
          </label>
        </div>
        <div v-if="currentProfile" class="relative">
          <button id="fileInput" accept=".cprf" @click="currentProfile = null" class="hidden"></button>
          <label for="fileInput" class="select-none inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 cursor-pointer font-medium transition">
            <Minus :size="17"/>
            Clear
          </label>
        </div>
      </div>
    </div>
    <div class="flex h-full gap-x-5">
      <!-- Assemblies -->
      <div v-if="currentProfile" class="flex-1 py-5 basis-1/2 min-w-0 overflow-y-auto">
        <h2 class="select-none text-lg font-semibold mb-2">ASSEMBLIES ({{ currentProfile?.Assemblies.length.toLocaleString() }}) <span class="text-blue-300/40" v-if="currentProfile?.Assemblies.length != sortedAssemblies.length"> — {{ sortedAssemblies.length.toLocaleString() }} found</span></h2>
        <div class="flex mb-3 select-none">
          <input type="text" placeholder="Search..." v-model="assemblyFilter" class="text-sm w-full p-2 bg-gray-800/50 focus:bg-gray-800 text-gray-200 border-gray-700"/>
          <div class="flex px-5 p-2 gap-x-2 text-blue-300/30 text-sm bg-gray-800/50 hover:bg-gray-800">
            Sort:
            <select v-model="assemblySort" class="select-all text-blue-300/60 font-semibold bg-transparent text-left border border-gray-700/0 hover:text-blue-300 hover:cursor-pointer">
              <option class="bg-gray-800 text-blue-300/60 p-2" v-for="option in assemblyOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="overflow-auto h-screen space-y-1">
          <div v-for="(assembly, i) in sortedAssemblies" :key="i" class="flex relative z-10 items-center justify-between bg-gray-800/20 hover:bg-gray-700 text-white cursor-pointer" @click="selectedAssembly = selectedAssembly == assembly.Name ? null : assembly.Name">
            <div class="absolute inset-0 opacity-70" :style="{ width: `${getAssemblyPercentage(assembly)}%`, backgroundColor: lerpColor(calmColor, intenseColor, getAssemblyPercentage(assembly) / 100) }"></div>
            <div v-if="selectedAssembly == assembly.Name" class="w-[5px] bg-red-600 self-stretch z-50"></div>
            <div class="flex justify-between w-full px-2 py-1 z-50">
              <div class="flex flex-col">
                <span class="font-semibold text-sm leading-tight">{{ assembly.Name?.DisplayName }}</span>
                <span class="text-xs text-gray-100/70">
                  {{ assembly.getTotalTime() }} ({{ assembly.TotalTimePercentage.toFixed(1) }}%) |
                  {{ (assembly.Alloc / 1000n).toLocaleString() }} KB |
                  {{ assembly.TotalExceptions.toLocaleString() }} excep.
                </span>
              </div>
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
      <!-- Calls -->
      <div v-if="currentProfile" class="flex-1 py-5 basis-1/2 min-w-0 overflow-y-auto">
        <h2 class="select-none text-lg font-semibold mb-2">CALLS ({{ currentProfile?.Calls.length.toLocaleString() }}) <span class="text-blue-300/40" v-if="currentProfile?.Calls.length != sortedCalls.length"> — {{ sortedCalls.length.toLocaleString() }} found</span></h2>
        <div class="flex mb-3 select-none">
          <input type="text" placeholder="Search..." v-model="callFilter" class="text-sm w-full p-2 bg-gray-800/50 focus:bg-gray-800 text-gray-200 border-gray-700"/>
          <div class="flex px-5 p-2 gap-x-2 text-blue-300/30 text-sm bg-gray-800/50 hover:bg-gray-800">
            Sort:
            <select v-model="callSort" class="select-all text-blue-300/60 font-semibold bg-transparent text-left border border-gray-700/0 hover:text-blue-300 hover:cursor-pointer">
              <option class="bg-gray-800 text-blue-300/60" v-for="option in callOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="overflow-auto h-screen space-y-1">
          <div v-for="(call, i) in sortedCalls" :key="i" class="flex relative z-10 justify-between items-center bg-gray-800/20 hover:bg-gray-700 text-white px-2 py-1 cursor-pointer">
            <div class="flex justify-between">
              <div class="absolute inset-0 opacity-70" :style="{ width: `${getCallPercentage(call)}%`, backgroundColor: lerpColor(calmColor, intenseColor, getCallPercentage(call) / 100) }"></div>
              <div class="flex flex-col z-50">
                <span class="font-semibold text-sm leading-tight">{{ call.MethodName }}</span>
                <span class="text-xs text-gray-100/70">
                  {{ call.getTotalTime() }} ({{ call.TotalTimePercentage.toFixed(1) }}%) | {{ call.getOwnTime() }} ({{ call.OwnTimePercentage.toFixed(1) }}%) | {{ call.TotalExceptions.toLocaleString() }} total / {{ call.OwnExceptions.toLocaleString() }} own excep.
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end text-right text-gray-100/70 z-50">
              <span class="text-xs opacity-80"><strong>{{ call.Calls.toLocaleString() }}</strong> calls</span>
              <span class="text-xs">{{ call.TotalAlloc / 1000n }} B total | {{ call.OwnAlloc / 1000n }} B own</span>
            </div>
          </div>
          <div v-if="sortedCalls.length == 0" class="text-center text-sm text-blue-200/30">
            No available calls
          </div>
        </div>
      </div>
      <div v-if="currentProfile == null" class="w-screen text-center pt-[50px] text-blue-300/30 select-none">
        No profile selected. Press on <strong class="text-blue-300/60">+ Load Profile</strong> to get started!
      </div>

    </div>

    <div v-if="currentProfile" class="flex relative z-10 items-center justify-between bg-gray-800/20 text-white cursor-pointer" >
      <div class="absolute inset-0 opacity-70" :style="{ width: `100%`, backgroundColor: calmColor }"></div>
      <div class="w-[5px] bg-red-600 self-stretch z-50"></div>
      <div class="flex justify-between w-full px-2 py-1 z-50">
        <div class="flex flex-col">
          <span class="font-semibold text-sm leading-tight">GC</span>
          <span class="text-xs text-gray-100/70">
            {{ currentProfile?.GC.Calls.toLocaleString() }} calls |
            {{ currentProfile?.GC.getTotalTime() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Memory -->
    <div v-if="currentProfile" class="flex-1 py-5 basis-1/2 min-w-0 overflow-y-auto">
      <h2 class="select-none text-lg font-semibold mb-2">MEMORY ({{ currentProfile?.Memory.length.toLocaleString() }}) <span class="text-blue-300/40" v-if="currentProfile?.Memory.length != sortedMemory.length"> — {{ sortedMemory.length.toLocaleString() }} found</span></h2>
      <div class="flex mb-3 select-none">
        <input type="text" placeholder="Search..." v-model="memoryFilter" class="text-sm w-full p-2 bg-gray-800/50 focus:bg-gray-800 text-gray-200 border-gray-700"/>
        <div class="flex px-5 p-2 gap-x-2 text-blue-300/30 text-sm bg-gray-800/50 hover:bg-gray-800">
          Sort:
          <select v-model="memorySort" class="select-all text-blue-300/60 font-semibold bg-transparent text-left border border-gray-700/0 hover:text-blue-300 hover:cursor-pointer">
            <option class="bg-gray-800 text-blue-300/60 p-2" v-for="option in memoryOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
      </div>
      <div class="overflow-auto h-screen space-y-1">
        <div v-for="(memory, i) in sortedMemory" :key="i" class="flex relative z-10 items-center justify-between bg-gray-800/20 hover:bg-gray-700 text-white cursor-pointer">
          <div class="absolute inset-0 opacity-70" :style="{ width: `${getMemoryPercentage(memory)}%`, backgroundColor: lerpColor(calmColor, intenseColor, getMemoryPercentage(memory) / 100) }"></div>
          <div class="flex justify-between w-full px-2 py-1 z-50">
            <div class="flex flex-col">
              <span class="font-semibold text-sm leading-tight">{{ memory.ClassName }}</span>
              <span class="text-xs text-gray-100/70">
                {{ (memory.Allocations / 1000n).toLocaleString() }} allocated |
                {{ (memory.TotalAllocSize / 1000n).toLocaleString() }} KB total
              </span>
            </div>
            <div class="flex flex-col items-end text-right text-gray-100/70">
              <span class="uppercase text-xs font-semibold opacity-80">
                {{ memory.InstanceSize }} B
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
</template>

<style scoped>
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.05) transparent;
}
</style>
