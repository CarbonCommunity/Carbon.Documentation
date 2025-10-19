# AutoWipe Module

The AutoWipe Module is an **optional Carbon module** that automates scheduled map and full wipes for your Rust server
using a configurable wipe list and cron expressions. It can trigger commands and delete files after each wipe.

> **Note:** This module is **not enabled by default**. It must be explicitly enabled in the server configuration or
> Carbon module settings.

## Overview

![AutoWipe Module](/misc/autowipe_a.webp){width=1640px height=502}

- **Class Name:** `AutoWipeModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/AutoWipeModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/AutoWipeModule)
- **Forces Modded Tag:** No

AutoWipe lets you schedule wipes using cron syntax, execute commands or delete files/folders after wiping, and even
randomize maps from a pool.

## Configuration

The configuration is stored in the `AutoWipeConfig` class and includes the following:

```json
{
  "WipeChatCommand": "nextwipe",
  "FullWipe": {
    "PostWipeCommands": [
      "c.reload MyPlugin"
    ],
    "PostWipeDeletes": [
      "carbon/data/myfile.json"
    ]
  },
  "MapWipe": {
    "PostWipeCommands": [],
    "PostWipeDeletes": []
  },
  "Maps": [
    {
      "Url": "https://example.com/my-map.map",
      "Temp": false
    }
  ],
  "AvailableWipes": [
    {
      "WipeName": "Biweekly Full Wipe",
      "MapBrowserName": "MyMap",
      "MapUrl": "POOL",
      "MapSize": 4000,
      "ServerSeed": 12345,
      "Cron": "0 18 */14 * *",
      "Temp": false,
      "Type (0=fullwipe 1=mapwipe)": 0,
      "Commands": [
        "say Full wipe incoming!",
        "server.save"
      ]
    }
  ]
}
```

- **WipeChatCommand**: Optional. Adds a chat command to display next scheduled wipe.
- **FullWipe / MapWipe**: Command and file delete hooks after each wipe.
- **Maps**: Pool of reusable maps. If `MapUrl` is set to `POOL`, one of these is randomly used.
- **AvailableWipes**: List of scheduled wipes with cron expressions.

## Commands

### User Wipe Command

- `/nextwipe` – Displays time until next wipe (configured via `WipeChatCommand` property).

### Console Commands

- `autowipe.wipes` – Lists all configured wipes
- `autowipe.add` – Adds a new wipe entry
- `autowipe.delete` – Deletes a wipe
- `autowipe.maps` – Lists map URLs from the pool
- `autowipe.addmap` – Adds a new map to the pool
- `autowipe.deletemap` – Deletes a map URL from the pool
- `autowipe.wipechat` – Sets the chat command name

## String Replacements

They're in place to automate server host name and descriptions with last wipe date and time information.

- `[WIPE_DAY]` – Wipe day replacement
- `[WIPE_MONTH]` – Wipe month replacement
- `[WIPE_YEAR]` – Wipe year replacement
- `[WIPE_HOUR]` – Wipe hour replacement
- `[WIPE_MINUTE]` – Wipe minute replacement
::: warning
<strong>You'll see a warning printed in the server log upon the module updating the host name and description.</strong> It usually only
happens once per server boot, unless you update any of two with the inclusion of replacement keys. <strong>This only happens when the
server sends Steam server information.</strong>
:::
::: tip Example
From `My Cool Server (WIPED [WIPE_MONTH]/[WIPE_DAY])` to `My Cool Server (WIPED 4/23)`.
:::

## How It Works

- Every 30 seconds, the module checks if a wipe is due via cron.
- Once a wipe runs, there is a 1-hour cooldown before another wipe can happen.
- When a wipe matches:
    - Runs any `Commands` listed in the wipe entry
    - Runs configured `PostWipeCommands`
    - Deletes files/folders in `PostWipeDeletes`
    - Updates the current wipe state and resets timers

Maps can be randomly pulled from the map pool using `"MapUrl": "POOL"`. <br>
The maps get automatically removed from the list if they're marked as `"Temp": true`.

---

This module is ideal for server operators looking to fully automate wipe logic and maintenance tasks without manual
intervention.
