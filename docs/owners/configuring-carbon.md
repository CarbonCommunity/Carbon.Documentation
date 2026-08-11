---
title: Configuring Carbon
description: A detailed documentation about Carbon's configuration file and explaining what everything does.
slug: configuring-carbon
---

# ⚙️ Configuring Carbon
Carbon comes with an extensive list of configurable properties. Keep reading to learn more.

## Settings
- `DeveloperMode` — Enabling this, will populate all patched and publicized Rust assemblies in the `carbon/developer/patched_assemblies` directory.
- `IsModded` — Will enable the modded flag on the server, making the server to show up on the Modded Rust browser tab.
- `Prefixes` — Are chat command prefixes, which allow you to configure them to behave differently when used by players based on their auth or logging.
- `Aliases` — Is a mapped list of RCon/console command replacements. If you need to, you can use these to add your Oxide overrides such as `o.reload` -> `c.reload`. These aliases work for Rust native commands too.
- `Rcon` — Should the Rcon server start?
- `Language` — Server language for the Oxide Lang system.
- `WebRequestIp` — Is the overriding IP address used for all plugin web requests made in plugins.
- `Watchers` — All watcher settings. Disabling the `ScriptWatchers` for example will no longer listen for locally made changes, requiring you to reload with `c.reload plugin`.
- `Permissions` — Here are all of the default player, admin and moderator group name settings. As well as settings for Carbon to auto-grant/revoke players from a group they no longer should have access in. Like if they used to be auth level 1 (moderators), re-logging will remove the `moderator` group from them automatically.
- `Analytics` — They're entirely anonymous and recommended to be kept enabled as the data does actually help us figure out when things go wrong with our changes.
- `SelfUpdating` — Configures if Carbon should look for updates on server boot. Also includes a separate option if remote hook updates should happen as well.
- `Debugging` — A few developer/admin debugging settings.
- `Processors` — Primarily consists the rate settings for the Carbon processors handling script compilation.
- `Publicizer` — Consists of all of the assemblies that Carbon should patch and publicize upon server boot. The ones listed below are mandatory values that cannot be removed, as they are required by Carbon, although you can add more to that list.
- `Logging` — Overall logging settings.
- `Profiler` — Carbon specific profiler settings, the actual [Carbon.Profiler](/devs/features/mono-profiler) settings are under `carbon/config.profiler.json`
- `Compiler` — All settings for the Carbon multithreaded compiler.
- `Misc` — Has settings that don't fit the other categories.

## Default Config
Here's the full default config out of the box.
```json:line-numbers
{
  "DeveloperMode": false,
  "IsModded": true,
  "Prefixes": [
    {
      "Value": "/",
      "PrintToChat": false,
      "PrintToConsole": false,
      "SuggestionAuthLevel": 2
    }
  ],
  "Aliases": {
    "carbon": "c.version"
  },
  "Rcon": true,
  "Language": "en",
  "WebRequestIp": null,
  "Watchers": {
    "ScriptWatchers": true,
    "ZipScriptWatchers": true,
    "ScriptWatcherOption": 0,
    "ModuleWatchers": true,
    "ExtensionWatchers": true
  },
  "Permissions": {
    "PlayerDefaultGroup": "default",
    "AdminDefaultGroup": "admin",
    "ModeratorDefaultGroup": "moderator",
    "AutoGrantPlayerGroup": true,
    "AutoGrantAdminGroup": true,
    "AutoGrantModeratorGroup": true,
    "BypassAdminCooldowns": false,
    "PermissionSerialization": 0
  },
  "Analytics": {
    "Enabled": true
  },
  "SelfUpdating": {
    "Enabled": true,
    "HookUpdates": true
  },
  "Debugging": {
    "ScriptDebuggingOrigin": "",
    "HookLagSpikeThreshold": 1000
  },
  "Processors": {
    "ScriptProcessingRate": 0.2,
    "ZipScriptProcessingRate": 0.5
  },
  "Publicizer": {
    "PublicizedAssemblies": [
      "Assembly-CSharp.dll",
      "Facepunch.Console.dll",
      "Facepunch.Network.dll",
      "Facepunch.Nexus.dll",
      "Facepunch.Ping.dll",
      "Facepunch.Unity.dll",
      "Rust.Clans.Local.dll",
      "Rust.FileSystem.dll",
      "Rust.Harmony.dll",
      "Rust.Global.dll",
      "Rust.Data.dll"
    ],
    "PublicizerMemberIgnores": [
      "^HiddenValueBase$",
      "^HiddenValue`1$",
      "^Pool$"
    ]
  },
  "Logging": {
    "LogSplitSize": 2.5,
    "LogSeverity": 2,
    "LogFileMode": 2,
    "LogVerbosity": 0,
    "CommandSuggestions": true
  },
  "Profiler": {
    "RecordingWarnings": true
  },
  "Compiler": {
    "UnloadOnFailure": false,
    "ConditionalCompilationSymbols": [
      "CARBON",
      "RUST",
      "OXIDE_PUBLICIZED"
    ]
  },
  "Misc": {
    "ShowConsoleInfo": true
  }
}
```