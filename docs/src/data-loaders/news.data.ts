import { ContentData, createContentLoader } from 'vitepress'
import { formatDate } from '../shared/utils'

export interface NewsPost extends ContentData {
  date: {
    time: number
    string: string
  }
}

declare const data: NewsPost[]
export { data }

export default createContentLoader([
  '/news/**/*.md', 
  '/tutorials/**/*.md'
], {
  render: true,
  transform(rawData) {
    return rawData
      .map((x): NewsPost => {
        return {
          ...x,
          date: formatDate(x.frontmatter.date),
        }
      })
      .sort((a, b) => b.date.time - a.date.time)
  },
})
