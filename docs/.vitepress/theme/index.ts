// https://vitepress.dev/guide/custom-theme
import CarbonBadge from '@/components/CarbonBadge.vue'
import CarbonChange from '@/components/CarbonChange.vue'
import NewsSection from '@/components/news/NewsSection.vue'
import NewsHeroSection from '@/components/news/NewsHeroSection.vue'
import NewsSectionTitle from '@/components/news/NewsSectionTitle.vue'
import NewsSectionSubtitle from '@/components/news/NewsSectionSubtitle.vue'
import NewsImage from '@/components/news/NewsImage.vue'
import NewsImageGrid from '@/components/news/NewsImageGrid.vue'
import NewsReleaseNotes from '@/components/news/NewsReleaseNotes.vue'
import NewsLayout from '@/components/NewsLayout.vue'
import type { Theme } from 'vitepress'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app }) {
    // https://vitepress.dev/guide/extending-default-theme#app-level-enhancements
    app.component('CarbonBadge', CarbonBadge)
    app.component('CarbonChange', CarbonChange)
    app.component('NewsImage', NewsImage)
    app.component('NewsImageGrid', NewsImageGrid)
    app.component('NewsSection', NewsSection)
    app.component('NewsHeroSection', NewsHeroSection)
    app.component('NewsSectionTitle', NewsSectionTitle)
    app.component('NewsSectionSubtitle', NewsSectionSubtitle)
    app.component('NewsReleaseNotes', NewsReleaseNotes)
    app.component('news-layout', NewsLayout)
    enhanceAppWithTabs(app)
  },
} satisfies Theme
