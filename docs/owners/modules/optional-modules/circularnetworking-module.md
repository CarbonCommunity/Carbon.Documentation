# CircularNetworking Module

The CircularNetworking Module is an **optional Carbon module** that overrides the default grid-based network visibility
logic with a **circular visibility model**. This allows for smoother and more efficient player-based entity visibility
around a central point, improving performance and relevance.

> **Note:** This module is **not used by other plugins** directly. It is enabled independently and modifies the internal
> networking behavior.

## Overview

![CircularNetworking Module](/misc/circularnetworking_a.webp){width=1640px height=502px}

- **Class Name:** `CircularNetworkingModule`
- **Enabled by default:** No
- **Supports Configuration:** No
- **Source:** [`Carbon.Modules/CircularNetworkingModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/CircularNetworkingModule)
- **Forces Modded Tag:** No

When enabled, this module replaces the standard Rust grid visibility system with a custom circular fallback using
precomputed radius masks.

## Behavior

When enabled, the module:

- Sets `ConVar.Net.visibilityRadiusFarOverride` to `6` (if not already set)
- Sets `ConVar.Net.visibilityRadiusNearOverride` to `4` (if not already set)
- Restores original values when disabled

This modifies how entities and network groups are calculated for clients by applying a circular pattern around each
player or source point.

## Use Cases

This module is useful for:

- More natural spatial relevance filtering
- Reducing unnecessary network group exposure

---

To enable this module, set it to `enabled: true` in the Carbon Modules tab in the Carbon panel.
