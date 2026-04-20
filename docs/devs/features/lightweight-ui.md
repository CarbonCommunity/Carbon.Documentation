---
title: LUI (Lightweight UI)
description: LUI is a **core UI component** of the Carbon framework that provides a fluent, object-oriented API for constructing and managing CUI elements in Rust.
---

# LUI (Lightweight UI)

LUI is a **core UI component** of the Carbon framework that provides a fluent, object-oriented API for constructing and
managing CUI elements in Rust. It simplifies creation, updates, and dispatch of UI elements, supports advanced layout
logic, and is tightly integrated with Carbon’s UI and image systems.

:::info Note
This is an internal utility of Carbon (not a plugin) for creating and managing CUI elements. Always available within
Carbon.
:::

## Overview

- **Type:** `Carbon.Components.LUI`
- **Purpose:** Simplified, high-performance UI construction and manipulation
- **Dependencies:** `CUI`, `ImageDatabaseModule`
- **Source**:
  [`Carbon.Common/LUI.cs`](https://github.com/CarbonCommunity/Carbon/tree/main/src/Carbon.Components/Carbon.Common/src/Carbon/Components/LUI.cs)

## Getting Started

### Creating an Instance

```csharp
// `CuiHandler` is an instance of Carbon's CUI system
using CUI cui = new CUI(CuiHandler);
```

### Sending the UI to a Player

```csharp
// Sends built UI to player
cui.v2.SendUi(player);

// Sends JSON variant of UI
// (optional debug/test alternative, sending UI in bytes is more efficient)
cui.v2.SendUiJson(player);
```

## Creating Aliases

Most of the elements have at least 4 aliases of methods, where only the first fields are changing.
Example is based on Panel Creation.

```csharp
CreatePanel(string parent, LuiPosition position, LuiOffset offset, ...);           // Base
CreatePanel(string parent, LuiOffset offset, ...);                                 // When position is None, we don't need to include it in method.
CreatePanel(LuiContainer container, LuiPosition position, LuiOffset offset, ...);  // Same as first, but we can just put the element we created previously without name knowledge.
CreatePanel(LuiContainer container, LuiOffset offset, ...);                        // Same as second, but we can just put the element we created previously without name knowledge.
```

## Creating Parent

```csharp
cui.v2.CreateParent(CUI.ClientPanels parent, LuiPosition position, string name = "");
```

Simple method for creating a parent that will be attached to one of the RUST CUI panels.
You can find all types of client panels in the `CUI.ClientPanels` enum.

## Creating Panels

```csharp
cui.v2.CreatePanel(string parent, LuiPosition position, LuiOffset offset, string color, string name = "");
```

Creates a simple panel (colored square) on certain position/offset.
If there is no name input, the element name will be generated randomly.

You can disable generating random names by setting `cui.v2.generateNames = false;`.
But keep in mind that setting it to false requires you to set names on each individual element that you want to attach
to some children's elements.

List of helper methods:

```csharp
.SetColor(string color);
.SetMaterial(string material);
```

## Creating Text

```csharp
cui.v2.CreateText(string parent, LuiPosition position, LuiOffset offset, int fontSize, string color, string text, TextAnchor alignment = TextAnchor.MiddleCenter, string name = "");
```

Creates a text. By default, it creates text in RobotoBold font.
Things like that and other methods that are less popular are added in sub-methods that can be added in the one-line
method or by linking a variable.
These methods can also be used while updating elements, so your request contains only things that you want to update —
no unnecessary allocations!

```csharp
// One-line method.
cui.v2.CreateText(...).SetTextFont(CUI.Handler.FontTypes.RobotoCondensedRegular);

// Multi-line method.
LUI.LuiContainer text = cui.v2.CreateText(...);
text.SetTextFont(CUI.Handler.FontTypes.RobotoCondensedRegular);
```

List of helper methods:

```csharp
.SetText(string input, int fontSize = 0, string color = null, TextAnchor alignment = TextAnchor.MiddleCenter, bool update = false);
.SetTextColor(string color);
.SetTextFont(CUI.Handler.FontTypes font);
.SetTextAlign(TextAnchor align);
.SetTextOverflow(VerticalWrapMode verticalOverflow);
```

## Creating Images

- From RUST files (Sprites):

```csharp
cui.v2.CreateSprite(string parent, LuiPosition position, LuiOffset offset, string sprite, string color = LuiColors.White, string name = "");
```

- From file (RUST SQL Data ID):

```csharp
cui.v2.CreateImage(string parent, LuiPosition position, LuiOffset offset, string png, string color = LuiColors.White, string name = "");
```

- From Carbon Image Database:

```csharp
cui.v2.CreateImageFromDb(string parent, LuiPosition position, LuiOffset offset, string dbName, string color = LuiColors.White, string name = "");
```

- Item Icons:

```csharp
cui.v2.CreateItemIcon(string parent, LuiPosition position, LuiOffset offset, string shortname, ulong skinId = 0, string name = "");
cui.v2.CreateItemIcon(string parent, LuiPosition position, LuiOffset offset, int itemId, ulong skinId = 0, string name = "");
```

These methods allow you to put images into your UI. Each method is useful for its purpose.

List of helper methods:

```csharp
.SetColor(string color);
.SetMaterial(string material);
.SetImageType(UnityEngine.UI.Image.Type imageType);
.SetSprite(string sprite = null, string color = null, UnityEngine.UI.Image.Type imageType = Image.Type.Simple);
.SetImage(string png = null, string color = null);
.SetItemIcon(int itemid, ulong skinid);
```

## Creating Raw Images

```csharp
cui.v2.CreateUrlImage(string parent, LuiPosition position, LuiOffset offset, string url, string color = LuiColors.White, string name = "");
```

Raw images are images taken directly from the URL. They might take some time to download, so we recommend using
databases, like the Carbon Image Database.
They also allow downloading Steam avatars and other things.
For Steam avatars, you can just create an empty container and assign size and the Steam icon.

```csharp
// Example
cui.v2.CreateEmptyContainer(mainPanel, add: true).SetOffset(new LuiOffset(0, 0, 256, 256)).SetSteamIcon(564345673);
```

List of helper methods:

```csharp
.SetUrlImage(string url = null, string color = null)
.SetSteamIcon(ulong steamid, string color = null);
.SetRawSprite(string sprite, string color = null);
.SetRawMaterial(string material, string color = null);
```

## Adding Buttons

```csharp
cui.v2.CreateButton(string parent, LuiPosition position, LuiOffset offset, string command, string color, bool isProtected = true, string name = "");
```

Creates a clickable button that the player can interact with.
By default, commands in buttons are protected by Carbon command protection, so keep that in mind while assigning a
command.

List of helper methods:

```csharp
.SetButton(string command = null, string color = null)
.SetButtonColors(string color = null, string normalColor = null, string highlightedColor = null, string pressedColor = null, string selectedColor = null, string disabledColor = null, float colorMultiplier = -1, float fadeDuration = -1);
.SetButtonMaterial(string material);
.SetButtonSprite(string sprite,  UnityEngine.UI.Image.Type imageType = Image.Type.Simple);
.SetButtonClose(string close);
```

## Setting outline

You can add an outline for most of the elements in the UI.
There is no creation method for that, as you add it to a currently existing element.

List of helper methods:

```csharp
.SetOutline(string color, Vector2 distance, bool useGraphicAlpha = false)
```

## Adding Input Fields

```csharp
cui.v2.CreateInput(string parent, LuiPosition position, LuiOffset offset, string color, string text, int fontSize, string command, int charLimit = 0, bool isProtected = true, CUI.Handler.FontTypes font = CUI.Handler.FontTypes.RobotoCondensedBold, TextAnchor alignment = TextAnchor.MiddleCenter, string name = "");
```

Creates an input field where the player can input anything he wants, and on submit it sends a command with input value
on the end.
Input fields can be modified to hide their values, setting the character limit and locking the player keyboard when you
clicked the input.

List of helper methods:

```csharp
.SetInput(string color = null, string text = null, int fontSize = 0, string command = null, int charLimit = 0, CUI.Handler.FontTypes font = CUI.Handler.FontTypes.RobotoCondensedBold, TextAnchor alignment = TextAnchor.MiddleCenter, bool update = false);
.SetInputReadOnly(bool readOnly);
.SetInputPassword(bool password);
.SetInputAutoFocus(bool autofocus);
.SetInputKeyboard(bool needsKeyboard = false, bool hudMenuInput = false);
.SetInputLineType(InputField.LineType lineType);

```

## Adding Cursor And Keyboard

Some of your elements might need a mouse to operate or keyboard.
You can lock player movement and unlock the mouse and typing by adding this method to an existing element.

```csharp
.AddCursor();
.AddKeyboard();
```

## Transform Methods

These helper methods might be useful only for updating elements.

List of helper methods:

```csharp
.SetAnchors(LuiPosition pos);
.SetOffset(LuiOffset off);
.SetAnchorAndOffset(LuiPosition pos, LuiOffset off);
.SetRectParent(string setParent);
.SetRectIndex(int setTransformIndex);
```

## Adding Countdowns

```csharp
cui.v2.CreateCountdown(string parent, LuiPosition position, LuiOffset offset, int fontSize, string color, string text, TextAnchor alignment, float startTime, float endTime, float step = 1, float interval = 1, string command = null, bool isProtected = true, string name = "");
```

Creates a countdown text that replaces `%TIME_LEFT%` with the formatted time in a string.
Runs command when time has reached the end.
Can be updated up to 50 times per second. It's a client-side update, so it might be pretty useful.

List of helper methods:

```csharp
.SetCountdown(float startTime, float endTime, float step = 1, float interval = 1, string command = null, string numberFormat = null);
.SetCountdownDestroy(bool destroy);
```

## Adding Scroll Views

```csharp
cui.v2.CreateScrollView(string parent, LuiPosition position, LuiOffset offset, bool vertical, bool horizontal, ScrollRect.MovementType movementType = ScrollRect.MovementType.Clamped, float elasticity = 0, bool inertia = false, float decelerationRate = 0, float scrollSensitivity = 0, LuiScrollbar verticalScrollOptions = default, LuiScrollbar horizontalScrollOptions = default, string name = "");
```

Creates a scrollable element.
After creating an element, you need to assign the scroll size, using:
`SetScrollContent(LuiPosition pos, LuiOffset offset)`
The LuiScrollbar struct is a regular struct that you should create before building an ScrollView.
It can be defaulted to not-assigned scroll.

List of helper methods:

```csharp
.SetScrollView(bool vertical, bool horizontal, ScrollRect.MovementType movementType = ScrollRect.MovementType.Clamped, float elasticity = 0, bool inertia = false, float decelerationRate = 0, float scrollSensitivity = 0, LuiScrollbar verticalScrollOptions = default, LuiScrollbar horizontalScrollOptions = default, bool update = false);
.SetScrollContent(LuiPosition pos, LuiOffset offset);
```

## Other UI Components

You can find other undocumented elements (for now) that are being implemented in RUST, but they might be still under
development.
Currently, you can find:

- **Draggable Elements**
- **Slots**

Each of these features has a corresponding `Create...` method with highly customizable parameters.

## Updating UI Elements

You can update UI in various ways.
We've provided some most common fields for easy updating, like panel color, position and offset.

```csharp
cui.v2.UpdatePosition(string name, LuiPosition pos);
cui.v2.UpdatePosition(string name, LuiOffset off);
cui.v2.UpdatePosition(string name, LuiPosition pos, LuiOffset off);
cui.v2.UpdateColor(string name, string color);
cui.v2.UpdateText(string name, string text, int fontSize = 0, string color = null);
cui.v2.UpdateButtonCommand(string name, string command, bool isProtected = true);
```

You can update any field you want by creating an update element, and modifying multiple properties in sequence.

```csharp
cui.v2.Update(string name).SetTextFont(CUI.Handler.FontTypes font);
```

## UI Sections

Good practice in UI might be grouping elements. You can do it by using simple only RectTransform elements that can be
created from empty containers.

```csharp
cui.v2.CreateEmptyContainer(string parent, string name = "", true).SetOffset(LuiOffset off);
```

## Global Update Methods

You can find some global update methods, that works for each element type.

```csharp
.SetDestroy(string name);
.SetFadeOut(float time);
.SetName(string newName);
```

## Any Type Update Methods

There are some fields, that are available in most of the elements, and they have their global methods, where you need to
input their type.
The T is one of the LuiCompBase classes, ex. `LuiTextComp, LuiOutlineComp, LuiScrollComp`

```csharp
.SetEnabled<T>(bool enabled = true);
.SetFadeIn<T>(float fadeIn);
```

## Updating Anything

Some methods might not expose all fields.
We tried to share as much of them as we could in a readable method, but some rare fields might be needed sometimes.
For that, you can use the UpdateComp method, which returns the field you've asked about.
The T is one of the LuiCompBase classes, ex. `LuiTextComp, LuiOutlineComp, LuiScrollComp`

```csharp
.UpdateComp<T>();

// Example
myUiField.UpdateComp<LuiCountdownComp>().timerFormat = "HoursMinutesSeconds";
```

## Rendering to JSON

For debugging purposes, you can generate the built LUI into JSON.
It's recommended to put it in some kind of JSON Beautifier, as it's not-formatted code.

```csharp
cui.v2.ToJson();

// You can draw the built code into console by doing that
Debug.Log(cui.v2.ToJson());
```

---

For a full list of component types, fonts, alignments, and helper methods, see the
[`LUI.cs`](https://github.com/CarbonCommunity/Carbon/tree/main/src/Carbon.Components/Carbon.Common/src/Carbon/Components/LUI.cs)
source and support classes.
