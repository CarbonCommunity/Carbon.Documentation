export class Commit {
  SHA: string = ''
  Repository: string = ''
  RepositoryUrl: string = ''
  AuthorName: string = ''
  AuthorAvatar: string = ''
  AuthorUrl: string = ''
  Message: string = ''
  Body: string = ''
  CommitUrl: string = ''
  Date: Date | null = null
  // The default branch when the commit is on it, otherwise every branch that contains it.
  Branches: string[] = []

  get ShortSHA() {
    return this.SHA.substring(0, 7)
  }

  // From a row of commits.json (see scripts/generate-commits.mjs).
  static fromData(repository: string, sha: string, time: number, authorName: string, login: string, title: string, body: string, branches: string[]): Commit {
    const commit = new Commit()
    commit.Repository = repository
    commit.SHA = sha
    commit.Date = new Date(time * 1000)
    commit.AuthorName = authorName
    commit.Message = title
    commit.Body = body
    commit.Branches = branches
    commit.setUrls()
    commit.resolveAuthor(login)
    return commit
  }

  // From an item of GitHub's `GET /repos/{owner}/{repo}/commits` response.
  static fromGitHub(repository: string, item: GitHubCommit, branch: string): Commit {
    const [title, ...rest] = item.commit.message.trim().split('\n')
    const commit = new Commit()
    commit.Repository = repository
    commit.SHA = item.sha
    commit.Date = new Date(item.commit.author?.date ?? item.commit.committer?.date ?? 0)
    commit.AuthorName = item.commit.author?.name ?? item.author?.login ?? ''
    commit.Message = title.trim()
    commit.Body = rest.join('\n').trim()
    commit.Branches = [branch]
    commit.setUrls()
    commit.resolveAuthor(item.author?.login)
    return commit
  }

  private setUrls() {
    this.RepositoryUrl = `https://github.com/CarbonCommunity/${this.Repository}`
    this.CommitUrl = `${this.RepositoryUrl}/commit/${this.SHA}`
  }

  private resolveAuthor(login?: string) {
    switch(this.AuthorName) {
      case 'evs.ptr':
        this.AuthorName = 'evs-ptr'
        break;
      case 'João Brázio':
      case 'Joao Brazio':
        this.AuthorName = 'jbrazio'
        break;
    }

    let githubName = login ?? ''
    switch(this.AuthorName) {
      case 'raul':
      case 'Raul-Sorin Sorban':
        githubName = "raulssorban"
        break;
      case 'David':
        githubName = 'david7-dev'
        break;
      case 'Death':
        githubName = 'Deathicated'
        break;
      case 'Kopter':
        githubName = 'kop7er'
        break;
      case 'evs-ptr':
      case 'DezLife':
      case 'jbrazio':
      case 'ThePitereq':
      case 'kop7er':
      case 'Patrette':
      case 'bubbafett5611':
        githubName = this.AuthorName
        break;
    }
    this.setLogin(githubName)
  }

  // Without a GitHub login there's no avatar; the page shows initials instead.
  setLogin(login: string) {
    this.AuthorUrl = login ? `https://github.com/${login}` : ''
    this.AuthorAvatar = login ? `${this.AuthorUrl}.png?size=80` : ''
  }
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string } | null
    committer: { name: string; date: string } | null
  }
  author: { login: string } | null
}
