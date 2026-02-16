import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'

const SITE_URL = 'https://carbonmod.gg'
const CHANNEL_TITLE = 'Carbon News'
const CHANNEL_LINK = `${SITE_URL}/news`
const CHANNEL_DESCRIPTION = 'Latest Carbon news and updates.'
const FEED_URL = `${SITE_URL}/rss.xml`

const rootDir = process.cwd()
const docsDir = path.join(rootDir, 'docs')
const newsDir = path.join(docsDir, 'news')
const outputPath = path.join(docsDir, 'public', 'rss.xml')

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

async function getMarkdownFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        return getMarkdownFiles(entryPath)
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        return [entryPath]
      }

      return []
    })
  )

  return files.flat()
}

function toSitePath(markdownFile) {
  const relative = path.relative(docsDir, markdownFile).split(path.sep).join('/')
  let normalized = `/${relative.replace(/\.md$/, '')}`

  if (normalized.endsWith('/index')) {
    normalized = normalized.slice(0, -'/index'.length) || '/'
  }

  return normalized
}

function toAbsoluteUrl(sitePath) {
  return `${SITE_URL}${sitePath}`
}

function warnSkip(filePath, reason) {
  const relative = path.relative(rootDir, filePath).split(path.sep).join('/')
  console.warn(`[generate:rss] Skipping ${relative}: ${reason}`)
}

function parseFrontmatterDate(rawDate) {
  if (rawDate instanceof Date) {
    return Number.isNaN(rawDate.getTime()) ? null : rawDate
  }

  if (typeof rawDate === 'string' || typeof rawDate === 'number') {
    const parsed = new Date(rawDate)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

async function buildRss() {
  const markdownFiles = await getMarkdownFiles(newsDir)
  const items = []

  for (const markdownFile of markdownFiles) {
    const content = await fs.readFile(markdownFile, 'utf8')
    const frontmatter = matter(content).data

    if (frontmatter.published !== true || frontmatter.hidden === true || frontmatter.category !== 'news' || frontmatter.rss === false) {
      continue
    }

    if (typeof frontmatter.title !== 'string' || frontmatter.title.trim().length === 0) {
      warnSkip(markdownFile, 'missing title')
      continue
    }

    if (typeof frontmatter.description !== 'string') {
      warnSkip(markdownFile, 'missing description')
      continue
    }

    const title = frontmatter.title.trim()
    const description = frontmatter.description.trim()

    if (description.length === 0) {
      warnSkip(markdownFile, 'empty description')
      continue
    }

    const date = parseFrontmatterDate(frontmatter.date)
    if (date == null) {
      warnSkip(markdownFile, `missing or invalid date "${String(frontmatter.date)}"`)
      continue
    }

    const sitePath = toSitePath(markdownFile)
    const absoluteLink = toAbsoluteUrl(sitePath)

    items.push({
      title,
      description,
      author: typeof frontmatter.author === 'string' ? frontmatter.author.trim() : '',
      categories: Array.isArray(frontmatter.tags)
        ? frontmatter.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
        : [],
      date,
      link: absoluteLink,
      guid: absoluteLink,
    })
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime())

  const itemsXml = items
    .map((item) => {
      const authorXml = item.author ? `\n      <dc:creator>${escapeXml(item.author)}</dc:creator>` : ''
      const categoriesXml = item.categories.map((category) => `\n      <category>${escapeXml(category)}</category>`).join('')

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>${authorXml}${categoriesXml}
    </item>`
    })
    .join('\n')

  const nowUtc = new Date().toUTCString()
  const channelPubDate = items[0]?.date.toUTCString() ?? nowUtc

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(CHANNEL_TITLE)}</title>
    <link>${escapeXml(CHANNEL_LINK)}</link>
    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>
    <language>en-us</language>
    <pubDate>${channelPubDate}</pubDate>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <generator>Carbon Documentation RSS Generator</generator>
    <ttl>60</ttl>
    <atom:link href="${escapeXml(FEED_URL)}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>
`

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, rssXml, 'utf8')

  console.log(`[generate:rss] Wrote ${items.length} items to docs/public/rss.xml`)
}

buildRss().catch((error) => {
  console.error('[generate:rss] Failed to build RSS feed')
  console.error(error)
  process.exitCode = 1
})
