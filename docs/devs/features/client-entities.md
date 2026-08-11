---
title: ClientEntity
description: Lightweight networked entities for client-specific visual elements and interactions in Carbon framework
---

# ClientEntity (Client-side Networked Entity)

`ClientEntity` enables efficient creation and management of networked entities visible **only to specific clients**.
These entities exist solely on the client-side, making them ideal for visual effects and client-specific interactions
without server overhead.

:::info Note
This is an internal utility of Carbon (not a plugin) for creating client-visible entities. Always available within
Carbon.
:::

## Overview

- **Purpose:** Spawn, update, and destroy entities per client with custom behavior
- **Net usage:** Efficient per-client entity transmission using `ProtoBuf`
- **Source**:
  [`Carbon.Common/ClientEntity.cs`](https://github.com/CarbonCommunity/Carbon/tree/main/src/Carbon.Components/Carbon.Common/src/Carbon/Components/ClientEntity.cs)

## Core API Reference

### Creating a ClientEntity

```csharp
// Basic creation with prefab and transform
var entity = ClientEntity.Create(
    "assets/prefabs/deployable/chair/chair.deployed.prefab",
    position,
    rotation
);
```

Optional parameters allow you to pass a custom `ProtoBuf.Entity`, a `netId`, and a `group`.

### Setting Properties

```csharp
entity.Position = new Vector3(0, 2, 0);
entity.Rotation = new Vector3(0, 90, 0);
entity.Flags = BaseEntity.Flags.OnFire;
```

You can also assign `ParentID` and modify the `Prefab` after creation.

### Spawning

```csharp
// Single client
entity.SpawnFor(clientConnection);

// Multiple clients
entity.SpawnAll(clientList);
```

### Destruction

```csharp
// Targeted removal
entity.KillFor(clientConnection);

// Global removal
entity.KillAll();
```

### Network Updates

```csharp
entity.SendNetworkUpdate();           // Full update
entity.SendNetworkUpdate_Flags();     // Just flag update
entity.SendNetworkUpdate_Position();  // Just position/rotation
```

### Flags

```csharp
// Set flags
entity.SetFlag(BaseEntity.Flags.OnFire, true);

// Check state
if (entity.HasFlag(BaseEntity.Flags.OnFire))
{
    // Handle
}
```

### RPC Handling

Override this method to implement custom RPC behavior:

```csharp
public override void OnRpc(string rpc, Message message)
{
    // Handle client-side interaction
}
```

### Disposal

```csharp
entity.Dispose();
```

Disposes all associated network data and removes the entity from tracking.

## Summary

`ClientEntity` is perfect for implementing **visual-only effects**, **custom client HUD objects**, or **interactive
client-only actors** without the performance cost of full entities.
