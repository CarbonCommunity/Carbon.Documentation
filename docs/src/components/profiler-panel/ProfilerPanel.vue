<script lang="ts" setup>
import {

} from 'lucide-vue-next'
import { loadProfile } from './ProfilerPanel.SaveLoad';
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold">Profiler Panel</h2>
      <div class="flex space-x-2">
        <input type="file" @change="loadProfile" id="fileInput" />
        <button class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Action 2</button>
        <!-- Add buttons or controls here -->
      </div>
    </div>
    <div class="flex-1 overflow-auto p-4">
      <!-- Profiler content goes here -->
      <p>This is the Profiler Panel content area.</p>
    </div>

  </div>
</template>

<style>

</style>
