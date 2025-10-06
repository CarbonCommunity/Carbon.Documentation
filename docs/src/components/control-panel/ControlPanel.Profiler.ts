import { ref } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'

export const files = ref<ProfileFile[]>([])


export class ProfileFile {
  FilePath: string = ''
  FileName: string = ''
  Size: bigint = 0n
  LastWriteTime: number = 0
}

export function clearFiles() {
  files.value.every(_ => files.value.shift())
}

export function loadProfile(profile: ProfileFile) {
  selectedServer.value?.sendCall('ProfilesLoad', profile.FilePath)
}

export function u8ToBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
