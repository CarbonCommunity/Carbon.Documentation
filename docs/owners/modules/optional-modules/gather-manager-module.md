# GatherManager Module

The GatherManager Module is an **optional Carbon module** that allows server administrators to modify item gather rates
dynamically based on source type-like pickups, quarries, dispensers, and more.

> **Note:** This module is **not used directly by other plugins** but is highly useful for fine-tuning resource
> gathering.

## Overview

![GatherManager Module](/misc/gathermanager_a.webp){width=1640px height=502px}

- **Class Name:** `GatherManagerModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/GatherManagerModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/GatherManagerModule)
- **Forces Modded Tag:** Yes

When enabled, this module intercepts item gathering logic and adjusts the resulting amounts using multipliers defined in
its config.

## Supported Gather Types

Each gather type has its own multiplier dictionary:

- **Pickup**: Picking up world items (e.g., seeds, dropped resources)
- **Gather**: Harvesting from resources (e.g., rocks, trees, fish)
- **Quarry**: Output from Mining Quarry
- **Excavator**: Output from the Giant Excavator

## Configuration Example

The module supports a wildcard (`"*"`) as a fallback multiplier if no specific item is matched:

```json
{
  "Pickup": {
    "*": 1.0,
    "seed.hemp": 2.0
  },
  "Gather": {
    "*": 1.0,
    "skull.human": 0.5
  },
  "Quarry": {
    "*": 1.5
  },
  "Excavator": {
    "*": 2.0
  }
}
```

## Behavior

- Multipliers are applied **in real-time** as resources are gathered.
- The module handles many gather sources including:
    - Collectible pickups
    - Plants
    - Fish
    - Dispensers
    - Mining quarries
    - The Giant Excavator
- Invalid or missing entries default to a `1.0x` multiplier.

## Example: Custom Gather Rule

```json
{
  "Gather": {
    "*": 1.0,
    "stones": 0.75,
    "wood": 1.25
  }
}
```

This config reduces stone gather yield by `25%` and increases wood by `25%`.

---

Use this module to **balance your economy** or just **fine-tune vanilla mechanics**. It's lightweight and customizable
with minimal overhead.
