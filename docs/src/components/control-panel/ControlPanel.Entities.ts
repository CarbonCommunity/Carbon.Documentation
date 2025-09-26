import { ref } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'
import { useKeyModifier } from '@vueuse/core'

export const searchMaxCount = ref<number>(50)
export const isSearching = ref<boolean>(false)
export const selectedEntity = ref<any | null>(null)
export const searchInput = ref<string>('')
export const searchedData = ref<any | null>(null)
export const currentSearch = ref<string>('')
export const iconUrl = ref<string>('')
export const isSide = ref<boolean>(false)
export const isShiftPressed = useKeyModifier<boolean>('Shift', { initial: false })

export function resetEntities() {
  isSearching.value = false
  searchedData.value = null
  searchInput.value = ''
  searchedData.value = null
  currentSearch.value = ''
  iconUrl.value = ''
  isSide.value = false
}

export function onSearch() {
  currentSearch.value = searchInput.value
  searchInput.value = ''
  isSearching.value = true

  selectedServer.value.CommandCallbacks[selectedServer.value.getId("SearchEntities")] = (data: any) => {
    isSearching.value = false
    searchedData.value = data.value
    editEntity(selectedEntity.value == null ? 0 : selectedEntity.value.NetId)
  }
  selectedServer.value.RpcCallbacks[selectedServer.value.getId("SearchEntities")] = (read: any) => {
    isSearching.value = false
    searchedData.value = []

    var entities = read.int32()
    for (let i = 0; i < entities; i++) {
      searchedData.value.push({
        NetId: read.uint64(),
        Name: read.string(),
        ShortName: read.string(),
        Id: read.uint32(),
        Flags: read.int32(),
        PosX: read.float(),
        PosY: read.float(),
        PosZ: read.float(),
        RotX: read.float(),
        RotY: read.float(),
        RotZ: read.float()
      })
    }

    console.log(entities)
    editEntity(selectedEntity.value == null ? 0 : selectedEntity.value.NetId)
  }
  selectedServer.value.sendRpc("SearchEntities", searchMaxCount.value, currentSearch.value)
}

export function editEntity(netId: number) {
  if(netId == 0) {
    return
  }

  selectedServer.value.CommandCallbacks[selectedServer.value.getId("EntityDetails")] = (data: any) => {
    selectedEntity.value = data.Value
    isSide.value = true
    refreshIcon()
  }
  selectedServer.value.RpcCallbacks[selectedServer.value.getId("EntityDetails")] = (read: any) => {
    selectedEntity.value = readEntity(read)
    isSide.value = true
    refreshIcon()
    console.log(selectedEntity.value)
  }
  selectedServer.value.sendRpc("EntityDetails", netId)
}

export function readEntity(read: any) {
  const entity = {}
  entity.NetId = read.uint64()
  entity.Name = read.string()
  entity.ShortName = read.string()
  entity.Id = read.uint32()
  entity.Flags = []
  const flagCount = read.int32()
  for (let i = 0; i < flagCount; i++) {
    entity.Flags.push(read.string())
  }
  entity.Type = read.string()
  entity.PosX = read.float()
  entity.PosY = read.float()
  entity.PosZ = read.float()
  entity.RotX = read.float()
  entity.RotY = read.float()
  entity.RotZ = read.float()
  entity.Owner = read.uint64()
  entity.Skin = read.uint64()
  if(read.bool()) {
    entity.Parent = readEntity(read)
  }
  const childCount = read.int32()
  entity.Children = []
  for (let i = 0; i < childCount; i++) {
    entity.Children.push(readEntity(read))
  }
  if(read.bool()) {
    entity.CombatEntity = {
      Health: read.float(),
      MaxHealth: read.float()
    }
  }
  if(read.bool()) {
    entity.PlayerEntity = {
      DisplayName: read.string(),
      UserId: read.uint64(),
      Thirst: read.float(),
      MaxThirst: read.float(),
      Hunger: read.float(),
      MaxHunger: read.float(),
      Rads: read.float(),
      MaxRads: read.float(),
      Bleed: read.float(),
      MaxBleed: read.float(),
    }
  }
  return entity
}

export function killEntity(netId: number) {
  if(netId == 0) {
    return
  }

  if(isShiftPressed.value || window.confirm(`Are you sure you destroy that entity?`)) {
    if(selectedEntity.value != null && selectedEntity.value.NetId == netId) {
      selectedEntity.value = null
    }
    selectedServer.value.sendRpc("EntityKill", netId)
    searchInput.value = currentSearch.value
    onSearch()
  }
}

export function saveEntity() {
  const payload = JSON.stringify(selectedEntity.value, bigintReplacer)
  console.log(payload.length)
  selectedServer.value.sendRpc("EntitySave", payload.length, payload)
}

function bigintReplacer(_key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function empowerPlayer(data: any) {
  data.CombatEntity.Health = data.CombatEntity.MaxHealth
  data.PlayerEntity.Thirst = data.PlayerEntity.MaxThirst
  data.PlayerEntity.Hunger = data.PlayerEntity.MaxHunger
  data.PlayerEntity.Rads = 0
  data.PlayerEntity.Bleed = 0
}

export function stopEditingEntity() {
  selectedEntity.value = null
}

export function refreshIcon() {
  iconUrl.value = `https://cdn.carbonmod.gg/prefabs/${selectedEntity.value.Id}${isSide.value ? '.side' : ''}.png`
}