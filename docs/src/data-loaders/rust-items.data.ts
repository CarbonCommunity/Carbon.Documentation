import { defineLoader } from 'vitepress'
import { Item, fetchItems } from '../api/metadata/rust/items'

declare const data: Item[]
export { data }

export default defineLoader({
  async load(): Promise<Item[]> {
    const { data } = await fetchItems()
    return data.slice(0, 30)
  },
})
