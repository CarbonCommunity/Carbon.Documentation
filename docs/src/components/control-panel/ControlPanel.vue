<script lang="ts" setup>
import { Antenna, ArrowUpFromDot, CodeXml, Dot, Expand, ExternalLink, HardDriveDownload, Plus, RotateCcw, Save, Shield, Trash2, Wifi, X } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'
import { Slot, activeInventory, activeSlot, beltSlots, handleDrag, handleDrop, hideInventory, mainSlots, toolSlots, wearSlots } from './ControlPanel.Inventory'
import {
  Server,
  addServer,
  createServer,
  deleteServer,
  exportSave,
  importSave,
  isUsingHttps,
  load,
  selectServer,
  selectSubTab,
  selectedServer,
  selectedSubTab,
  servers,
} from './ControlPanel.SaveLoad'
import ConsoleTab from './ControlPanel.Tabs.Console.vue'
import ChatTab from './ControlPanel.Tabs.Chat.vue'
import PermissionsTab from './ControlPanel.Tabs.Permissions.vue'
import PlayersTab from './ControlPanel.Tabs.Players.vue'
import EntitiesTab from './ControlPanel.Tabs.Entities.vue'

let timerSwitch: ReturnType<typeof setTimeout> = null!

const subTabs = [
  {
    Name: 'Console',
    Description: 'An RCon based console displaying all log output sent by the server and allows sending commands to the server.',
    IsDisabled: () => !selectedServer.value?.hasPermission("console_view")
  },
  {
    Name: 'Chat',
    Description: 'All the chatter going on the server.',
    IsDisabled: () => !selectedServer.value?.hasPermission("chat_view")
  },
  {
    Name: 'Information',
    Description: 'Useful info about the server activity and various other options.'
  },
  {
    Name: 'Players',
    Description: 'A list of players or something like that.',
    ExtraData: (selectedServer: Server) => `(${selectedServer?.PlayerInfo?.length})`,
    IsDisabled: () => !selectedServer.value?.hasPermission("players_view")
  },
  {
    Name: 'Permissions',
    Description: "Good ol' permissions.",
    IsDisabled: () => !selectedServer.value?.hasPermission("permissions_view")
  },
  {
    Name: 'Entities',
    Description: "Search and inspect any entities on the server.",
    IsDisabled: () => !selectedServer.value?.hasPermission("entities_view")
  }
]

onMounted(() => {
  const timerCallback = () => {
    timerSwitch = setTimeout(timerCallback, 10000)
    servers.value.forEach((server) => {
      if (!server.Password || !server.UserConnected) {
        return
      }
      if (!server.IsConnected) {
        server.connect()
        return
      }
      if(server.Bridge) {
        server.sendCommand('serverinfo', 2)
      } else {
        server.sendCall("ServerInfo")
      }
    })
  }

  timerSwitch = setTimeout(timerCallback, 10000)
  load()

  beltSlots.value = []
  mainSlots.value = []
  for (let i = 0; i < 24; i++) {
    const slot = new Slot()
    slot.Position = i
    slot.Container = 0
    mainSlots.value.push(slot)
  }
  for (let i = 0; i < 6; i++) {
    const slot = new Slot()
    slot.Position = i
    slot.Container = 1
    beltSlots.value.push(slot)
  }
  for (let i = 0; i < 7; i++) {
    const slot = new Slot()
    slot.Position = i
    slot.Container = 2
    wearSlots.value.push(slot)
  }

  const dropSlot = new Slot()
  dropSlot.Position = 0
  dropSlot.Container = 10
  toolSlots.value.push(dropSlot)

  const trashSlot = new Slot()
  trashSlot.Position = 1
  trashSlot.Container = 11
  toolSlots.value.push(trashSlot)
})

onUnmounted(() => {
  clearTimeout(timerSwitch)
})
</script>

