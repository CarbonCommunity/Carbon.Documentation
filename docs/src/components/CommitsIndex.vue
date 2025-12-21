<script setup lang="ts">
import { shallowRef, onMounted } from 'vue';
import { Commit } from './commits/Commits';
import { Search } from 'lucide-vue-next'

const searchInput = shallowRef<string>('')
const searchResults = shallowRef<Commit[]>([])

async function onSearch() {
  searchResults.value.length = 0
  
  const response = await fetch('https://api.github.com/repos/CarbonCommunity/Carbon.Common/commits')

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const results = await response.json()

  results.forEach((jsonCommit: any) => {
    const commit = new Commit().parse(jsonCommit)
    searchResults.value.push(commit)
    console.log(commit)
  });
  
  searchInput.value = ''
}

onMounted(async () => {

})
</script>

<template>
<div class="mt-10">
  <div class="flex items-center text-slate-400 gap-x-2 bg-black/30 p-3 content-fill">
    <Search :size="16" /> <input v-model="searchInput" @keyup.enter='onSearch' enter placeholder="Search commits..." class="w-full"/>
  </div>

  <div class="min-h-screen text-zinc-100">
    <div class="mx-auto w-full max-w-5xl px-6 py-10">
      <div class="space-y-10">
        <article v-for="(item, i) in searchResults" :key="i" class="grid grid-cols-[240px_1fr] gap-10">
          <div class="flex items-center justify-end gap-4">
            <div class="text-right">
              <a :href="item.AuthorUrl" class="text-sm font-semibold text-emerald-400 !no-underline">
                {{ item.AuthorName }}
              </a>
              <div class="text-xs text-zinc-500">
                <span v-if="item.wasToday()">
                  Today
                </span>
                <span v-else>
                  {{ item.Date?.toDateString() }} 
                  {{ item.Date?.toLocaleTimeString() }}
                </span>
              </div>
            </div>

            <div class="relative">
              <img v-if="item.AuthorAvatar" :src="item.AuthorAvatar" alt="" class="h-12 w-12 rounded-md object-cover ring-1 ring-white/10" />
              <div v-else class="h-12 w-12 rounded-md bg-zinc-800 ring-1 ring-white/10 grid place-items-center text-zinc-500">
              </div>
            </div>
          </div>

          <div class="pt-1">
            <a :href="item.Url" class="inline-flex items-center gap-2 font-semibold text-emerald-400 hover:text-emerald-300">
              <span class="truncate">{{ item.title }}</span>
              <span class="text-amber-400">#{{ item.number }}</span>
            </a>

            <div class="mt-2 text-sm text-zinc-200/90">
                <span class="leading-6" v-html="item.Message"></span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>

</div>
</template>
