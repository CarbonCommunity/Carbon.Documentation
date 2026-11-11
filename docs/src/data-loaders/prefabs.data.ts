import { defineLoader } from 'vitepress'
import { Prefab, fetchPrefabs } from '../api/metadata/rust/prefabs'

declare const data: Prefab[]
export { data }

export default defineLoader({
  async load(): Promise<Prefab[]> {
    const { data } = await fetchPrefabs()
    return data.slice(0, 40)
  },
})
