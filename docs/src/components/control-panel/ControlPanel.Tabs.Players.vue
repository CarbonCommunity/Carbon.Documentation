<script lang="ts" setup>
import { ExternalLink, ArrowUpFromDot, Trash2, Crown } from 'lucide-vue-next'
import { showInventory, hideInventory, activeInventory, handleDrop, handleDrag, activeSlot, mainSlots, wearSlots, beltSlots, toolSlots } from './ControlPanel.Inventory'
import { geoFlagCache, selectedServer } from './ControlPanel.SaveLoad'
import { ref, onMounted, computed } from 'vue'
import { fetchItems } from '@/api/metadata/rust/items'

const playerSearch = ref<string>('')
const viewTeam = ref<bigint>()
const selectedItemOption = ref('bleach')
const selectedItemAmount = ref(1)
const selectedItemSearch = ref('')
const itemOptions: any = []
const isOpen = ref<boolean>(false)

function giveItem() {
  selectedServer.value?.sendCommand(`inventory.giveto ${activeInventory.value} ${selectedItemOption.value} ${selectedItemAmount.value}`, 1)
}

const filteredOptions = computed(() => {
  const q = selectedItemSearch.value.toLowerCase()
  return itemOptions.filter((opt: any) => opt.value.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q))
})

onMounted(async () => {
  refreshPlayers()
  const { data } = await fetchItems()
  data.forEach(item => {
    itemOptions.push({ 
      value: item.ShortName,
      label: item.DisplayName
    })
  });
})

function refreshPlayers() {
  selectedServer.value?.sendCall("Players")
}
</script>

<template>
  <table tabindex="0" class="w-full border-collapse text-sm text-slate-300 overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.3)] backdrop-blur-sm">
    <thead class="bg-slate-800/70 text-slate-200 text-xs uppercase tracking-wider">
      <tr>
        <th class="px-3 py-2 w-[100px]">Ping</th>
        <th class="px-3 py-2 text-left">Player <span class="opacity-30">({{ selectedServer?.PlayerInfo?.length }} online, {{ selectedServer?.SleeperInfo?.length }} sleeping)</span></th>
        <th class="px-3 py-2 text-center">Team</th>
        <th class="px-3 py-2 text-center">Health</th>
        <th class="px-3 py-2 text-left">Connected</th>
        <th class="px-3 py-2 text-center">Actions</th>
      </tr>
    </thead>
    <tbody class="">
      <tr>
        <td></td>
        <td>
          <input type="text" v-model="playerSearch"  placeholder="Search player..."
            class="w-64 px-3 py-1.5 bg-slate-800/40 border border-slate-700/60
                  text-sm text-slate-200 placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
                  transition-all duration-200 hover:bg-slate-700/50 shadow-inner"/>
        </td>
      </tr>
      <tr v-for="player in selectedServer?.getAllPlayers()?.filter(x => !playerSearch || x.DisplayName.toLowerCase().includes(playerSearch.toLowerCase()))" :key="player.SteamID" 
        :class="[ 'group transition-colors duration-200 border-t border-slate-800/50', player.Ping == -1 ? 'bg-red-400/5 opacity-60' : '' ]">
        <td class="px-3 py-2 text-xs text-slate-400 items-center text-center">
          <div v-if="player.Ping != -1" class="flex justify-self-center gap-2">
            <img :src="geoFlagCache[player.Address]" class="w-4 h-4 rounded-sm shadow-sm" />
            <span class="font-mono">{{ player.Ping }}ms</span>
          </div>
        </td>
        <td class="px-3 py-2 flex flex-col">
          <strong class="text-slate-200 group-hover:text-white transition flex gap-x-1">
            <Crown class="opacity-25" v-if="player.TeamLeader == player.SteamID" :size="17"/>{{ player.DisplayName }}
          </strong>
          <a :href="'https://steamcommunity.com/profiles/' + player.SteamID" target="_blank" class="text-xs max-w-fit text-slate-500 hover:text-blue-400 flex items-center gap-1 mt-[1px]">
            <ExternalLink :size="12" /> {{ player.SteamID }}
          </a>
        </td>
        <td class="text-center text-slate-400/50">
          <button
            v-if="player.HasTeam && player.Team.length > 1 && viewTeam != player.SteamID"
            class="px-2 py-1.5 text-xs bg-blue-800/30 hover:bg-blue-700/60 text-blue-300 hover:text-blue-100 transition-all shadow-sm"
            @click="viewTeam = player.SteamID">
            View Team
          </button>
          <div v-if="player.HasTeam && viewTeam == player.SteamID">
            <p v-for="member in player.Team" :key="member">
              <span v-if="member != player.SteamID" class="flex gap-x-2 justify-self-center">
                <a :href="'https://steamcommunity.com/profiles/' + member" target="_blank" class="text-xs max-w-fit  text-slate-500 hover:text-blue-400 flex gap-1 mt-[1px]">
                  <Crown v-if="player.TeamLeader == member" :size="13"/> <strong>{{ selectedServer?.getPlayer(member)?.DisplayName ?? member }}</strong> 
                  <ExternalLink :size="12" />
                </a>
              </span>
            </p>
          </div>  
        </td>
        <td class="px-3 py-2 relative text-center">
          <div class="absolute left-0 top-0 h-full rounded-sm bg-green-600/20 transition-all duration-300" :style="{ width: (player.Health > 100 ? 100 : player.Health) + '%' }"></div>
          <span class="relative z-10 font-mono text-xs text-slate-200">
            {{ player.Health.toFixed(1) }}
          </span>
        </td>
        <td class="px-3 py-2 text-xs text-slate-400 font-mono">
          <span v-if="player.Ping != -1">{{ selectedServer?.formatDuration(player.ConnectedSeconds) }}</span>
        </td>
        <td class="px-3 py-2 text-center">
          <button
            v-if="selectedServer?.hasPermission('players_inventory')"
            class="px-2 py-1.5 text-xs bg-blue-800/30 hover:bg-blue-700/60 text-blue-300 hover:text-blue-100 transition-all shadow-sm"
            @click="showInventory(player.SteamID)">
            Inventory
          </button>
        </td>
      </tr>
    </tbody>
  </table>

  <div v-if="activeInventory" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="hideInventory()">
    <div class="mx-4 w-full max-w-lg rounded-lg bg-white p-6 dark:bg-gray-800" @click.stop>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-xl font-bold"></h3>
        <button @click="hideInventory()" class="text-gray-500 hover:text-gray-700">
          <X :size="20" />
        </button>
      </div>
      <div class="items-center" style="justify-items: center">
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
