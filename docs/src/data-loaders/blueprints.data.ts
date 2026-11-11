import { defineLoader } from 'vitepress'
import { Blueprint, fetchBlueprints } from '../api/metadata/rust/blueprints'

declare const data: Blueprint[]
export { data }

export default defineLoader({
  async load(): Promise<Blueprint[]> {
    const { data } = await fetchBlueprints()
    return data.slice(0, 20)
  },
})
