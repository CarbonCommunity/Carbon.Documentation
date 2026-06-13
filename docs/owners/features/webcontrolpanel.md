---
title: WebControlPanel
description: Remotely manage your Rust server from the browser — console, chat, players, permissions, entities, plugins and the profiler, all in one place.
slug: webcontrolpanel
---

<script setup lang="ts">
import CarbonButton from '@/components/CarbonButton.vue'
import { GaugeIcon } from 'lucide-vue-next'
</script>

# 🛰️ WebControlPanel

The **WebControlPanel** is Carbon's built-in remote admin system. You turn it on inside your
server, open the [Control Panel](/tools/control-panel/) website in your browser, log in, and you
get a live dashboard for your server — no extra software to install and nothing to host yourself.

Think of it as a much richer, Carbon-aware version of RCon.

:::tip Open the panel
The web panel is hosted for you on the docs site — there's nothing to download.

<CarbonButton :icon="GaugeIcon" href="/tools/control-panel/" text="Open Control Panel"/><p></p>
:::

## What can it do?

Once connected, you get a set of tabs:

| Tab | What it's for |
| --- | --- |
| **Console** | Live server log output, and send commands (like RCon). |
| **Chat** | Watch in-game chat and send messages as a custom name. |
| **Information** | Server description, header image and general details. |
| **Players** | Browse online players, peek at their inventory, see their IP/location. |
| **Permissions** | View and edit Carbon permission groups. |
| **Entities** | Search, inspect, edit and kill entities on the server. |
| **Profiler** | Start/stop the [Mono profiler](/devs/features/mono-profiler), and load or delete recordings. |
| **Plugins** | List, load, unload and inspect your plugins. |
| **Stats** | General client-side stats. |

You can connect to **multiple servers at once** and switch between them from the top bar.

## Turning it on

By default the WebControlPanel is **disabled**. There are two ways to enable it.

### Option A — console commands (easiest)

Run these on your server console:

```
webpanel.setenabled true
```

That flips it on, saves the config and starts the server. A few more commands are available:

| Command | What it does |
| --- | --- |
| `webpanel.setenabled true/false` | Start or stop the panel server. |
| `webpanel.loadcfg` | Reload the config from disk (re-reads accounts). |
| `webpanel.savecfg` | Save the current config to disk. |
| `webpanel.clients` | List everyone currently connected to the panel. |
| `webpanel.connected` | Whether the panel server is currently running. |

> All of these require admin (auth level 2).

### Option B — edit the config file

The config lives at:

```
carbon/config.webpanel.json
```

It's created automatically the first time Carbon runs. Here's what it looks like:

```json
{
  "Enabled": false,
  "Panel": {
    "MapImageScale": 1.0
  },
  "BridgeServer": {
    "Ip": "localhost",
    "Port": 0,
    "MaxConnections": 500,
    "MaxConnectionsPerIp": 5
  },
  "WebAccounts": [
    {
      "Name": "owner",
      "Password": "aB3xZ9q",
      "Permissions": { "...": "all true" }
    }
  ]
}
```

To enable it you need to, at minimum:

1. Set `"Enabled": true`.
2. Give `BridgeServer.Port` a real port (it must not be `0`).
3. Set `BridgeServer.Ip` — can keep it `localhost` as long as the port is exposed outside your network if you want to access it over the internet.

Then run `webpanel.loadcfg` (or restart the server) to apply it.

> The panel only starts when `Enabled` is `true` **and** the IP isn't empty **and** the port isn't `0`.

## Logging in

The panel doesn't use a username field — **the password _is_ your login**. On first run Carbon
generates a random 7-character password for the default `owner` account, which has every
permission enabled.

In the [Control Panel](/tools/control-panel/) website:

1. Click **+** to add a server.
2. Fill in the **Address** (e.g. `your-server-ip:28507`) and the **Password** from your config.
3. Toggle **Bridge** on.
4. Click **Connect**.

::: warning HTTPS vs HTTP
Browsers block insecure (`ws://`) connections from an `https://` page. If you're connecting to a
remote server without an SSL certificate, open the panel over **`http://`** instead of `https://`.
Connecting to your own machine (`localhost` / `127.0.0.1`) works either way.
:::

