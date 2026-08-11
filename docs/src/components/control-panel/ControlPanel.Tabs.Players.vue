<script lang="ts" setup>
import { ExternalLink, Crown, Link2 } from 'lucide-vue-next'
import { showInventory } from './ControlPanel.Inventory'
import { geoFlagCache, selectedServer } from './ControlPanel.SaveLoad'
import { ref, onMounted } from 'vue'

const playerSearch = ref<string>('')
const viewTeam = ref<bigint>()

onMounted(async () => {
  refreshPlayers()
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
          <span class="flex gap-2">
            <a :href="'https://steamcommunity.com/profiles/' + player.SteamID" target="_blank" class="text-xs max-w-fit text-slate-500 hover:text-blue-400 flex items-center gap-1 mt-[1px]">
              <ExternalLink :size="12" /> {{ player.SteamID }}
            </a>
            <a :href="'https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=' + player.SteamID + '&filter%5Bservers%5D=false&filter%5BplayerFlags%5D=&sort=score&showServers=false&method=full'" target="_blank" class="text-xs max-w-fit text-slate-500 hover:text-blue-400 flex items-center gap-1 mt-[1px]">
            <Link2 :size="12" /> Battlemetrics
            </a>
          </span>
        </td>
        <td class="text-center text-slate-400/50">
          <button
            v-if="player.HasTeam && player.Team.length > 1 && viewTeam != player.SteamID"
            class="px-2 py-1.5 text-xs bg-blue-800/30 hover:bg-blue-700/60 text-blue-300 hover:text-blue-100 shadow-sm"
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
            class="px-2 py-1.5 text-xs bg-blue-800/30 hover:bg-blue-700/60 text-blue-300 hover:text-blue-100 shadow-sm"
            @click="showInventory(player.SteamID, player.DisplayName)">
            Inventory
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
