import { ref } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'

export const activeSlot = ref(0)
export const activeInventory = ref(0)
export const mainSlots = ref<Slot[]>([])
export const beltSlots = ref<Slot[]>([])
export const wearSlots = ref<Slot[]>([])
export const toolSlots = ref<Slot[]>([])
export const draggedSlot = ref<Slot | null>()

let timerInvRefresh: ReturnType<typeof setTimeout> = null!

export class Slot {
  Position: number = 0
  ItemId: number = 0
  ShortName: string = ''
  MaxCondition: number = 0
  Condition: number = 0
  ConditionNormalized: number = 0
  HasCondition: boolean = false
  Amount: number = 0
  Container: number = 0

  clear() {
    this.ItemId = 0
    this.ShortName = ''
    this.MaxCondition = 0
    this.Condition = 0
    this.ConditionNormalized = 0
    this.HasCondition = false
    this.Amount = 0
  }
  hasItem() {
    return this.ShortName != ''
  }
}

export function clearInventory() {
  activeSlot.value = -1
  mainSlots.value.forEach((slot) => {
    slot.clear()
  })
  beltSlots.value.forEach((slot) => {
    slot.clear()
  })
  wearSlots.value.forEach((slot) => {
    slot.clear()
  })
}

export function showInventory(playerId: number) {
  clearInventory()
  activeInventory.value = playerId
  selectedServer.value.fetchInventory(playerId)

  const looper = () => {
    if (!selectedServer.value.PlayerInfo.find((player) => player.SteamID == playerId)) {
      hideInventory()
      return
    }

    timerInvRefresh = setTimeout(looper, 1000)
    selectedServer.value.fetchInventory(playerId)
  }
  timerInvRefresh = setTimeout(looper, 1000)
}

export function hideInventory() {
  if (activeInventory.value != 0) {
    activeInventory.value = 0
    clearTimeout(timerInvRefresh)
  }
}

export function handleDrag(slot: Slot) {
  draggedSlot.value = slot
}

export function handleDrop(slot: Slot) {
  selectedServer.value.sendRpc("MoveInventoryItem", activeInventory.value, draggedSlot.value?.Container, draggedSlot.value?.Position, slot.Container, slot.Position)
  selectedServer.value.fetchInventory(activeInventory.value)
  draggedSlot.value = null
}
