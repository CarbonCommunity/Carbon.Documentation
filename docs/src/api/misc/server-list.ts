import { CacheOptions } from '../cache'
import { CACHE_TIME_SERVER_LIST_TTL, URL_SERVER_LIST } from '../constants'
import { fetchApiCaching } from '../fetch-api'

interface ServerApi {
  hostname: string
  map: string | null
  players: number
  maxplayers: number
  tags: string | null
  ip: string
  port: number
  query_port: number
}

interface ServerListApi {
  Servers: ServerApi[]
  Version: number
  PackedTimestamp: number
}

export enum RegionTag {
  NorthAmerica = 'NA',
  SouthAmerica = 'SA',
  Europe = 'EU',
  WestAsia = 'WA',
  EastAsia = 'EA',
  Oceania = 'OC',
  Africa = 'AF',
}

export enum CompressedTag {
  Monthly = '^m',
  Biweekly = '^b',
  Weekly = '^w',
  Vanilla = '^v',
  Hardcore = '^h',
  Softcore = '^s',
  PvE = '^p',
  Roleplay = '^r',
  Creative = '^c',
  Minigame = '^e',
  Training = '^d',
  Battlefield = '^i',
  BattleRoyale = '^j',
  BuildServer = '^k',
  Tutorial = '^t',
  Premium = '^q',
  Modded = '^z',
  Oxide = '^o',
  Carbon = '^y',
}

export interface Server extends ServerApi {
  id: number
  tags_set: Set<RegionTag | CompressedTag | string>
  rust_version: number | typeof NaN
}

export interface ServerList {
  Servers: Server[]
  Version: number
  PackedTimestamp: number
}

export async function fetchServerList() {
  const url = URL_SERVER_LIST

  const options: CacheOptions = {
    versionUrl: '',
  }

  const { data, isFromCache } = await fetchApiCaching<ServerList, ServerListApi>(
    url,
    CACHE_TIME_SERVER_LIST_TTL,
    (data) => {
      const serverList: Server[] = data.Servers.map((server, index) => {
        const tags = server.tags?.split(',') || []
        const tagsSet = new Set(tags)
        const rustVersionStr = tags.find((tag) => tag.startsWith('v'))?.slice(1)

        return {
          ...server,
          id: index,
          tags_set: tagsSet,
          rust_version: rustVersionStr ? parseInt(rustVersionStr) : 0,
        }
      })
      const serverListData: ServerList = { ...data, Servers: serverList }
      return serverListData
    },
    options
  )

  return { data, isFromCache }
}
