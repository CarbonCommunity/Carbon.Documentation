import { BinaryReader } from '@/utils/BinaryReader'
import { BinaryWriter } from '@/utils/BinaryWriter'
import MD5 from 'crypto-js/md5'
import { ref, shallowRef } from 'vue'
import { message, tryFocusChat } from './ControlPanel.Chat'
import { command, commandIndex, tryFocusLogs } from './ControlPanel.Console'
import { resetEntities } from './ControlPanel.Entities'
import { activeSlot, beltSlots, clearInventory, hideInventory, mainSlots, wearSlots } from './ControlPanel.Inventory'
import { refreshPermissions } from './ControlPanel.Tabs.Permissions.vue'

export const selectedServer = ref<Server | null>(null)
export const selectedSubTab = shallowRef<number>(0)
export const servers = ref<Server[]>([])
export const geoFlagCache = ref<{ [key: string]: string }>({})

const isLoadedServers = shallowRef<boolean>(false)

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

export const md5 = (s: string) => String(md5FirstUint32LE(s))

export function md5FirstUint32LE(str: string): number {
  const wa = MD5(str)
  const w0 = wa.words[0] | 0
  const b0 = (w0 >>> 24) & 0xff
  const b1 = (w0 >>> 16) & 0xff
  const b2 = (w0 >>> 8) & 0xff
  const b3 = w0 & 0xff
  return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0
}

export async function fetchGeolocation(ip: string) {
  if (ip == '127.0.0.1') {
    return
  }

  const url = `https://api.iplocation.net/?ip=${ip.split(':')[0]}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`IPAPI responded with status ${response.status}`)
    }

    const data = await response.json()
    if (geoFlagCache.value && !(ip in geoFlagCache.value)) {
      geoFlagCache.value[ip] = `https://flagcdn.com/32x24/${data.country_code2.toString().toLowerCase()}.png`
    }
  } catch (ex) {
    console.log(ex)
  }
}

export function isUsingHttps(): boolean {
  return location.protocol == 'https:'
}

export function createServer(address: string, password: string = '') {
  const server = new Server()
  server.Address = address
  server.Password = password
  return server
}

export function addServer(server: Server, shouldSelect: boolean = false) {
  servers.value.push(server)
  save()

  if (shouldSelect) {
    selectServer(server)
  }
}

export function hasServer(address: string, password: string): boolean {
  servers.value.forEach((server: Server) => {
    if (server.Address == address && server.Password == password) {
      return true
    }
  })
  return false
}

export function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function deleteServer(server: Server, e: MouseEvent) {
  const confirmDelete = e.shiftKey || window.confirm(`Are you sure you want to delete server "${server.Address}"?`)
  if (confirmDelete) {
    const index = servers.value.indexOf(server)
    servers.value.splice(index, 1)
    if (selectedServer.value == server) {
      selectedServer.value = index > 0 ? servers.value[index - 1] : null
    }
  }
  save()
}

export function selectServer(server: Server) {
  if (!server) {
    console.log('Tried selecting a non-existent server')
    return
  }
  commandIndex.value = 0
  selectedServer.value = selectedServer.value == server ? null : server
  localStorage.setItem('rcon-lastserver', server.Address)
  refreshPermissions()
  resetEntities()
  tryFocusLogs(true)
  tryFocusChat(true)
}

export function findServer(address: string): Server {
  return servers.value.find((sv) => {
    if (sv.Address == address) {
      return sv
    }
  }) as Server
}

export function selectSubTab(index: number) {
  selectedSubTab.value = index
  localStorage.setItem('rcon-subtab', index.toString())
  save()

  switch (index) {
    case 0:
      tryFocusLogs(true)
      break

    case 1:
      tryFocusChat(true)
      break
  }
}

function exportToJson(): string {
  return JSON.stringify(servers.value, (key, value) => {
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
      case 'Chat':
      case 'Rpcs':
        return undefined
    }
    return value
  })
}

export function exportSave() {
  const confirm = window.confirm(`Are you sure you wanna copy servers to clipboard?`)
  if (confirm) {
    navigator.clipboard.writeText(exportToJson())
  }
}

