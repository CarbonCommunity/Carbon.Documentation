import { ref } from 'vue'
import { selectedServer, addPopup } from './ControlPanel.SaveLoad'

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

export const onInventoryUpdate = ref<any | null>(null)

export async function showInventory(playerId: number, displayName: string) {
  clearInventory()
  activeInventory.value = playerId
  const props = { title: 'Player Inventory', subtitle: 'Modify ' + displayName + '\'s inventory in real time, or give them items.', userId: playerId, onClosed: hideInventory, isLoading: ref<boolean>(true) }
  onInventoryUpdate.value = () => {
    props.isLoading.value = false
  }
  addPopup((await import(`@/components/control-panel/ControlPanel.Popup.PlayerInventory.vue`)).default, props)
  selectedServer.value?.fetchInventory(playerId)

  const looper = () => {
    if(selectedServer.value == null) {
      return
    }
    if (!(selectedServer.value.PlayerInfo.concat(selectedServer.value.SleeperInfo)).find((player: any) => player.SteamID == playerId)) {
      hideInventory()
      return
    }
    selectedServer.value?.fetchInventory(playerId)
  }
  timerInvRefresh = setInterval(looper, 1000);
}

export function hideInventory() {
  if (activeInventory.value != 0) {
    activeInventory.value = 0
    console.log("work")
    clearTimeout(timerInvRefresh)
  }
}

export function handleDrag(slot: Slot) {
  draggedSlot.value = slot
}

export function handleDrop(slot: Slot) {
  selectedServer.value?.sendCall("MoveInventoryItem", activeInventory.value, draggedSlot.value?.Container, draggedSlot.value?.Position, slot.Container, slot.Position)
  selectedServer.value?.fetchInventory(activeInventory.value)
  draggedSlot.value = null
}
