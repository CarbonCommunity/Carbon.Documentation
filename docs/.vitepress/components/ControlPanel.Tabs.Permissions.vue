<script lang="ts" setup>
import { Loader2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'

onMounted(() => {
  refreshPermissions()
})

function selectGroup(value: string | null, forceSelect: boolean = true) {
  if (!forceSelect && selectedGroup.value == value) {
    selectedGroup.value = null
    selectHookable(null)
    return
  }
  selectedGroup.value = value
  selectedServer.value.sendRpc(631493895, value)
}
function selectHookable(value: string | null) {
  selectedHookable.value = value
}
function groupHasPermission(value: string): boolean {
  if (groupPermInfo.value == null) {
    return false
  }
  return groupPermInfo.value.includes(value)
}
function togglePermission(value: string) {
  if (value == 'grantall' || value == 'revokeall') {
    const confirm = window.confirm(`Are you sure?`)
    if (confirm) {
      selectedServer.value.sendRpc(3261363143, selectedGroup.value, value, selectedHookable.value.Plugin?.Name ?? selectedHookable.value.Module?.Name)
      selectGroup(selectedGroup.value)
    }
    return
  }

  selectedServer.value.sendRpc(3261363143, selectedGroup.value, value, selectedHookable.value.Plugin?.Name ?? selectedHookable.value.Module?.Name)
  selectGroup(selectedGroup.value)
}
</script>

<script lang="ts">
const groupInfo = ref()
const groupPermInfo = ref<string[]>()
const selectedGroup = ref<string | null>('')
const selectedHookable = ref()

export function refreshPermissions() {
  if (!selectedServer.value) {
    return
  }

  selectedGroup.value = null
  selectedHookable.value = null
  groupInfo.value = null

  // GetPermissionsMetadata
  selectedServer.value.Rpcs[1317317511] = (data: any) => {
    groupInfo.value = data.Value
  }
  // GetGroupPermissions
  selectedServer.value.Rpcs[631493895] = (data: any) => {
    groupPermInfo.value = data.Value.Permissions
  }
  selectedServer.value.sendRpc(1317317511)
}
</script>

<template>
  <div class="table-stack text-center">
    <table>
      <thead>
        <tr>
          <th class="vp-doc th">Groups</th>
        </tr>
      </thead>
      <tr v-for="group in groupInfo?.Groups" :key="group">
        <td class="vp-doc td">
          <button class="r-send-button" :class="'r-send-button ' + (group == selectedGroup ? 'toggled' : null)" @click="selectGroup(group, false)">
            <span class="text-neutral-400">{{ group }}</span>
          </button>
        </td>
      </tr>
      <Loader2 v-if="groupInfo == null || groupInfo?.Groups.length == 0" class="flex animate-spin text-xs text-slate-500" :size="20" />
    </table>
    <table v-if="selectedGroup">
      <thead>
        <tr>
          <th class="vp-doc th">Plugins</th>
        </tr>
      </thead>
      <tr v-for="plugin in groupInfo?.Plugins" :key="plugin.Plugin.Name">
        <td class="vp-doc td">
          <button class="r-send-button" :class="'r-send-button ' + (plugin == selectedHookable ? 'toggled' : null)" @click="selectHookable(plugin)">
            <span class="text-neutral-400">{{ plugin.Plugin.Name }}</span>
          </button>
        </td>
      </tr>
      <tr>
        <th class="vp-doc th pt-5">Modules</th>
      </tr>
      <tr v-for="module in groupInfo?.Modules" :key="module.Module.Name">
        <td class="vp-doc td">
          <button class="r-send-button" :class="'r-send-button ' + (module == selectedHookable ? 'toggled' : null)" @click="selectHookable(module)">
            <span class="text-neutral-400">{{ module.Module.Name }}</span>
          </button>
        </td>
      </tr>
    </table>
    <table v-if="selectedHookable">
      <thead>
        <tr>
          <th class="vp-doc th">Permissions</th>
        </tr>
      </thead>
      <tr>
        <td>
          <span>
            <button class="r-send-button" @click="togglePermission('grantall')"><span class="text-neutral-400">Grant All</span></button>
            <button class="r-send-button" @click="togglePermission('revokeall')"><span class="text-neutral-400">Revoke All</span></button>
          </span>
        </td>
      </tr>
      <tr v-for="permission in selectedHookable.Permissions" :key="permission">
        <td class="vp-doc td content-center">
          <button :class="'r-send-button ' + (groupHasPermission(permission) ? 'toggled' : null)" @click="togglePermission(permission)">
            <span class="text-neutral-400">{{ permission }}</span>
          </button>
        </td>
      </tr>
    </table>
  </div>
</template>

<style>
.table-stack {
  display: ruby;
}
</style>
