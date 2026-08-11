<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Info, Minus, Plus, X } from 'lucide-vue-next'
import pako from 'pako'
import { loadProfile, currentProfile, ProfileTypes, Assembly, Call, Memory, load, selectedAssembly } from './ProfilerPanel.SaveLoad'
import { base64ToU8 } from '../control-panel/ControlPanel.Profiler'
import { BinaryReader } from '@/utils/BinaryReader'
import { addPopup, popups, removePopup } from '../control-panel/ControlPanel.SaveLoad'

const sortedAssemblies = computed(() => {
  if (!currentProfile.value) return []
  return [...currentProfile.value.Assemblies]
    .filter((a) => {
      return !assemblyFilter.value || a.Name?.DisplayName.toLowerCase().includes(assemblyFilter.value.toLowerCase())
    })
    .sort((a, b) => {
      switch (assemblySort.value) {
        case 'Name':
          return a.Name?.DisplayName.localeCompare(b.Name?.DisplayName)
        case 'Time':
          return Number(b.TotalTime) - Number(a.TotalTime)
        case 'Calls':
          return Number(b.Calls) - Number(a.Calls)
        case 'Memory':
          return Number(b.Alloc) - Number(a.Alloc)
        case 'Exceptions':
          return Number(b.TotalExceptions) - Number(a.TotalExceptions)
      }
      return 0
    })
})

const sortedCalls = computed(() => {
  if (!currentProfile.value) return []
  return currentProfile.value.Calls.filter((c) => {
    return selectedAssembly.value && c.AssemblyName === selectedAssembly.value
  })
    .filter((c) => {
      return !callFilter.value || c.MethodName.toLowerCase().includes(callFilter.value.toLowerCase())
    })
    .sort((a, b) => {
      switch (callSort.value) {
        case 'Method':
          return a.MethodName.localeCompare(b.MethodName)
        case 'Calls':
          return Number(b.Calls) - Number(a.Calls)
        case 'Time (Total)':
          return Number(b.TotalTime) - Number(a.TotalTime)
        case 'Time (Own)':
          return Number(b.OwnTime) - Number(a.OwnTime)
        case 'Memory (Total)':
          return Number(b.TotalAlloc) - Number(a.TotalAlloc)
        case 'Memory (Own)':
          return Number(b.OwnAlloc) - Number(a.OwnAlloc)
        case 'Exceptions (Total)':
          return Number(b.TotalExceptions) - Number(a.TotalExceptions)
        case 'Exceptions (Own)':
          return Number(b.OwnExceptions) - Number(a.OwnExceptions)
      }
      return 0
    })
})

const sortedMemory = computed(() => {
  if (!currentProfile.value) return []
  return [...currentProfile.value.Memory]
    .filter((a) => {
      return !memoryFilter.value || a.ClassName.toLowerCase().includes(memoryFilter.value.toLowerCase())
    })
    .sort((a, b) => {
      switch (memorySort.value) {
        case 'Type':
          return a.ClassName.localeCompare(b.ClassName)
        case 'Allocations':
          return Number(b.Allocations) - Number(a.Allocations)
        case 'Memory':
          return Number(b.TotalAllocSize) - Number(a.TotalAllocSize)
      }
      return 0
    })
})

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
const niceColor = '#60a848'
const contextName = ref<string | null>(null)
const isDraggingFile = ref(false)
const dragDepth = ref(0)

function isFileDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes('Files')
}

function onDragEnter(event: DragEvent) {
  if (currentProfile.value || !isFileDrag(event)) return
  event.preventDefault()
  dragDepth.value += 1
  isDraggingFile.value = true
}

function onDragOver(event: DragEvent) {
  if (currentProfile.value || !isFileDrag(event)) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

function onDragLeave(event: DragEvent) {
  if (currentProfile.value || !isFileDrag(event)) return
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    isDraggingFile.value = false
  }
}

function onDrop(event: DragEvent) {
  if (currentProfile.value || !isFileDrag(event)) return
  event.preventDefault()
  event.stopPropagation()
  dragDepth.value = 0
  isDraggingFile.value = false

  const file = event.dataTransfer?.files?.[0]
  if (!file) return

  const syntheticEvent = {
    target: {
      files: [file],
    },
  } as unknown as Event
  loadProfile(syntheticEvent)
}

