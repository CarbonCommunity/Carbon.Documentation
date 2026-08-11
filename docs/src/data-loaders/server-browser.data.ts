import { defineLoader } from 'vitepress'
import { fetchServerList, ServerList } from '../api/misc/server-list'

declare const data: ServerList
export { data }

export default defineLoader({
  async load(): Promise<ServerList> {
    const { data } = await fetchServerList()

    data.Servers = data.Servers.slice(0, 69)

    return data
  },
})
