import { BinaryReader } from '@/utils/BinaryReader'

export class Commit {
  SHA: string = ''
  Repository: string = ''
  RepositoryUrl: string = ''
  AuthorName: string = ''
  AuthorAvatar: string = ''
  AuthorUrl: string = ''
  Message: string = ''
  Body: string = ''
  Branch: string = ''
  CommitUrl: string = ''
  Changeset: number = 0
  Date: Date | null = null
  Live: boolean = false

  get ShortSHA() {
    return this.SHA.substring(0, 7)
  }

  wasToday() {
    if(this.Date == null) {
      return false
    }
    return this.Date.toDateString() == new Date().toDateString()
  }

  parse(reader: BinaryReader) : Commit {
    this.Repository = reader.bstring()
    this.SHA = reader.bstring()
    this.Date = new Date(reader.bstring())
    this.AuthorName = reader.bstring()
    this.Message = reader.bstring()
    this.Changeset = reader.int32()
    this.setUrls()
    this.resolveAuthor()
    return this
  }

  // Builds a commit from an item of GitHub's `GET /repos/{owner}/{repo}/commits` response.
  fromGitHub(repository: string, item: GitHubCommit, changeset: number, branch: string) : Commit {
    this.Repository = repository
    this.SHA = item.sha
    this.Date = new Date(item.commit.author?.date ?? item.commit.committer?.date ?? 0)
    this.AuthorName = item.commit.author?.name ?? item.author?.login ?? ''
    const [title, ...rest] = item.commit.message.trim().split('\n')
    this.Message = title.trim()
    this.Body = rest.join('\n').trim()
    this.Changeset = changeset
    this.Branch = branch
    this.Live = true
    this.setUrls()
    this.resolveAuthor(item.author?.login)
    return this
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
