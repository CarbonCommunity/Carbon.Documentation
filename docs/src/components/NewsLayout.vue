<script lang="ts" setup>
import { useData } from 'vitepress'
import { VPBadge, VPHomeContent } from 'vitepress/theme'
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { data as initialData, NewsPost } from '../data-loaders/news.data'
import { formatDate } from '../shared/utils'

const { frontmatter } = useData()
const showAllTags = shallowRef<boolean>(false)
const news = shallowRef<NewsPost[]>(initialData)
const checker = shallowRef<ReturnType<typeof setTimeout> | null>(null)

function switchTransparentNavBar(flag: boolean) {
  const navBar = document.querySelector('.VPNavBar') as HTMLElement
  if (navBar) {
    navBar.style.backgroundColor = flag ? 'transparent' : ''
    const divider = navBar.querySelector('.divider') as HTMLElement
    divider.style.display = flag ? 'none' : ''
  }
}

onMounted(async () => {
  switchTransparentNavBar(true)

  const callback = () => {
    currentIndex.value = news.value.findIndex((post: NewsPost) => post.frontmatter.title == frontmatter.value.title)
    readMorePosts.value = news.value
      .filter((post: NewsPost, index: number) => index != currentIndex.value && post.frontmatter.published && !post.frontmatter.hidden)
      .slice(0, 3)
    checker.value = setTimeout(callback, 2000)
  }
  checker.value = setTimeout(callback, 2000)
  callback()
})

onUnmounted(() => {
  switchTransparentNavBar(false)

  if (checker.value) {
    clearTimeout(checker.value)
  }
})
const currentIndex = ref<number>()
const readMorePosts = ref<NewsPost[]>()
</script>

<template>
  <VPHomeContent>
    <div class="fixed inset-0 overflow-hidden bg-neutral-950/100">
      <div class="pointer-events-none fixed left-0 top-0 z-0 h-full w-full">
        <div class="relative h-[800px] w-full overflow-hidden opacity-60">
          <img :src="frontmatter.header" alt="Header background" class="news-hero absolute left-0 top-0 h-full w-full object-cover" />
          <div class="absolute bottom-0 left-0 h-96 w-full bg-gradient-to-b from-transparent to-neutral-950/100"></div>
        </div>
      </div>
    </div>
    <div class="relative">
      <div class="mx-auto my-40 flex max-w-screen-lg flex-col items-center gap-6 text-balance">
        <img class="mx-auto w-[80%]" width="1424px" height="709px" :src="frontmatter.logo" />
        <div class="text-center font-sans text-5xl font-black uppercase" :class="frontmatter.published ? 'text-slate-200' : 'text-yellow-200'" @click.stop>
          {{ frontmatter.title }}
        </div>
        <div class="my-3 gap-2 text-center uppercase">
          <VPBadge class="text-sm" type="info"
            >posted <span v-if="frontmatter.author"> by {{ frontmatter.author }}</span> on {{ formatDate(frontmatter.date).string }}<br
          /></VPBadge>
          <VPBadge class="text-sm" v-for="tag in showAllTags ? frontmatter.tags : frontmatter.tags.slice(0, 4)" :key="tag" type="tip">{{ tag }}</VPBadge
          ><button @click="showAllTags = !showAllTags" v-if="frontmatter.tags.length > 4">
            <VPBadge class="text-sm font-bold" type="tip">{{ showAllTags ? '-' : '+' }}</VPBadge>
          </button>
        </div>
        <div class="mb-48 text-center text-2xl font-normal text-slate-400" @click.stop>
          {{ frontmatter.description }}
          <br /><VPBadge v-if="!frontmatter.published" class="text-sm" type="warning">DRAFT</VPBadge>
        </div>
        <div class="news-content text-wrap text-slate-300 opacity-80" @click.stop>
          <Content />
          <div v-if="frontmatter.showjoinus == null || frontmatter.showjoinus">
            <NewsSectionTitle text="Join us!" />
            <NewsImage src="/news/join-us.webp" />
            <NewsSection marginless>
              Feel free to join us on our <a href="https://discord.gg/carbonmod" target="_blank">official Discord server</a> if you have any other questions!
            </NewsSection>
            <NewsSectionSubtitle text="Read More" />
            There's more where that came from! Choose what you wanna learn about next.
            <div class="news-grid my-10 gap-5">
              <div v-for="post in readMorePosts" :key="post.url" class="transform transition-transform duration-200 hover:scale-105">
                <a class="relative inline-block font-extrabold no-underline" :href="post.url">
                  <div class="transform">
                    <img class="opacity-25 blur" width="1424px" height="709px" :src="post.frontmatter.header" />
                    <img class="absolute left-0 top-0 h-full w-full object-contain" width="1424px" height="709px" :src="post.frontmatter.logo" />
                  </div>
                  <div class="mt-5">
                    <span class="font-sans text-2xl font-black uppercase" :class="post.frontmatter.published ? 'text-slate-200' : 'text-yellow-200'">
                      <span v-if="post.frontmatter.collectionid">{{ post.frontmatter.collectionid }}.</span> {{ post.frontmatter.title }}</span
                    ><br />
                    <span class="text-sm font-normal text-slate-400">{{ post.frontmatter.description }}</span
                    ><br />
                  </div>
                </a>
              </div>
            </div>
            <div v-if="readMorePosts?.length == 0" class="w-full select-none text-center text-xs text-slate-500">No blog posts</div>
          </div>
        </div>
      </div>
    </div>
  </VPHomeContent>
</template>

<style scoped>
.news-hero {
  opacity: 0.5;
}
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-gap: 50px 15px;
  text-decoration: none;
}

.news-grid a {
  text-decoration: none;
}
</style>
