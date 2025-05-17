import { URL_METDAT_RUST_ENTITIES } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

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

  const data = await fetchApiCaching<EntitiesData>(url)

  return data
}
