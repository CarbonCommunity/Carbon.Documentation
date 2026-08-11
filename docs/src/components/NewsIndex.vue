<script lang="ts" setup>
import { VPBadge } from 'vitepress/theme'
import { shallowRef, computed } from 'vue'
import { data as initialData, NewsPost } from '../data-loaders/news.data'
import { Search } from 'lucide-vue-next'
import { formatDate } from '../shared/utils'
import { useData } from 'vitepress'

interface Props {
  category: string;
  categoryName: string;
}

const {
  frontmatter
} = useData()
const props = defineProps<Props>()
const news = shallowRef<NewsPost[]>(initialData)
const searchInput = shallowRef<string>('')
const searchResults = computed(() => {
  const input = searchInput.value?.toLowerCase() ?? ''
  const categoryNews = news.value?.filter((post: NewsPost) => {
      return !post.frontmatter.hidden && (import.meta.env.MODE == 'development' || post.frontmatter.published) && (input.length != 0 || post.frontmatter.category == props.category)
    })
  if(!input) { 
    return categoryNews
  }
  return categoryNews?.filter((post: NewsPost) => {
    const title = post.frontmatter.title?.toLowerCase() ?? ''
    const description = post.frontmatter.description?.toLowerCase() ?? ''
    const url = post.url?.toLowerCase() ?? ''
    const tags = post.frontmatter.tags ?? []
    return title.includes(input) || description.includes(input) || url.includes(input) || tags.some((tag: string) => tag.toLowerCase().includes(input))
  }) ?? []
})
const firstPost = shallowRef<NewsPost | null>(!frontmatter.value.tags?.includes('collection') ? searchResults.value?.[0] ?? null : null)
</script>

<template>
  <div>
    <div class="pointer-events-none fixed left-0 top-0 z-0 h-full w-full">
      <div class="relative h-[800px] w-full overflow-hidden opacity-30">
        <img :src="firstPost?.frontmatter.header ?? 'https://files.facepunch.com/Alistair/130/06/2025/0n84/julyupdate2025_hero.jpg'" alt="Header background" class="news-hero absolute left-0 top-0 h-full w-full object-cover blur-2xl" />
        <div class="absolute bottom-0 left-0 h-96 w-full bg-gradient-to-b from-transparent to-neutral-900/100"></div>
      </div>
    </div>
    <div v-if="firstPost" class="relative z-10 h-full overflow-y-auto">
      <a class="relative inline-block" :href="firstPost.url">
        <div class="mx-auto mt-72 flex max-w-screen-lg md:flex-row flex-col">
          <div class="flex flex-col items-center">
            <img class="max-w-[500px] transform justify-self-center transition-transform duration-200 hover:scale-105" width="1424px" height="709px" :src="firstPost.frontmatter.logo" />
          </div>
          <div>
            <div class="mb-5 text-left text-5xl font-black uppercase">
              {{ firstPost.frontmatter.title }}
            </div>
            <div class="my-3 block uppercase">
              <span v-if="!firstPost.frontmatter.tags.includes('collection')"><VPBadge class="text-sm" type="info"><span v-if="firstPost.frontmatter.author"> by {{ firstPost.frontmatter.author }}</span> on {{ formatDate(firstPost.frontmatter.date).string }}</VPBadge><br></span>
              <VPBadge v-for="tag in firstPost.frontmatter.tags" :key="tag" type="tip">{{ tag }}</VPBadge>
            </div>
            <div class="mb-48 text-left text-2xl font-normal text-slate-400">
              {{ firstPost.frontmatter.description }}<span class="text-base text-slate-500" v-if="firstPost.frontmatter.tags.includes('collection')"><br>Collection with {{ news.filter((newsPost: NewsPost) => !newsPost.frontmatter.hidden && newsPost.frontmatter.published && newsPost.frontmatter.category == firstPost?.frontmatter.collection).length }} posts available.</span>
            </div>
          </div>
        </div>
      </a>
    </div>
  </div>

  <NewsSectionTitle :text="'Explore ' + props.categoryName"/>
  <p>A variety of blog posts for Carbon modding framework and the docs website. Stay tuned for more!</p>

  <div class="flex items-center text-slate-400 gap-x-2 bg-black/30 p-3 content-fill">
    <Search :size="16" /> <input v-model="searchInput" placeholder="Search blog posts..." class="w-full"/>
  </div>

  <div class="news-grid my-10 gap-5">
    <div v-for="post in searchResults" :key="post.url" class="transform transition-transform duration-200 hover:scale-105">
      <a class="relative inline-block font-extrabold no-underline" :href="post.url">
        <div class="transform">
          <img :class="[{'blur': post.frontmatter.logo }, 'opacity-25']" width="1424px" height="709px" :src="post.frontmatter.header" />
          <img v-if="post.frontmatter.logo" class="absolute left-0 top-0 h-full w-full object-contain" width="1424px" height="709px" :src="post.frontmatter.logo" />
        </div>
        <div class="mt-5">
          <div class="mb-3 block uppercase">
            <span v-if="!post.frontmatter.tags.includes('collection')"><VPBadge class="text-sm" type="info"><span v-if="post.frontmatter.author">by {{ post.frontmatter.author }}</span> on {{ formatDate(post.frontmatter.date).string }}</VPBadge><br></span>
            <VPBadge v-for="tag in post.frontmatter.tags" :key="tag" type="tip">{{ tag }}</VPBadge>
          </div>
          <span :class="'font-sans text-2xl font-black uppercase text-' + (post.frontmatter.published ? 'slate' : 'yellow') + '-200'"><span v-if="post.frontmatter.collectionid">{{ post.frontmatter.collectionid }}.</span> {{ post.frontmatter.title }}</span><br>
          <span class="text-sm font-normal text-slate-400">{{ post.frontmatter.description }} <span class="text-slate-500" v-if="post.frontmatter.tags.includes('collection')">Collection with {{ news.filter((newsPost: NewsPost) => !newsPost.frontmatter.hidden && newsPost.frontmatter.published && newsPost.frontmatter.category == firstPost?.frontmatter.collection).length }} posts available.</span></span><br>
        </div>
      </a>
    </div>
  </div>
  <div v-if="searchResults.length == 0" class="select-none text-center w-full text-slate-500 text-xs">
    No blog posts with that filter
  </div>
</template>

<style scoped>
.vp-doc a {
  font-weight: inherit;
  color: inherit;
  text-decoration: inherit;
  text-underline-offset: inherit;
  transition: inherit;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-gap: 50px 15px;
}
</style>