function addDragListeners() {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
}

function removeDragListeners() {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
}

function getAssemblyPercentage(assembly: Assembly): number {
  if (currentProfile.value == null || currentProfile.value.Assemblies.length == 0) {
    return 0
  }
  const firstAssembly = sortedAssemblies.value[0]

  switch (assemblySort.value) {
    case 'Name':
      return 0
    case 'Time':
      return (Number(assembly.TotalTime) / Number(firstAssembly.TotalTime)) * 100
    case 'Calls':
      return (Number(assembly.Calls) / Number(firstAssembly.Calls)) * 100
    case 'Memory':
      return (Number(assembly.Alloc) / Number(firstAssembly.Alloc)) * 100
    case 'Exceptions':
      return (Number(assembly.TotalExceptions) / Number(firstAssembly.TotalExceptions)) * 100
  }
  return 0
}

function getCallPercentage(call: Call): number {
  if (currentProfile.value == null || currentProfile.value.Calls.length == 0) {
    return 0
  }
  const firstCall = sortedCalls.value[0]
  switch (callSort.value) {
    case 'Method':
      return 0
    case 'Calls':
      return (Number(call.Calls) / Number(firstCall.Calls)) * 100
    case 'Time (Total)':
      return (Number(call.TotalTime) / Number(firstCall.TotalTime)) * 100
    case 'Time (Own)':
      return (Number(call.OwnTime) / Number(firstCall.OwnTime)) * 100
    case 'Memory (Total)':
      return (Number(call.TotalAlloc) / Number(firstCall.TotalAlloc)) * 100
    case 'Memory (Own)':
      return (Number(call.OwnAlloc) / Number(firstCall.OwnAlloc)) * 100
    case 'Exceptions (Total)':
      return (Number(call.TotalExceptions) / Number(firstCall.TotalExceptions)) * 100
    case 'Exceptions (Own)':
      return (Number(call.OwnExceptions) / Number(firstCall.OwnExceptions)) * 100
  }
  return 0
}

