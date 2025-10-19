# Color Picker Module

The Color Picker Module is a **core module** included in the Carbon modding framework for Rust. It provides an
interactive and animated UI component that allows players to visually select colors, including brightness and alpha
(transparency) values. Plugins can access this module directly to incorporate color picking into their functionality.

> **Note:** This module is **built into Carbon** and does not require installation like traditional plugins. It is
> always enabled and cannot be disabled.

## Overview

![Color Picker](/misc/colorpicker_a.webp){width=1640px height=502px}

- **Class Name:** `ColorPickerModule`
- **Enabled by default:** Yes
- **Force enabled:** Yes (cannot be disabled)
- **Supports Configuration:** No
- **Source:** [`Carbon.Common/ColorPickerModule`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Modules/ColorPickerModule/ColorPickerModule.cs)
- **Forces Modded Tag:** No

This module is intended for use by **other plugins** to enable color selection through a UI interface. It includes
fade-in animations, brightness and alpha sliders, and hex color input fields.

## Accessing the Module in Plugins

Plugins can access the `ColorPicker` module using:

```csharp
var colorPicker = Carbon.Base.BaseModule.GetModule<ColorPickerModule>();
```

## How It Works

### Open the Picker

```csharp
colorPicker.Open(player, (hex, raw, alpha) => {
    // Handle color picked by player
});
```

- `player` – The `BasePlayer` to open the UI for.
- `onColorPicked` – A callback invoked when the player selects a color. Returns:
    - `hex` – Hex code of selected color.
    - `raw` – RGB values as string (e.g. `"0.5 0.2 0.7"`).
    - `alpha` – The alpha (opacity) value as a float.

## Example Use in Plugin

```csharp
colorPicker.Open(player, (hex, raw, alpha) =>
{
    Puts($"Player picked color {hex} with alpha {alpha}");
    // Apply to UI or save preference
});
```
