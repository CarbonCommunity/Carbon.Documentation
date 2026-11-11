import { defineLoader } from 'vitepress'
import { type CommandCarbon, fetchCommandsCarbon } from '../api/metadata/carbon/commands'

declare const data: CommandCarbon[]
export { data }

export default defineLoader({
  async load(): Promise<CommandCarbon[]> {
    const { data } = await fetchCommandsCarbon()
    return data.slice(0, 40)
  },
})
