import { URL_METDAT_CARB_HOOKS } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

export interface Hook {
  Id: number
  Name: string
  FullName: string
  Category: string
  Parameters: Parameter[]
  Flags: number
  Descriptions: string[]
  CarbonCompatible: boolean
  OxideCompatible: boolean
  MethodSource: string
  ParametersText: string
  TargetName: string
  MethodName: string
  AssemblyName: string
  ReturnTypeName: string
}

export interface Parameter {
  Name: string
  Optional: boolean
  TypeName: string
  TypeFriendly: string
}

export type HooksData = Map<string, Hook[]>

export async function fetchHooks() {
  const url = URL_METDAT_CARB_HOOKS

  const data = await fetchApiCaching<{ [key: string]: Hook[] }>(url)

  const actualMap: HooksData = new Map()

  Object.keys(data).forEach((key) => {
    actualMap.set(key, data[key])
  })

  return actualMap
}
