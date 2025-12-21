<script setup lang="ts">
import { shallowRef, onMounted, computed } from 'vue';
import { Commit } from './commits/Commits';
import { Search } from 'lucide-vue-next'
import { BinaryReader } from '@/utils/BinaryReader'

const searchInput = shallowRef<string>('')
const searchResults = computed(() => {
  const input = searchInput.value.toLowerCase()
  return searchData.value.filter(x => x.Message.toLowerCase().includes(input) || x.Repository.toLowerCase().includes(input) || x.AuthorName.toLowerCase().includes(input))
})
const searchData = shallowRef<Commit[]>([])

async function onSearch() {
  searchInput.value = ''
}

onMounted(async () => {
  searchData.value.length = 0

  const response = await fetch('https://api.carbonmod.gg/meta/git.dat')

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const reader = new BinaryReader((await response.bytes()).buffer)
  const count = reader.int32();

  for (let i = 0; i < count; i++) {
    searchData.value.push(new Commit().parse(reader))    
  }
  
  searchData.value.sort((a, b) => b.Date?.getTime() - a.Date?.getTime());
})
</script>

<template>
<div class="mt-10">
  <div class="flex items-center text-slate-400 gap-x-2 bg-black/30 p-3 content-fill">
    <Search :size="16" /> <input v-model="searchInput" @keyup.enter='onSearch' enter placeholder="Search commits (by message, repo name, author)..." class="w-full"/>
  </div>

  <div class="min-h-screen text-zinc-100">
    <div class="mx-auto w-full max-w-5xl px-6 py-10">
      <div class="space-y-10">
        <article v-for="(commit, i) in searchResults.splice(0, 500)" :key="i" class="grid grid-cols-[240px_1fr] gap-10">
          <div class="flex items-center justify-end gap-4">
            <div class="text-right">
              <a :href="commit.AuthorUrl" target="_blank" class="text-sm font-semibold text-emerald-400 !no-underline">
                {{ commit.AuthorName }}
              </a>
              <div class="text-xs text-zinc-500">
                <span v-if="commit.wasToday()">
                  Today
                </span>
                <span v-else>
                  {{ commit.Date?.toDateString() }} 
                  {{ commit.Date?.toLocaleTimeString() }}
                </span>
              </div>
            </div>

            <div class="relative">
              <img v-if="commit.AuthorAvatar" :src="commit.AuthorAvatar" alt="" class="h-12 w-12 rounded-md object-cover ring-1 ring-white/10" />
              <div v-else class="h-12 w-12 rounded-md bg-zinc-800 ring-1 ring-white/10 grid place-items-center text-zinc-500">
              </div>
            </div>
          </div>

          <div class="pt-1">
            <span class="inline-flex items-center font-semibold text-emerald-400 hover:text-emerald-300">
              <a :href="commit.RepositoryUrl" target="_blank" class="truncate !no-underline">{{ commit.Repository }}</a>
              <a :href="commit.CommitUrl" target="_blank" class="!text-amber-400 !no-underline">#{{ commit.Changeset }}</a>
            </span>

            <div class="mt-2 text-sm text-zinc-200/90">
                <span class="leading-6" v-html="commit.Message"></span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>

</div>
</template>
