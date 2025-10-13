<script lang="ts" setup>
import { command, consoleContainer } from './ControlPanel.Console'
import { selectedServer } from './ControlPanel.SaveLoad'
</script>

<template>
  <div class="r-settings-input-group">
    <span class="r-settings-input-label" style="user-select: none">Host</span>
    <p type="text" class="r-settings-custom-input transparent">{{ selectedServer?.ServerInfo.Hostname }}</p>
  </div>
  <div class="r-settings-input-group">
    <span class="r-settings-input-label" style="user-select: none">Description</span>
    <div type="text" class="r-settings-custom-input transparent" style="white-space: break-spaces" v-html="selectedServer?.getDescription()"></div>
  </div>
  <div style="display: flex">
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Header</span>
      <img v-if="selectedServer?.HeaderImage" :src="selectedServer?.HeaderImage" width="300" />
      <p v-else class="text-xs text-slate-400">No header available</p>
    </div>
  </div>
  <div style="display: flex">
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Players</span>
      <p type="text" class="r-settings-custom-input transparent">
        {{ selectedServer?.ServerInfo.Players }} / {{ selectedServer?.ServerInfo.MaxPlayers }} — {{ selectedServer?.ServerInfo.Queued }} queued,
        {{ selectedServer?.ServerInfo.Joining }} joining
      </p>
    </div>
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Uptime</span>
      <p type="text" class="r-settings-custom-input transparent">{{ selectedServer?.ServerInfo.Uptime.toLocaleString() }} </p>
    </div>
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Performance</span>
      <p type="text" class="r-settings-custom-input transparent">{{ selectedServer?.ServerInfo.Framerate.toLocaleString() }} FPS, </p>
    </div>
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Entities</span>
      <p type="text" class="r-settings-custom-input transparent">{{ selectedServer?.ServerInfo.EntityCount.toLocaleString() }}</p>
    </div>
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Map</span>
      <p type="text" class="r-settings-custom-input transparent">{{ selectedServer?.ServerInfo.Map }}</p>
    </div>
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Version</span>
      <p type="text" class="r-settings-custom-input transparent">{{ selectedServer?.ServerInfo.Protocol }}</p>
    </div>
  </div>
  <div style="display: flex">
    <div class="r-settings-input-group">
      <span class="r-settings-input-label" style="user-select: none">Carbon</span>
      <p type="text" class="r-settings-custom-input transparent">
        {{ selectedServer?.CarbonInfo == null ? 'Not found' : selectedServer?.CarbonInfo.Message.split(' ').slice(0, 2).join(' ') }}
      </p>
    </div>
  </div>
</template>

<style scoped>

</style>
