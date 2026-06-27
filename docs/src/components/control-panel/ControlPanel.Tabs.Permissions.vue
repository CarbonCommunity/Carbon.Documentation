<script lang="ts" setup>
import { Loader2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'

onMounted(() => {
  refreshPermissions()
})

function searchUser() {
  selectedServer.value?.sendCall("SearchUsers", userSearch.value)
}
function selectUser(value: string | null, forceSelect: boolean = true) {
  if (!forceSelect && selectedUser.value == value) {
    selectedUser.value = null
    selectHookable(null)
    return
  }
  selectedGroup.value = null
  selectedUser.value = value
  selectedServer.value.sendCall("GetUserMetadata", value.SteamId)
  console.log("sent")
}
function toggleUserGroup(value: string) {
  if(selectedServer.value == null || selectedUser.value == null ) {
    return
  }
  selectedServer.value.sendCall("ToggleUserGroup", selectedUser.value.SteamId, value)
  selectedServer.value.sendCall("GetUserMetadata", selectedUser.value.SteamId)
}
function toggleUserPermission(value: string) {
  if(selectedServer.value == null || selectedUser.value == null ) {
    return
  }
  selectedServer.value.sendCall("ToggleUserPermission", selectedUser.value.SteamId, value)
  selectedServer.value.sendCall("GetUserMetadata", selectedUser.value.SteamId)
}
function selectGroup(value: string | null, forceSelect: boolean = true) {
  if (!forceSelect && selectedGroup.value == value) {
    selectedGroup.value = null
    selectHookable(null)
    return
  }
  selectedUser.value = null
  selectedGroup.value = value
  selectedServer.value.sendCall("GetGroupPermissions", value)
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
      selectedServer.value.sendCall("TogglePermission", selectedGroup.value, value, selectedHookable.value.Plugin?.Name ?? selectedHookable.value.Module?.Name)
      selectGroup(selectedGroup.value)
    }
    return
  }

  selectedServer.value.sendCall("TogglePermission", selectedGroup.value, value, selectedHookable.value.Plugin?.Name ?? selectedHookable.value.Module?.Name)
  selectGroup(selectedGroup.value)
}
</script>

<script lang="ts">
const userInfo = ref()
const groupInfo = ref()
const groupPermInfo = ref<string[]>()
const selectedUser = ref<string | null>('')
const selectedGroup = ref<string | null>('')
const selectedHookable = ref()
const userSearch = ref<string>('')
const permissionSearch = ref<string>('')

export function refreshPermissions() {
  if (!selectedServer.value) {
    return
  }

  selectedUser.value = null
  selectedGroup.value = null
  selectedHookable.value = null
  groupInfo.value = null
  userInfo.value = null

  selectedServer.value?.setRpc('GetPermissionsMetadata', (read: any) => {
    groupInfo.value = {
      Groups: [],
      Permissions: [],
      Plugins: [],
      Modules: []
    }
    const groupCount = read.int32()
    for (let i = 0; i < groupCount; i++) {
      groupInfo.value.Groups.push(read.string())
    }
    const permissionsCount = read.int32()
    for (let i = 0; i < permissionsCount; i++) {
      groupInfo.value.Permissions.push(read.string())
    }
    const pluginCount = read.int32()
    for (let i = 0; i < pluginCount; i++) {
      const plugin = {
        Name: read.string(),
        Author: read.string()
      }
      const permissions = []
      const permissionCount = read.int32()
      for (let p = 0; p < permissionCount; p++) {
        permissions.push(read.string())
      }
      groupInfo.value.Plugins.push({
        Plugin: plugin,
        Permissions: permissions
      })
    }
    const moduleCount = read.int32()
    for (let i = 0; i < moduleCount; i++) {
      const module = {
        Name: read.string(),
        Author: read.string()
      }
      const permissions = []
      const permissionCount = read.int32()
      for (let p = 0; p < permissionCount; p++) {
        permissions.push(read.string())
      }
      groupInfo.value.Modules.push({
        Module: module,
        Permissions: permissions
      })
    }
  })
  selectedServer.value?.setRpc('SearchUsers', (read: any) => {
    userInfo.value = {
      Users: []
    }
    let containsSelectedUser = false
    const userCount = read.int32()
    for (let i = 0; i < userCount; i++) {
      const user = {
        DisplayName: read.string(),
        SteamId: read.string(),
      }
      userInfo.value.Users.push(user)
      if(selectedUser.value?.SteamId == user.SteamId) {
        containsSelectedUser = true
      }
    }
    if(!containsSelectedUser) {
      selectedUser.value = null
    }
  })
  selectedServer.value?.setRpc('GetGroupPermissions', (read: any) => {
    groupPermInfo.value = []
    const permissionCount = read.int32()
    for (let i = 0; i < permissionCount; i++) {
      groupPermInfo.value.push(read.string())
    }
  })
  selectedServer.value?.setRpc('GetUserMetadata', (read: any) => {
    const steamId = read.string()
    if(selectedUser.value == null || selectedUser.value.SteamId != steamId) {
      return
    }
    selectedUser.value.Permissions = []
    const permissionCount = read.int32()
    for (let i = 0; i < permissionCount; i++) {
      selectedUser.value.Permissions.push(read.string())
    }
    const groupCount = read.int32()
    selectedUser.value.Groups = []
    for (let i = 0; i < groupCount; i++) {
      selectedUser.value.Groups.push(read.string())
    }
    console.log('User Metadata:', selectedUser.value)
  })
  selectedServer.value?.sendCall("GetPermissionsMetadata")
}
</script>

