import { CACHE_TIME_ITEM_TTL, URL_METDAT_RUST_ENTITIES } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

// fix naming issues with first letter being uppercase

export interface Entity {
  Type: string
  Path: string
  Name: string
  Components: string[]
  ID: number
}

export type EntitiesData = Entity[]

export async function fetchEntities() {
  const url = URL_METDAT_RUST_ENTITIES

  const { data, isFromCache } = await fetchApiCaching<EntitiesData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