<template>
  <div :class="[ 'mx-auto space-y-0 px-4 py-8', !selectedServer?.WideScreen ? 'md:container lg:px-6 xl:px-8 2xl:px-20' : '']">
    <div class="r-list">
      <button v-for="server in servers" :key="server.Address" :class="['r-button', { toggled: server == selectedServer }]" @click="selectServer(server)">
        <Dot
          :size="45"
          :style="'margin: -10px; color: ' + (server.IsConnecting ? 'yellow' : server.IsConnected ? 'green' : 'red') + '; filter: blur(1.5px);'"
        />
        <div class="grid">
          <p>
            <strong>{{ !server.CachedHostname ? 'Unknown' : server.CachedHostname }}</strong>
          </p>
          <p style="font-size: 12px; color: var(--vp-badge-info-text)">{{ server.Address }}</p>
        </div>
      </button>
      <button class="r-button" @click="addServer(createServer('', ''), true)">
        <Plus />
      </button>
      <div class="grid gap-y-0 text-xs">
        <button class="r-button" @click="importSave()"><HardDriveDownload :size="14" /> Import Clipboard</button>
        <button class="r-button" @click="exportSave()"><Save :size="14" /> Export Clipboard</button>
      </div>
    </div>

    <div v-if="selectedServer" class="r-settings" style="margin-top: 15px">
      <div class="r-settings-input-group">
        <span class="r-settings-input-label" style="user-select: none">Address</span>
        <input v-model="selectedServer.Address" type="text" class="r-settings-custom-input" placeholder="localhost:28507" />
      </div>
      <div class="r-settings-input-group">
        <span class="r-settings-input-label" style="user-select: none">Password</span>
        <input v-model="selectedServer.Password" type="password" class="r-settings-custom-input" />
      </div>
      <div class="flex">
        <button
          class="r-button"
          :disabled="selectedServer.IsConnecting"
          @click="selectedServer.connect()"
          :style="'color: ' + (!selectedServer?.IsConnected ? 'var(--docsearch-footer-background);' : 'var(--c-carbon-3);') + 'font-size: small;'"
        >
          <Wifi :size="20" /> {{ selectedServer?.IsConnected ? 'Disconnect' : 'Connect' }}
        </button>
        <button
          class="r-button"
          :disabled="selectedServer.IsConnecting || selectedServer.IsConnected"
          @click="selectedServer.toggleBridge()"
          :class="['r-button', { toggled: selectedServer.Bridge }]"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          <Antenna :size="20" /> Bridge
        </button>
        <button class="r-button" @click="(e) => deleteServer(selectedServer, e)" style="color: var(--docsearch-footer-background); font-size: small">
          <X :size="20" /> Delete
        </button>
        <button
          class="r-button"
          @click="selectedServer.toggleSecure()"
          :class="['r-button', { toggled: selectedServer.Secure }]"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          <Shield :size="20" /> Secure
        </button>
        <button
          class="r-button"
          @click="selectedServer.toggleAutoConnect()"
          :class="['r-button', { toggled: selectedServer.AutoConnect }]"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          <RotateCcw :size="20" /> Auto-Connect
        </button>
        <a
          class="r-button"
          href="https://github.com/CarbonCommunity/Carbon.Documentation/blob/main/docs/src/components/control-panel/ControlPanel.vue"
          target="_blank"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          <CodeXml :size="20" /> Source <ExternalLink :size="13" />
        </a>
        <button
          class="r-button"
          @click="selectedServer.toggleWideScreen()"
          :class="['r-button', { toggled: selectedServer.WideScreen }]"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          <Expand :size="20" />
        </button>
      </div>
    </div>

    <div v-if="isUsingHttps()" class="r-settings text-xs" style="margin-top: 15px; opacity: 75%">
      <p style="text-align: center">
        You're currently using Control Panel in HTTPS mode.
        <br />
        To use RCon without the SSL certificate requirement, update the URL to use
        <code><span style="color: var(--category-favourite); font-weight: bolder">http</span>://</code> instead of <code>https</code>.
        <br />
        This is only necessary if you want to connect to the remote server. If you're using it to connect to your local server (127.0.0.1, localhost, etc.) -
        you can ignore this.
      </p>
    </div>

    <div v-if="selectedServer && selectedServer.ServerInfo" style="margin-top: 15px; display: flow" class="r-settings">
      <div class="mb-5 flex">
        <button
          v-for="(tab, index) in subTabs"
          :key="index"
          class="r-button"
          v-show="tab.IsDisabled == null || !tab.IsDisabled()"
          @click="selectSubTab(index)"
          :class="['r-button', { toggled: selectedSubTab == index }]"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          {{ tab.Name }} {{ tab.ExtraData != null ? tab.ExtraData(selectedServer) : null }}
        </button>
      </div>

      <div v-for="(tab, index) in subTabs" :key="index">
        <div v-if="selectedSubTab == index" class="m-4 text-xs text-slate-500">
          <span>{{ tab.Description }}</span>
        </div>
      </div>

      <div v-if="selectedSubTab == 0">
        <ConsoleTab />
      </div>
      <div v-else-if="selectedSubTab == 1" style="overflow: auto">
        <ChatTab />
      </div>
      <div v-else-if="selectedSubTab == 2">
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Host</span>
          <p type="text" class="r-settings-custom-input transparent">{{ selectedServer.ServerInfo.Hostname }}</p>
        </div>
        <div class="r-settings-input-group">
          <span class="r-settings-input-label" style="user-select: none">Description</span>
          <div type="text" class="r-settings-custom-input transparent" style="white-space: break-spaces" v-html="selectedServer.Description"></div>
        </div>
        <div style="display: flex">
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Header</span>
            <img v-if="selectedServer.HeaderImage" :src="selectedServer.HeaderImage" width="300" />
            <p v-else class="text-xs text-slate-400">No header available</p>
          </div>
        </div>
        <div style="display: flex">
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Players</span>
            <p type="text" class="r-settings-custom-input transparent">
              {{ selectedServer.ServerInfo.Players }} / {{ selectedServer.ServerInfo.MaxPlayers }} — {{ selectedServer.ServerInfo.Queued }} queued,
              {{ selectedServer.ServerInfo.Joining }} joining
            </p>
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Entities</span>
            <p type="text" class="r-settings-custom-input transparent">{{ selectedServer.ServerInfo.EntityCount.toLocaleString() }}</p>
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Map</span>
            <p type="text" class="r-settings-custom-input transparent">{{ selectedServer.ServerInfo.Map }}</p>
          </div>
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Version</span>
            <p type="text" class="r-settings-custom-input transparent">{{ selectedServer.ServerInfo.Protocol }}</p>
          </div>
        </div>
        <div style="display: flex">
          <div class="r-settings-input-group">
            <span class="r-settings-input-label" style="user-select: none">Carbon</span>
            <p type="text" class="r-settings-custom-input transparent">
              {{ selectedServer.CarbonInfo == null ? 'Not found' : selectedServer.CarbonInfo.Message.split(' ').slice(0, 2).join(' ') }}
            </p>
          </div>
        </div>
      </div>
      <div v-else-if="selectedSubTab == 3" style="overflow: auto">
        <PlayersTab />
      </div>
      <div v-else-if="selectedSubTab == 4" style="overflow: auto">
        <PermissionsTab />
      </div>
      <div v-else-if="selectedSubTab == 5" style="overflow: auto">
        <EntitiesTab />
      </div>
    </div>
    <div v-if="!selectedServer" style="color: var(--category-misc); font-size: small; text-align: center; user-select: none">
      <p>No server selected</p>
    </div>
  </div>
