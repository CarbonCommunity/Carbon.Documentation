// Builds docs/public/data/commits.json: every commit on every branch of the repositories below.
// Uses plain git (commit-only partial clones), so it needs no GitHub API calls or tokens.
// The commits page loads this file and then asks GitHub only for what changed since it was built.

import { execFileSync } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const OWNER = 'CarbonCommunity'
const REPOSITORIES = ['Carbon', 'Carbon.Native', 'Carbon.Profiler']
const MAX_BODY_LENGTH = 2000

const rootDir = process.cwd()
const cacheDir = path.join(rootDir, 'docs', '.vitepress', 'cache', 'commit-repos')
const outputPath = path.join(rootDir, 'docs', 'public', 'data', 'commits.json')

const FIELD = '\x1f'
const RECORD = '\x1e'
const LOG_FORMAT = ['%H', '%at', '%an', '%ae', '%B'].join('%x1f') + '%x1e'

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512, stdio: ['ignore', 'pipe', 'pipe'] })
}

async function syncRepository(name) {
  const dir = path.join(cacheDir, `${name}.git`)
  const url = `https://github.com/${OWNER}/${name}.git`

  if (existsSync(dir)) {
    git(dir, 'fetch', '--quiet', '--prune', '--filter=tree:0', 'origin', '+refs/heads/*:refs/heads/*')
  } else {
    await fs.mkdir(cacheDir, { recursive: true })
    // Commits only: no trees or file contents are downloaded.
    git(cacheDir, 'clone', '--quiet', '--bare', '--filter=tree:0', url, dir)
  }
  // The remote's default branch, e.g. 'ref: refs/heads/main\tHEAD'
  const symref = git(dir, 'ls-remote', '--symref', 'origin', 'HEAD')
  const defaultBranch = /^ref: refs\/heads\/(\S+)\s+HEAD/m.exec(symref)?.[1]
  if (!defaultBranch) throw new Error(`Couldn't find the default branch of ${name}`)
  return { dir, defaultBranch }
}

function readLog(dir, ...revisions) {
  const output = git(dir, 'log', `--format=${LOG_FORMAT}`, ...revisions)
  return output
    .split(RECORD)
    .map((x) => x.replace(/^\n/, ''))
    .filter(Boolean)
    .map((record) => {
      const [sha, time, name, email, message] = record.split(FIELD)
      return { sha, time: Number(time), name, email, message: message.trim() }
    })
}

// GitHub's noreply addresses carry the account login.
function loginFromEmail(email) {
  const match = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email)
  return match ? match[1] : ''
}

async function main() {
  const authors = []
  const authorIndex = new Map()
  const repositories = []
  const commits = []

  for (const name of REPOSITORIES) {
    process.stdout.write(`${name}: syncing… `)
    const { dir, defaultBranch } = await syncRepository(name)

    const branches = git(dir, 'for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [branch, head] = line.split(' ')
        return { name: branch, head }
      })
      .sort((a, b) => (a.name == defaultBranch ? -1 : b.name == defaultBranch ? 1 : a.name.localeCompare(b.name)))

    const branchIndex = new Map(branches.map((x, i) => [x.name, i]))
    const defaultIndex = branchIndex.get(defaultBranch)

    // Every commit gets the default branch if it's on it, otherwise every branch it's on.
    const membership = new Map()
    for (const branch of branches) {
      if (branch.name == defaultBranch) continue
      const shas = git(dir, 'rev-list', `refs/heads/${branch.name}`, '--not', `refs/heads/${defaultBranch}`).trim().split('\n').filter(Boolean)
      for (const sha of shas) {
        const list = membership.get(sha)
        if (list) list.push(branchIndex.get(branch.name))
        else membership.set(sha, [branchIndex.get(branch.name)])
      }
    }

    const log = readLog(dir, '--branches')
    const repoIndex = repositories.length
    for (const commit of log) {
      const authorKey = `${commit.name}\n${commit.email.toLowerCase()}`
      let author = authorIndex.get(authorKey)
      if (author === undefined) {
        author = authors.length
        authors.push([commit.name, loginFromEmail(commit.email)])
        authorIndex.set(authorKey, author)
      }

      const [title, ...rest] = commit.message.split('\n')
      let body = rest.join('\n').trim()
      if (body.length > MAX_BODY_LENGTH) body = body.substring(0, MAX_BODY_LENGTH) + '…'

      commits.push([repoIndex, commit.sha, commit.time, author, title.trim(), body, membership.get(commit.sha) ?? [defaultIndex]])
    }

    repositories.push({ name, defaultBranch, branches: branches.map((x) => [x.name, x.head]) })
    console.log(`${log.length} commits, ${branches.length} branches`)
  }

  commits.sort((a, b) => b[2] - a[2])

  const data = {
    version: 1,
    generatedAt: new Date().toISOString(),
    // commits: [repository, sha, unix time, author, title, body, branch indices]
    repositories,
    authors,
    commits,
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(data))
  const size = (await fs.stat(outputPath)).size
  console.log(`Wrote ${commits.length} commits to ${path.relative(rootDir, outputPath)} (${(size / 1024 / 1024).toFixed(2)} MB)`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
