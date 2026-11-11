import { defineLoader } from 'vitepress'
import { ConVarRust, fetchConVarsRust } from '../api/metadata/rust/convars'

declare const data: ConVarRust[]
export { data }

export default defineLoader({
  async load(): Promise<ConVarRust[]> {
    const { data } = await fetchConVarsRust()
    return data.slice(0, 60)
  },
})
