import { URL_METDAT_RUST_ITEMS } from '@/api/constants'
import { fetchApiCaching } from '@/api/fetch-api'

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
  SteamDlcItem: SteamDlcItem | null
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

  const data = await fetchApiCaching<ItemsData>(url)

  return data
}
