import { selectedServer } from './ControlPanel.SaveLoad'

export class ProfileFile {
  FilePath: string = ''
  FileName: string = ''
  Size: bigint = 0n
  LastWriteTime: number = 0
}

export function clearFiles() {
  selectedServer.value?.ProfileFiles.splice(0)
}

export function loadProfile(profile: ProfileFile) {
  selectedServer.value?.sendCall('ProfilesLoad', profile.FilePath)
}

export function toggleProfile(cancel: boolean) {
  selectedServer.value?.sendCall('ProfilesToggle', cancel)
  setInterval(() => {
    selectedServer.value?.sendCall('ProfilesState')
    selectedServer.value?.sendCall('ProfilesList')
  }, 400);
}

export function deleteProfile(profile: ProfileFile) {
  const confirmDelete = window.confirm(`Are you sure you want to delete that profile?`)
  if (confirmDelete) {
    selectedServer.value?.sendCall('ProfilesDelete', profile.FilePath)
    selectedServer.value?.sendCall('ProfilesList')
  }
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
