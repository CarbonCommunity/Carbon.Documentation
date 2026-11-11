import { defineLoader } from 'vitepress'
import { type Switch, fetchSwitches } from '../api/metadata/carbon/switches'

declare const data: Switch[]
export { data }

export default defineLoader({
  async load(): Promise<Switch[]> {
    const { data } = await fetchSwitches()
    return data.slice(0, 40)
  },
})
