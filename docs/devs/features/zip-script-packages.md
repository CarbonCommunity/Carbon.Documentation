---
title: ZIP Scripts & Packages
description: Or also described as ZIP packages, are individual plugins which are split in multiple different files under the same namespace and partial class name.
---

# ZIP Scripts & Packages

This system allows developers to organize their code into modular, reusable components and ship plugins as `.cszip`
archives.

## Introduction

This system allows developers to organise their code and ship the plugins in separate chunks, which are zip files with
the `.cszip` extension, packed with a plugin split in multiple partial parts.

This is beneficial because it allows a lot more levels of organisation than just using `#regions`. This makes
delivering and managing larger plugins way easier.

## Getting Started

File name can be whatever you want it to be, for partial classes, it'd make sense to do something like the following:

### Primary Header File

The primary file should be a partial class with the name of the plugin ("MyPlugin"), the info attribute and the
CarbonPlugin base type, like the following example.

::: code-group

```csharp:line-numbers [MyPlugin.Main.cs]
namespace Carbon.Plugins;

[Info("MyPlugin", "Carbon Community", "1.0.0")]
public partial class MyPlugin : CarbonPlugin
{
    private void OnServerInitialized()
    {
        Puts("Wee woo!");
    }
}
```

:::

### Partial Files

The rest of the files, have to define the exact same namespace as well as plugin partial class name. The base type is
not mandatory to be defined (the compiler will say the same).

::: code-group

```csharp:line-numbers [MyPlugin.Commands.cs]
namespace Carbon.Plugins;

public partial class MyPlugin
{
    [Command("yoyo")]
    private void CommandBeLike(BasePlayer player, string cmd, string[] args)
    {
        var test = "asdasd";

        Puts($"Howdy :D! {test}");
    }

    [Command("helloworld")]
    private void HelloWorld(BasePlayer player, string cmd, string[] args)
    {
        player.ChatMessage("Hello world!");
    }
}
```

```csharp:line-numbers [MyPlugin.Hooks.cs]
namespace Carbon.Plugins;

public partial class MyPlugin
{
    private void OnPlayerConnected(BasePlayer player)
    {
        Puts($"YO, {player} joined! :D");
    }

    private void OnEntityBuilt(Planner plan, UnityEngine.GameObject go)
    {
        Puts($"OnEntityBuilt works! {plan} {go}");
    }
}
```

:::

:::danger IMPORTANT
After you've set up your plugin up, zip all your plugin partial class files up, then just drop the zip file in the
`<root>/carbon/plugins` folder.
:::

## Debugging

You may load up the package plugins out of a debug-build-only folder found in the `<root>/carbon/plugins/cszip_dev`
folder. All you need to do is to create a folder with the same name as your ZIP file, in which you place the `.cs` files
in. Carbon will hot-load any changes made to any of those files.

![CSZIP Sample](/misc/cszip-sample.webp){width=654px height=247px}

:::tip DEBUG-BUILD ONLY
This feature is entirely for **development** purposes and not for **live server production**.
:::
