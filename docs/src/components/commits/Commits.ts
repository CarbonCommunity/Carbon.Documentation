import { BinaryReader } from '@/utils/BinaryReader'

export class Commit {
  SHA: string = ''
  Repository: string = ''
  RepositoryUrl: string = ''
  AuthorName: string = ''
  AuthorAvatar: string = ''
  AuthorUrl: string = ''
  Message: string = ''
  Branch: string = ''
  CommitUrl: string = ''
  Changeset: number = 0
  Date: Date | null = null

  wasToday() {
    if(this.Date == null) {
      return false
    }
    return this.Date.getDate() == new Date(Date.now()).getDate()
  }

  parse(reader: BinaryReader) : Commit {
    this.Repository = reader.bstring()
    this.SHA = reader.bstring()
    this.Date = new Date(reader.bstring())
    this.AuthorName = reader.bstring()
    this.Message = reader.bstring()
    this.Changeset = reader.int32()
    this.RepositoryUrl = `https://github.com/CarbonCommunity/${this.Repository}`
    this.CommitUrl = `${this.RepositoryUrl}/commit/${this.SHA}`

    switch(this.AuthorName) {
      case 'evs.ptr':
        this.AuthorName = 'evs-ptr'
        break;
      case 'João Brázio':
      case 'Joao Brazio':
        this.AuthorName = 'jbrazio'
        break;
    }

    let githubName = ''
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
        githubName = this.AuthorName
        break;
    }
    this.AuthorUrl = `https://github.com/${githubName}`
    this.AuthorAvatar = `${this.AuthorUrl}.png`
    return this
  }
}
