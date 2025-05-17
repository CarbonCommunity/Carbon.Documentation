import { URL_METDAT_CARB_CONVARS } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

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

  const data = await fetchApiCaching<ConVarsCarbonData>(url)

  return data
}
