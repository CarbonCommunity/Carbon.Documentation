# Admin Module

The Admin module introduces a new and intuitive way of managing your server in pretty much any way that you'd need. It's
a modular system that comes with built-in tabs helpful to see server statistics (such as dynamic hook use count), edit,
teleport or manage entities using the dedicated inspector.

:::warning IMPORTANT
The Admin module is enabled by default and will not enforce the server to be in the modded tab when enabled.
:::

## Overview

- **Class Name:** `Multiple Classes, see source`
- **Enabled by default:** Yes
- **Force enabled:** Yes (cannot be disabled)
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Common/AdminModule`](https://github.com/CarbonCommunity/Carbon.Common/tree/develop/src/Carbon/Modules/AdminModule)
- **Forces Modded Tag:** No

### Initial Access

To gain access to the Admin panel for the first time:

1. Open RCON/Console
2. Run `ownerid <steamid>` replacing `<steamid>` with your own
3. Go in-game and execute `/cpanel` or `/cp` in chat to open up the Admin Panel

### Configuration

```json
{
  "Enabled": true,
  "Config": {
    "OpenCommands": [
      "cp",
      "cpanel"
    ],
    "MinimumAuthLevel": 2,
    "DisableEntitiesTab": true,
    "DisablePluginsTab": false,
    "DisableConsole": false,
    "SpectatingInfoOverlay": true,
    "SpectatingEndTeleportBack": false,
    "QuickActions": []
  },
  "Version": "3927179163"
}
```

## Carbon Tab

![Carbon Tab](/misc/admin_a.webp){width=1640px height=502px}

The Carbon tab comes with a variety of options and information about the live server, as well as Carbon configurations
that be modified on the fly.

## Players Tab

![Players Tab](/misc/admin_b.webp){width=1640px height=502px}

It's a simplified and straight-forward tab that displays all active and inactive players from the server. You may also
search them using the search bar. This tab also acts as an interface to do common actions with your players that you
would expect out of an admin panel like banning, viewing inventories, healing players, and much more.

## Entities Tab

![Entities Tab](/misc/admin_c.webp){width=1640px height=502px}

Comes with a lot of filtering and searching options for specific entity type or names in the world. Inspecting entities
will allow you to teleport to their positions, or you're teleporting them to yours, spectating or changing flags (doors
open/close), access and loot any container on the map, modify the health of entities on the fly, and metabolism options
of players.

## Permissions Tab

![Permissions Tab](/misc/admin_d.webp){width=1640px height=502px}

It's a very straight-forward and similar implementation
to [Permissions Manager](https://codefling.com/plugins/permissions-manager) from Codefling. It allows you to grant or
revoke permissions and group from players. As well as the ability to edit or add new groups or parent groups for
inherited permissions.

## Modules Tab

![Modules Tab](/misc/admin_e.webp){width=1640px height=502px}

A generic and global place where you can modify module configs, save or load, or enable and disable modules on the fly.

## Plugins Tab

![Plugins Tab](/misc/admin_f.webp){width=1640px height=502px}

This tab is disabled by default, but it's a tab that allows you to browse, download and edit configs straight into the
UI of any free plugin or plugin that you own from Codefling and uMod. It comes with rich filtering features, very fast
and intuitive searching and tag-based filters.

**To enable it, please do the following:**\
`Modules` -> `Admin` -> `Edit Config` -> untick `DisablePluginsTab` -> `Save`

## API

The Admin module allows developers to create custom tabs straight in your plugin. The following are general instructions
how you can get started up to creating your own tabs.

### Referencing

To reference the module in your project, you may do the following in your class constructor:

```csharp
using Carbon.Modules;
using Carbon.Base;

public AdminModule Admin = BaseModule.GetModule<AdminModule>();
```

:::tip
It can be defined as a field/property initializer or setting the module singleton instance in one of the `Init()` or
`OnServerInitialized()` hooks.
:::

### Player Session

A very handy tool that allows you to store dynamically assigned content mapped to players that are interacting with the
panel.

```csharp
var session = Admin.GetPlayerSession(player);
var myValue = session.GetStorage<int>(tab, "my_key", @default: defaultValue);
```

:::tip
The `tab` and `@default` value is optional, you may globally store dynamically assigned content mapped to player
sessions by setting the `tab` to `null`.
:::

The Admin module is enabled by default and will not enforce the server to be in the modded tab when enabled.

## Module Permissions

Access to Carbon's Admin panel can be granted to players that do not have ownerid/auth 2. The list of permissions below
can be used to control exactly what each player has access to.

### General

`adminmodule.wizard` - Access to view the setup wizard.  
`adminmodule.carbon.use` - Access the Carbon tab.  
`adminmodule.carbon.server_settings` - Access to update and view server settings in the Carbon tab.  
`adminmodule.carbon.server_config` - Access to update server config.  
`adminmodule.carbon.server_info` - Access to view server information.  
`adminmodule.carbon.server_console` - Access to use and view server console.  
`adminmodule.environment.use` - Access the Environment tab.  
`adminmodule.modules.use` - Access the Modules tab.  
`adminmodule.modules.config_edit` - Access to update module configs.  
`adminmodule.permissions.use` - Access the Permissions tab.

### Entities

`adminmodule.entities.use` - Access the Entities tab.  
`adminmodule.entities.kill_entity` - Access to kill entities through the Entities tab.  
`adminmodule.entities.tp_entity` - Access to teleport entities to self or to it.  
`adminmodule.entities.loot_entity` - Access to loot container entities.  
`adminmodule.entities.loot_players` - Access to loot players.  
`adminmodule.entities.respawn_players` - Access to respawn players - teleporting them to a random spot, and wiping
inventory.  
`adminmodule.entities.blind_players` - Access to blind players.  
`adminmodule.entities.spectate_players` - Access to spectate players or entities in general.  
`adminmodule.entities.owner_change` - Access to modify the ownership of entities.

### Players

`adminmodule.players.use` - Access the Players tab.  
`adminmodule.players.inventory_management` - Access to manage player inventory.  
`adminmodule.players.craft_queue` - Access to view and update player crafting queue.  
`adminmodule.players.see_ips` - Access to view player IP address.

### Plugins

`adminmodule.plugins.use` - Access the Plugins tab.  
`adminmodule.plugins.setup` - Access to add/update or remove plugins from the server (include config).  
