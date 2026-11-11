import { defineLoader } from 'vitepress'
import { Entity, fetchEntities } from '../api/metadata/rust/entities'

declare const data: Entity[]
export { data }

export default defineLoader({
  async load(): Promise<Entity[]> {
    const { data } = await fetchEntities()
    return data.slice(0, 40)
  },
})
