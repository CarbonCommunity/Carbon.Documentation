---
title: Entity Serializer
description: A light weight solution for serializing entities
---

# Entity Serializer

`EntitySerializer` is a general purpose class that holds different methods to convert
Rust objects such as entities to bytes and back.

:::info Note
This is an internal utility of Carbon (not a plugin) for serializing & deserializing entities. Always avaliable within Carbon.
:::

## Overview
- **Purpose:** Serialize & Deserialize BaseEntities for file storage.
- **Net usage:** Simple functions to convert entities to bytes and back.
- **Source:** [`Carbon.Common/CSerializer.cs`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Components/CSerializer.cs)

## Core API References

### Serializing a BaseEntity

```csharp
BaseEntity entity;

Byte[] bytes = EntitySerializer.SerializeEntity(entity);

// Print out the bytes to hexidecimal
Puts(BitConverter.ToString(bytes).Replace("-"," "));
```
It is **suggested** that you check that the output is not null before doing anything with the bytes.

### Deserialization

```csharp
    Byte[] bytes;

    //It is suggested that you check if your bytes are null before deserialization.
    if (!bytes) return;

    ProtoBuf.Entity entityData = EntitySerializer.ConvertToDataEntity(bytes);
```
Its a good idea to check if `ProtoBuf.Entity` is null before doing anything with it.

### Non-Serialization Conversion

```csharp
// Converting BaseEntity straight to ProtoBuf.Entity
BaseEntity entity;

ProtoBuf.Entity entityData = EntitySerializer.BaseEntityToProto(entity);
```

## Summary
`EntitySerializer` is a general purpose class for serializing any type of BaseEntity.
You can additionally get sub-data such as an AutoTurrets inventory, and similar details by decompiling `ProtoBuf.Entity`