</template>

<style>
.r-list {
  display: flex;
  gap: 10px;
  overflow: scroll;
  flex-flow: wrap;
  scrollbar-width: none;
}

.r-settings {
  background-color: var(--vp-code-copy-code-bg);
  padding: 15px;
  gap: 1rem;
  font-family: monospace;
}

.r-settings-input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  flex: 1;
}

.r-settings-input-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #aaa;
  margin-bottom: 4px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.r-settings-custom-input {
  background-color: #1a1a1a;
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

.r-button {
  opacity: 50%;
  background-color: var(--vp-code-copy-code-bg);
  padding: 7.5px 15px;
  align-items: flex-start;
  text-align: left;
  display: ruby;
  transition-duration: 0s;
  border-bottom: 2px solid transparent;
}

.r-button:hover {
  opacity: 75%;
  background-color: var(--docsearch-text-color);
}

.r-button.toggled {
  opacity: 100%;
  background-color: var(--vp-button-alt-bg);
  border-bottom: 2px solid #ffffff29;
}

.r-send-button {
  text-decoration: auto;
  font-family: monospace;
  color: var(--category-misc);
  background-color: transparent;
  padding: 6px 12px;
  border-radius: 0px;
  cursor: pointer;
  transition: background-color, color;
  border-color: transparent;
  border: transparent 1px;
  transition-duration: 0.5s;
  transition-timing-function: cubic-bezier(0, 1, 0, 0);
}

.r-send-button.toggled {
  font-weight: bolder;
  text-decoration: underline;
  text-underline-position: under;
}

.r-send-button:hover {
  background-color: var(--category-misc);
  color: white;
}
</style>
