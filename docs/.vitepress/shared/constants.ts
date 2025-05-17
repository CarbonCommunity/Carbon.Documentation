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
