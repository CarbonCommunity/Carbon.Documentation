---
title: Lang (Localization)
description: Ship multilingual plugins using Carbon's built-in lang system — register default phrases and let server owners translate them without touching your code.
---

# Lang (Localization)

The lang system lets plugins define all player-facing text in a central place and automatically serve each player the
message in their own language. Translations live in `carbon/lang/<lang>/<PluginName>.json` and can be edited by server
owners without reloading the plugin.

:::tip Default Language
`en` is always the fallback. Phrases missing from a player's language file are transparently resolved from `en`.
:::

## Registering Phrases

Override `LoadDefaultMessages` and call `lang.RegisterMessages` once per language you support.

```csharp
protected override void LoadDefaultMessages()
{
    lang.RegisterMessages(new Dictionary<string, string>
    {
        ["Welcome"]      = "Welcome to the server, {0}!",
        ["KitClaimed"]   = "You claimed the kit <color=#90EE90>{0}</color>.",
        ["KitCooldown"]  = "That kit is on cooldown. Try again in {0} seconds.",
        ["NoPermission"] = "You don't have permission to do that.",
    }, this);

    lang.RegisterMessages(new Dictionary<string, string>
    {
        ["Welcome"]      = "Bem-vindo ao servidor, {0}!",
        ["KitClaimed"]   = "Pegaste o kit <color=#90EE90>{0}</color>.",
        ["KitCooldown"]  = "Esse kit está em cooldown. Tenta em {0} segundos.",
        ["NoPermission"] = "Não tens permissão para isso.",
    }, this, "pt");
}
```

## Getting a Message

Use `lang.GetMessage(key, plugin, playerId)`. Pass `player?.UserIDString` so Carbon picks the right
language for each player automatically.

```csharp
private string Msg(string key, BasePlayer player = null, params object[] args)
{
    var message = lang.GetMessage(key, this, player?.UserIDString);
    return args.Length > 0 ? string.Format(message, args) : message;
}
```

## Sending Messages to Players

```csharp
private void OnPlayerConnected(BasePlayer player)
{
    player.ChatMessage(Msg("Welcome", player, player.displayName));
}
```

## Commands With Localized Replies

```csharp
[ChatCommand("kit"), Permission("myplugin.kit")]
private void KitCommand(BasePlayer player, string command, string[] args)
{
    if (args.Length == 0)
    {
        player.ChatMessage(Msg("NoPermission", player));
        return;
    }

    var kitName = args[0];
    // ... kit logic ...

    player.ChatMessage(Msg("KitClaimed", player, kitName));
}
```

## File Location

After the first load, Carbon writes the default phrases to disk so owners can translate them:

```
carbon/
  lang/
    en/
      MyPlugin.json     ← generated automatically from RegisterMessages
    pt/
      MyPlugin.json     ← generated automatically for "pt"
```

Owners edit these JSON files directly. Changes are picked up on the next `c.reload MyPlugin`.

## Adding More Languages Later

Call `lang.RegisterMessages` again in `LoadDefaultMessages` for each new language — existing translated
files on disk are not overwritten, only created if absent.

```csharp
protected override void LoadDefaultMessages()
{
    lang.RegisterMessages(new Dictionary<string, string>
    {
        ["Welcome"] = "Welcome, {0}!",
    }, this);        // "en" — always register this one first

    lang.RegisterMessages(new Dictionary<string, string>
    {
        ["Welcome"] = "Willkommen, {0}!",
    }, this, "de");

    lang.RegisterMessages(new Dictionary<string, string>
    {
        ["Welcome"] = "Bienvenido, {0}!",
    }, this, "es");
}
```

## Full Example

```csharp:line-numbers
namespace Carbon.Plugins;

[Info("KitPlugin", "author", "1.0.0")]
public class KitPlugin : CarbonPlugin
{
    protected override void LoadDefaultMessages()
    {
        lang.RegisterMessages(new Dictionary<string, string>
        {
            ["KitClaimed"]   = "You claimed the kit <color=#90EE90>{0}</color>.",
            ["KitCooldown"]  = "That kit is on cooldown. Try again in {0}s.",
            ["NoPermission"] = "You don't have permission to do that.",
        }, this);
    }

    private string Msg(string key, BasePlayer player = null, params object[] args)
    {
        var message = lang.GetMessage(key, this, player?.UserIDString);
        return args.Length > 0 ? string.Format(message, args) : message;
    }

    [ChatCommand("kit"), Permission("kitplugin.use")]
    private void KitCommand(BasePlayer player, string command, string[] args)
    {
        if (args.Length == 0)
        {
            player.ChatMessage(Msg("NoPermission", player));
            return;
        }

        // ... kit logic here ...

        player.ChatMessage(Msg("KitClaimed", player, args[0]));
    }
}
```

:::tip Best Practice
Keep every player-facing string — including error messages — in `LoadDefaultMessages`. Hardcoded strings
scattered through code are invisible to translators and break multilingual support.
:::
