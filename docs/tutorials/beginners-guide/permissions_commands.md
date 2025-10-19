---
title: Permissions & Commands
description: Learn to create customizable permissions and commands for your plugins!
header: https://files.facepunch.com/Alistair/128/04/2025/3P09/jungleupdate_jungleruins_22.jpg
date: 2025-07-05T13:42:51.509Z
tags:
    - carbon
    - developer
    - locale
    - oxide
    - tutorial
    - perms
    - commands
    - configuration
layout: news-layout
sidebar: false
fmContentType: blogpost
category: beginners-guide
published: true
author: Bubbafett
hidden: false
logo: /news/localization.webp
collectionid: 4
---

<NewsSectionTitle text="Introduction" author="bubbafett5611"/>
<NewsSection>

So, I covered it in the previous tutorial, however lets take a deeper dive into both permissions and commands, and how to use them in your plugin.

In this tutorial, I will cover how to check the permissions of BasePlayers and IPlayers, as well as how to create console, chat, and covalence commands.

:::warning
This tutorial assumes you know the following:
- How to create basic Carbon or Oxide plugins
- Basic C# syntax and structure (classes, methods, fields)
- How to run and test your plugin on a Rust server
- A basic understanding of Configuration creation
:::

</NewsSection>

<NewsSectionSubtitle text="What are permissions?"/>
<NewsSection>

Permissions are used to validate the person who attempted to complete an action has authorization to do so, this is normally used in commands, UI elements, and button press events.

So, to get started lets build on the same plugin we created for [Configuration Management](/tutorials/beginners-guide/config-management), but I am removing the **OnPlayerConnected** hook for this tutorial.

::: details Example Plugin
```cs
using Newtonsoft.Json;
using Oxide.Core;

namespace Oxide.Plugins;

[Info("CoolPlugin", "Bubbafett", "1.0.0")]
[Description("Cool plugin that tells players about cool permissions.")]
public class ConfigExample : RustPlugin
{
    #region Config
    
    public Configuration PluginConfig;

    public class Configuration
    {
        [JsonProperty(PropertyName = "Version (DO NOT CHANGE)", Order = int.MaxValue)]
        public VersionNumber Version = new(1, 0, 0);
        
        [JsonProperty(PropertyName = "Permission")]
        public string UsePermission = "CoolPlugin.use";
        
        [JsonProperty(PropertyName = "Permission Enabled")]
        public bool IsEnabled = true;
    }
    
    protected override void LoadDefaultConfig() => PluginConfig = new Configuration();
    
    protected override void SaveConfig() => Config.WriteObject(PluginConfig, true);
    
    protected override void LoadConfig()
    {
        base.LoadConfig();
        PluginConfig = Config.ReadObject<Configuration>();
        if (PluginConfig == null)
        {
            PluginConfig = new Configuration();
            SaveConfig();
            return;
        }
        
        UpdateConfig();
    }

    private void UpdateConfig()
    {
        if (PluginConfig.Version >= Version) return;
        PrintWarning("Outdated configuration file detected. Updating...");
        PluginConfig.IsEnabled = true;
        PluginConfig.Version = Version;
        SaveConfig();
    }
    
    #endregion
    #region Hooks
    
    private void Init()
    {
        permission.RegisterPermission(PluginConfig.UsePermission, this);
    }
    
    #endregion
}
```
:::

So lets recap what we already have in the example plugin then we will build on it.

What we already have:
- Basic Configuration Handling
- Configurable Permission String that registers when the plugin initializes

</NewsSection>
<NewsSectionSubtitle text="Build it up"/>
<NewsSection>

One of my favorite things to do is make a command settings class, that I reuse several times in my plugin. So lets look at that, and see how we will implement that into our plugin.

First, lets create the class. We know that commands and permissions are both string values, so lets create a class with some strings.

```cs:line-numbers
    #region Config
    
    public Configuration PluginConfig;

    public class CommandSettings// [!code ++][!code focus]
    {// [!code ++][!code focus]
        [JsonProperty(PropertyName = "Command")]// [!code ++][!code focus]
        public string Command = string.Empty;// [!code ++][!code focus]

        [JsonProperty(PropertyName = "Permission")]// [!code ++][!code focus]
        public string Permission = string.Empty;// [!code ++][!code focus]

        [JsonProperty(PropertyName = "Enabled?")]// [!code ++][!code focus]
        public bool Enabled = true;// [!code ++][!code focus]
    }// [!code ++][!code focus]
    
    public class Configuration// [!code focus]
    {// [!code focus]
        [JsonProperty(PropertyName = "Version (DO NOT CHANGE)", Order = int.MaxValue)]// [!code focus]
        public VersionNumber Version = new(1, 0, 1);// [!code focus]
        
        [JsonProperty(PropertyName = "Permission")]// [!code --][!code focus]
        public string UsePermission = "CoolPlugin.use";// [!code --][!code focus]

        [JsonProperty(PropertyName = "Permission Enabled")]// [!code --][!code focus]
        public bool IsEnabled = true;// [!code --][!code focus]

        [JsonProperty(PropertyName = "Chat Command Settings")]// [!code ++][!code focus]
        public CommandSettings ChatCommand = new() { Command = "coolcommand", Permission = "CoolPlugin.coolcommand"};// [!code ++][!code focus]
    }// [!code focus]
    
    protected override void LoadDefaultConfig() => PluginConfig = new Configuration();
    
    protected override void SaveConfig() => Config.WriteObject(PluginConfig, true);
    
```

</NewsSection>