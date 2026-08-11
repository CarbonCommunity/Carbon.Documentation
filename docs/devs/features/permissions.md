---
title: Permissions
description: Reference documentation for Carbon permissions system
---

# Permissions

An overall look at how permissions work and how you can use them.

## Permission Registration

A good place to start using permissions in your plugins, here's how you register your permissions within your plugin.
Usually done at the very beginning of your plugin, which can be `Init()` or `OnServerInitialized()`.

```csharp
private void Init()
{
    permission.RegisterPermission("myplugin.admin", this);
    permission.RegisterPermission("myplugin.use", this);
}
```

To use your newly registered permissions, you may use the following format:

```csharp
private void OnPlayerConnected(BasePlayer player)
{
    if (permission.UserHasPermission(player.UserIDString, "myplugin.admin"))
    {
        // Do admin stuff.
    }
}
```

## Groups Registration

To get all the groups available on a server, you may use this:

```csharp
var groups = permission.GetGroups();
```

To create a new group, you can do this:

```csharp
var rank = 0;

if (permission.CreateGroup("mygroup", "Group Display Name", rank))
{
    Puts("Group has been created successfully!");
}
else
{
    Puts("Couldn't create group. Probably because it already exists.");
}
```

To delete a group:

```csharp
if (permission.RemoveGroup("mygroup"))
{
    Puts("Group has been successfully deleted.");
}
else
{
    Puts("Couldn't delete group. Probably because it doesn't exist.");
}
```

Grant a permission to a group:

```csharp
permission.GrantGroupPermission("mygroup", "myplugin.use", this);
```

Revoke a permission from a group:

```csharp
permission.RevokeGroupPermission("mygroup", "myplugin.admin");
```

Get all group permissions:

```csharp
var permissions = permission.GetGroupPermissions("mygroup", false);

// 'false' is the value for the "parents" parameter.
// When true, it will return all permissions,
// including the parent permissions "mygroup" group is a part of.
// When false, it will only return "mygroup" permissions.
```

Get the rank value of a group:

```csharp
var rank = permission.GetGroupRank("mygroup");
```

Get the display title of a group:

```csharp
var displayName = permission.GetGroupTitle("mygroup");
```

Get the parent of a group:

```csharp
var parent = permission.GetGroupParent("mygroup");
```

