import { CACHE_TIME_ITEM_TTL, URL_METDAT_RUST_BLUEPRINTS } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'
import { Item } from './items'

// fix naming issues with first letter being uppercase
export interface Ingredient {
  Item: Item
  Amount: number
}

export interface Blueprint {
  Ingredients: Ingredient[]
  Item: Item
  UserCraftable: boolean
  Rarity: number
  Time: number
  CraftAmount: number
  ScrapRequired: number
  ScrapFromRecycle: number
  WorkbenchLevelRequired: number
  RequireUnlockedItem: Item | null
  NeedsSteamItem: boolean
  NeedsSteamDLC: boolean
}

export type BlueprintsData = Blueprint[]

export async function fetchBlueprints() {
  const url = URL_METDAT_RUST_BLUEPRINTS

  const { data, isFromCache } = await fetchApiCaching<BlueprintsData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
