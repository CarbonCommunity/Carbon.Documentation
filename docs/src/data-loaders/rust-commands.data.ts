import { defineLoader } from 'vitepress'
import { CommandRust, fetchCommandsRust } from '../api/metadata/rust/commands'

declare const data: CommandRust[]
export { data }

export default defineLoader({
  async load(): Promise<CommandRust[]> {
    const { data } = await fetchCommandsRust()
    return data.slice(0, 60)
  },
})
