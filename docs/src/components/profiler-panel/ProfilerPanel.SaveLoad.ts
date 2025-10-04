import { BinaryReader } from '@/utils/BinaryReader';
import { ref } from 'vue';

export const currentProfile = ref<BinaryReader | null>(null);
export function doTest(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result) {
      currentProfile.value = new BinaryReader(e.target.result as ArrayBuffer);
    }
  }
  reader.readAsArrayBuffer(file);
}
