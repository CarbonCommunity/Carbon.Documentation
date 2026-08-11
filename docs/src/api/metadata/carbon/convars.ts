import { CACHE_TIME_ITEM_TTL, URL_METDAT_CARB_CONVARS } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

// fix naming issues with first letter being uppercase
export interface ConVarCarbon {
  Name: string
  DisplayName: string
  Help: string
  ForceModded: boolean
  Protected: boolean
}

export type ConVarsCarbonData = ConVarCarbon[]

export async function fetchConVarsCarbon() {
  const url = URL_METDAT_CARB_CONVARS

  const { data, isFromCache } = await fetchApiCaching<ConVarsCarbonData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
