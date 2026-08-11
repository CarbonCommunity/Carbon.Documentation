<template>
  <a class="news-slug-link" :href="'#' + slugify(props.text)"><h1 :id="slugify(props.text)" :class="'news-text-section' + (props.author ? '' : ' mb-5')" v-html="renderedText"></h1></a>
  <div v-if="props.author" :class="'news-text-section-author'">by <a :href="'https://github.com/' + props.author" target="_break" class="news-text-section-author-name">{{ props.author }}</a></div>
  <div class="mb-5"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import MarkdownIt from 'markdown-it';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface Props {
  text: string;
  author?: string;
}

const props = defineProps<Props>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
})

const renderedText = md.renderInline(props.text)

onMounted(() => {
  setTimeout(() => {
    const hash = window.location.hash
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 150,
          behavior: 'smooth'
        })
      }
    }
  }, 300)
})
</script>

<style scoped>
.news-slug-link {
  text-decoration: none;
}
.news-slug-link:hover {
  text-decoration: underline;
}
.news-text-section {
  margin-top: 200px;
  font-weight: 900 !important;
  font-size: 38px;
  text-transform: uppercase;
  color: white;
}
.news-text-section-author {
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 20px;
}
.news-text-section-author-name {
  color: inherit;
  text-decoration: none;
  transition-duration: 0ms;
}
.news-text-section-author-name:hover {
  color: rgba(255, 255, 255, 1);
  text-decoration: underline;
  text-decoration-color: var(--vp-c-brand-1);
}
</style>
