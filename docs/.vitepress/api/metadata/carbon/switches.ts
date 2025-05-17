import { URL_METDAT_CARB_SWITCHES } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

// fix naming issues with first letter being uppercase
export interface Switch {
  Name: string
  Help: string
}

export type SwitchesData = Switch[]

export async function fetchSwitches() {
  const url = URL_METDAT_CARB_SWITCHES

  const data = await fetchApiCaching<SwitchesData>(url)

  return data
}
