import { CACHE_TIME_ITEM_TTL, URL_METDAT_RUST_COMMANDS } from '../../constants'
import { fetchApiCaching } from '../../fetch-api'

// fix naming issues with first letter being uppercase
export interface CommandRust {
  Name: string
  Help: string
  ServerUser: boolean
  Client: boolean
  Server: boolean
}

export type CommandsRustData = CommandRust[]

export async function fetchCommandsRust() {
  const url = URL_METDAT_RUST_COMMANDS

  const { data, isFromCache } = await fetchApiCaching<CommandsRustData>(url, CACHE_TIME_ITEM_TTL)

  return { data, isFromCache }
}
