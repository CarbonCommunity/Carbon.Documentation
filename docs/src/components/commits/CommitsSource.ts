import { BinaryReader } from '@/utils/BinaryReader'
import { Commit, GitHubCommit } from './Commits'

// The snapshot on api.carbonmod.gg is only regenerated occasionally, so anything newer
// than its latest commit per repository is pulled live from the GitHub API.
// Unauthenticated GitHub requests are limited to 60/hour per IP, so every response is cached.
const SNAPSHOT_URL = 'https://api.carbonmod.gg/meta/git.dat'
const GITHUB_OWNER = 'CarbonCommunity'
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}`
const LIVE_MAX_PAGES = 10 // 100 commits per page
const BRANCH_MAX_PAGES = 3
const CACHE_MINUTES = 10
const REPO_INFO_CACHE_MINUTES = 24 * 60

export interface LiveResult {
  commits: Commit[]
  failedRepositories: string[]
  fetchedAt: Date
}

export interface BranchList {
  defaultBranch: string
  branches: string[]
}

// ---------- caching ----------

async function cached<T>(storage: () => Storage, key: string, minutes: number, force: boolean, load: () => Promise<T>): Promise<{ value: T; time: number }> {
  if (!force) {
    try {
      const entry = JSON.parse(storage().getItem(key) ?? 'null')
      if (entry && Date.now() - entry.time < minutes * 60_000) {
        return entry
      }
    } catch {
      /* storage unavailable */
    }
  }

  const entry = { value: await load(), time: Date.now() }
  try {
    storage().setItem(key, JSON.stringify(entry))
  } catch {
    /* storage unavailable or full */
  }
  return entry
}

const session = () => sessionStorage
const local = () => localStorage

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!response.ok) {
    const limited = response.status == 403 || response.status == 429
    throw new Error(limited ? 'GitHub rate limit reached, try again later' : `GitHub request failed (HTTP ${response.status})`)
  }
  return response.json()
}

async function fetchCommitPages(repository: string, query: string, maxPages: number): Promise<GitHubCommit[]> {
  const items: GitHubCommit[] = []
  for (let page = 1; page <= maxPages; page++) {
    let batch: GitHubCommit[]
    try {
      batch = await githubJson<GitHubCommit[]>(`/${repository}/commits?per_page=100&page=${page}&${query}`)
    } catch (e) {
      if (items.length == 0) throw e
      break
    }
    items.push(...batch)
    if (batch.length < 100) break
  }
  return items
}

// ---------- snapshot ----------

export async function loadSnapshot(): Promise<Commit[]> {
  const response = await fetch(SNAPSHOT_URL)

  if (!response.ok) {
    throw new Error(`Snapshot request failed (HTTP ${response.status})`)
  }

  const reader = new BinaryReader(await response.arrayBuffer())
  const count = reader.int32()
  const commits: Commit[] = []

  for (let i = 0; i < count; i++) {
    commits.push(new Commit().parse(reader))
  }
  return commits
}

// ---------- repository info ----------

export async function loadDefaultBranch(repository: string, force = false): Promise<string> {
  const { value } = await cached(local, `commits:default:${repository}`, REPO_INFO_CACHE_MINUTES, force, async () => {
    const info = await githubJson<{ default_branch: string }>(`/${repository}`)
    return info.default_branch
  })
  return value
}

export async function loadBranches(repository: string, force = false): Promise<BranchList> {
  const defaultBranch = await loadDefaultBranch(repository, force)
  const { value } = await cached(session, `commits:branches:${repository}`, CACHE_MINUTES, force, async () => {
    const names: string[] = []
    for (let page = 1; page <= 3; page++) {
      const batch = await githubJson<{ name: string }[]>(`/${repository}/branches?per_page=100&page=${page}`)
      names.push(...batch.map((x) => x.name))
      if (batch.length < 100) break
    }
    return names
  })
  const branches = [defaultBranch, ...value.filter((x) => x != defaultBranch).sort((a, b) => a.localeCompare(b))]
  return { defaultBranch, branches }
}

// ---------- live commits ----------

// Commits on each repository's default branch newer than the snapshot.
export async function loadLive(snapshot: Commit[], force = false): Promise<LiveResult> {
  const known = new Set(snapshot.map((x) => x.SHA))
  const latest = new Map<string, Commit>()
  for (const commit of snapshot) {
    const current = latest.get(commit.Repository)
    if (!current || (commit.Date?.getTime() ?? 0) > (current.Date?.getTime() ?? 0)) {
      latest.set(commit.Repository, commit)
    }
  }

  const repositories = [...latest.values()]
  const results = await Promise.allSettled(
    repositories.map(async (newest) => {
      const branch = await loadDefaultBranch(newest.Repository).catch(() => '')
      const since = newest.Date!.toISOString()
      const { value: items, time } = await cached(session, `commits:live:${newest.Repository}:${since}`, CACHE_MINUTES, force, () =>
        fetchCommitPages(newest.Repository, `since=${encodeURIComponent(since)}`, LIVE_MAX_PAGES)
      )
      const commits = items
        .filter((x) => !known.has(x.sha))
        .reverse() // oldest first, so changesets keep counting up from the snapshot
        .map((item, i) => new Commit().fromGitHub(newest.Repository, item, newest.Changeset + i + 1, branch))
      return { commits, time }
    })
  )

  const commits: Commit[] = []
  const failedRepositories: string[] = []
  let fetchedAt = 0
  results.forEach((result, i) => {
    if (result.status == 'fulfilled') {
      commits.push(...result.value.commits)
      fetchedAt = Math.max(fetchedAt, result.value.time)
    } else {
      failedRepositories.push(repositories[i].Repository)
    }
  })
  return { commits, failedRepositories, fetchedAt: new Date(fetchedAt || Date.now()) }
}

// The most recent commits of one branch, straight from GitHub. Changesets are borrowed
// from commits already known (snapshot or live), otherwise left at 0.
export async function loadBranchCommits(repository: string, branch: string, known: Commit[], force = false): Promise<{ commits: Commit[]; fetchedAt: Date }> {
  const changesets = new Map(known.filter((x) => x.Repository == repository).map((x) => [x.SHA, x.Changeset]))
  const { value: items, time } = await cached(session, `commits:branch:${repository}:${branch}`, CACHE_MINUTES, force, () =>
    fetchCommitPages(repository, `sha=${encodeURIComponent(branch)}`, BRANCH_MAX_PAGES)
  )
  const commits = items.map((item) => new Commit().fromGitHub(repository, item, changesets.get(item.sha) ?? 0, branch))
  return { commits, fetchedAt: new Date(time) }
}
