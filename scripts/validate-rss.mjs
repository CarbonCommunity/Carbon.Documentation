import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const rootDir = process.cwd()
const rssPath = path.join(rootDir, 'docs', 'public', 'rss.xml')
const ALLOW_EMPTY_FEED = process.env.ALLOW_EMPTY_RSS === 'true'

function fail(message) {
  console.error(`[validate:rss] ${message}`)
  process.exitCode = 1
}

function validateDate(value, label) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} has invalid date: "${value}"`)
  }
}

function validateAbsoluteHttpsUrl(value, label) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${label} is not a valid URL: "${value}"`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use https: "${value}"`)
  }
}

function extractTagValue(source, tagName) {
  const match = source.match(new RegExp(`<${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function extractItems(source) {
  return [...source.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1])
}

function extractCategories(itemXml) {
  return [...itemXml.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((match) => match[1].trim())
}

async function runGenerateRss() {
  await execFileAsync(process.execPath, ['scripts/generate-rss.mjs'], { cwd: rootDir })
}

async function validateXmlWellFormed() {
  try {
    await execFileAsync('xmllint', ['--noout', rssPath], { cwd: rootDir })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.warn('[validate:rss] xmllint not found, skipping well-formedness check')
      return
    }
    throw error
  }
}

async function validateRssSemantics() {
  const xml = await fs.readFile(rssPath, 'utf8')

  if (!xml.startsWith('<?xml')) {
    throw new Error('missing XML declaration')
  }

  if (!/<rss\s+version="2\.0"/.test(xml)) {
    throw new Error('missing RSS 2.0 root element')
  }

  const channelXmlMatch = xml.match(/<channel>([\s\S]*?)<\/channel>/)
  if (!channelXmlMatch) {
    throw new Error('missing <channel>')
  }

  const channelXml = channelXmlMatch[1]
  const channelTitle = extractTagValue(channelXml, 'title')
  const channelLink = extractTagValue(channelXml, 'link')
  const channelDescription = extractTagValue(channelXml, 'description')
  const channelPubDate = extractTagValue(channelXml, 'pubDate')
  const channelLastBuildDate = extractTagValue(channelXml, 'lastBuildDate')

  if (!channelTitle) throw new Error('channel title is required')
  if (!channelLink) throw new Error('channel link is required')
  if (!channelDescription) throw new Error('channel description is required')
  if (!channelPubDate) throw new Error('channel pubDate is required')
  if (!channelLastBuildDate) throw new Error('channel lastBuildDate is required')

  validateAbsoluteHttpsUrl(channelLink, 'channel link')
  validateDate(channelPubDate, 'channel pubDate')
  validateDate(channelLastBuildDate, 'channel lastBuildDate')

  const atomSelfLink = xml.match(/<atom:link[^>]*href="([^"]+)"[^>]*rel="self"[^>]*type="application\/rss\+xml"[^>]*\/>/)?.[1] ?? ''
  if (!atomSelfLink) {
    throw new Error('missing atom self link')
  }
  validateAbsoluteHttpsUrl(atomSelfLink, 'atom self link')

  const items = extractItems(channelXml)
  if (items.length === 0 && !ALLOW_EMPTY_FEED) {
    throw new Error('feed has zero items (set ALLOW_EMPTY_RSS=true to allow this)')
  }

  const guidSet = new Set()

  for (const [index, itemXml] of items.entries()) {
    const label = `item ${index + 1}`
    const title = extractTagValue(itemXml, 'title')
    const description = extractTagValue(itemXml, 'description')
    const link = extractTagValue(itemXml, 'link')
    const guid = extractTagValue(itemXml, 'guid')
    const pubDate = extractTagValue(itemXml, 'pubDate')

    if (!title) throw new Error(`${label} missing title`)
    if (!description) throw new Error(`${label} missing description`)
    if (!link) throw new Error(`${label} missing link`)
    if (!guid) throw new Error(`${label} missing guid`)
    if (!pubDate) throw new Error(`${label} missing pubDate`)

    validateAbsoluteHttpsUrl(link, `${label} link`)
    validateAbsoluteHttpsUrl(guid, `${label} guid`)
    validateDate(pubDate, `${label} pubDate`)

    if (guidSet.has(guid)) {
      throw new Error(`${label} guid is duplicated: "${guid}"`)
    }
    guidSet.add(guid)

    const categories = extractCategories(itemXml)
    if (categories.some((category) => category.length === 0)) {
      throw new Error(`${label} contains an empty category`)
    }
  }
}

async function main() {
  await runGenerateRss()
  await validateXmlWellFormed()
  await validateRssSemantics()
  console.log('[validate:rss] RSS feed is valid')
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