export function importSave() {
  const confirm = window.confirm(`Are you sure you wanna import and append the servers from the clipboard?`)
  if (confirm) {
    navigator.clipboard.readText().then((text) => {
      importFromJson(text)
    })
  }
}

export function shiftServer(index: number, before: boolean) {
  const list = servers.value
  if (!list || index < 0 || index >= list.length) {
    return
  }
  const newIndex = before ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= list.length) {
    return
  }

  [list[index], list[newIndex]] = [list[newIndex], list[index]]
}

function importFromJson(data: string) {
  try {
    if (data) {
      ;(JSON.parse(data) as Server[]).forEach((server) => {
        if (hasServer(server.Address, server.Password)) {
          return
        }
        const localServer = createServer(server.Address, server.Password)
        localServer.AutoConnect = server.AutoConnect
        localServer.WideScreen = server.WideScreen
        localServer.Bridge = server.Bridge
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
  } catch (ex) {
    console.error(ex)
  }
}

export function save() {
  localStorage.setItem('rcon-servers', exportToJson())
}

export function load() {
  if (isLoadedServers.value) {
    return
  }

  isLoadedServers.value = true
  importFromJson(localStorage.getItem('rcon-servers') as string)

  const lastSelectedServer = localStorage.getItem('rcon-lastserver')
  if (lastSelectedServer) {
    selectServer(findServer(lastSelectedServer))
  }
  const subtab = localStorage.getItem('rcon-subtab')
  if (subtab) {
    selectSubTab(Number(subtab))
  }
}

export class Server {
  Address = ''
  Password = ''
  Socket: WebSocket | null = null
  Logs: string[] = []
  Chat: string[] = []
  CommandHistory: string[] = []
  AutoConnect = false
  WideScreen = false
  Secure = false
  Bridge = false
  CachedHostname = ''
  IsConnected = false
  IsConnecting = false
  UserConnected = false
  ServerInfo: any | null = null
  CarbonInfo: any | null = null
  PlayerInfo: any | null = null
  HeaderImage = ''
  Description = ''
  CommandCallbacks: Record<number, (...args: unknown[]) => void> = {}
  RpcCallbacks: Record<number, (...args: unknown[]) => void> = {}
  RpcPermissions: any | null = []

  hasPermission(permission: string) {
    if (permission in this.RpcPermissions) {
      return this.RpcPermissions[permission]
    }
    return true
  }

  clear() {
    this.IsConnecting = false
    this.IsConnected = false
    this.ServerInfo = null
    this.CarbonInfo = null
    this.PlayerInfo = null
    this.HeaderImage = ''
    this.Description = ''
    this.Socket = null

    if (selectedServer.value == this) {
      hideInventory()
      tryFocusLogs()
      tryFocusChat()
    }
  }

  registerCommands() {
    this.CommandCallbacks = {}

    this.setCommand('MoveInventoryItem', () => {})

    this.setCommand('SendPlayerInventory', (data: any) => {
      clearInventory()
      try {
        activeSlot.value = data.value.ActiveSlot
        data.value.Main.forEach((item: any) => {
          if (item.Position == -1 || item.Position >= mainSlots.value.length) {
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
        })
        data.value.Belt.forEach((item: any) => {
          if (item.Position == -1 || item.Position >= beltSlots.value.length) {
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
        })
        data.value.Wear.forEach((item: any) => {
          if (item.Position == -1 || item.Position >= wearSlots.value.length) {
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
        })
      } catch (e) {
        console.error(e)
      }
    })

    this.setCommand('TestCall', (data) => {
      console.log(data)
    })
  }

  registerRpcs() {
    this.setRpc('Test', (read) => {
      console.log(read.string())
      console.log(read.int32())
    })
    this.setRpc('ServerInfo', (read) => {
      this.ServerInfo = {
        Hostname: read.string(),
        MaxPlayers: read.int32(),
        Players: read.int32(),
        Queued: read.int32(),
        Joining: read.int32(),
        ReservedSlots: read.int32(),
        EntityCount: read.int32(),
        GameTime: read.string(),
        Uptime: read.int32(),
        Map: read.string(),
        Framerate: read.float(),
        Memory: read.int32(),
        MemoryUsageSystem: read.int32(),
        Collections: read.int32(),
        NetworkIn: read.int32(),
        NetworkOut: read.int32(),
        Restarting: read.bool(),
        SaveCreatedTime: read.string(),
        Version: read.int32(),
        Protocol: read.string(),
      } as const
      this.CachedHostname = this.ServerInfo.Hostname
    })
    this.setRpc('CarbonInfo', (read) => {
      this.CarbonInfo = {
        Message: read.string(),
      }
    })
    this.setRpc('ServerDescription', (read) => {
      this.Description = read.string()
    })
    this.setRpc('ServerHeaderImage', (read) => {
      this.HeaderImage = read.string()
    })
    this.setRpc('SendPlayerInventory', (read) => {
      clearInventory()
      activeSlot.value = read.int32()
      this.readInventory(read, mainSlots)
      this.readInventory(read, beltSlots)
      this.readInventory(read, wearSlots)
    })
    this.setRpc('Players', (read) => {
      this.PlayerInfo = []
      const playerCount = read.int32()
      for (let i = 0; i < playerCount; i++) {
        this.PlayerInfo.push({
          SteamID: read.uint64(),
          OwnerSteamID: read.uint64(),
          DisplayName: read.string(),
          Ping: read.int32(),
          Address: read.string(),
          EntityId: read.uint64(),
          ConnectedSeconds: read.int32(),
          ViolationLevel: read.float(),
          CurrentLevel: read.int32(),
          UnspentXp: read.int32(),
          Health: read.float(),
        })
      }
    })
    this.setRpc('ConsoleTail', (read) => {
      const logs = []
      const logCount = read.int32()
      for (let i = 0; i < logCount; i++) {
        logs.push({
          Message: read.string(),
          Type: read.string(),
          Time: read.int32(),
        })
      }
      logs.forEach((log: any) => {
        this.appendLog(log.Message as string)
      })
      tryFocusLogs(true)
    })
    this.setRpc('ConsoleLog', (read) => {
      const log = {
        Message: read.string(),
        Type: read.string(),
        Time: read.int32(),
      }
      this.appendLog(log.Message as string)
      tryFocusLogs(true)
    })
    this.setRpc('ChatTail', (read) => {
      const messages = []
      const messageCount = read.int32()
      console.log(messageCount)
      for (let i = 0; i < messageCount; i++) {
        messages.push({
          Channel: read.int32(),
          Message: read.string(),
          UserId: read.string(),
          Username: read.string(),
          Color: read.string(),
          Time: read.int32()
        })
      }
      messages.forEach((log: any) => {
        this.appendChat(log)
      })
      tryFocusChat(true)
    })
    this.setRpc('ChatLog', (read) => {
      const message = {
          Channel: read.int32(),
          Message: read.string(),
          UserId: read.string(),
          Username: read.string(),
          Color: read.string(),
          Time: read.int32()
      }
      this.appendChat(message)
      tryFocusChat(true)
    })
    this.setRpc('AccountPermissions', (read) => {
      this.RpcPermissions['console_view'] = read.bool()
      this.RpcPermissions['console_input'] = read.bool()
      this.RpcPermissions['chat_view'] = read.bool()
      this.RpcPermissions['chat_input'] = read.bool()
      this.RpcPermissions['players_view'] = read.bool()
      this.RpcPermissions['players_ip'] = read.bool()
      this.RpcPermissions['players_inventory'] = read.bool()
      this.RpcPermissions['entities_view'] = read.bool()
      this.RpcPermissions['entities_edit'] = read.bool()
      this.RpcPermissions['permissions_view'] = read.bool()
      this.RpcPermissions['permissions_edit'] = read.bool()
    })
  }

  readInventory(read: any, inventory: any) {
    const count = read.int32()
    for (let i = 0; i < count; i++) {
      const item = this.readItem(read)
      const position = item.Position
      if (position == -1 || position >= inventory.value.length) {
        continue
      }
      const slot = inventory.value[position]
      slot.ItemId = item.ItemId
      slot.ShortName = item.ShortName
      slot.Amount = item.Amount
      slot.MaxCondition = item.MaxCondition
      slot.Condition = item.Condition
      slot.ConditionNormalized = item.ConditionNormalized
      slot.HasCondition = item.HasCondition
    }
  }

  readItem(read: BinaryReader) {
    return {
      ItemId: read.int32(),
      ShortName: read.string(),
      Amount: read.int32(),
      Position: read.int32(),
      MaxCondition: read.float(),
      Condition: read.float(),
      ConditionNormalized: read.float(),
      HasCondition: read.bool(),
    }
  }

  connect() {
    save()
    this.UserConnected = true
    if (this.Socket != null) {
      this.Socket.close()
      this.Socket.onclose?.(
        new CloseEvent('close', {
          wasClean: true,
          code: 1000,
          reason: 'Manual close',
        })
      )
      this.UserConnected = false
      return
    }

    this.Socket = new WebSocket((this.Secure ? 'wss' : 'ws') + '://' + this.Address + '/' + this.Password)
    if (this.Bridge) {
      this.Socket.binaryType = 'arraybuffer'
    }
    this.IsConnecting = true

    this.Socket.onopen = () => {
      this.IsConnecting = false
      this.IsConnected = true

      this.registerCommands()
      this.registerRpcs()
      if (this.Bridge) {
        this.sendCall('ServerInfo')
        this.sendCall('CarbonInfo')
        this.sendCall('ServerDescription')
        this.sendCall('ServerHeaderImage')
        this.sendCall('Players')
        this.sendCall('ConsoleTail', 200)
        this.sendCall('ChatTail', 200)
        this.sendCall('AccountPermissions')
      } else {
        this.sendCommand('serverinfo', 2)
        this.sendCommand('playerlist', 6)
        this.sendCommand('console.tail', 7)
        this.sendCommand('chat.tail', 8)
        this.sendCommand('c.version', 3)
        this.sendCommand('server.headerimage', 4)
        this.sendCommand('server.description', 5)
      }
    }
    this.Socket.onclose = () => {
      this.clear()
    }
    this.Socket.onerror = () => {
      this.UserConnected = false
    }
    this.Socket.onmessage = (event) => {
      if (this.Bridge) {
        let bytes: Uint8Array
        if (event.data instanceof ArrayBuffer) {
          bytes = new Uint8Array(event.data)
        }
        const read = new BinaryReader(event.data)
        switch (read.int32()) {
          case 0:
            if (this.onIdentifiedRpc(read)) {
              return
            }
            break
        }
      } else {
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

        const match = resp.Message.match(/^\[CHAT\]\s+(.+?)\[(\d+)\]\s+:\s+(.+)$/)
        if (match) {
          this.appendChat({
            Username: match[1],
            UserId: match[2],
            Message: match[3],
          })
          return
        }

        this.appendLog(resp.Message)
        tryFocusLogs()
      }
    }
  }

  fetchInventory(playerId: number) {
    this.sendCall('SendPlayerInventory', playerId)
  }

  sendCommand(input: string, id: number = 1) {
    if (!input) {
      return
    }

    if (this.Bridge) {
      this.sendCall('ConsoleInput', input)
    } else {
      if (this.Socket && this.IsConnected) {
        const packet: CommandSend = {
          Message: input,
          Identifier: id,
        }
        this.Socket.send(JSON.stringify(packet))
      }
    }

    if (input == command.value) {
      this.appendLog('<span style="color: var(--category-misc);"><strong>></strong></span> ' + input)
      command.value = ''
      commandIndex.value = 0

      if (this.CommandHistory.length == 0 || this.CommandHistory[this.CommandHistory.length - 1] != input) {
        this.CommandHistory.unshift(input)
      }
    }

    tryFocusLogs(false)
  }

  sendMessage(input: string, clearMessage: boolean = true) {
    if(this.Bridge) {
      this.sendCall('ChatInput', "SERVER", input, "#fff", "0")
    } else { 
      this.sendCommand(`say ${input}`, 1)
    }
    this.appendChat({
      Message: input,
      Username: "SERVER",
      UserId: 0,
      Color: "#fff",
      Time: Math.floor(Date.now() / 1000)
    })
    if (clearMessage) {
      message.value = ''
    }
  }

  getId(id: string): number {
    const idPrefix = this.Bridge ? 'RPC' : 'CMD'
    return Number.parseInt(md5(`${idPrefix}_${id}`))
  }

  setCommand(id: string, callback: (...args: unknown[]) => void) {
    this.CommandCallbacks[this.getId(id)] = callback
  }

  setRpc(id: string, callback: (...args: unknown[]) => void) {
    this.RpcCallbacks[this.getId(id)] = callback
  }

  sendCall(id: string, ...args: unknown[]) {
    if (this.Bridge) {
      const write = new BinaryWriter()
      write.int32(0)
      write.uint32(this.getId(id))
      for (let i = 0; i < args.length; i++) {
        const value = args[i]
        const type = typeof value
        switch (type) {
          case 'bigint':
            write.uint64(value as bigint)
            break
          case 'number':
            write.int32(value as number)
            break
          case 'string':
            write.string(value as string)
            break
        }
      }
      this.Socket?.send(write.toArrayBuffer())
    } else {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        args[i] = `"${arg}"`
      }
      this.sendCommand(`c.webpanel.cmd ${this.getId(id)} ${args.join(' ')}`, 100)
    }
  }

  onIdentifiedCommand(id: number, data: any) {
    switch (id) {
      case 0: // Rust output
      case 1: // User input
        return false
      case 2: // serverinfo
        this.ServerInfo = data
        this.CachedHostname = this.ServerInfo?.Hostname
        break
      case 6: // playerinfo
        this.PlayerInfo = data
        this.PlayerInfo?.forEach((player: any) => {
          if (!(player.Address in geoFlagCache.value)) {
            fetchGeolocation(player.Address)
          }
        })
        break
      case 7: // console.tail
        data.forEach((log: any) => {
          this.appendLog(log.Message as string)
        })
        tryFocusLogs(true)
        break
      case 8: // chat.tail
        data.forEach((log: any) => {
          this.appendChat(log)
        })
        tryFocusChat(true)
        break
      case 3: // carboninfo
        this.CarbonInfo = data
        break
      case 4: // headerimage
        this.HeaderImage = data.Message.toString().split(' ').slice(1, 2).join(' ').replace(/['"]/g, '')
        if (!isValidUrl(this.HeaderImage)) {
          this.HeaderImage = ''
        }
        break
      case 5: // description
        this.Description = data.Message.toString().split(' ').slice(1, 1000).join(' ').replace(/['"]/g, '')
        break
      case 100: {
        // c.webpanel.cmd
        const rpcId = Number(data.rpcId)
        if (rpcId in this.CommandCallbacks) {
          this.CommandCallbacks[rpcId](data)
        }
        break
      }
    }

    return true
  }

  onIdentifiedRpc(read: BinaryReader): boolean {
    const rpcId = read.uint32()
    if (rpcId in this.RpcCallbacks) {
      this.RpcCallbacks[rpcId](read)
    }
    return true
  }

  toggleAutoConnect() {
    this.AutoConnect = !this.AutoConnect
    save()
  }

  toggleWideScreen() {
    this.WideScreen = !this.WideScreen
    save()
  }

  toggleBridge() {
    this.Bridge = !this.Bridge
    save()
  }

  toggleSecure() {
    this.Secure = !this.Secure
    save()
  }

  appendLog(log: string) {
    this.Logs.push(log)
  }

  appendChat(message: any) {
    this.Chat.push(
      `<span class="text-zinc-500 text-xs">${new Date(message.Time * 1000).toLocaleTimeString()}</span> <a style="color: ${message.Color}" href="http://steamcommunity.com/profiles/${message.UserId}" target="_blank">${message.Username}</a>: ${message.Message}`
    )
  }

  selectHistory(up: boolean) {
    if (up) {
      commandIndex.value++
    } else {
      commandIndex.value--
    }

    if (commandIndex.value > this.CommandHistory.length - 1) {
      commandIndex.value = -1
    } else if (commandIndex.value < -1) {
      commandIndex.value = this.CommandHistory.length - 1
    }

    if (commandIndex.value == -1) {
      command.value = ''
      return
    }

    if (this.CommandHistory.length > 0) {
      command.value = this.CommandHistory[commandIndex.value]
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
