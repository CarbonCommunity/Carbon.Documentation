import { CACHE_TIME_ITEM_TTL, URL_METDAT_CARB_SWITCHES } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

// fix naming issues with first letter being uppercase
export interface Switch {
  Name: string
  Help: string
}

export type SwitchesData = Switch[]

export async function fetchSwitches() {
  const url = URL_METDAT_CARB_SWITCHES

  const { data, isFromCache } = await fetchApiCaching<SwitchesData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
