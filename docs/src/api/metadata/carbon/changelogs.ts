import { CacheOptions } from '@/api/cache'
import { CACHE_TIME_CHANGELOGS_TTL, URL_METDAT_CARB_CHANGELOGS } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

// fix naming issues with first letter being uppercase

export interface ChangeCarbon {
  Message: string
  Type: number
  Authors: string[] | undefined
}

export interface ChangelogCarbon {
  Date: string
  Version: string
  CommitUrl: string
  Changes: ChangeCarbon[]
}

export type ChangelogsCarbonData = ChangelogCarbon[]

export async function fetchChangelogsCarbon() {
  const url = URL_METDAT_CARB_CHANGELOGS

  const options: CacheOptions = {
    versionUrl: '',
  }

  const { data } = await fetchApiCaching<ChangelogsCarbonData>(url, CACHE_TIME_CHANGELOGS_TTL, undefined, options)

  return data
}
