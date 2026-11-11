import { defineLoader } from 'vitepress'
import { ConVarCarbon, fetchConVarsCarbon } from '../api/metadata/carbon/convars'

declare const data: ConVarCarbon[]
export { data }

export default defineLoader({
  async load(): Promise<ConVarCarbon[]> {
    const { data } = await fetchConVarsCarbon()
    return data.slice(0, 40)
  },
})
