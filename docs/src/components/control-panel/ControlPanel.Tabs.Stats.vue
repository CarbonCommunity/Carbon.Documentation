<script lang="ts" setup>
import { BinaryWriter } from '@/utils/BinaryWriter'
import { selectedServer } from './ControlPanel.SaveLoad'
import { BinaryReader } from '@/utils/BinaryReader'


</script>

<template>
  <table tabindex="0" class="w-full border-collapse text-sm text-slate-300 overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.3)] backdrop-blur-sm">
    <thead class="bg-slate-800/70 text-slate-200 text-xs uppercase tracking-wider">
      <tr>
        <th class="px-3 py-2 text-left">Stat</th>
        <th class="px-3 py-2 text-right">Bytes</th>
        <th class="px-3 py-2 text-left">Packets</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="px-3 py-2">
          Sent (Global)
        </td>
        <td class="px-3 py-2 text-xs text-slate-400 text-right">
          {{ BinaryWriter.totalWrite.toLocaleString() }} B ({{ selectedServer?.formatBytes(BinaryWriter.totalWrite) }})
        </td>
        <td class="px-3 py-2 text-xs text-slate-400 text-left">
          {{ BinaryWriter.totalSent.toLocaleString() }}
        </td>
      </tr>
      <tr>
        <td class="px-3 py-2">
          Received (Global)
        </td>
        <td class="px-3 py-2 text-xs text-slate-400 text-right">
          {{ BinaryReader.totalRead.toLocaleString() }} B ({{ selectedServer?.formatBytes(BinaryReader.totalRead) }})
        </td>
        <td class="px-3 py-2 text-xs text-slate-400 text-left">
          {{ BinaryReader.totalReceived.toLocaleString() }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
