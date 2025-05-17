<script setup lang="ts">
import { Database, ExternalLink } from 'lucide-vue-next'
import { URL_METDAT_RUST_LOOT_TABLES } from '@/api/constants'

const LINK_API = URL_METDAT_RUST_LOOT_TABLES
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Rust Game Loot Tables Reference</h1>
    <p class="mb-8">
      This section will contain a comprehensive list of all loot tables available in the game. Each loot table
      will show the items that can be found and their drop chances.
    </p>

    <div class="mb-4">
      <div class="flex items-center gap-2">
        <a :href="LINK_API" target="_blank" class="vp-button medium brand flex items-center gap-2">
          <Database :size="16" />
          Loot Tables API
          <ExternalLink :size="14" class="opacity-80" />
        </a>
      </div>
    </div>

    <div class="text-center py-16">
      <div class="inline-block p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 class="text-xl font-medium mb-2">Coming Soon</h2>
        <p class="text-gray-600 dark:text-gray-400">
          The loot tables reference is currently under development.
          <br />
          Check back later for updates!
        </p>
      </div>
    </div>
  </div>
</template>
