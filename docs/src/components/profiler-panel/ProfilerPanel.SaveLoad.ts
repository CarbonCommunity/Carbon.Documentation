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
  for (let i = 0; i < assemblyLength; i++) {
    const record = {} as Assembly
    record.TotalTime = reader.uint64()
    record.TotalTimePercentage = reader.double()
    record.TotalExceptions = reader.uint64()
    record.Calls = reader.uint64()
    record.Alloc = reader.uint64()
    record.Name = {
      Name: reader.bstring(),
      DisplayName: reader.bstring(),
      DisplayNameNonIncrement: reader.bstring(),
      ProfileType: reader.int32() as ProfileTypes
    } as AssemblyName
    record.Comparison = {
      IsCompared: reader.bool(),
      TotalTime: reader.int32() as Difference,
      TotalExceptions: reader.int32() as Difference,
      Calls: reader.int32() as Difference,
      Alloc: reader.int32() as Difference
    }
    profile.Assemblies.push(record)
    profile.AssemblyNames.push(record.Name)
  }

  const callsLength = reader.int32()
  for (let i = 0; i < callsLength; i++) {
    const record = {} as Call
    record.TotalTime = reader.uint64()
    record.TotalTimePercentage = reader.double()
    record.OwnTime = reader.uint64()
    record.OwnTimePercentage = reader.double()
    record.Calls = reader.uint64()
    record.TotalAlloc = reader.uint64()
    record.OwnAlloc = reader.uint64()
    record.TotalExceptions = reader.uint64()
    record.OwnExceptions = reader.uint64()
    record.MethodName = reader.bstring()
    record.AssemblyName = profile.AssemblyNames[reader.int32()]
    record.Comparison = {
      IsCompared: reader.bool(),
      TotalTime: reader.int32(),
      OwnTime: reader.int32(),
      Calls: reader.int32(),
      TotalAlloc: reader.int32(),
      OwnAlloc: reader.int32(),
      TotalExceptions: reader.int32(),
      OwnExceptions: reader.int32()
    }
    profile.Calls.push(record)
  }

  return profile
}

export class Profile {
  Protocol: number = 0
  Duration: number = 0
  IsCompared: boolean = false
  Comparison: ProfileSampleComparison = { 
    Duration: Difference.None
  }
  Assemblies: Assembly[] = []
  AssemblyNames: AssemblyName[] = []
  Calls: Call[] = []
}

export class ProfileSampleComparison {
    Duration: Difference = Difference.None
  }

export class Assembly {
  TotalTime: bigint = 0n
  TotalTimePercentage: number = 0
  TotalExceptions: bigint = 0n
  Calls: bigint = 0n
  Alloc: bigint = 0n
  Name: AssemblyName | null = null
  Comparison = new AssemblyComparison()
}

export class AssemblyComparison {
  IsCompared: boolean = false
  TotalTime: Difference = Difference.None
  TotalExceptions: Difference = Difference.None
  Calls: Difference = Difference.None
  Alloc: Difference = Difference.None
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

export class Call {
  TotalTime: bigint = 0n
  TotalTimePercentage: number = 0
  OwnTime: bigint = 0n
  OwnTimePercentage: number = 0
  Calls: bigint = 0n
  TotalAlloc: bigint = 0n
  OwnAlloc: bigint = 0n
  TotalExceptions: bigint = 0n
  OwnExceptions: bigint = 0n
  MethodName: string = ''
  AssemblyName: AssemblyName | null = null
  Comparison = new CallComparison()
}

export class CallComparison {
  IsCompared: boolean = false
  TotalTime: Difference = Difference.None
  OwnTime: Difference = Difference.None
  Calls: Difference = Difference.None
  TotalAlloc: Difference = Difference.None
  OwnAlloc: Difference = Difference.None
  TotalExceptions: Difference = Difference.None
  OwnExceptions: Difference = Difference.None
}

export enum ProfileTypes {
  Assembly = 0,
  Plugin = 1,
  Module = 2,
  Extension = 3,
  Harmony = 4
}

export enum Difference {
  None = 0,
  ValueHigher = 1,
  ValueEqual = 2,
  ValueLower = 3
}
