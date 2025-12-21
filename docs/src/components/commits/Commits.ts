export class Commit {
  AuthorName: string = ''
  AuthorAvatar: string = ''
  AuthorUrl: string = ''
  Message: string = ''
  Branch: string = ''
  Url: string = ''
  Date: Date | null = null

  wasToday() {
    if(this.Date == null) {
      return false
    }
    return this.Date.getDate() == new Date(Date.now()).getDate()
  }

  async parse(json: any) : Commit {
    this.AuthorName = json.author.login
    this.AuthorAvatar = json.author.avatar_url
    this.AuthorUrl = json.author.html_url
    this.Message = json.commit.message
    this.Url = json.html_url
    this.Date = new Date(json.commit.committer.date)
    // this.Branch = (await (await fetch(json.url + "/branches-where-head")).json())[0].name
  }
}
