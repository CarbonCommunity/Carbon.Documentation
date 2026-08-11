import type MiniSearch from 'minisearch'
import { shallowRef } from 'vue'

export const store = {
  searchValue: shallowRef(''),
  miniSearch: shallowRef<MiniSearch | null>(null),
  useBasicSearch: shallowRef<boolean>(false),
  chosenCategory: shallowRef('All'),
  showOxideHooks: shallowRef(true),
  showCarbonHooks: shallowRef(true),
}
