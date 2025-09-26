import { ref, shallowRef } from 'vue'
import { command, commandIndex, tryFocusLogs } from './ControlPanel.Console'
import { message, tryFocusChat } from './ControlPanel.Chat'
import { activeSlot, beltSlots, clearInventory, hideInventory, mainSlots, wearSlots } from './ControlPanel.Inventory'
import { refreshPermissions } from './ControlPanel.Tabs.Permissions.vue'
import { resetEntities } from './ControlPanel.Entities'
import MD5 from 'crypto-js/md5';

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

class BinaryReader {
  private view: DataView;
  private offset = 0;
  private decoder = new TextDecoder();

  constructor(private buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  int32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  uint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  float(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  byte(): number {
    return this.view.getUint8(this.offset++);
  }

  bytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  string(length: number): string {
    const bytes = this.bytes(length);
    return this.decoder.decode(bytes);
  }

  cstring(): string {
    const start = this.offset;
    while (this.offset < this.view.byteLength && this.view.getUint8(this.offset) !== 0) {
      this.offset++;
    }
    const bytes = new Uint8Array(this.buffer, start, this.offset - start);
    this.offset++;
    return this.decoder.decode(bytes);
  }

  skip(bytes: number) {
    this.offset += bytes;
  }

  get position() {
    return this.offset;
  }

  get length() {
    return this.view.byteLength;
  }
}

class BinaryWriter {
  private view: DataView;
  private buf: ArrayBuffer;
  private u8: Uint8Array;
  private offset = 0;
  private encoder = new TextEncoder();

  constructor(initialCapacity = 1024) {
    this.buf = new ArrayBuffer(initialCapacity);
    this.view = new DataView(this.buf);
    this.u8 = new Uint8Array(this.buf);
  }

  private ensure(extra: number) {
    const need = this.offset + extra;
    if (need <= this.view.byteLength) return;

    let cap = this.view.byteLength || 1;
    while (cap < need) cap *= 2;

    const next = new ArrayBuffer(cap);
    new Uint8Array(next).set(this.u8.subarray(0, this.offset));
    this.buf = next;
    this.view = new DataView(this.buf);
    this.u8 = new Uint8Array(this.buf);
  }

  int32(value: number): void {
    this.ensure(4);
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
  }

  uint32(value: number): void {
    this.ensure(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  float(value: number): void {
    this.ensure(4);
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }

  byte(value: number): void {
    this.ensure(1);
    this.view.setUint8(this.offset, value & 0xff);
    this.offset += 1;
  }

  bytes(data: Uint8Array | ArrayBuffer): void {
    const src = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.ensure(src.length);
    this.u8.set(src, this.offset);
    this.offset += src.length;
  }

  string(value: string, length?: number): void {
    const bytes = this.encoder.encode(value);

    if (length === undefined) {
      this.uint32(bytes.length);
      this.ensure(bytes.length);
      this.u8.set(bytes, this.offset);
      this.offset += bytes.length;
      return;
    }

    this.ensure(length);
    const n = Math.min(bytes.length, length);
    this.u8.set(bytes.subarray(0, n), this.offset);
    if (n < length) this.u8.fill(0, this.offset + n, this.offset + length);
    this.offset += length;
  }

  skip(bytes: number): void {
    this.ensure(bytes);
    this.u8.fill(0, this.offset, this.offset + bytes);
    this.offset += bytes;
  }

  get length(): number {
    return this.offset;
  }

  get position(): number {
    return this.offset;
  }

  get capacity(): number {
    return this.view.byteLength;
  }

  toArrayBuffer(): ArrayBuffer {
    return this.buf.slice(0, this.offset);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf, 0, this.offset);
  }
}

export const md5 = (s: string) => String(md5FirstUint32LE(s));

export function md5FirstUint32LE(str: string): number {
  const wa = MD5(str);
  const w0 = wa.words[0] | 0;
  const b0 = (w0 >>> 24) & 0xff;
  const b1 = (w0 >>> 16) & 0xff;
  const b2 = (w0 >>>  8) & 0xff;
  const b3 =  w0         & 0xff;
  return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
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

  switch(index) {
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
  Rpcs: Record<number, (...args: unknown[]) => void> = {}

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

  registerRpcs() {
    this.Rpcs = {}

    this.Rpcs[this.getRpc('MoveInventoryItem')] = () => {}

    this.Rpcs[this.getRpc('SendPlayerInventory')] = (data: any) => {
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
    }

    this.Rpcs[this.getRpc('TestCall')] = (data) => {
      console.log(data)
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
    if(this.Bridge) {
      this.Socket.binaryType = 'arraybuffer';
    }  
    this.IsConnecting = true

    this.Socket.onopen = () => {
      this.IsConnecting = false
      this.IsConnected = true

      this.registerRpcs()
      this.sendCommand('serverinfo', 2)
      this.sendCommand('playerlist', 6)
      this.sendCommand('console.tail', 7)
      this.sendCommand('chat.tail', 8)
      this.sendCommand('c.version', 3)
      this.sendCommand('server.headerimage', 4)
      this.sendCommand('server.description', 5)
      this.sendRpc("Test", 125, "hello wordle!!sdf as")
    }
    this.Socket.onclose = () => {
      this.clear()
    }
    this.Socket.onerror = () => {
      this.UserConnected = false
    }
    this.Socket.onmessage = (event) => {
      if(this.Bridge) {
        let bytes: Uint8Array;
        if (event.data instanceof ArrayBuffer) {
          bytes = new Uint8Array(event.data);
        }
        const reader = new BinaryReader(event.data);
        console.log(reader.int32())
        console.log(reader.int32())
      } 
      else {
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
        if(match) {
          this.appendChat({
            Username: match[1],
            UserId: match[2],
            Message: match[3]
          })
          return
        }

        this.appendLog(resp.Message)
        tryFocusLogs()
      }
    }
  }

  fetchInventory(playerId: number) {
    this.sendRpc("SendPlayerInventory", playerId)
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
      commandIndex.value = 0

      if (this.CommandHistory.length == 0 || this.CommandHistory[this.CommandHistory.length - 1] != input) {
        this.CommandHistory.unshift(input)
      }
    }

    tryFocusLogs(false)
  }

  sendMessage(input: string, clearMessage: boolean = true) {
    this.sendCommand(`say ${input}`, 1)
    this.Chat.push(`SERVER: ${input}`)
    if(clearMessage) {
      message.value = ''
    }
  }

  getRpc(id: string) : number {
    const idPrefix = this.Bridge ? "RPC" : "CMD";
    return Number.parseInt(md5(`${idPrefix}_${id}`))
  }

  sendRpc(id: string, ...args: unknown[]) {
    if(this.Bridge) {
      const write = new BinaryWriter();
      write.int32(0);
      write.uint32(this.getRpc(id));
      for (let i = 0; i < args.length; i++) {
        const value = args[i]
        const type = typeof value
        switch(type) {
          case 'number':
            write.int32(value as number)
            break;
          case 'string':
            write.string(value as string)
            break;
        }
      }
      this.Socket?.send(write.toArrayBuffer())
    }
    else {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        args[i] = `"${arg}"`
      }
      this.sendCommand(`c.webrcon.rpc ${this.getRpc(id)} ${args.join(' ')}`, 100)
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
        // c.webrcon.rpc
        const rpcId = Number(data.rpcId)
        if (rpcId in this.Rpcs) {
          this.Rpcs[rpcId](data)
        }
        break
      }
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
    this.Chat.push(`<a style="color: ${message.Color}" href="http://steamcommunity.com/profiles/${message.UserId}" target="_blank">${message.Username}</a>: ${message.Message}`)
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
