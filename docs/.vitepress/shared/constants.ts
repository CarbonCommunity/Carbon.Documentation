// API URLs from environment variables
export const HOOKS_API_URL = 'https://carbonmod.gg/redist/metadata/carbon/hooks.json'
export const BLUEPRINTS_API_URL = 'https://carbonmod.gg/redist/metadata/rust/blueprints.json'
export const ITEMS_API_URL = 'https://carbonmod.gg/redist/metadata/rust/items.json'
export const ENTITIES_API_URL = 'https://carbonmod.gg/redist/metadata/rust/entities.json'
export const LOOT_TABLES_API_URL = 'https://carbonmod.gg/redist/metadata/rust/loot_tables.json'
export const PREFABS_API_URL = 'https://carbonmod.gg/redist/metadata/rust/prefabs.json'
export const COMMANDS_API_URL = 'https://carbonmod.gg/redist/metadata/carbon/commands.json'
export const RELEASE_NOTES_API_URL = 'https://carbonmod.gg/redist/metadata/carbon/changelogs.json'
export const SWITCHES_API_URL = 'https://carbonmod.gg/redist/metadata/carbon/switches.json'
export const CONVARS_API_URL = 'https://carbonmod.gg/redist/metadata/carbon/convars.json'
export const RUST_CONVARS_API_URL = 'https://carbonmod.gg/redist/metadata/rust/convars.json'
export const RUST_COMMANDS_API_URL = 'https://carbonmod.gg/redist/metadata/rust/commands.json'
export const ITEM_IMAGE_SERVER = 'https://carbonmod.gg/assets/media/items'
export const MISSING_IMAGE_URL = 'https://carbonmod.gg/assets/media/missing.jpg'
export const CACHE_VERSION_API_URL = 'https://carbonmod.gg/version/?id=docs'

// Cache configuration
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours
const CACHE_PREFIX = 'carbon_docs_cache_'
const VERSION_CACHE_KEY = CACHE_PREFIX + 'version'

// Helper functions for localStorage cache
const getCacheKey = (url: string) => CACHE_PREFIX + btoa(url)

const checkVersion = async () => {
  try {
    const response = await fetch(CACHE_VERSION_API_URL)
    if (!response.ok) return null
    const version = await response.text()
    const cachedVersion = localStorage.getItem(VERSION_CACHE_KEY)
    
    if (cachedVersion !== version) {
      // Clear all cached data
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key))
      // Store new version
      localStorage.setItem(VERSION_CACHE_KEY, version)
      return false
    }
    return true
  } catch (error) {
    console.warn('Error checking version:', error)
    return true // Keep cache if version check fails
  }
}

const getFromCache = async (url: string) => {
  try {
    // Check version first
    const isVersionValid = await checkVersion()
    if (!isVersionValid) return null

    const key = getCacheKey(url)
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }
    return data
  } catch (error) {
    console.warn('Error reading from cache:', error)
    return null
  }
}

const setCache = (url: string, data: any) => {
  try {
    const key = getCacheKey(url)
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.warn('Error writing to cache:', error)
  }
}

// Legacy constant for backward compatibility
export const GAME_DATA_FOLDER = 'https://carbonmod.gg/redist/metadata/rust'

export enum ItemFlag {
  NoDropping = 1,
  NotStraightToBelt = 2,
  NotAllowedInBelt = 4,
  Backpack = 8,
}

export enum ItemCategory {
  Weapon = 0,
  Construction = 1,
  Items = 2,
  Resources = 3,
  Attire = 4,
  Tool = 5,
  Medical = 6,
  Food = 7,
  Ammunition = 8,
  Traps = 9,
  Misc = 10,
  All = 11,
  Common = 12,
  Component = 13,
  Search = 14,
  Favourite = 15,
  Electrical = 16,
  Fun = 17,
}

export enum ItemRarity {
  Common = 1,
  Uncommon = 2,
  Rare = 3,
  VeryRare = 4,
}

export enum SpawnType {
  GENERIC = 0,
  PLAYER = 1,
  TOWN = 2,
  AIRDROP = 3,
  CRASHSITE = 4,
  ROADSIDE = 5,
}

