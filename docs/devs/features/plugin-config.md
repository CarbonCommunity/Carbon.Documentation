---
title: Plugin Configuration
description: Persist plugin settings across server restarts using Carbon's built-in typed config system, fully compatible with Oxide.
---

# Plugin Configuration

Every plugin can read and write a JSON configuration file automatically managed by Carbon. The file is created on first
load and reloaded with the `c.reload` command — no boilerplate required beyond defining your config class.

:::tip File Location
Config files are stored at `carbon/configs/<PluginName>.json`.
:::

## Defining a Config Class

Use a plain C# class with `[JsonProperty]` attributes for human-readable key names.

```csharp
private Configuration _config;

private class Configuration
{
    [JsonProperty("Welcome Message")]
    public string WelcomeMessage = "Welcome to the server!";

    [JsonProperty("Max Kit Uses")]
    public int MaxKitUses = 3;

    [JsonProperty("Enable Debug Logs")]
    public bool EnableDebugLogs = false;
}
```

## Wiring It Up

Override three methods in your plugin:

```csharp
protected override void LoadConfig()
{
    base.LoadConfig();
    _config = Config.ReadObject<Configuration>();
}

protected override void LoadDefaultConfig()
{
    _config = new Configuration();
    SaveConfig();
}

protected override void SaveConfig() => Config.WriteObject(_config);
```

| Method | When it's called |
|---|---|
| `LoadConfig` | Every time the plugin loads or is reloaded |
| `LoadDefaultConfig` | Only when no config file exists yet |
| `SaveConfig` | Explicitly by your code, or after `LoadDefaultConfig` |

:::info
`LoadDefaultConfig` is the right place to document your defaults — it only runs once (on first install).
After that, `LoadConfig` reads the existing file.
:::

## Accessing Config Values

Read `_config` anywhere in your plugin.

```csharp
private void OnPlayerConnected(BasePlayer player)
{
    player.ChatMessage(_config.WelcomeMessage);
}
```

## Saving Config Changes at Runtime

Call `SaveConfig()` after mutating `_config`.

```csharp
[ConsoleCommand("setwelcome"), AuthLevel(2)]
private void SetWelcome(ConsoleSystem.Arg arg)
{
    _config.WelcomeMessage = arg.GetString(0, _config.WelcomeMessage);
    SaveConfig();
    arg.ReplyWith($"Welcome message updated to: {_config.WelcomeMessage}");
}
```

## Nested Objects

Group related settings into sub-classes for a cleaner JSON layout.

```csharp
private class Configuration
{
    [JsonProperty("Messages")]
    public MessagesConfig Messages = new MessagesConfig();

    [JsonProperty("Limits")]
    public LimitsConfig Limits = new LimitsConfig();

    public class MessagesConfig
    {
        [JsonProperty("Welcome")]
        public string Welcome = "Welcome!";

        [JsonProperty("Goodbye")]
        public string Goodbye = "See you!";
    }

    public class LimitsConfig
    {
        [JsonProperty("Max Kit Uses")]
        public int MaxKitUses = 3;

        [JsonProperty("Cooldown (seconds)")]
        public float Cooldown = 60f;
    }
}
```

This produces the following JSON:

```json
{
  "Messages": {
    "Welcome": "Welcome!",
    "Goodbye": "See you!"
  },
  "Limits": {
    "Max Kit Uses": 3,
    "Cooldown (seconds)": 60.0
  }
}
```

## Handling Missing Fields After Updates

When you add a new field to an existing config class, old config files won't have it — `ReadObject` will
leave it at the C# default. A common pattern is to save the config back immediately after loading so the
file gets the new field written out:

```csharp
protected override void LoadConfig()
{
    base.LoadConfig();
    _config = Config.ReadObject<Configuration>();
    SaveConfig(); // write back to add any newly introduced fields
}
```

:::danger
Avoid reading `Config` directly via the dynamic `Config["key"]` API. The typed class approach is safer,
refactor-friendly, and produces consistent JSON output.
:::

## Full Example

```csharp:line-numbers
namespace Carbon.Plugins;

[Info("WelcomePlugin", "author", "1.0.0")]
public class WelcomePlugin : CarbonPlugin
{
    private Configuration _config;

    private class Configuration
    {
        [JsonProperty("Welcome Message")]
        public string WelcomeMessage = "Welcome to the server!";

        [JsonProperty("Broadcast to All")]
        public bool BroadcastToAll = false;
    }

    protected override void LoadConfig()
    {
        base.LoadConfig();
        _config = Config.ReadObject<Configuration>();
        SaveConfig();
    }

    protected override void LoadDefaultConfig() => _config = new Configuration();

    protected override void SaveConfig() => Config.WriteObject(_config);

    private void OnPlayerConnected(BasePlayer player)
    {
        if (_config.BroadcastToAll)
            Server.Broadcast(_config.WelcomeMessage);
        else
            player.ChatMessage(_config.WelcomeMessage);
    }
}
```
