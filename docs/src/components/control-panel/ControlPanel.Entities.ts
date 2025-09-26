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
  selectedServer.value.sendRpc("EntityDetails", netId)
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
  selectedServer.value.sendRpc("EntitySave", `"${JSON.stringify(selectedEntity.value)}"`)
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