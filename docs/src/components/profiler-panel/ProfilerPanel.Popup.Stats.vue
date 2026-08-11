<script lang="ts" setup>
import { Profile } from './ProfilerPanel.SaveLoad'

const props = defineProps<{
  profile: Profile
}>()

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}
</script>

<template>
<div>
  <table tabindex="0" class="table-auto w-full">
    <tr>
      <td class="info-title">
        Protocol
      </td>
      <td class="info-value">
        {{ props.profile.Protocol }}
      </td>
    </tr>
    <tr>
      <td class="info-title">
        Duration
      </td>
      <td class="info-value">
        {{ formatDuration(props.profile.Duration) }}
      </td>
    </tr>
    <tr>
      <td class="info-title">
        Is Compared?
      </td>
      <td class="info-value">
        {{ props.profile.IsCompared ? "Yes" : "No" }}
      </td>
    </tr>
    <tr>
      <td class="info-title">
        Assemblies
      </td>
      <td class="info-value">
        {{ props.profile.Assemblies.length.toLocaleString() }}
      </td>
    </tr>
    <tr>
      <td class="info-title">
        Calls
      </td>
      <td class="info-value">
        {{ props.profile.Calls.length.toLocaleString() }}
      </td>
    </tr>
    <tr>
      <td class="info-title">
        Memory
      </td>
      <td class="info-value">
        {{ props.profile.Memory.length.toLocaleString() }}
      </td>
    </tr>
  </table>
</div>
</template>

<style scoped>
.info-title {
  color: rgb(148 163 184 / 0.7);
  background-color: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 8px 16px;
  font-size: 14px;
}

.info-value {
  color: rgb(255 255 255 / 0.7);
  border: 1px solid var(--vp-c-divider);
  padding: 8px 16px;  padding: 8px 16px;
  font-size: 14px;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.2) transparent;
}
</style>
