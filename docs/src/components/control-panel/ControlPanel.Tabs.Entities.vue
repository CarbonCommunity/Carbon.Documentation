<script lang="ts" setup>
import { Loader2, Pencil, Trash2, CheckCircle2, Copy, X, Save, RefreshCcw, ArrowUpFromDot, ExternalLink } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted } from 'vue'
import { selectedEntity,
  stopEditingEntity,
  refreshIcon, 
  isSide, 
  iconUrl, 
  isShiftPressed, 
  onSearch, 
  editEntity, 
  killEntity, 
  saveEntity, 
  empowerPlayer, 
  isSearching, 
  searchMaxCount, 
  searchInput, 
  searchedData, 
  currentSearch
} from './ControlPanel.Entities'

const copiedId = ref<string | number | null>(null)
const timer = ref<NodeJS.Timeout | null>(null)

const copyToClipboard = async (text: string, id: string | number | null = null) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

onMounted(() => {
  const sideFlip = () => {
    if(selectedEntity.value) {
      isSide.value = !isSide.value
      refreshIcon()
    }
    timer.value = setTimeout(sideFlip, 3000)
  }
  timer.value = setTimeout(sideFlip, 3000)
})
onUnmounted(() => {
  if(timer.value != null) {
    clearTimeout(timer.value)
    timer.value = null
  }
})
</script>