<template>
  <div class="table-stack text-center">
    <table>
      <thead>
        <tr>
          <th class="vp-doc th">Users ({{ userInfo?.Users.length ?? 0 }})</th>
        </tr>
      </thead>
      <tr>
        <td>
          <input type="text" v-model="userSearch" @keyup.enter="searchUser()" placeholder="Search user..."
            class="w-64 px-3 py-1.5 bg-slate-800/40 border border-slate-700/60
                  text-sm text-slate-200 placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
                  transition-all duration-200 hover:bg-slate-700/50 shadow-inner"/>
        </td>
      </tr>
      <tr class="select-none" v-if="userInfo == null || userInfo.Users == null || userInfo.Users.length == 0">
        <td colspan="1" class="text-sm text-slate-600 pt-2">Start typing to search</td>
      </tr>
      <tr>
        <td v-for="user in userInfo?.Users" :key="user.SteamId" class="vp-doc td">
          <button class="r-send-button justify-self-center" :class="'r-send-button ' + (user.SteamId == selectedUser?.SteamId ? 'toggled' : null)" @click="selectUser(user, false)">
            <span class="text-neutral-400">{{ user.DisplayName }}</span>
          </button>
        </td>
      </tr>
      <Loader2 v-if="userInfo != null && userInfo.Users == null" class="flex animate-spin text-xs text-slate-500" :size="20" />
    </table>

    <table v-if="selectedUser == null">
      <thead>
        <tr>
          <th class="vp-doc th">Groups</th>
        </tr>
      </thead>
      <tr v-for="group in groupInfo?.Groups" :key="group">
        <td class="vp-doc td">
          <button class="r-send-button justify-self-center" :class="'r-send-button ' + (group == selectedGroup ? 'toggled' : null)" @click="selectGroup(group, false)">
            <span class="text-neutral-400">{{ group }}</span>
          </button>
        </td>
      </tr>
      <Loader2 v-if="groupInfo == null || groupInfo?.Groups.length == 0" class="flex animate-spin text-xs text-slate-500" :size="20" />
    </table>

    <table v-if="selectedUser != null">
      <thead>
        <tr>
          <th class="vp-doc th">Groups</th>
        </tr>
      </thead>
      <tr v-for="group in groupInfo?.Groups" :key="group">
        <td class="vp-doc td">
          <button class="r-send-button justify-self-center" :class="'r-send-button ' + (selectedUser.Groups.includes(group) ? 'toggled' : null)" @click="toggleUserGroup(group)">
            <span class="text-neutral-400">{{ group }}</span>
          </button>
        </td>
      </tr>
      <Loader2 v-if="selectedUser == null || selectedUser?.Groups == null" class="flex animate-spin text-xs text-slate-500" :size="20" />
    </table>

    <table v-if="selectedUser != null">
      <thead>
        <tr>
          <th class="vp-doc th">Permissions</th>
        </tr>
      </thead>
      <tr>
        <td>
          <input type="text" v-model="permissionSearch" placeholder="Search permission..."
                class="w-64 px-3 py-1.5 bg-slate-800/40 border border-slate-700/60
                text-sm text-slate-200 placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
                transition-all duration-200 hover:bg-slate-700/50 shadow-inner"/>
        </td>
      </tr>
      <tr v-for="permission in groupInfo?.Permissions" :key="permission">
        <td v-if="permissionSearch != '' && permission.includes(permissionSearch)" class="vp-doc td">
          <button class="r-send-button justify-self-center" :class="'r-send-button ' + (selectedUser.Permissions.includes(permission) ? 'toggled' : null)" @click="toggleUserPermission(permission)">
            <span class="text-neutral-400">{{ permission }}</span>
          </button>
        </td>
      </tr>
      <tr class="select-none" v-if="permissionSearch == ''">
        <td colspan="1" class="text-sm text-slate-600 pt-2">Start typing to search</td>
      </tr>
    </table>

    <table v-if="selectedGroup && selectedUser == null">
      <thead>
        <tr>
          <th class="vp-doc th">Plugins</th>
        </tr>
      </thead>
      <tr v-for="plugin in groupInfo?.Plugins" :key="plugin.Plugin.Name">
        <td class="vp-doc td">
          <button class="r-send-button justify-self-center" :class="'r-send-button ' + (plugin == selectedHookable ? 'toggled' : null)" @click="selectHookable(plugin)">
            <span class="text-neutral-400">{{ plugin.Plugin.Name }}</span>
          </button>
        </td>
      </tr>
      <tr>
        <th class="vp-doc th pt-5">Modules</th>
      </tr>
      <tr v-for="module in groupInfo?.Modules" :key="module.Module.Name">
        <td class="vp-doc td">
          <button class="r-send-button justify-self-center" :class="'r-send-button ' + (module == selectedHookable ? 'toggled' : null)" @click="selectHookable(module)">
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
            <button class="r-send-button justify-self-center" @click="togglePermission('grantall')"><span class="text-neutral-400">Grant All</span></button>
            <button class="r-send-button justify-self-center" @click="togglePermission('revokeall')"><span class="text-neutral-400">Revoke All</span></button>
          </span>
        </td>
      </tr>
      <tr v-for="permission in selectedHookable.Permissions" :key="permission">
        <td class="vp-doc td content-center">
          <button :class="[ 'r-send-button justify-self-center', (groupHasPermission(permission) ? 'toggled' : null) ]" @click="togglePermission(permission)">
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
