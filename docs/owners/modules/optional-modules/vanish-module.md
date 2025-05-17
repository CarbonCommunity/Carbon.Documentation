# Vanish Module

The Vanish Module is an **optional Carbon module** that enables administrators or moderators to toggle invisibility for
players. It prevents detection by other players, AI, and server-side mechanics like helicopters or turrets. This module
includes UI feedback, sound effects, and permission-controlled behavior.

> **Note:** Vanish is highly customizable and designed to respect permission layers. It does not affect player
> persistence unless configured to.

## Overview

![Vanish Module](/misc/vanish_a.webp)

- **Class Name:** `VanishModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/VanishModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/VanishModule)
- **Forces Modded Tag:** No

When a player is vanished, they become invisible, unattackable, and undetectable by most game systems and AI.
Reappearance restores normal status.

## Configuration

The config is defined in `VanishConfig`:

```json
{
  "VanishPermission": "vanish.allow",
  "VanishUnlockWhileVanishedPermission": "vanish.unlock",
  "PermanentVanishPermission": "vanish.permanent",
  "VanishCommand": "vanish",
  "ToggleNoclipOnVanish": true,
  "ToggleNoclipOnUnvanish": false,
  "InvisibleText": "You are currently invisible.",
  "InvisibleTextSize": 10,
  "InvisibleTextColor": "#8bba49",
  "InvisibleTextAnchor": 7,
  "InvisibleTextAnchorX": [0, 1],
  "InvisibleTextAnchorY": [0, 0.025],
  "InvisibleIconUrl": "",
  "InvisibleIconColor": "1 1 1 0.3",
  "InvisibleIconMinAnchor": [0.5, 0],
  "InvisibleIconMaxAnchor": [0.5, 0],
  "InvisibleIconMinOffset": [-350, 15],
  "InvisibleIconMaxOffset": [-250, 125],
  "BroadcastVanishSounds": false,
  "WhooshSoundOnVanish": true,
  "GutshotScreamOnUnvanish": true,
  "EnableLogs": true,
  "TeleportBackOnUnvanish": false,
  "CanDamageWhenVanished": true,
  "Effect": {
    "Vanishing": "assets/prefabs/npc/patrol helicopter/effects/rocket_fire.prefab",
    "Unvanishing": "assets/bundled/prefabs/fx/player/gutshot_scream.prefab"
  }
}
```

## Permissions

- `vanish.allow` – Allows player to toggle vanish.
- `vanish.unlock` – Allows unlocking doors/containers while vanished.
- `vanish.permanent` – Automatically vanish on connect/sleep end.

## Command

```bash
/vanish
```

Toggles vanish state for the player (requires `vanish.allow`).

## Features

- Fully invisible and undetectable while vanished
- Removes from AI memory (e.g. Bradley, Helicopters)
- Optionally toggles noclip on/off
- Can block attacks while vanished
- Optional teleport return when unvanishing
- UI icon and text feedback while vanished
- Effect visuals and broadcast options
- Hook support: `OnCarbonVanished`, `OnCarbonUnvanished`

## UI

Displays custom text and/or icon using CUI. Position, color, and anchors are fully configurable.

---

The Vanish Module is ideal for admins needing to monitor players stealthily, moderate without interference, or perform
cinematic recordings.


## API
The vanish module comes with a few API hook calls:

- `void OnCarbonVanished(BasePlayer player)` when players vanish
- `void OnCarbonUnvanished(BasePlayer player)` when players unvanish