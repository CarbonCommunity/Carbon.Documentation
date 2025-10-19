# StackManager Module

The StackManager Module is an **optional Carbon module** that allows fine-grained control over item stack sizes in Rust.
It supports both global and per-item configuration, and applies changes dynamically on server load or when enabled.

> **Note:** This module is designed for balancing loot, optimizing inventory space, or reducing item spam. It does not
> affect vanilla server validation.

## Overview

![StackManager Module](/misc/stackmanager_a.webp){width=1640px height=502px}

- **Class Name:** `StackManagerModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/StackManagerModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/StackManagerModule)
- **Forces Modded Tag:** Yes

StackManager adjusts `ItemDefinition.stackable` values for all items based on configurable rules.

## Configuration

The config is defined in `StackManagerConfig`:

```json
{
  "GlobalMultiplier": 1.0,
  "GlobalItemsMultiplier": 1.0,
  "ProhibitItemContainerStacking": false,
  "ProhibitItemConsumableContainerStacking": true,
  "ProhibitItemFishableStacking": true,
  "Categories": {
    "Ammunition": 1.0,
    "Food": 2.0,
    "Medical": 2.5
  },
  "Items": {
    "wood": 10000,
    "stone": 5000
  },
  "Blacklist": [
    "water",
    "water.salt"
  ]
}
```

## Example Use Case

```json
{
  "Categories": {
    "Food": 3.0
  },
  "Items": {
    "scrap": 5000,
    "metal.refined": 1000
  }
}
```

- All food stacks are tripled.
- Scrap is capped at `5000` per stack.
- High quality metal is capped at `1000`.

---

StackManager is perfect for fine-tuning inventory flow and improving server quality-of-life. Combine with loot mods for
full control over Rust's economy.