## Accounts & permissions

You can create as many accounts as you like, each with its own password and its own set of
permissions. This lets you hand out limited access — for example, a moderator who can read chat
and the console but can't touch plugins or permissions.

Each account has these toggles:

| Permission | Grants |
| --- | --- |
| `console_view` / `console_input` | Read the console / send commands. |
| `chat_view` / `chat_input` | Read chat / send chat messages. |
| `players_view` | See the player list. |
| `players_ip` | See player IP addresses & locations. |
| `players_inventory` | View & edit player inventories. |
| `entities_view` / `entities_edit` | Inspect entities / edit & kill them. |
| `permissions_view` / `permissions_edit` | View / change permission groups. |
| `profiler_view` / `profiler_load` / `profiler_edit` | View profiles / load them / start-stop profiling. |
| `plugins_view` / `plugins_edit` | List plugins / load & unload them. |
| `map_view` / `map_entities` | See the map / see entities plotted on the map. |

Example of an extra, restricted account:

```json
{
  "Name": "moderator",
  "Password": "choose-something-strong",
  "Permissions": {
    "console_view": true,
    "console_input": false,
    "chat_view": true,
    "chat_input": true,
    "players_view": true,
    "players_ip": false,
    "players_inventory": false,
    "entities_view": false,
    "entities_edit": false,
    "permissions_view": false,
    "permissions_edit": false,
    "profiler_view": false,
    "profiler_load": false,
    "profiler_edit": false,
    "plugins_view": true,
    "plugins_edit": false,
    "map_view": true,
    "map_entities": false
  }
}
```

After editing accounts, run `webpanel.loadcfg` so the changes take effect.

::: tip Security
- Treat passwords like server passwords — anyone with one can act as that account.
- Give each person their **own** account so you can revoke just theirs.
- Only enable `console_input`, `plugins_edit`, `permissions_edit` and `entities_edit` for people
  you fully trust — those can change your server.
:::

---

## How it works (the short version)

This part is optional reading — handy if you're curious or debugging.

- The panel runs on Carbon's **Bridge**, a lightweight WebSocket layer built on top of the same
  networking Rust's RCon uses. When you enable the panel, Carbon starts a Bridge server on the IP
  and port from your config.
- The **frontend** (the website) is a static Vue app — it lives entirely in the
  [Carbon.Documentation](https://github.com/CarbonCommunity/Carbon.Documentation) repo and talks
  directly to your server's Bridge. There's no backend in the middle — your browser connects
  straight to your server.
- Your **password is the WebSocket path** — the server matches it against the accounts in
  `config.webpanel.json` to figure out who you are and what you're allowed to do.
- Each feature is an **RPC** (a named server method). The frontend calls things like
  `ServerInfo`, `Players` or `ConsoleTail`; the server runs the matching handler and streams the
  result back. Every RPC is permission-checked before it runs, so a missing permission simply
  means that call does nothing.

### For developers

On the C# side everything lives in
`src/Carbon.Components/Carbon.Common/src/Carbon/WebControlPanel/`. Adding a new endpoint is just a
static method tagged with attributes:

```csharp
[WebCall]
[WebCall.Condition.Permission(PermissionTypes.ConsoleView)]
private static void RPC_ConsoleTail(BridgeRead read)
{
    var count = read.Int32();
    // ...read args, do work...

    var write = StartRpcResponse();
    write.WriteObject(/* your data */);
    SendRpcResponse(read.Connection, write);
}
```

- `[WebCall]` registers the method. Its **name** is hashed into an ID that the frontend addresses
  it by (the frontend calls `sendCall('ConsoleTail')`, which maps to `RPC_ConsoleTail`).
- `[WebCall.Condition.Permission(...)]` gates it behind one of the account permissions.
- `BridgeRead` reads the incoming arguments; `BridgeWrite` (via `StartRpcResponse` /
  `SendRpcResponse`) writes the reply.
- RPCs are queued and run on the main thread once per frame, so it's safe to touch game state.

The matching frontend code is in
`docs/src/components/control-panel/` in the Carbon.Documentation repo.
