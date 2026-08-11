import { CACHE_TIME_ITEM_TTL, URL_METDAT_RUST_PREFABS } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

// fix naming issues with first letter being uppercase

export interface Prefab {
  Type: null // It's really always null
  Path: string
  Name: string
  Components: string[]
  ID: number
}

export type PrefabsData = Prefab[]

export async function fetchPrefabs() {
  const url = URL_METDAT_RUST_PREFABS

  const { data, isFromCache } = await fetchApiCaching<PrefabsData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
