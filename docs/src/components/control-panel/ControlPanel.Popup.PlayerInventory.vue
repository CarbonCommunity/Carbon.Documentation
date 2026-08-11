<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { handleDrop, handleDrag, activeSlot, mainSlots, wearSlots, beltSlots, toolSlots } from './ControlPanel.Inventory'
import { selectedServer } from './ControlPanel.SaveLoad'
import { ArrowUpFromDot, Trash2 } from 'lucide-vue-next'
import { fetchItems } from '@/api/metadata/rust/items'

const selectedItemOption = ref('bleach')
const selectedItemAmount = ref(1)
const selectedItemSearch = ref('')
const itemOptions: any = []
const isOpen = ref<boolean>(false)

onMounted(async () => {
  const { data } = await fetchItems()
  data.forEach(item => {
    itemOptions.push({ 
      value: item.ShortName,
      label: item.DisplayName
    })
  });
})

function giveItem() {
  selectedServer.value?.sendCommand(`inventory.giveto ${props.userId} ${selectedItemOption.value} ${selectedItemAmount.value}`, 1)
}

const filteredOptions = computed(() => {
  const q = selectedItemSearch.value.toLowerCase()
  return itemOptions.filter((opt: any) => opt.value.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q))
})

const props = defineProps<{
  userId: string
}>()
</script>

<template>
  <div class="place-items-center">
    <div class="inventory-grid">
      <div v-for="slot in mainSlots" :key="slot.Position" class="slot" @dragover.prevent @drop="handleDrop(slot)">
        <img v-if="slot.hasItem()" class="slot-img" :src="`https://cdn.carbonmod.gg/items/${slot.ShortName}.png`" draggable="true" @dragstart="handleDrag(slot)" />
        <span v-if="slot.hasItem() && slot.Amount > 1" class="slot-amount">x{{ slot.Amount }}</span>
        <div v-if="slot.hasItem() && slot.HasCondition" class="slot-condition" :style="'height: ' + slot.ConditionNormalized * 100 + '%;'"></div>
      </div>
    </div>
    <div class="inventory-grid-clothing mt-5">
      <div v-for="slot in wearSlots" :key="slot.Position" class="slot" @dragover.prevent @drop="handleDrop(slot)">
        <img v-if="slot.hasItem()" class="slot-img" :src="`https://cdn.carbonmod.gg/items/${slot.ShortName}.png`" draggable="true" @dragstart="handleDrag(slot)" />
        <span v-if="slot.hasItem() && slot.Amount > 1" class="slot-amount">x{{ slot.Amount }}</span>
        <div v-if="slot.hasItem() && slot.HasCondition" class="slot-condition" :style="'height: ' + slot.ConditionNormalized * 100 + '%;'"></div>
      </div>
    </div>
    <div class="inventory-grid mt-5">
      <div v-for="slot in beltSlots" :key="slot.Position" class="slot" @dragover.prevent @drop="handleDrop(slot)">
        <div v-if="activeSlot == slot.Position" class="slot-active"></div>
        <img v-if="slot.hasItem()" class="slot-img" :src="`https://cdn.carbonmod.gg/items/${slot.ShortName}.png`" draggable="true" @dragstart="handleDrag(slot)" />
        <span v-if="slot.hasItem() && slot.Amount > 1" class="slot-amount">x{{ slot.Amount }}</span>
        <div v-if="slot.hasItem() && slot.HasCondition" class="slot-condition" :style="'height: ' + slot.ConditionNormalized * 100 + '%;'"></div>
      </div>
    </div>
    <div :class="'inventory-grid-tools cols-' + (selectedServer?.hasPermission('console_input') ? '5' : '2') +  ' mt-5 items-center justify-center opacity-50'">
      <div v-for="slot in toolSlots" :key="slot.Position" class="slot-tool" @dragover.prevent @drop="handleDrop(slot)">
        <span v-if="slot.Container == 10" class="select-none justify-items-center text-xs opacity-50"><ArrowUpFromDot /> Drop</span>
        <span v-if="slot.Container == 11" class="select-none justify-items-center text-xs opacity-50"><Trash2 /> Discard</span>
      </div>
      <div v-if="selectedServer?.hasPermission('console_input')" class="slot-tool w-52 justify-items-center text-xs">
        <div class="grid">
          <div class="flex">
            <input class="w-6 text-center" v-model="selectedItemAmount"/><span class="content-center">x</span>
            <div class="relative w-full">
              <input
                type="text"
                v-model="selectedItemSearch"
                @focus="isOpen = true"
                @focusout="isOpen = false"
                placeholder="Select an item..."
                class="bg-transparent border rounded px-2 py-1 w-full" />

              <ul v-if="isOpen && filteredOptions?.length" class="absolute mt-1 z-10 w-full max-h-64 overflow-auto border rounded bg-black text-white">
                <li v-for="option in filteredOptions" :key="option.value" @mousedown.prevent="selectedItemSearch = selectedItemOption = option.value; isOpen = false" class="px-2 py-1 hover:bg-gray-700 cursor-pointer">
                  <span class="flex"><img class="w-6" :src="`https://cdn.carbonmod.gg/items/${option.value}.png`"/> <span class="ml-2 content-center">{{ option.label }}</span></span>
                </li>
              </ul>
            </div>
          </div>
          <button class="r-send-button w-full" @click="giveItem()">Give</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(6, 64px);
  grid-gap: 6px;
}

.inventory-grid-clothing {
  display: grid;
  grid-template-columns: repeat(7, 64px);
  grid-gap: 6px;
}
.inventory-grid-tools {
  display: grid;
  grid-template-columns: repeat(5, 64px);
  grid-gap: 6px;
}

.inventory-grid-tools.cols-2 {
  grid-template-columns: repeat(2, 64px);
}
.inventory-grid-tools.cols-5 {
  grid-template-columns: repeat(5, 64px);
}

.slot {
  width: 64px;
  height: 64px;
  background-color: rgba(255, 255, 255, 0.075);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.slot-tool {
  height: 64px;
  background-color: rgba(255, 255, 255, 0.075);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.slot-tool:hover {
  opacity: 100%;
}

.slot-active {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  object-fit: contain;
  position: absolute;
  background-color: #1b5c8b;
}

.slot-img {
  width: 80%;
  height: 80%;
  display: flex;
  position: absolute;
  justify-content: center;
  align-items: center;
  object-fit: contain;
}

.slot-amount {
  font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  padding: 0 2px;
  user-select: none;
}

.slot-condition {
  background-color: #5d8b30;
  position: absolute;
  bottom: 0;
  left: 0;
  font-size: 12px;
  padding: 0 2px;
  user-select: none;
}
</style>
