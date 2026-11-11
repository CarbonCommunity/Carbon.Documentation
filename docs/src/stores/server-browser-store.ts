import { CompressedTag, RegionTag } from '@/api/misc/server-list'
import MiniSearch from 'minisearch'
import { ref, shallowRef } from 'vue'

export const store = {
  searchValue: shallowRef(''),
  miniSearch: shallowRef<MiniSearch | null>(null),
  useBasicSearch: shallowRef<boolean>(false),
  chosenRegionTags: ref<RegionTag[]>([]),
  chosenCompressedTagsOr: ref<CompressedTag[]>([]),
  chosenCompressedTagsAnd: ref<CompressedTag[]>([]),
  playersRangeMin: shallowRef(0),
  playersRangeMax: shallowRef(-1),
  chosenRustVersions: ref<number[]>([]),
}
