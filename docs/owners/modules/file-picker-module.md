# File Module

The File Module is a **core module** included in the Carbon modding framework for Rust. It provides an in-game file
browser UI that allows players to navigate directories, view files, and optionally delete or select them. It is
primarily used by plugins that need user interaction with the server’s file system.

> **Note:** This module is **built into Carbon** and does not require installation like traditional plugins. It is
> always enabled and cannot be disabled.

## Overview

![File Picker](/misc/filepicker_a.webp){width=1640px height=502px}

- **Class Name:** `FileModule`
- **Enabled by default:** Yes
- **Force enabled:** Yes (cannot be disabled)
- **Supports Configuration:** No
- **Source:** [`Carbon.Common/FileModule`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Modules/FileModule/FileModule.cs)
- **Forces Modded Tag:** No

This module is intended for use by **other plugins** that need to expose a browsable file system interface to players or
admins in-game. It supports file filtering, directory limits, and callback integration.

## Accessing the Module in Plugins

Plugins can access the `File` module using:

```csharp
var fileModule = Carbon.Base.BaseModule.GetModule<FileModule>();
```

## How It Works

### Open the File Browser

```csharp
fileModule.Open(player, "Title", "start/path", "path/limit", "json",
    onConfirm: (player, browser) => {
        Puts($"Selected file: {browser.SelectedFile}");
    },
    onCancel: (player, browser) => {
        Puts("File selection cancelled.");
    });
```

- `player` – The `BasePlayer` to open the UI for.
- `title` – UI header text.
- `directory` – Starting path.
- `directoryLimit` – Prevent navigation above this folder.
- `extension` – File type filter (e.g., `json`, `txt`).
- `onConfirm` – Callback when a file is selected.
- `onCancel` – Callback when the browser is closed.
- `onExtraInfo` – Optional callback to show extra info in UI per file.

## Example Use in Plugin

```csharp
fileModule.Open(player, "Browse JSON Files", "/carbon/data", "/carbon/data", "json",
    onConfirm: (player, browser) =>
    {
        Puts($"Confirmed: {browser.SelectedFile}");
    },
    onCancel: (player, browser) =>
    {
        Puts("Cancelled.");
    });
```
