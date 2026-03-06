---
title: Custom Vitals Manager
description: Management support for Rust's Custom Vitals
---

# Custom Vitals Manager


<b>Custom Vitals Info</b> is a Facepunch class which defines a multitude of options to display on vitals above the player health area.

<image src="/misc/custom-vitals.webp"/>


## Introduction

The content structure is fairly straightforward. Theres a background color, two text objects, an icon and a countdown status value you can use. There currently isn't a health-bar like vital variant.

:::code-group
```cs [CustomVitalInfo]
public Color backgroundColor;
public Color leftTextColor;
public Color rightTextColor;
public Color iconColor;
public string leftText;
public string rightText;
public string icon; // CRC FileStorage value (uint)
public bool active;
public int timeLeft;
```
:::

### The Manager

There are two types of custom vitals that the manager... manages. The <b>Shared vitals</b>, and the <b>player</b>-specific <b>vitals</b>.

## Shared Vitals

<b>Shared vitals</b> are vitals which will be delivered to all connected players (as well as newly connected ones).

:::code-group
```cs [Shared Vitals Sample]
using Carbon.Components;
using Carbon.Modules;

public readonly ImageDatabaseModule ImageDatabase = Carbon.Base.BaseModule.GetModule<ImageDatabaseModule>();

public CustomVitalManager.SharedIdentifiableVital globalVital;

private void OnServerInitialized()
{
    // Rent one from the manager's class or just use Pool.Get<CustomVitalInfo>()
    //   they're one and the same thing
    var vital = CustomVitalManager.RentVitalInfo(
        icon: ImageDatabase.GetImageString("file"), 
        iconColor: Color.red.WithAlpha(.6f), 
        backgroundColor: Color.black.WithAlpha(.9f), 
        leftText: "Searching files...", leftTextColor: Color.white.WithAlpha(.6f));

    // Add and immediately apply the shared vital to all players
    // expiry will automatically remove the global vital from all players 
    CustomVitalManager.AddSharedVital(vital, expiry: 10);
}

private void Unload()
{
    // Remove the shared vital. Changes are immediately applied to all players.
    CustomVitalManager.RemoveSharedVital(globalVital);

    // When in doubt, clear ALL shared vitals ever created, ever. 
    CustomVitalManager.ClearSharedVitals();

    globalVital = null;
}
```
:::

:::warning NOTICE

When vitals are removed, they'll appropriately be sent back to Facepunches Pool.

:::

## Player Vitals

<b>Player vitals</b> are individual vitals, unique per player. 

<video controls autoplay loop src="/misc/sillygoosery.mp4"></video>


:::code-group
```cs [Player Vitals Sample]
using Carbon.Components;
using Carbon.Modules;

public readonly ImageDatabaseModule ImageDatabase = BaseModule.GetModule<ImageDatabaseModule>();

public CustomVitalManager.PlayerIdentifiableVital playerVital;

private void OnServerInitialized()
{
    var self = BasePlayer.Find("Raul");
    var vital = CustomVitalManager.RentVitalInfo(
        icon: ImageDatabase.GetImageString("reload"), 
        iconColor: Color.yellow.WithAlpha(.6f), 
        backgroundColor: Color.black.WithAlpha(.9f), 
        leftText: "Standing by...", leftTextColor: Color.white.WithAlpha(.6f));
    playerVital = CustomVitalManager.AddVital(self, vital);
}

private void Unload()
{
    var self = BasePlayer.Find("Raul");
    CustomVitalManager.ClearVitals(self); 
}

[ConsoleCommand("sillygoosery")]
private void sillygoosery(ConsoleSystem.Arg arg)
{
    var player = arg.Player();
    player.Ragdoll();
    playerVital.info.icon = ImageDatabase.GetImageString("star");
    playerVital.info.leftText = "Ragdolling";
    playerVital.info.backgroundColor = Color.red.WithAlpha(.6f);
    playerVital.info.rightText = "{timeleft:ss}s";
    playerVital.info.rightTextColor = Color.white;
    playerVital.SetTimeLeft(5); // Restarts the timer of the vital
    playerVital.SendUpdate();

    timer.In(5f, () =>
    {
        playerVital.info.icon = ImageDatabase.GetImageString("reload");
        playerVital.info.leftText = "Standing by...";
        playerVital.info.rightText = string.Empty;
        playerVital.info.backgroundColor = Color.black.WithAlpha(.9f);
        playerVital.SendUpdate();
    });
}
```
:::

## Updating Vitals

Both Shared and Player vitals follow the same format for applying and sending updates to the designated targets. Highly recommended to have a look at the example above on how changing vital variables works.
