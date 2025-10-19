# Date Picker Module

The Date Picker Module is a **core module** included in the Carbon modding framework for Rust. It provides an animated,
interactive UI component that allows players to select a specific year, month, and day. Plugins can access this module
directly to allow date-based inputs from players.

> **Note:** This module is **built into Carbon** and does not require installation like traditional plugins. It is
> always enabled and cannot be disabled.

## Overview

![Date Picker](/misc/datepicker_a.webp){width=1640px height=502px}

- **Class Name:** `DatePickerModule`
- **Enabled by default:** Yes
- **Force enabled:** Yes (cannot be disabled)
- **Supports Configuration:** No
- **Source:** [`Carbon.Common/DatePickerModule`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Modules/DatePickerModule/DatePickerModule.cs)
- **Forces Modded Tag:** No

This module is intended for use by **other plugins** to enable date selection through a UI interface. It includes a
calendar layout, year/month input, and selection confirmation.

## Accessing the Module in Plugins

Plugins can access the `DatePicker` module using:

```csharp
var datePicker = Carbon.Base.BaseModule.GetModule<DatePickerModule>();
```

## How It Works

### Open the Picker

```csharp
datePicker.Open(player, (date) => {
    // Handle date picked by player
});
```

- `player` – The `BasePlayer` to open the UI for.
- `onDatePicked` – A callback invoked when the player selects a date. Returns:
    - `date` – The selected `DateTime` object.

## Example Use in Plugin

```csharp
datePicker.Open(player, (date) =>
{
    Puts($"Player picked date {date.ToShortDateString()}");
    // Use the selected date in plugin logic
});
```
