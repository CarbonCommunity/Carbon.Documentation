import { BinaryReader } from '@/utils/BinaryReader';
import { ref } from 'vue';
import pako from 'pako'

export const currentProfile = ref<BinaryReader | null>(null);
export function loadProfile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader();
  reader.onload = (e) => {
    console.log(e)
    if (e.target?.result) {
      const unzipped = pako.ungzip(e.target.result as ArrayBuffer)
      currentProfile.value = new BinaryReader(unzipped.buffer);
      console.log(`Protocol: ${currentProfile.value.uint32()}`)
    }
  }
  reader.readAsArrayBuffer(file);
}
