<script lang="ts" setup>
import { Plus, Dot, Wifi, X, RotateCcw, Shield, CodeXml, ExternalLink, ArrowUpFromDot, Trash2 } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const selectedSubtab = ref(0)
const selectedPlayer = ref(0)
const selectedCommandIndex = ref(0)
const selectedSlot = ref(0)
const mainSlots = ref<Slot[]>([])
const beltSlots = ref<Slot[]>([])
const wearSlots = ref<Slot[]>([])
const toolSlots = ref<Slot[]>([])
const draggedSlot = ref<Slot | null>()
const command = ref('')
const logContainer = ref<HTMLDivElement>(null!)
const flags = ref<{ [key: string]: string }>({})

let timerSwitch: ReturnType<typeof setTimeout> = null!
let timerInvRefresh: ReturnType<typeof setTimeout> = null!

async function tryFocusLogs(autoScroll: boolean = false) {
  await nextTick()
  if (logContainer.value?.scrollHeight && (autoScroll || logContainer.value.scrollHeight - logContainer.value?.scrollTop < 2000)) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
  save()
}

function isValidUrl(urlStr: string) : boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function clearInventory() {
  selectedSlot.value = -1
  mainSlots.value.forEach(slot => {
    slot.clear()
  });
  beltSlots.value.forEach(slot => {
    slot.clear()
  });
  wearSlots.value.forEach(slot => {
    slot.clear()
  });
}

function handleDrag(slot: Slot) {
  draggedSlot.value = slot
}

function handleDrop(slot: Slot) {
  // MoveInventoryItem
  selectedServer.value.sendRpc('3553623853', selectedPlayer.value, draggedSlot.value?.Container, draggedSlot.value?.Position, slot.Container, slot.Position)
  selectedServer.value.fetchInventory(selectedPlayer.value)
  draggedSlot.value = null
}

async function fetchGeolocation(ip: string) {
  const url = `https://ipwho.is/${ip.split(':')[0]}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`IPAPI responded with status ${response.status}`);
    }

    const data = await response.json();
    if(flags) {
      flags.value[ip] = `https://flagcdn.com/32x24/${data.country_code.toString().toLowerCase()}.png`
    }
  } catch {

  }
}

function selectSubTab(index: number) {
  selectedSubtab.value = index
  localStorage.setItem('rcon-subtab', index.toString())
  save() 

  if(index == 0) {
    tryFocusLogs(true)
  }
}

function showInventory(playerId: number) {
  clearInventory()
  selectedPlayer.value = playerId
  selectedServer.value.fetchInventory(playerId)

  const looper = () => {
    if(!selectedServer.value.PlayerInfo.find(player => player.SteamID == playerId)) {
      hideInventory()
      return
    }

    timerInvRefresh = setTimeout(looper, 1000)
    selectedServer.value.fetchInventory(playerId)
  }
  timerInvRefresh = setTimeout(looper, 1000)
}

