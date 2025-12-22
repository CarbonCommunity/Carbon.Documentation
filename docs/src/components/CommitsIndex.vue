<script setup lang="ts">
import { shallowRef, onMounted, computed } from 'vue';
import { Commit } from './commits/Commits';
import { Search } from 'lucide-vue-next'
import { BinaryReader } from '@/utils/BinaryReader'
import { useUrlSearchParams } from '@vueuse/core'

const commitsPerLoad = 1000
const searchInput = shallowRef<string>('')
const searchResults = computed(() => {
  const input = searchInput.value.toLowerCase()
  return searchData.value.filter(x => x.Message.toLowerCase().includes(input) || x.Repository.toLowerCase().includes(input) || x.AuthorName.toLowerCase().includes(input))
})
const searchData = shallowRef<Commit[]>([])

async function onSearch() {
  params.search = searchInput.value
  searchInput.value = ''
}

const params = useUrlSearchParams('history', {
  removeFalsyValues: true,
})

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

  setTimeout(() => {
    searchInput.value = params.search
  }, 100);
})
</script>

<template>
<div class="mt-10">
  <div class="flex items-center sticky text-slate-400 gap-x-2 bg-black/30 p-3 content-fill opacity-50 hover:opacity-100">
    <Search :size="16" /> <input v-model="searchInput" @keyup.enter='onSearch' enter placeholder="Search commits (by message, repo name, author)..." class="w-full"/>
  </div>

  <div v-if="searchResults.length == 0" class="text-center pt-5 text-sm text-slate-400/50">
    <span class="select-none">No commits found with that filter...</span> <button @click="searchInput = ''" class="font-semibold hover:text-slate-400/80">Reset?</button>
  </div>

  <div class="min-h-screen pt-20 text-zinc-100">
    <div class="mx-auto w-full max-w-5xl px-6">
      <div>
        <article v-for="(commit, i) in searchResults.splice(0, commitsPerLoad)" :key="i" class="grid overflow-auto grid-cols-[240px_1fr] gap-x-10 py-5 scale-100 duration-75 opacity-60 hover:scale-[1.01] hover:opacity-100">
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

            <div class="relative select-none">
              <img :src="commit.AuthorAvatar" alt="" class="h-12 w-12 rounded-md object-cover ring-1 ring-white/10" />
            </div>
          </div>

          <div class="pt-1">
            <span class="inline-flex items-center hover:text-emerald-300">
              <a :href="commit.RepositoryUrl" target="_blank" class="truncate !no-underline transition-none opacity-75 hover:opacity-100;font-semibold">{{ commit.Repository }}</a>
              <a :href="commit.CommitUrl" target="_blank" class="!text-amber-400 !opacity-75 !no-underline transition-none hover:opacity-100;font-semibold">#{{ commit.Changeset }}</a>
            </span>

            <div class="mt-2 text-sm text-zinc-200/90">
                <span class="leading-6" v-html="commit.Message"></span>
            </div>
          </div>
        </article>

        <div v-if="searchResults.length > commitsPerLoad" class="text-center pt-5 text-sm text-slate-400/50">
          <span class="select-none">
            Displaying {{ commitsPerLoad.toLocaleString() }} commits...<br> 
            {{ (searchResults.length - commitsPerLoad).toLocaleString() }} commits are ommited for performance purposes
          </span>
        </div>
      </div>
    </div>
  </div>

</div>
</template>
