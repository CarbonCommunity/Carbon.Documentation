import { withBase } from 'vitepress'
import { Commit, GitHubCommit } from './Commits'

// The full history of every branch comes from /data/commits.json, generated at build time by
// scripts/generate-commits.mjs. Anything pushed since then is fetched from the GitHub API:
// one branch listing per repository, plus a walk of each branch whose head isn't known yet.
// Unauthenticated GitHub requests are limited to 60/hour per IP, so every response is cached.
const DATA_URL = '/data/commits.json'
// Keep in sync with REPOSITORIES in scripts/generate-commits.mjs
export const REPOSITORIES = ['Carbon', 'Carbon.Native', 'Carbon.Profiler']
const GITHUB_OWNER = 'CarbonCommunity'
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}`
const BRANCH_WALK_MAX_PAGES = 3 // 100 commits per page
const RATE_LIMIT_RESERVE = 5 // leave a few requests for other pages
const CACHE_MINUTES = 10

export interface Repository {
  name: string
  defaultBranch: string
  // branch name -> head sha
  branches: Map<string, string>
}

export interface CommitData {
  commits: Commit[]
  repositories: Map<string, Repository>
  generatedAt: Date | null
}

export interface UpdateResult {
  commits: Commit[]
  failedRepositories: string[]
  // Branches not walked because the GitHub rate limit was close
  skippedBranches: number
  fetchedAt: Date
}

interface DataFile {
  version: number
  generatedAt: string
  repositories: { name: string; defaultBranch: string; branches: [string, string][] }[]
  authors: [string, string][]
  commits: [number, string, number, number, string, string, number[]][]
}

// ---------- generated data ----------

export async function loadCommitData(): Promise<CommitData> {
  const response = await fetch(withBase(DATA_URL))
  if (!response.ok) {
    if (response.status == 404) {
      // Local dev without `npm run generate:commits`: rely on GitHub alone.
      return { commits: [], repositories: new Map(), generatedAt: null }
    }
    throw new Error(`Commit data request failed (HTTP ${response.status})`)
  }

  const data: DataFile = await response.json()
  const repositories = new Map<string, Repository>()
  for (const repo of data.repositories) {
    repositories.set(repo.name, { name: repo.name, defaultBranch: repo.defaultBranch, branches: new Map(repo.branches) })
  }

  const commits = data.commits.map(([repoIndex, sha, time, authorIndex, title, body, branchIndices]) => {
    const repo = data.repositories[repoIndex]
    const [authorName, login] = data.authors[authorIndex]
    return Commit.fromData(repo.name, sha, time, authorName, login, title, body, branchIndices.map((i) => repo.branches[i][0]))
  })
  return { commits, repositories, generatedAt: new Date(data.generatedAt) }
}

// ---------- GitHub ----------

let rateLimitRemaining = Infinity

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  const remaining = response.headers.get('X-RateLimit-Remaining')
  if (remaining != null) rateLimitRemaining = Number(remaining)

  if (!response.ok) {
    const limited = response.status == 403 || response.status == 429
    if (limited) rateLimitRemaining = 0
    throw new Error(limited ? 'GitHub rate limit reached, try again later' : `GitHub request failed (HTTP ${response.status})`)
  }
  return response.json()
}

function readCache<T>(storage: Storage, key: string, minutes: number): { value: T; time: number } | null {
  try {
    const entry = JSON.parse(storage.getItem(key) ?? 'null')
    if (entry && (minutes <= 0 || Date.now() - entry.time < minutes * 60_000)) return entry
  } catch {
    /* storage unavailable */
  }
  return null
}

function writeCache(storage: Storage, key: string, value: unknown) {
  const entry = { value, time: Date.now() }
  try {
    storage.setItem(key, JSON.stringify(entry))
  } catch {
    /* storage unavailable or full */
  }
  return entry
}

async function loadDefaultBranch(repository: string): Promise<string> {
  const key = `commits:default:${repository}`
  const cached = readCache<string>(localStorage, key, 24 * 60)
  if (cached) return cached.value
  const info = await githubJson<{ default_branch: string }>(`/${repository}`)
  return writeCache(localStorage, key, info.default_branch).value
}

async function loadBranchHeads(repository: string, force: boolean): Promise<{ value: [string, string][]; time: number }> {
  const key = `commits:heads:${repository}`
  const cached = force ? null : readCache<[string, string][]>(sessionStorage, key, CACHE_MINUTES)
  if (cached) return cached

  const heads: [string, string][] = []
  for (let page = 1; page <= 5; page++) {
    const batch = await githubJson<{ name: string; commit: { sha: string } }[]>(`/${repository}/branches?per_page=100&page=${page}`)
    heads.push(...batch.map((x) => [x.name, x.commit.sha] as [string, string]))
    if (batch.length < 100) break
  }
  return writeCache(sessionStorage, key, heads)
}

// Commits on a branch, newest first, up to the first one already known. A head sha never
// changes meaning, so the result is cached for good under it.
async function walkBranch(repository: string, head: string, known: Set<string>): Promise<GitHubCommit[]> {
  const key = `commits:walk:${repository}:${head}`
  const cached = readCache<GitHubCommit[]>(localStorage, key, 0)
  if (cached) return cached.value

  const items: GitHubCommit[] = []
  let reachedKnown = false
  for (let page = 1; page <= BRANCH_WALK_MAX_PAGES && !reachedKnown; page++) {
    const batch = await githubJson<GitHubCommit[]>(`/${repository}/commits?per_page=100&page=${page}&sha=${head}`)
    for (const item of batch) {
      if (known.has(item.sha)) {
        reachedKnown = true
        break
      }
      // Only what the page needs, to keep storage small.
      items.push({ sha: item.sha, commit: { message: item.commit.message, author: item.commit.author, committer: null }, author: item.author ? { login: item.author.login } : null })
    }
    if (batch.length < 100) break
  }
  writeCache(localStorage, key, items)
  return items
}

export async function loadUpdates(data: CommitData, repositoryNames: string[], force = false): Promise<UpdateResult> {
  const known = new Set(data.commits.map((x) => x.SHA))
  const found = new Map<string, Commit>()
  const failedRepositories: string[] = []
  let skippedBranches = 0
  let fetchedAt = 0

  for (const name of repositoryNames) {
    try {
      let repo = data.repositories.get(name)
      if (!repo) {
        repo = { name, defaultBranch: await loadDefaultBranch(name), branches: new Map() }
        data.repositories.set(name, repo)
      }
      const { value: heads, time } = await loadBranchHeads(name, force)
      fetchedAt = Math.max(fetchedAt, time)

      // GitHub's list is current: drops deleted branches and adds new ones.
      repo.branches = new Map(heads)

      // Default branch first, so commits on it are labelled with it.
      const ordered = [...heads].sort(([a], [b]) => (a == repo.defaultBranch ? -1 : b == repo.defaultBranch ? 1 : 0))
      for (const [branch, head] of ordered) {
        if (known.has(head)) continue
        if (rateLimitRemaining <= RATE_LIMIT_RESERVE && !readCache(localStorage, `commits:walk:${name}:${head}`, 0)) {
          skippedBranches++
          continue
        }

        for (const item of await walkBranch(name, head, known)) {
          const existing = found.get(item.sha)
          if (!existing) found.set(item.sha, Commit.fromGitHub(name, item, branch))
          else if (existing.Branches[0] != repo.defaultBranch && !existing.Branches.includes(branch)) existing.Branches.push(branch)
        }
      }
    } catch {
      failedRepositories.push(name)
    }
  }

  return { commits: [...found.values()], failedRepositories, skippedBranches, fetchedAt: new Date(fetchedAt || Date.now()) }
}
