import { BinaryReader } from '@/utils/BinaryReader';
import { ref } from 'vue';
import pako from 'pako'

export const currentProfile = ref<Profile | null>(null)
export function loadProfile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result) {
      const unzipped = pako.ungzip(e.target.result as ArrayBuffer)
      const reader = new BinaryReader(unzipped.buffer);
      const profile = load(reader)
      currentProfile.value = profile      
      console.log(profile)
    }
  }
  reader.readAsArrayBuffer(file);
}

export function load(reader: BinaryReader) : Profile | null {
  const profile = new Profile()
  profile.Protocol = reader.uint32()
  profile.Duration = reader.double()
  profile.IsCompared = reader.bool()
  profile.Comparison.Duration = reader.int32()

  const assemblyLength = reader.int32()
  console.log(`Assemblies found: ${assemblyLength}`)
  for (let i = 0; i < assemblyLength; i++) {
    const record = {} as Assembly
    record.TotalTime = reader.uint64()
    profile.Assemblies.push(record)
  }

  return profile
}

export class Profile {
  Protocol = 0
  Duration = 0
  IsCompared = false
  Comparison = { 
    Duration: 0
  } as Comparison
  Assemblies: Assembly[] = []
}

export class Comparison {
  Duration = 0
}

export class Assembly {
  TotalTime: bigint = 0n
  TotalTimePercentage = 0
  TotalExceptions = 0
  Calls = 0
  Alloc = 0
  Comparison = {} as Comparison
}
