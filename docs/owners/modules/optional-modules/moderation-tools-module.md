# ModerationTools Module

The ModerationTools Module is an **optional Carbon module** that provides built-in chat and console moderation tools for
administrators. It includes commands for muting, unmuting, banning, kicking, and toggling developer (`cadmin`) mode with
permission-based access control.

> **Note:** This module is useful for admins and moderators but is **not required** for plugin operation.

## Overview

![ModerationTools Module](/misc/moderationtools_a.webp){width=1640px height=502px}

- **Class Name:** `ModerationToolsModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/ModerationToolsModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/ModerationToolsModule)
- **Forces Modded Tag:** No

This module adds a powerful yet lightweight moderation layer to your Rust server, directly usable through chat and
console commands.

## Configuration

The config is defined in `ModerationToolsConfig`:

```json
{
  "Moderation": {
    "/cadmin command": "cadmin",
    "/cadmin command cooldown (ms)": 5000,
    "/cadmin permission (developer)": "carbon.cadmin",
    "/cmod permission (mute, kick, ban)": "carbon.cmod"
  }
}
```

## Permissions

- `carbon.cadmin`: Required to toggle developer (`cadmin`) mode.
- `carbon.cmod`: Required to use mute, unmute, ban, kick, and view mute list.

You must grant these permissions manually via the `carbon.grant` or `c.grant` command or your preferred permission manager.

## Chat Commands

### `/cadmin`

Toggles developer mode for the calling player. Requires `carbon.cadmin`.

## Console Commands

These require `carbon.cmod` and can be run from RCON or in F1 console by authorized players:

### `cmod.mute <name|id> <reason>`

Mutes a player in chat.

### `cmod.unmute <name|id>`

Unmutes a player.

### `cmod.mutelist`

Lists all currently muted players.

### `cmod.kick <name|id> <reason>`

Kicks a player with an optional reason.

### `cmod.ban <steamID> <reason> [duration]`

Bans a player by Steam ID. Optionally specify a duration in seconds.

---

ModerationTools is perfect for community servers seeking basic in-game and remote moderation without requiring
third-party tools or plugins.
