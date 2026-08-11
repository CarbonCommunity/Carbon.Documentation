import { CACHE_TIME_ITEM_TTL, URL_METDAT_RUST_ITEMS } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

// fix naming issues with first letter being uppercase

export interface ItemModFoodSpoiling {
  TotalSpoilTimeHours: number
  SpoilItemId: number
  SpoilItemShortName: string
}

export interface ItemModCompostable {
  TotalFertilizerProduced: number
  BaitValue: number
  MaxBaitStack: number
}

export interface ItemModBurnable {
  FuelAmount: number
  HasByProduct: boolean
  ByproductItemId: number
  ByproductItemShortName: string
  ByproductAmount: number
  ByproductChance: number
}

export interface ItemModRepair {
  ConditionLost: number
  WorkbenchLvlRequired: number
  CanUseRepairBench: boolean
}

export interface ItemModPrefabReference {
  ResourcePath: string
  ResourceID: number
}

export interface SteamDlcItem {
  AppId: number
  Name: string
}

export interface SteamStoreItem {
  WorkshopId: number
  Name: string
  Id: number
}

export interface Item {
  Id: number
  DisplayName: string
  ShortName: string
  Description: string
  Stack: number
  Hidden: boolean
  Flags: number
  Category: number
  Rarity: number
  RedirectOf: Item | null
  SteamDlcItem: SteamDlcItem | null
  SteamStoreItem: SteamStoreItem | null
  ItemMods: string[]
  ItemMod_Deployable: ItemModPrefabReference | null
  ItemMod_Entity: ItemModPrefabReference | null
  ItemMod_EntityReference: ItemModPrefabReference | null
  ItemMod_Repair: ItemModRepair | null
  ItemMod_Burnable: ItemModBurnable | null
  ItemMod_Compostable: ItemModCompostable | null
  ItemMod_FoodSpoiling: ItemModFoodSpoiling | null
}

export type ItemsData = Item[]

export async function fetchItems() {
  const url = URL_METDAT_RUST_ITEMS

  const { data, isFromCache } = await fetchApiCaching<ItemsData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
