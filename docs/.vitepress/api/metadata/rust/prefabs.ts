import { URL_METDAT_RUST_PREFABS } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

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

  const data = await fetchApiCaching<PrefabsData>(url)

  return data
}
