---
title: Data Files
description: Persist player data, leaderboards, and any structured information between restarts using Carbon's built-in data file system.
---

# Data Files

Data files let plugins store arbitrary structured data as JSON on disk — player stats, leaderboards, ban lists, or
anything that needs to survive server restarts. Unlike [Plugin Configuration](/devs/features/plugin-config), data files
are meant to change at runtime, not just at setup.

:::tip File Location
Data files are stored at `carbon/data/<filename>.json`. Subdirectories are supported — use a path like
`MyPlugin/players` to write to `carbon/data/MyPlugin/players.json`.
:::

## Writing Data

Serialize any object with `Interface.Oxide.DataFileSystem.WriteObject`.

```csharp
private void SaveData()
{
    Interface.Oxide.DataFileSystem.WriteObject("MyPlugin/players", _playerData);
}
```

## Reading Data

Deserialize with `ReadObject<T>`. Returns a new `T` (default constructor) if the file does not exist yet.

```csharp
private void LoadData()
{
    _playerData = Interface.Oxide.DataFileSystem.ReadObject<Dictionary<ulong, PlayerInfo>>("MyPlugin/players");
}
```

## Recommended Pattern

Call `LoadData` in `Init` or `OnServerInitialized`, and `SaveData` whenever data changes (or on a periodic
timer for write-heavy scenarios).

```csharp
private Dictionary<ulong, PlayerInfo> _playerData = new();

private void Init() => LoadData();

private void Unload() => SaveData();

private void LoadData()
{
    _playerData = Interface.Oxide.DataFileSystem.ReadObject<Dictionary<ulong, PlayerInfo>>("MyPlugin/players")
                  ?? new Dictionary<ulong, PlayerInfo>();
}

private void SaveData()
{
    Interface.Oxide.DataFileSystem.WriteObject("MyPlugin/players", _playerData);
}
```

:::danger
Always save on `Unload`. If the server crashes data in memory is lost, but a periodic save timer reduces that risk.
:::

## Defining a Data Model

```csharp
private class PlayerInfo
{
    [JsonProperty("kills")]
    public int Kills;

    [JsonProperty("deaths")]
    public int Deaths;

    [JsonProperty("last_seen")]
    public long LastSeenUtc;
}
```

## Tracking Players

A `Dictionary<ulong, T>` keyed by `player.userID` is the standard pattern for per-player data.

```csharp
private void OnPlayerDeath(BasePlayer victim, HitInfo info)
{
    if (victim == null) return;

    if (!_playerData.TryGetValue(victim.userID, out var data))
        _playerData[victim.userID] = data = new PlayerInfo();

    data.Deaths++;
    data.LastSeenUtc = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    SaveData();
}

private void OnPlayerAttack(BasePlayer attacker, HitInfo info)
{
    if (attacker == null || info?.HitEntity is not BasePlayer) return;

    if (!_playerData.TryGetValue(attacker.userID, out var data))
        _playerData[attacker.userID] = data = new PlayerInfo();

    data.Kills++;
    SaveData();
}
```

## Periodic Save Timer

For high-frequency writes, batch saves with a timer to avoid hammering the disk on every event.

```csharp
private Timer _saveTimer;

private void OnServerInitialized()
{
    LoadData();
    _saveTimer = timer.Every(300f, SaveData); // save every 5 minutes
}

private void Unload()
{
    _saveTimer?.Destroy();
    SaveData();
}
```

## Multiple Data Files

Use different paths per concern — there's no limit on how many files a plugin can manage.

```csharp
private Dictionary<ulong, PlayerInfo> _playerData;
private List<ulong> _bannedPlayers;

private void LoadData()
{
    _playerData   = Interface.Oxide.DataFileSystem.ReadObject<Dictionary<ulong, PlayerInfo>>("MyPlugin/players")
                    ?? new Dictionary<ulong, PlayerInfo>();
    _bannedPlayers = Interface.Oxide.DataFileSystem.ReadObject<List<ulong>>("MyPlugin/bans")
                    ?? new List<ulong>();
}

private void SaveData()
{
    Interface.Oxide.DataFileSystem.WriteObject("MyPlugin/players", _playerData);
    Interface.Oxide.DataFileSystem.WriteObject("MyPlugin/bans", _bannedPlayers);
}
```

## Config vs Data Files

| | [Plugin Configuration](/devs/features/plugin-config) | Data Files |
|---|---|---|
| Purpose | Server owner settings | Runtime state |
| Changed by | Owner (manually) | Plugin code |
| Reloaded via | `c.reload` | `LoadData()` |
| Typical content | Thresholds, messages, toggles | Player stats, ban lists, leaderboards |
