<script lang="ts" setup>
import { computed, ref } from 'vue'
import { AssemblyName, loadProfile, currentProfile, ProfileTypes } from './ProfilerPanel.SaveLoad';
const sortedAssemblies = computed(() => {
  return currentProfile.value
    ? [...currentProfile.value.Assemblies].sort((a, b) => {
        return Number(b.Calls) - Number(a.Calls)
      })
    : []
})
const sortedCalls = computed(() => {
  return currentProfile.value
    ? [...currentProfile.value.Calls.filter(c => c.AssemblyName == selectedAssembly.value)]
    : []
})
const selectedAssembly = ref<AssemblyName | null>(null)
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold">Profiler Panel</h2>
      <div class="flex space-x-2">
        <input type="file" @change="loadProfile" id="fileInput" />
        <button class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Action 2</button>
      </div>
    </div>
    <div class="flex h-full">
      <!-- Assemblies -->
      <div class="flex-1 overflow-auto p-2 text-white">
        <h2 class="text-lg font-semibold mb-2">ASSEMBLIES ({{ currentProfile?.Assemblies.length.toLocaleString() }}):</h2>
        <input type="text" placeholder="Search..." class="w-full mb-3 p-2 bg-gray-800 text-gray-200 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        <div v-if="currentProfile" class="space-y-1">
        <div
          v-for="(assembly, i) in sortedAssemblies"
          :key="i"
          class="flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-white cursor-pointer"
          @click="selectedAssembly = assembly.Name">

          <div v-if="selectedAssembly == assembly.Name" class="w-[5px] bg-red-600 self-stretch"></div>

          <!-- Main content (left + right sections) -->
          <div class="flex justify-between w-full px-2 py-1">
            <!-- Left side -->
            <div class="flex flex-col">
              <span class="font-semibold text-sm leading-tight">{{ assembly.Name?.DisplayName }}</span>
              <span class="text-xs text-gray-200">
                {{ assembly.getTotalTime() }} ({{ assembly.TotalTimePercentage.toFixed(1) }}%) |
                {{ (assembly.Alloc / 1000n).toLocaleString() }} KB |
                {{ assembly.TotalExceptions.toLocaleString() }} excep.
              </span>
            </div>

            <!-- Right side -->
            <div class="flex flex-col items-end text-right">
              <span class="uppercase text-xs font-semibold opacity-80">
                {{ ProfileTypes[assembly.Name?.ProfileType] }}
              </span>
              <span class="text-xs font-bold">
                {{ assembly.Calls.toLocaleString() }} calls
              </span>
            </div>
          </div>
        </div>

        </div>
      </div>

      <!-- Calls -->
      <div class="flex-1 overflow-auto p-2 text-white">
        <h2 class="text-lg font-semibold mb-2">CALLS ({{ currentProfile?.Calls.length.toLocaleString() }}):</h2>
        <input type="text" placeholder="Search..." class="w-full mb-3 p-2 bg-gray-800 text-gray-200 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        <div v-if="currentProfile" class="space-y-1">
          <div v-for="(call, i) in sortedCalls" :key="i" class="flex justify-between items-center bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 cursor-pointer">
            <div class="flex flex-col">
              <span class="font-semibold text-sm leading-tight">{{ call.MethodName }}</span>
              <span class="text-xs text-gray-200">
                {{ call.getTotalTime() }} ({{ call.TotalTimePercentage.toFixed(1) }}%) | {{ call.getOwnTime() }} ({{ call.OwnTimePercentage.toFixed(1) }}%) | {{ call.TotalExceptions.toLocaleString() }} total / {{ call.OwnExceptions.toLocaleString() }} own excep.
              </span>
            </div>
            <div class="flex flex-col items-end text-right">
              <span class="text-xs opacity-80"><strong>{{ call.Calls.toLocaleString() }}</strong> calls</span>
              <span class="text-xs">{{ call.TotalAlloc / 1000n }} B total | {{ call.OwnAlloc / 1000n }} B own</span>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<style>

</style>