<template>
  <div class="r-settings-input-group">
    <input v-model="searchInput" type="text" class="r-settings-custom-input" @keyup.enter="onSearch" placeholder="Search entity (name, type, netID) or a range of entities at a location (eg. '<x> <y> <z>:50[:filter]')..." />
    <div v-if="currentSearch && searchedData" class="m-4 text-xs text-red-800">
      <span>Searched '{{ currentSearch }}' and found {{ searchedData.length }} out of {{ searchMaxCount }} max. entities <button @click="() => { searchInput = currentSearch; onSearch() }"><span class="text-neutral-400"><RefreshCcw :size="13"/></span></button> <button @click="() => { searchInput = currentSearch; }"><span class="text-neutral-400"><ArrowUpFromDot :size="13"/></span></button></span>
    </div>
  </div>
  <Loader2 v-if="isSearching" class="flex animate-spin text-xs text-slate-500" :size="20" />
  <table v-if="searchedData && searchedData.length > 0" :class="isSearching ? 'blur-sm' : ''">
    <thead style="border: 1px;">
      <tr>
        <th class="vp-doc th r-table-row"></th>
        <th class="vp-doc th r-table-row">NetID</th>
        <th class="vp-doc th r-table-row">Name</th>
        <th class="vp-doc th r-table-row">Coordinate</th>
      </tr>
    </thead>
    <tr style="border: 1px;" v-for="entity in searchedData">
      <td class="vp-doc td r-table-row">
        <button class="r-send-button" @click="editEntity(entity.NetId)"><span class="text-neutral-400"><Pencil :size="17"/></span></button>
        <button class="r-send-button" @click="killEntity(entity.NetId)"><span :class="'text-' + (isShiftPressed ? 'red' : 'neutral') + '-400 flex'"><Trash2 :size="17"/></span></button>
      </td> 
      <td class="vp-doc td r-table-row">
        <span class="flex">
          <button
              @click="copyToClipboard(entity.NetId, entity.PosX + entity.PosY + entity.PosZ + 1)"
              class="flex items-center pr-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <component :is="copiedId === entity.PosX + entity.PosY + entity.PosZ + 1 ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
          {{ entity.NetId }}
        </span>
      </td>
      <td class="vp-doc td r-table-row">
        <span class="flex">
          <button
              @click="copyToClipboard(entity.Name, entity.PosX + entity.PosY + entity.PosZ + 2)"
              class="flex items-center pr-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <component :is="copiedId === entity.PosX + entity.PosY + entity.PosZ + 2 ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
          {{ entity.Name }}
        </span>
      </td>
      <td class="vp-doc td r-table-row">
        <span class="flex">
          <button
              @click="copyToClipboard(`${entity.PosX} ${entity.PosY} ${entity.PosZ}`, entity.PosX + entity.PosY + entity.PosZ + 3)"
              class="flex items-center pr-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <component :is="copiedId === entity.PosX + entity.PosY + entity.PosZ + 3 ? CheckCircle2 : Copy" class="ml-2" :size="14" />
          </button>
          {{ entity.PosX.toLocaleString() }} {{ entity.PosY.toLocaleString() }} {{ entity.PosZ.toLocaleString() }} 
        </span>
      </td>
    </tr>
  </table>
  <div v-if="selectedEntity" class="fixed inset-0 z-0 flex items-center justify-center bg-black/50" @click="stopEditingEntity()">
    <div class="mx-4 w-full max-w-fit rounded-lg bg-white p-6 dark:bg-gray-800" @click.stop>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-xl font-bold"></h3>
        <button @click="stopEditingEntity()" class="text-gray-500 hover:text-gray-700">
          <X :size="20" />
        </button>
      </div>
      
      <div>
        <img class="h-36 w-36" :src="iconUrl" @error="(e: any) => e.target.src = 'https://cdn.carbonmod.gg/content/missing.jpg'" />
      </div>

      <p class="text-xs text-neutral-500">{{ selectedEntity.Type }} [{{ selectedEntity.NetId }}]</p>
      <p class="text-lg mb-5">{{ selectedEntity.ShortName }}</p>

      <div class="flex">
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Position</span>
          <div class="flex">
            <input type="number" :step="1" class="r-settings-custom-input w-24" title="X coordinate" v-model="selectedEntity.PosX" />
            <input type="text" class="r-settings-custom-input w-24" title="Y coordinate" v-model="selectedEntity.PosY" />
            <input type="text" class="r-settings-custom-input w-24" title="Z coordinate" v-model="selectedEntity.PosZ" />
          </div>
        </div>
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Rotation</span>
          <div class="flex">
            <input type="text" class="r-settings-custom-input w-24" title="X coordinate" v-model="selectedEntity.RotX" />
            <input type="text" class="r-settings-custom-input w-24" title="Y coordinate" v-model="selectedEntity.RotY" />
            <input type="text" class="r-settings-custom-input w-24" title="Z coordinate" v-model="selectedEntity.RotZ" />
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Parent</span>
          <span v-if="selectedEntity.Parent"><button @click="killEntity(selectedEntity.Parent.NetId)"><span :class="'text-' + (isShiftPressed ? 'red' : 'neutral') + '-400 flex'"><Trash2 :size="15"/></span></button><button class="self-start" @click="editEntity(selectedEntity.Parent.NetId)"><span class="text-xs"> {{ selectedEntity.Parent.ShortName }} <span class="text-neutral-500">{{ selectedEntity.Parent.NetId }}</span></span></button></span>
          <div v-if="!selectedEntity.Parent" class="text-xs text-neutral-400">N/A</div>
        </div>
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Children</span>
          <span v-if="selectedEntity.Children.length > 0" v-for="child in selectedEntity.Children"><button @click="killEntity(child.NetId)"><span :class="'text-' + (isShiftPressed ? 'red' : 'neutral') + '-400 flex'"><Trash2 :size="15"/></span></button><button class="self-start" @click="editEntity(child.NetId)"><span class="text-xs"> {{ child.ShortName }} <span class="text-neutral-500">{{ child.NetId }}</span></span></button></span>
          <div v-if="selectedEntity.Children.length == 0" class="text-xs text-neutral-400">N/A</div>
        </div>
      </div>
      <div class="flex">
        <div class="r-settings-input-group">
            <a :href="selectedEntity.Owner != 0 ? 'http://steamcommunity.com/profiles/' + selectedEntity.Owner : ''" target="_blank" class="r-settings-input-label flex select-none">Owner<ExternalLink :size="12" class="mx-1"/></a>
          <input v-model="selectedEntity.Owner" type="text" class="r-settings-custom-input" />
        </div>
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Skin</span>
          <input v-model="selectedEntity.Skin" type="text" class="r-settings-custom-input" />
        </div>
        <div class="r-settings-input-group">
          <button class="r-settings-input-label flex select-none">Flags<Pencil :size="12" class="mx-1"/></button>
          <input readonly type="text" class="r-settings-custom-input" :value="selectedEntity.Flags" />
        </div>
      </div>
      <div v-if="selectedEntity.CombatEntity">
        <strong>Combat Entity</strong>
        <div class="flex mt-3">
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Health</span>
            <input type="text" class="r-settings-custom-input" v-model="selectedEntity.CombatEntity.Health" />
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Max. Health</span>
            <input type="text" class="r-settings-custom-input" v-model="selectedEntity.CombatEntity.MaxHealth" />
          </div>
          <button class="r-send-button" @click="selectedEntity.CombatEntity.Health = selectedEntity.CombatEntity.MaxHealth; saveEntity()"><span class="text-green-400">HEAL</span></button>
          <button class="r-send-button" @click="selectedEntity.CombatEntity.Health -= selectedEntity.CombatEntity.MaxHealth / 10; saveEntity()"><span class="text-red-400">HURT</span></button>
        </div>
      </div>
      <div v-if="selectedEntity.PlayerEntity">
        <strong>Player Entity</strong>
        <div class="flex">
          <div class="r-settings-input-group mt-3">
            <span class="r-settings-input-label" style="user-select: none">Display Name</span>
            <span class="flex r-settings-custom-input"><input type="text" class="mr-2" v-model="selectedEntity.PlayerEntity.DisplayName" /></span>
          </div>
          <div class="r-settings-input-group mt-3">
            <a :href="'http://steamcommunity.com/profiles/' + selectedEntity.PlayerEntity.UserId" target="_blank" class="r-settings-input-label flex" style="user-select: none">Steam ID <ExternalLink :size="12" class="mx-1"/></a>
            <span class="flex r-settings-custom-input"><input readonly type="text" class="mr-2" v-model="selectedEntity.PlayerEntity.UserId" /></span>
          </div>
        </div>
        <div class="flex">
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Hunger</span>
            <span class="flex r-settings-custom-input"><input type="text" class="mr-2 w-16" v-model="selectedEntity.PlayerEntity.Hunger" />/<input type="text" class="ml-2 w-24" v-model="selectedEntity.PlayerEntity.MaxHunger" /></span>
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Thirst</span>
            <span class="flex r-settings-custom-input"><input type="text" class="mr-2 w-16" v-model="selectedEntity.PlayerEntity.Thirst" />/<input type="text" class="ml-2 w-24" v-model="selectedEntity.PlayerEntity.MaxThirst" /></span>
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Rads</span>
            <span class="flex r-settings-custom-input"><input type="text" class="mr-2 w-16" v-model="selectedEntity.PlayerEntity.Rads" />/<input type="text" class="ml-2 w-24" v-model="selectedEntity.PlayerEntity.MaxRads" /></span>
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Bleed</span>
            <span class="flex r-settings-custom-input"><input type="text" class="mr-2 w-16" v-model="selectedEntity.PlayerEntity.Bleed" />/<input type="text" class="ml-2 w-24" v-model="selectedEntity.PlayerEntity.MaxBleed" /></span>
          </div>
          <button class="r-send-button" @click="empowerPlayer(selectedEntity); saveEntity()"><span class="text-yellow-400">EMPOWER</span></button>   
        </div>
      </div>
      <div class="flex justify-end">
        <button class="r-send-button" @click="saveEntity()"><span class="text-neutral-400"><Save :size="17"/></span></button>
        <button class="r-send-button" @click="killEntity(selectedEntity.NetId)"><span :class="'text-' + (isShiftPressed ? 'red' : 'neutral') + '-400 flex'"><Trash2 :size="17"/></span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.r-table-row {
  text-align: left;
  padding-right: 15px;
}

.r-settings-input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  flex: 1;
}

.r-settings-custom-input {
  background-color: #1a1a1a00;
  color: white;
  border-bottom: 1px solid #444;
  border-radius: 4px;
  padding: 5px 7px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease-in-out;
}

.r-settings-custom-input.transparent {
  font-size: small;
  border-radius: 0px;
  background-color: transparent !important;
}

.r-settings-custom-input:focus {
  border-color: #888;
}
</style>