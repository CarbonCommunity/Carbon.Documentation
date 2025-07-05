<script lang="ts" setup>
import { useData } from 'vitepress'
import { VPBadge, VPHomeContent } from 'vitepress/theme'
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { formatDate } from '../shared/utils'

const { frontmatter } = useData()
const showAllTags = shallowRef<boolean>(false)

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
})

onUnmounted(() => {
  switchTransparentNavBar(false)
})
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
        <img class="mx-auto w-[80%]" :src="frontmatter.logo" />
          <div class="my-3 gap-2 text-center uppercase">
            <VPBadge class="text-sm" type="info">posted <span v-if="frontmatter.author"> by {{ frontmatter.author }}</span> on {{ formatDate(frontmatter.date).string }}</VPBadge>
            <br><VPBadge class="text-sm" v-for="tag in (showAllTags ? frontmatter.tags : frontmatter.tags.slice(0, 4))" :key="tag" type="tip">{{ tag }}</VPBadge><button @click="showAllTags = !showAllTags" v-if="frontmatter.tags.length > 4"><VPBadge class="text-sm font-bold" type="tip">{{ showAllTags ? '-' : '+' }}</VPBadge></button>
          </div>
        <div :class="'font-sans text-5xl font-black uppercase text-' + (frontmatter.published ? 'slate' : 'yellow') + '-200'" @click.stop>
          {{ frontmatter.title }}
        </div>
        <div class="mb-48 text-center text-2xl font-normal text-slate-400" @click.stop>
          {{ frontmatter.description }}
          <br><VPBadge v-if="!frontmatter.published" class="text-sm" type="warning">DRAFT</VPBadge>
        </div>
        <div class="news-content text-wrap text-slate-300 opacity-80" @click.stop>
          <Content />
          <NewsSectionTitle text="Join us!"/>
          <NewsImage src="/news/join-us.webp"/>
          <NewsSection>
          Feel free to join us on our <a href="https://discord.gg/carbonmod" target="_blank">official Discord server</a> if you have any other questions!
          </NewsSection>
        </div>
      </div>
    </div>
  </VPHomeContent>
</template>

<style scoped>
.news-hero {
  opacity: 0.5;
}
</style>