function getMemoryPercentage(memory: Memory): number {
  if (currentProfile.value == null || currentProfile.value.Memory.length == 0) {
    return 0
  }
  const firstMemory = sortedMemory.value[0]

  switch (memorySort.value) {
    case 'Type':
      return 0
    case 'Allocations':
      return (Number(memory.Allocations) / Number(firstMemory.Allocations)) * 100
    case 'Memory':
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

onMounted(() => {
  addDragListeners()
  var pendingProfile = localStorage.getItem('currentProfile')
  if (!pendingProfile) {
    return
  }
  const buffer = base64ToU8(pendingProfile)
  const unzipped = pako.ungzip(buffer.buffer as ArrayBuffer)
  const reader = new BinaryReader(unzipped.buffer)
  currentProfile.value = load(reader)

  contextName.value = localStorage.getItem('currentProfileName')
  localStorage.removeItem('currentProfile')
  localStorage.removeItem('currentProfileName')
})

onUnmounted(() => {
  removeDragListeners()
})

async function openStats() {
  const windowProps = {
    profile: currentProfile,
    title: 'Profile Statistics',
    subtitle: 'Additional profile info and helpful stats for nerds.',
    onClosed: () => {},
  }
  console.log('eeeee')
  addPopup((await import(`@/components/profiler-panel/ProfilerPanel.Popup.Stats.vue`)).default, windowProps)
}
</script>

<template>
  <div class="flex h-full w-full flex-col px-[10px]">
    <div class="mx-10 flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
      <h2 class="select-none text-lg font-semibold">
        Profiler Panel <span class="text-blue-300/40" v-if="contextName"> — {{ contextName }}</span>
      </h2>
      <div class="flex space-x-2">
        <div v-if="!currentProfile" class="relative">
          <input id="loadProfile" type="file" accept=".cprf" @change="loadProfile" class="hidden" />
          <label
            for="loadProfile"
            class="inline-flex cursor-pointer select-none items-center gap-2 bg-[#60a848]/75 px-4 py-2 font-medium text-white hover:bg-[#60a848]"
          >
            <Plus :size="20" />
            Load Profile
          </label>
        </div>
        <div v-if="currentProfile" class="flex gap-x-2">
          <button id="profileStats" @click="openStats" class="hidden"></button>
          <label
            for="profileStats"
            class="inline-flex cursor-pointer select-none items-center gap-2 bg-[#4f9401] px-4 py-2 font-medium text-white hover:bg-[#8ad138]"
          >
            <Info :size="20" />
          </label>

          <button id="clearProfile" accept=".cprf" @click="currentProfile = null" class="hidden"></button>
          <label
            for="clearProfile"
            class="inline-flex cursor-pointer select-none items-center gap-2 bg-[#d13b38]/75 px-4 py-2 font-medium text-white hover:bg-[#d13b38]"
          >
            <X :size="20" />
            Clear
          </label>
        </div>
      </div>
    </div>
    <div class="mx-10 flex gap-x-5">
      <!-- Assemblies -->
      <div v-if="currentProfile" class="min-w-0 flex-1 basis-1/2 overflow-y-auto py-5">
        <h2 class="mb-2 select-none text-lg font-semibold">
          ASSEMBLIES ({{ currentProfile?.Assemblies.length.toLocaleString() }})
          <span class="text-blue-300/40" v-if="currentProfile?.Assemblies.length != sortedAssemblies.length">
            — {{ sortedAssemblies.length.toLocaleString() }} found</span
          >
        </h2>
        <div class="mb-3 flex select-none">
          <input
            type="text"
            placeholder="Search..."
            v-model="assemblyFilter"
            class="w-full border-gray-700 bg-gray-800/50 p-2 text-sm text-gray-200 focus:bg-gray-800"
          />
          <div class="flex gap-x-2 bg-gray-800/50 p-2 px-5 text-sm text-blue-300/30 hover:bg-gray-800">
            Sort:
            <select
              v-model="assemblySort"
              class="select-all border border-gray-700/0 bg-transparent text-left font-semibold uppercase text-blue-300/60 hover:cursor-pointer hover:text-blue-300"
            >
              <option class="bg-gray-800 p-2 text-blue-300/60" v-for="option in assemblyOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="h-[1000px] space-y-1 overflow-auto">
          <div
            v-for="(assembly, i) in sortedAssemblies"
            :key="i"
            class="relative z-10 flex cursor-pointer items-center justify-between bg-gray-800/20 text-white hover:bg-gray-700"
            @click="selectedAssembly = selectedAssembly == assembly.Name ? null : assembly.Name"
          >
            <div
              class="absolute inset-0 opacity-70"
              :style="{
                width: `${getAssemblyPercentage(assembly)}%`,
                backgroundColor: lerpColor(calmColor, intenseColor, getAssemblyPercentage(assembly) / 100),
              }"
            ></div>
            <div v-if="selectedAssembly == assembly.Name" class="z-50 w-[5px] self-stretch bg-red-600"></div>
            <div class="z-50 flex w-full justify-between px-2 py-1">
              <div class="flex flex-col">
                <span class="text-sm font-semibold leading-tight">{{ assembly.Name?.DisplayName }}</span>
                <span class="text-xs text-gray-100/70">
                  {{ assembly.getTotalTime() }} ({{ assembly.TotalTimePercentage.toFixed(1) }}%) | {{ (assembly.Alloc / 1000n).toLocaleString() }} KB |
                  {{ assembly.TotalExceptions.toLocaleString() }} excep.
                </span>
              </div>
              <div class="flex flex-col items-end text-right text-gray-100/70">
                <span class="text-xs font-semibold uppercase opacity-80">
                  {{ ProfileTypes[assembly.Name?.ProfileType] }}
                </span>
                <span class="text-xs font-bold"> {{ assembly.Calls.toLocaleString() }} calls </span>
              </div>
            </div>
          </div>
          <div v-if="sortedAssemblies.length == 0" class="text-center text-sm text-blue-200/30">No available assemblies</div>
        </div>
      </div>
      <!-- Calls / Memory-->
      <div v-if="currentProfile" class="min-w-0 flex-1 basis-1/2 overflow-y-auto py-5">
        <h2 class="mb-2 select-none text-lg font-semibold">
          CALLS ({{ currentProfile?.Calls.length.toLocaleString() }})
          <span class="text-blue-300/40" v-if="currentProfile?.Calls.length != sortedCalls.length"> — {{ sortedCalls.length.toLocaleString() }} found</span>
        </h2>
        <div class="mb-3 flex select-none">
          <input
            type="text"
            placeholder="Search..."
            v-model="callFilter"
            class="w-full border-gray-700 bg-gray-800/50 p-2 text-sm text-gray-200 focus:bg-gray-800"
          />
          <div class="flex gap-x-2 bg-gray-800/50 p-2 px-5 text-sm text-blue-300/30 hover:bg-gray-800">
            Sort:
            <select
              v-model="callSort"
              class="select-all border border-gray-700/0 bg-transparent text-left font-semibold uppercase text-blue-300/60 hover:cursor-pointer hover:text-blue-300"
            >
              <option class="bg-gray-800 text-blue-300/60" v-for="option in callOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="h-[1000px] space-y-1 overflow-auto">
          <div
            v-for="(call, i) in sortedCalls"
            :key="i"
            class="relative z-10 flex cursor-pointer items-center justify-between gap-x-2 bg-gray-800/20 px-2 py-1 text-white hover:bg-gray-700"
          >
            <div class="flex justify-between">
              <div
                class="absolute inset-0 opacity-70"
                :style="{ width: `${getCallPercentage(call)}%`, backgroundColor: lerpColor(niceColor, intenseColor, getCallPercentage(call) / 100) }"
              ></div>
              <div class="z-50 flex flex-col">
                <span class="text-sm font-semibold leading-tight" style="overflow-wrap: anywhere">{{ call.MethodName }}</span>
                <span class="text-xs text-gray-100/70">
                  {{ call.getTotalTime() }} total ({{ call.TotalTimePercentage.toFixed(1) }}%) | {{ call.getOwnTime() }} own ({{
                    call.OwnTimePercentage.toFixed(1)
                  }}%) | {{ call.TotalExceptions.toLocaleString() }} total / {{ call.OwnExceptions.toLocaleString() }} own excep.
                </span>
              </div>
            </div>
            <div class="z-50 flex flex-col items-end text-right text-gray-100/70" style="min-width: max-content">
              <span class="text-xs opacity-80"
                ><strong>{{ call.Calls.toLocaleString() }}</strong> calls</span
              >
              <span class="text-xs">{{ call.TotalAlloc / 1000n }} B total | {{ call.OwnAlloc / 1000n }} B own</span>
            </div>
          </div>
          <div v-if="sortedCalls.length == 0" class="select-none text-center text-sm text-blue-200/30">
            No available calls.<br />Update the filter or select an <strong class="!text-blue-300/40"><- Assembly</strong>.
          </div>
        </div>
      </div>
      <!-- Memory -->
      <div v-if="currentProfile" class="ml-5 min-w-0 flex-1 basis-1/2 overflow-y-auto py-5">
        <h2 class="mb-2 select-none text-lg font-semibold text-blue-300/50">
          MEMORY ({{ currentProfile?.Memory.length.toLocaleString() }})
          <span class="text-blue-300/40" v-if="currentProfile?.Memory.length != sortedMemory.length"> — {{ sortedMemory.length.toLocaleString() }} found</span>
        </h2>
        <div class="mb-3 flex select-none">
          <input
            type="text"
            placeholder="Search..."
            v-model="memoryFilter"
            class="w-full border-gray-700 bg-gray-800/50 p-2 text-sm text-gray-200 focus:bg-gray-800"
          />
          <div class="flex gap-x-2 bg-gray-800/50 p-2 px-5 text-sm text-blue-300/30 hover:bg-gray-800">
            Sort:
            <select
              v-model="memorySort"
              class="select-all border border-gray-700/0 bg-transparent text-left font-semibold uppercase text-blue-300/60 hover:cursor-pointer hover:text-blue-300"
            >
              <option class="bg-gray-800 p-2 text-blue-300/60" v-for="option in memoryOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </div>
        <div class="relative z-10 mb-3 flex cursor-pointer items-center justify-between bg-gray-800/20 text-white">
          <div class="absolute inset-0 opacity-70" :style="{ width: `100%`, backgroundColor: niceColor }"></div>
          <div class="z-50 w-[5px] self-stretch bg-red-600"></div>
          <div class="z-50 flex w-full justify-between px-2 py-1">
            <div class="flex flex-col">
              <span class="text-sm font-semibold leading-tight">GC</span>
              <span class="text-xs text-gray-100/70">
                {{ currentProfile?.GC.Calls.toLocaleString() }} calls |
                {{ currentProfile?.GC.getTotalTime() }}
              </span>
            </div>
          </div>
        </div>
        <div class="h-[940px] space-y-1 overflow-auto">
          <div
            v-for="(memory, i) in sortedMemory"
            :key="i"
            class="relative z-10 flex cursor-pointer items-center justify-between bg-gray-800/20 text-white hover:bg-gray-700"
          >
            <div
              class="absolute inset-0 opacity-70"
              :style="{ width: `${getMemoryPercentage(memory)}%`, backgroundColor: lerpColor(calmColor, intenseColor, getMemoryPercentage(memory) / 100) }"
            ></div>
            <div class="z-50 flex w-full justify-between gap-x-2 px-2 py-1">
              <div class="flex flex-col">
                <span class="text-sm font-semibold leading-tight" style="overflow-wrap: anywhere">{{ memory.ClassName }}</span>
                <span class="text-xs text-gray-100/70">
                  {{ (memory.Allocations / 1000n).toLocaleString() }} allocated | {{ (memory.TotalAllocSize / 1000n).toLocaleString() }} KB total
                </span>
              </div>
              <div class="flex flex-col items-end text-right text-gray-100/70" style="min-width: max-content">
                <span class="text-xs font-semibold uppercase opacity-80"> {{ memory.InstanceSize }} B </span>
              </div>
            </div>
          </div>
          <div v-if="sortedAssemblies.length == 0" class="text-center text-sm text-blue-200/30">No available assemblies</div>
        </div>
      </div>
      <div v-if="currentProfile == null" class="w-screen select-none pt-[50px] text-center text-blue-300/30">
        <span v-if="!isDraggingFile">
          No profile selected. Press on <strong class="text-blue-300/60">+ Load Profile</strong> to get started!
          <span class="text-blue-300/50">(or drag and drop a .cprf file)</span>
        </span>
        <span v-else>Drop your <strong class="text-blue-300/60">.cprf</strong> file to load it.</span>
      </div>
    </div>
  </div>
  <div v-if="!currentProfile && isDraggingFile" class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/55">
    <div class="select-none border border-[#60a848] bg-[#60a848]/15 px-8 py-6 text-center text-xl font-semibold text-[#9fe07a]">
      Drop your .cprf file to load it
    </div>
  </div>
  <div v-for="html in popups" v-bind:key="html" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="removePopup(html.props.id)">
    <div class="mx-4 w-full max-w-fit bg-white p-6 dark:bg-gray-800" @click.stop>
      <div v-if="!html.props.isLoading" class="mb-4 flex items-center justify-between">
        <span class="select-none">
          <span class="flex">
            <Dot v-if="html.props.live" :size="45" :style="'margin: -10px; color: red; filter: blur(1.5px);'" class="animate-pulse" />
            <h3 class="text-x font-bold">{{ html.props.title }}</h3>
          </span>
          <span class="text-sm text-slate-500">{{ html.props.subtitle }}</span>
        </span>
        <button @click="removePopup(html.props.id)" class="text-gray-500 hover:text-gray-700">
          <X :size="20" />
        </button>
      </div>
      <div v-if="html.props.isLoading">
        <Loader2 class="animate-spin text-slate-500/50" :size="50" />
      </div>
      <component v-if="!html.props.isLoading" :is="html.component" v-bind="html.props" class="font-mono" />
    </div>
  </div>
</template>

<style scoped>
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.05) transparent;
}
</style>