function hideInventory() {
  if(selectedPlayer.value != 0) {
    selectedPlayer.value = 0
    clearTimeout(timerInvRefresh)
  }
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (hrs > 0) parts.push(`${hrs}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

class Slot {
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

class Server {
  Address = ''
  Password = ''
  Socket: WebSocket | null = null
  Logs: string[] = []
  CommandHistory: string[] = []
  AutoConnect = false
  Secure = false
  CachedHostname = ''
  IsConnected = false
  IsConnecting = false
  UserConnected = false
  ServerInfo: object | null = null
  CarbonInfo: object | null = null
  PlayerInfo: object | null = null
  HeaderImage = ''
  Description = ''
  Rpcs: Record<string, (...args: any[]) => void> = {};

  registerRpcs() {
    this.Rpcs = {}

    // MoveInventoryItem
    this.Rpcs["3553623853"] = data => {
      
    }

    // SendPlayerInventory
    this.Rpcs["1739174796"] = data => {
        clearInventory()
        try {
          selectedSlot.value = data.Value.ActiveSlot
          data.Value.Main.forEach(item => {
            if(item.Position == -1 || item.Position >= mainSlots.value.length) {
              return
            }
            const slot = mainSlots.value[item.Position]
            slot.ShortName = item.ShortName
            slot.ItemId = item.ItemId 
            slot.Amount = item.Amount
            slot.Condition = item.Condition
            slot.MaxCondition = item.MaxCondition
            slot.ConditionNormalized = item.ConditionNormalized
            slot.HasCondition = item.HasCondition
          });
          data.Value.Belt.forEach(item => {
            if(item.Position == -1 || item.Position >= beltSlots.value.length) {
              return
            }
            const slot = beltSlots.value[item.Position]
            slot.ShortName = item.ShortName
            slot.ItemId = item.ItemId  
            slot.Amount = item.Amount
            slot.Condition = item.Condition
            slot.MaxCondition = item.MaxCondition
            slot.ConditionNormalized = item.ConditionNormalized
            slot.HasCondition = item.HasCondition
          });
          data.Value.Wear.forEach(item => {
            if(item.Position == -1 || item.Position >= wearSlots.value.length) {
              return
            }
            const slot = wearSlots.value[item.Position]
            slot.ShortName = item.ShortName
            slot.ItemId = item.ItemId
            slot.Amount = item.Amount
            slot.Condition = item.Condition
            slot.MaxCondition = item.MaxCondition
            slot.ConditionNormalized = item.ConditionNormalized
            slot.HasCondition = item.HasCondition
          });
        } catch (e) {
          console.error(e)
        }
    }

    // TestCall
    this.Rpcs['951948318'] = data => {
      console.log(data)
    }
  }

  connect() {
    save()
    this.UserConnected = true
    if (this.Socket != null) {
      this.Socket.close()
      this.Socket.onclose(
        new CloseEvent('close', {
          wasClean: true,
          code: 1000,
          reason: 'Manual close',
        })
      )
      this.UserConnected = false
      return
    }

    this.Socket = new WebSocket((this.Secure || enforceSecure() ? 'wss' : 'ws') + '://' + this.Address + '/' + this.Password)
    this.IsConnecting = true

    this.Socket.onopen = () => {
      this.IsConnecting = false
      this.IsConnected = true

      this.registerRpcs();
      this.sendCommand('serverinfo', 2)
      this.sendCommand('playerlist', 6)
      this.sendCommand('console.tail', 7)
      this.sendCommand('c.version', 3)
      this.sendCommand('server.headerimage', 4)
      this.sendCommand('server.description', 5)
      this.sendRpc('951948318', 'Ping sentence!')
    }
    this.Socket.onclose = () => {
      this.IsConnecting = false
      this.IsConnected = false
      this.ServerInfo = null
      this.CarbonInfo = null
      this.PlayerInfo = null
      this.HeaderImage = ''
      this.Description = ''
      this.Socket = null
      hideInventory()
      tryFocusLogs()
    }
    this.Socket.onerror = (e) => {
      this.UserConnected = false
    }
    this.Socket.onmessage = (event) => {
      const resp: CommandResponse = JSON.parse(event.data)

      try {
        let isJson = false
        let jsonData = null

        try {
          jsonData = JSON.parse(resp.Message)
          isJson = true
        } catch {
          /* empty */
        }

        if (this.onIdentifiedCommand(resp.Identifier, jsonData ?? resp)) {
          return
        }
      } catch {
        /* empty */
      }

      this.appendLog(resp.Message)
      tryFocusLogs()
    }
  }

  fetchInventory(playerId: number) {
    // SendPlayerInventory
    this.sendRpc('1739174796', playerId)
  }

  sendCommand(input: string, id: number = 1) {
    if (!input) {
      return
    }

    if (this.Socket && this.IsConnected) {
      const packet: CommandSend = {
        Message: input,
        Identifier: id,
      }
      this.Socket.send(JSON.stringify(packet))
    }

    if (input == command.value) {
      this.appendLog('<span style="color: var(--category-misc);"><strong>></strong></span> ' + input)
      command.value = ''
      selectedCommandIndex.value = 0

      if(this.CommandHistory.length == 0 || this.CommandHistory[this.CommandHistory.length -1] != input) {
        this.CommandHistory.unshift(input)
      }
    }

    tryFocusLogs(false)
  }

  sendRpc(id: string, ...args: any[]) {
    for (let i = 0; i < args.length; i++) {
      var arg = args[i]
      args[i] = `"${arg}"` 
    }
    this.sendCommand(`c.webrcon.rpc ${id} ${args.join(' ')}`, 100)
  }

  onIdentifiedCommand(id: number, data: object) {
    switch (id) {
      case 0: // Rust output
      case 1: // User input
        return false
      case 2: // serverinfo
        this.ServerInfo = data
        this.CachedHostname = this.ServerInfo.Hostname
        break
      case 6: // playerinfo
        this.PlayerInfo = data
        this.PlayerInfo.forEach(player => {
          if(!(player.Address in flags.value)) {
            fetchGeolocation(player.Address)
          }
        });
        break
      case 7: // console.tail
        data.forEach(log => {
          this.appendLog(log.Message as string)
        });
        tryFocusLogs(true)
        break
      case 3: // carboninfo
        this.CarbonInfo = data
        break
      case 4: // headerimage
        this.HeaderImage = data.Message.toString().split(' ').slice(1, 2).join(' ').replace(/['"]/g, '')
        if(!isValidUrl(this.HeaderImage)) {
          this.HeaderImage = ''
        }
        break
      case 5: // description
        this.Description = data.Message.toString().split(' ').slice(1, 1000).join(' ').replace(/['"]/g, '')
        break
      case 100: // c.webrcon.rpc
          if (data.RpcId in this.Rpcs) {
            this.Rpcs[data.RpcId](data);
          }
        break
    }

    return true
  }

  toggleAutoConnect() {
    this.AutoConnect = !this.AutoConnect
    save()
  }

  toggleSecure() {
    this.Secure = !this.Secure
    save()
  }

  appendLog(log: string) {
    this.Logs.push(log)
  }

  selectHistory(up: boolean) {
    if(up) {
      selectedCommandIndex.value++
    } else {
      selectedCommandIndex.value--
    }
    
    if(selectedCommandIndex.value > this.CommandHistory.length - 1) {
      selectedCommandIndex.value = -1
    } else if(selectedCommandIndex.value < -1) {
      selectedCommandIndex.value = this.CommandHistory.length - 1
    }

    if(selectedCommandIndex.value == -1) {
      command.value = ''
      return
    }

    if(this.CommandHistory.length > 0) {
      command.value = this.CommandHistory[selectedCommandIndex.value]
    }
  }

  clearLogs() {
    const confirmDelete = window.confirm(`Are you sure you want to clear all logs for "${this.Address}"?`)
    if (confirmDelete) {
      this.Logs = []
      this.CommandHistory = []
      save()
    }
  }
}

const servers = ref<Server[]>([])
const selectedServer = ref()

function enforceSecure(): boolean {
  return location.protocol == 'https:'
}

function createServer(address: string, password: string = '') {
  const server = new Server()
  server.Address = address
  server.Password = password
  return server
}

function addServer(server: Server, shouldSelect: boolean = false) {
  servers.value.push(server)
  save()

  if (shouldSelect) {
    selectServer(server)
  }
}

function deleteServer(server: Server) {
  const confirmDelete = window.confirm(`Are you sure you want to delete server "${server.Address}"?`)
  if (confirmDelete) {
    servers.value.splice(servers.value.indexOf(server), 1)
    if (selectedServer.value == server) {
      selectedServer.value = null
    }
  }
  save()
}

function selectServer(server: Server) {
  if (!server) {
    console.log('Tried selecting a non-existent server')
    return
  }
  selectedCommandIndex.value = 0
  selectedServer.value = selectedServer.value == server ? null : server
  localStorage.setItem('rcon-lastserver', server.Address)
  tryFocusLogs(true)
}

function findServer(address: string): Server {
  return servers.value.find((server) => {
    if (server.Address == address) {
      return server
    }
  }) as Server
}

function save() {
  localStorage.setItem(
    'rcon-servers',
    JSON.stringify(servers.value, (key, value) => {
      switch (key) {
        case 'Socket':
        case 'UserConnected':
        case 'IsConnected':
        case 'ServerInfo':
        case 'CarbonInfo':
        case 'PlayerInfo':
        case 'HeaderImage':
        case 'Description':
        case 'Logs':
        case 'Rpcs':
          return undefined
      }
      return value
    })
  )
}

function load() {
  try {
    const value = localStorage.getItem('rcon-servers')
    if (value) {
      ;(JSON.parse(value) as Server[]).forEach((server) => {
        const localServer = createServer(server.Address, server.Password)
        localServer.AutoConnect = server.AutoConnect
        localServer.Secure = server.Secure
        localServer.CachedHostname = server.CachedHostname
        localServer.CommandHistory = server.CommandHistory ?? []
        addServer(localServer)
      })

      setTimeout(() => {
        servers.value.forEach((server) => {
          if (server.AutoConnect) {
            server.connect()
          }
        })
      }, 250)
    }
    const lastSelectedServer = localStorage.getItem('rcon-lastserver')
    if (lastSelectedServer) {
      selectServer(findServer(lastSelectedServer))
    }
    const subtab = localStorage.getItem('rcon-subtab')
    if (subtab) {
      selectSubTab(Number(subtab))
    }
  } catch (ex) {
    console.error(ex)
  }
}

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
      server.sendCommand('serverinfo', 2)
      server.sendCommand('playerlist', 6)
      server.sendCommand('server.description', 5)
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

interface CommandSend {
  Message: string
  Identifier: number
}

interface CommandResponse {
  Message: string
  Identifier: number
  Type: LogType
  Stacktrace: string
}

enum LogType {
  Generic = 0,
  Error = 1,
  Warning = 2,
  Chat = 3,
  Report = 4,
  ClientPerf = 5,
  Subscription = 6,
}
</script>

<template>
  <div class="max-w-screen-lg mx-auto px-4 py-8 space-y-0">
    <div class="r-list">
      <button v-for="server in servers" :key="server.Address" :class="['r-button', { toggled: server == selectedServer }]" @click="selectServer(server)">
        <Dot
          :size="45"
          :style="'margin: -10px; color: ' + (server.IsConnecting ? 'yellow' : server.IsConnected ? 'green' : 'red') + '; filter: blur(1.5px);'"
        />
        <div style="display: grid">
          <p>
            <strong>{{ !server.CachedHostname ? 'Undefined' : server.CachedHostname }}</strong>
          </p>
          <p style="font-size: 12px; color: var(--vp-badge-info-text)">{{ server.Address }}</p>
        </div>
      </button>
      <button class="r-button" @click="addServer(createServer('', ''), true)">
        <Plus />
      </button>
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
      <div style="display: flex">
        <button
          class="r-button"
          :disabled="selectedServer.IsConnecting"
          @click="selectedServer.connect()"
          :style="'color: ' + (!selectedServer?.IsConnected ? 'var(--docsearch-footer-background);' : 'var(--c-carbon-3);') + 'font-size: small;'"
        >
          <Wifi :size="20" /> {{ selectedServer?.IsConnected ? 'Disconnect' : 'Connect' }}
        </button>
        <button class="r-button" @click="deleteServer(selectedServer)" style="color: var(--docsearch-footer-background); font-size: small">
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
          href="https://github.com/CarbonCommunity/Carbon.Documentation/blob/main/docs/.vitepress/components/RCon.vue"
          target="_blank"
          style="color: var(--docsearch-footer-background); font-size: small"
        >
          <CodeXml :size="20" /> Source <ExternalLink :size="13" />
        </a>
      </div>
    </div>

    <div v-if="enforceSecure()" class="r-settings" style="margin-top: 15px; font-size: small; opacity: 75%">
      <p style="text-align: center">
        You're currently using Carbon Documentation in HTTPS mode. <br />
        To use RCon without the SSL certificate requirement, update the URL to use
        <code><span style="color: var(--category-favourite); font-weight: bolder">http</span>://</code> instead of <code>https</code>.
      </p>
    </div>

    <div v-if="selectedServer && selectedServer.ServerInfo" style="margin-top: 15px; display: flow" class="r-settings">
      <div class="mb-5" style="display: flex">
        <button class="r-button" @click="selectSubTab(0)" :class="['r-button', { toggled: selectedSubtab == 0 }]" style="color: var(--docsearch-footer-background); font-size: small">
          Console
        </button>
        <button class="r-button" @click="selectSubTab(1)" :class="['r-button', { toggled: selectedSubtab == 1 }]" style="color: var(--docsearch-footer-background); font-size: small">
          Info
        </button>
        <button class="r-button" @click="selectSubTab(2)" :class="['r-button', { toggled: selectedSubtab == 2 }]" style="color: var(--docsearch-footer-background); font-size: small">
          Players ({{ selectedServer?.PlayerInfo?.length }})
        </button>
      </div>

      <div v-if="selectedSubtab == 0">
        <div
          v-if="selectedServer"
          ref="logContainer"
          class="p-4 rounded text-sm font-mono"
          style="overflow: auto; align-content: end; background-color: var(--vp-code-copy-code-bg); min-height: 300px; max-height: 700px; scrollbar-width: none"
        >
          <p v-for="(line, i) in selectedServer?.Logs" :key="i" v-html="line" style="white-space: pre-wrap; text-wrap-mode: nowrap"></p>
        </div>
        <div v-if="selectedServer" class="flex gap-2" style="align-items: center; background-color: var(--vp-code-copy-code-bg); padding: 10px">
          <div style="color: var(--category-misc); font-family: monospace; font-weight: 900; user-select: none">></div>
          <input
            style="font-family: monospace; color: var(--docsearch-muted-color)"
            class="w-full"
            spellcheck="false"
            v-model="command"
            @keydown.up.prevent="selectedServer?.selectHistory(true)"
            @keydown.down.prevent="selectedServer?.selectHistory(false)"
            @keyup.enter="selectedServer?.sendCommand(command, 1)"
          />
          <button @click="selectedServer?.clearLogs()" class="r-send-button"><span style="user-select: none">Clear</span></button>
          <button @click="selectedServer?.sendCommand(command, 1)" class="r-send-button"><span style="user-select: none">Send</span></button>
        </div>
      </div>
      <div v-else-if="selectedSubtab == 1">
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
      <div v-else-if="selectedSubtab == 2" style="overflow: auto;">
        <table tabindex="0" class="vp-doc table" style="">
          <thead>
            <tr>
              <th class="vp-doc th"></th>
              <th class="vp-doc th">Player</th>
              <th class="vp-doc th text-center">Health</th>
              <th class="vp-doc th">Connected</th>
              <th class="vp-doc th"></th>
            </tr>
          </thead>
          <tr v-for="player in selectedServer.PlayerInfo">
            <td class="vp-doc td">
              <span style="display: flex; gap: 5px;" class="ml-2 text-xs text-slate-400"><img :src="flags[player.Address]" class="size-4"/> {{ player.Ping }}ms</span>
            </td>
            <td class="vp-doc td">
              <strong>{{player.DisplayName}}</strong> <span class="text-xs text-slate-400">[<a style="color: inherit; display: inline-flex;" :href="'http://steamcommunity.com/profiles/' + player.SteamID" target="_blank">{{ player.SteamID }} <ExternalLink class="mx-1" :size="12"/> </a>]</span>
            </td>
            <td style="position: relative;">
              <div :style="'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #41642da6; width: ' + player.Health + '%'"></div>
              <div style="opacity: 50%; font-size: smaller">{{ player.Health.toFixed(1) }}</div>
            </td>
            <td class="vp-doc td">
              <span class="text-xs text-slate-400">{{ formatDuration(player.ConnectedSeconds) }}</span>
            </td>
            <td class="vp-doc td">
              <button class="r-send-button" @click="showInventory(player.SteamID)">Inventory</button>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div v-if="!selectedServer" style="color: var(--category-misc); font-size: small; text-align: center; user-select: none">
      <p>No server selected</p>
    </div>
  </div>

  <div v-if="selectedPlayer" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="hideInventory()">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4" @click.stop>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold"></h3>
        <button @click="hideInventory()" class="text-gray-500 hover:text-gray-700">
          <X :size="20" />
        </button>
      </div>
      <div class="items-center" style="justify-items: center;">      
        <div class="inventory-grid">
          <div v-for="slot in mainSlots" :key="slot.Position" class="slot" @dragover.prevent @drop="handleDrop(slot)">
            <img v-if="slot.hasItem()" class="slot-img" :src="`https://cdn.carbonmod.gg/items/${slot.ShortName}.png`" draggable="true" @dragstart="handleDrag(slot)"/>
            <span v-if="slot.hasItem() && slot.Amount > 1" class="slot-amount">x{{ slot.Amount }}</span>
            <div v-if="slot.hasItem() && slot.HasCondition" class="slot-condition" :style="'height: ' + (slot.ConditionNormalized * 100) + '%;'"></div>
          </div>
        </div>
        <div class="inventory-grid-clothing mt-5">
          <div v-for="slot in wearSlots" :key="slot.Position" class="slot" @dragover.prevent @drop="handleDrop(slot)">
            <img v-if="slot.hasItem()" class="slot-img" :src="`https://cdn.carbonmod.gg/items/${slot.ShortName}.png`" draggable="true" @dragstart="handleDrag(slot)"/>
            <span v-if="slot.hasItem() && slot.Amount > 1" class="slot-amount">x{{ slot.Amount }}</span>
            <div v-if="slot.hasItem() && slot.HasCondition" class="slot-condition" :style="'height: ' + (slot.ConditionNormalized * 100) + '%;'"></div>
          </div>
        </div>
        <div class="inventory-grid mt-5">
          <div v-for="slot in beltSlots" :key="slot.Position" class="slot" @dragover.prevent @drop="handleDrop(slot)">
            <div v-if="selectedSlot == slot.Position" class="slot-active"></div>
            <img v-if="slot.hasItem()" class="slot-img" :src="`https://cdn.carbonmod.gg/items/${slot.ShortName}.png`" draggable="true" @dragstart="handleDrag(slot)"/>
            <span v-if="slot.hasItem() && slot.Amount > 1" class="slot-amount">x{{ slot.Amount }}</span>
            <div v-if="slot.hasItem() && slot.HasCondition" class="slot-condition" :style="'height: ' + (slot.ConditionNormalized * 100) + '%;'"></div>
          </div>
        </div>
        <div class="inventory-grid-tools mt-5">
          <div v-for="slot in toolSlots" :key="slot.Position" class="slot-tool opacity-50 items-center justify-center " @dragover.prevent @drop="handleDrop(slot)">
            <span v-if="slot.Container == 10" class="opacity-50 select-none justify-items-center text-xs"><ArrowUpFromDot /> Drop</span>
            <span v-if="slot.Container == 11" class="opacity-50 select-none justify-items-center text-xs"><Trash2 /> Discard</span>
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
  grid-template-columns: repeat(2, 64px);
  grid-gap: 6px;
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
  width: 64px;
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
  font-family:'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
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

.r-send-button {
  text-decoration: auto;
  font-family: monospace;
  color: var(--category-misc);
  background-color: transparent;
  padding: 6px 12px;
  border-radius: 0px;
  cursor: pointer;
  transition: background-color, color;
}

.r-send-button:hover {
  background-color: var(--category-misc);
  color: white;
}

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
</style>