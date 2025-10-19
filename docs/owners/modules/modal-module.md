# Modal Module

The Modal Module is a **core module** included in the Carbon modding framework for Rust. It provides a flexible,
interactive modal form system that allows plugins to prompt users for structured input using a wide variety of field
types.

> **Note:** This module is **built into Carbon** and does not require installation like traditional plugins. It is
> always enabled and cannot be disabled.

## Overview

![Modal](/misc/modal_a.webp){width=1640px height=502px}

- **Class Name:** `ModalModule`
- **Enabled by default:** Yes
- **Force enabled:** Yes (cannot be disabled)
- **Supports Configuration:** No
- **Source:** [`Carbon.Common/ModalModule`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Modules/ModalModule/ModalModule.cs)
- **Forces Modded Tag:** No

This module allows **plugins to create modals** with input fields such as strings, booleans, numbers, colors, enums, and
even buttons. Field validation and callbacks are supported.

## Accessing the Module in Plugins

Plugins can access the `ModalModule` using:

```csharp
var modalModule = Carbon.Base.BaseModule.GetModule<ModalModule>();
```

## How It Works

### Open a Modal

```csharp
var fields = new Dictionary<string, ModalModule.Modal.Field>
{
    ["name"] = ModalModule.Modal.Field.Make("Name", ModalModule.Modal.Field.FieldTypes.String, required: true),
    ["age"] = ModalModule.Modal.Field.Make("Age", ModalModule.Modal.Field.FieldTypes.Integer),
};

modalModule.Open(player, "User Info", fields,
    onConfirm: (player, modal) =>
    {
        var name = modal.Get<string>("name");
        var age = modal.Get<int>("age");
        Puts($"{player.displayName} entered: {name}, {age}");
    },
    onCancel: () =>
    {
        Puts("Modal was cancelled.");
    });
```

- `player` – The `BasePlayer` the modal is displayed to.
- `title` – The modal title text.
- `fields` – A dictionary of field keys and configurations.
- `onConfirm` – Invoked with the modal data when the user confirms.
- `onCancel` – Called if the user cancels the modal.

## Example Use in Plugin

```csharp
var fields = new Dictionary<string, ModalModule.Modal.Field>
{
    ["favorite_color"] = ModalModule.Modal.Field.Make("Favorite Color", ModalModule.Modal.Field.FieldTypes.HexColor),
    ["notifications"] = ModalModule.Modal.Field.Make("Enable Notifications", ModalModule.Modal.Field.FieldTypes.Boolean, @default: true)
};

modalModule.Open(player, "Preferences", fields,
    onConfirm: (player, modal) =>
    {
        var color = modal.Get<string>("favorite_color");
        var enabled = modal.Get<bool>("notifications");
        Puts($"{player.displayName}'s prefs - Color: {color}, Notifications: {enabled}");
    });
```