export enum HookFlags {
  Static = 1,
  Patch = 2,
  Hidden = 4,
  IgnoreChecksum = 8,
  MetadataOnly = 16,
}

// Helper functions
export const getItemFlagText = (flag: number): string[] => {
  const flags: string[] = []
  if (flag & ItemFlag.NoDropping) flags.push('NoDropping')
  if (flag & ItemFlag.NotStraightToBelt) flags.push('NotStraightToBelt')
  if (flag & ItemFlag.NotAllowedInBelt) flags.push('NotAllowedInBelt')
  if (flag & ItemFlag.Backpack) flags.push('Backpack')
  return flags
}

export const getItemCategoryText = (category: ItemCategory): string => {
  return ItemCategory[category]
}

export const getItemRarityText = (rarity: ItemRarity): string => {
  return ItemRarity[rarity]
}

export const getSpawnTypeText = (type: SpawnType): string => {
  return SpawnType[type]
}

export const getHookFlagsText = (flags: number): string[] => {
  const flagTexts: string[] = []
  if (flags & HookFlags.Static) flagTexts.push('Static')
  if (flags & HookFlags.Patch) flagTexts.push('Patch')
  if (flags & HookFlags.Hidden) flagTexts.push('Hidden')
  if (flags & HookFlags.IgnoreChecksum) flagTexts.push('IgnoreChecksum')
  return flagTexts
}

// Color mappings
export const RARITY_COLORS = {
  [ItemRarity.Common]: 'var(--rarity-common)',
  [ItemRarity.Uncommon]: 'var(--rarity-uncommon)',
  [ItemRarity.Rare]: 'var(--rarity-rare)',
  [ItemRarity.VeryRare]: 'var(--rarity-veryrare)',
} as const

export const CATEGORY_COLORS = {
  [ItemCategory.Weapon]: 'var(--category-weapon)',
  [ItemCategory.Construction]: 'var(--category-construction)',
  [ItemCategory.Items]: 'var(--category-items)',
  [ItemCategory.Resources]: 'var(--category-resources)',
  [ItemCategory.Attire]: 'var(--category-attire)',
  [ItemCategory.Tool]: 'var(--category-tool)',
  [ItemCategory.Medical]: 'var(--category-medical)',
  [ItemCategory.Food]: 'var(--category-food)',
  [ItemCategory.Ammunition]: 'var(--category-ammunition)',
  [ItemCategory.Traps]: 'var(--category-traps)',
  [ItemCategory.Misc]: 'var(--category-misc)',
  [ItemCategory.All]: 'var(--category-all)',
  [ItemCategory.Common]: 'var(--category-common)',
  [ItemCategory.Component]: 'var(--category-component)',
  [ItemCategory.Search]: 'var(--category-search)',
  [ItemCategory.Favourite]: 'var(--category-favourite)',
  [ItemCategory.Electrical]: 'var(--category-electrical)',
  [ItemCategory.Fun]: 'var(--category-fun)',
} as const

export const getGameData = async (url: string) => {
  try {
    // Check localStorage cache first
    const cached = await getFromCache(url)
    if (cached) {
      return cached
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`)
    }
    const data = await response.json()
    
    // Cache the response in localStorage
    try {
      setCache(url, data)
    } catch (cacheError) {
      console.warn('Failed to cache data:', cacheError)
    }
    
    return data
  } catch (error) {
    console.error('Error fetching data:', error)
    // Try to get cached data even if it's expired
    try {
      const key = getCacheKey(url)
      const cached = localStorage.getItem(key)
      if (cached) {
        const { data } = JSON.parse(cached)
        return data
      }
    } catch (cacheError) {
      console.warn('Failed to get expired cache:', cacheError)
    }
    throw error
  }
}

// need to use item shortname to get the image ex: https://carbonmod.gg/assets/media/items/hat.wolf.png
export const getImage = async (image: string) => {
  try {
    const response = await fetch(`${ITEM_IMAGE_SERVER}/${image}`)
    if (!response.ok) {
      return MISSING_IMAGE_URL
    }
    return response.blob()
  } catch (error) {
    console.error('Error fetching image:', error)
    return MISSING_IMAGE_URL
  }
}




