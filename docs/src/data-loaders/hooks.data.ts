import { defineLoader } from 'vitepress'
import { fetchHooks, Hook } from '../api/metadata/carbon/hooks'

declare const data: Hook[]
export { data }

export default defineLoader({
  async load(): Promise<Hook[]> {
    const { data: hooks } = await fetchHooks()

    const flatHooks: Hook[] = []
    hooks.forEach((hooks) => {
      flatHooks.push(...hooks)
    })

    return flatHooks.slice(0, 25)
  },
})
