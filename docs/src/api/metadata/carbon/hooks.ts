import { CACHE_TIME_ITEM_TTL, URL_METDAT_CARB_HOOKS } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

export interface Hook {
  Id: number
  Name: string
  FullName: string
  Category: string
  Parameters: Parameter[]
  Flags: number
  Descriptions: string[] | null
  CarbonCompatible: boolean
  OxideCompatible: boolean
  MethodSource: string
  ParametersText: string
  TargetName: string | null
  MethodName: string | null
  AssemblyName: string | null
  ReturnTypeName: string
  ReturnBehavior?: ReturnBehavior
}

export type ReturnBehavior = 'Unspecified' | 'Cancel' | 'Override' | 'Modify'

export interface Parameter {
  Name: string
  Optional: boolean
  TypeName: string
  TypeFriendly: string
}

export type HooksData = Map<string, Hook[]>

export async function fetchHooks() {
  const url = URL_METDAT_CARB_HOOKS

  const { data, isFromCache } = await fetchApiCaching<HooksData, { [key: string]: Hook[] }>(url, CACHE_TIME_ITEM_TTL, (data) => {
    const actualMap: HooksData = new Map()
    Object.keys(data).forEach((key) => {
      actualMap.set(key, data[key])
    })
    return actualMap
  })

  return { data, isFromCache }
}
