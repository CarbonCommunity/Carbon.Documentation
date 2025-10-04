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
  Protocol: number = 0
  Duration: number = 0
  IsCompared: boolean = false
  Comparison: Comparison = { 
    Duration: 0
  }
  Assemblies: Assembly[] = []
}

export class Comparison {
  Duration: number = 0
}

export class Assembly {
  TotalTime: bigint = 0n
  TotalTimePercentage: number = 0
  TotalExceptions: number = 0
  Calls: number = 0
  Alloc: number = 0
  Comparison: Comparison = {
    Duration: 0
  }
}

export class AssemblyName {
  Name: string = ''
  DisplayName: string = ''
  DisplayNameNonIncrement: string = ''
  ProfileType: ProfileTypes = ProfileTypes.Assembly

  getDisplayName (isCompared: boolean) : string {
    return isCompared ? this.DisplayNameNonIncrement : this.DisplayName 
  }
}

export enum ProfileTypes {
  Assembly = 0,
  Plugin = 1,
  Module = 2,
  Extension = 3,
  Harmony = 4
}
