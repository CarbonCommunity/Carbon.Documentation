---
title: Modifiers
description: Carbon modifiers are plugin developer directed modifiers designed to enhance plugin designing experience by adding new field members in Rust classes and more.
---

# Modifiers
Carbon modifiers are JSON plugin developer directed modifiers designed to enhance plugin designing experience by adding new field members in Rust classes and more.

> A restart is necessary for the modifiers to apply (of course).

:::tip DIRECTORY
All Carbon modifier files go inside the `carbon/modifiers` folder by default, it being changeable with `-carbon.modifierdir` command-line.
:::

:::danger RELEVANT SOURCE
Here is all of the relevant source code of things referenced on this page:
- [Modifier](https://github.com/CarbonCommunity/Carbon/blob/develop/Carbon.Core/Carbon.Tools/Carbon.Publicizer.Shared/Modifier.cs) is responsible for the IL generation and assembly post-processing events before the server boots.
- [StoredModifiers](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Components/StoredModifiers.cs) is responsible for the logic of handling Rust entity `Save` and `Load` events, as well as `ProtoBuf.Net` subtype initialization.
:::

## Example
As stated previously, Carbon modifiers are in the format of JSON files, designed to be easily managed and shipped with plugins.

:::tabs

===carbon/modifiers/MyPlugin.json
```json:line-numbers
[
  {
    "Assembly": "Assembly-CSharp",
    "Name": "BasePlayer",
    "Fields": [
      {
        "Name": "IsSkibidi",
        "Type": "System.Boolean",
        "DefaultValue": true
      },
	  {
        "Name": "DuckCounter",
        "Type": "System.Int32",
        "DefaultValue": 0,
        "IsStatic": true
      },
      {
        "Name": "Tags",
        "Type": "System.Collections.Generic.List`1[System.String]"
      }
    ]
  }
]
```
:::

Then you can use it in your plugin(s) like this.
```csharp:line-numbers
namespace Carbon.Plugins;

[Info("MyPlugin", "dev101", "1.0")]
public class MyPlugin : CarbonPlugin
{
	private void OnServerInitialized()
	{
        foreach(var player in BasePlayer.allPlayerList)
        {
            player.Tags ??= new();
            Puts($"{player} {(player.IsSkibidi ? "is" : "isn't")} skibidi.");
            BasePlayer.DuckCounter++;
        }

		Puts($"Counted {BasePlayer.DuckCounter:n0} ducks.");
	}
}
```

##  Stored Modifiers
:::danger IMPORTANT
This feature is designed to **only** work with Rust's entity system. So all stored modifiers must be inside in any classes that derive from `BaseNetworkable` or `BaseEntity`.

#### Saving & Loading
Carbon's modifier data save file is under `<root>/server/<identity>/*.carbon.sav`. Carbon modifier data gets saved right before Rust's native server save saves and loads right after Rust's entities spawn.

You'll see something like this:
```cs
Spawning 0 entities from map
        done.
Spawning 9932 entities from save
Processed 482 entities with Carbon modifier data // [!code focus]
        done.
Postprocessing 0 entities from map
        done.
Postprocessing 0 entities from save
Starting to load entities into GlobalNetworkHandler...
Took 4ms to load entities into GlobalNetworkHandler
        done.
Enforcing SpawnPopulation Limits
        done.
Initializing 9985 entity links
        done.
Initializing 87 stability supports
        done.
Initializing 9934 entity save caches
        done.
```
Upon server save, you'll see something like this (the log **only happens** when there actually is Carbon modifier stored data):
```cs
Invalidate Network Cache took 0.00 seconds
Saved 2,426 ents with Carbon modifier data // [!code focus]
Saved 10,077 ents, cache(0.09), write(0.00), disk(0.00).
Saving complete
```
:::

This is an extension to the previously mentioned modifiers, although access design slightly changes, as you'll notice shortly.

```json
  // carbon/modifiers/MyPlugin.json

  {
    "Assembly": "Assembly-CSharp",
    "Name": "BasePlayer",
    "Fields": [
	  {
        "Name": "hasSeenWelcomeUi",
        "Type": "System.Boolean",
        "ShouldSave": true
      },
	  {
        "Name": "timeSinceUiOpen",
        "Type": "System.Single",
        "ShouldSave": true
      }
    ]
  }
  ```

:::danger MORE IMPORTANT STUFF
Carbon stored data only exists until the entity with that reference dies/gets killed. So once entities get killed, Carbon data is also killed.
:::

## How it works
On server boot, upon detecting and collecting all types that have stored modifiers, Carbon will generate the following new class in the same assembly, for each modified type.

```csharp
// dnSpy, Assembly-CSharp, BasePlayerCarbonData

using System;
using Carbon.Components;
using ProtoBuf;
using ProtoBuf.Meta;

[ProtoContract(ImplicitFields = 1)]
public class BasePlayerCarbonData : StoredModifiers.Data
{
	public static void Initialize()
	{
		RuntimeTypeModel.Default[typeof(StoredModifiers.Data)].AddSubType(151162043, typeof(global::BasePlayerCarbonData));
	}

	public bool hasSeenWelcomeUi = default(bool);

	public float timeSinceUiOpen = default(float);

	// This exists in a different carbon/modifiers JSON file, 
	// with a stored modifier on the same type
	public int chatMessageCount = 0; 
}
```

Then these following things happen in the modified type:
```csharp
	// dnSpy, Assembly-CSharp, BasePlayer

	[NonSerialized]
	// To actually save this data, you must assign this field yourself with a 
	// new value, then upon manual or automated Rust server save, it'll get
	// picked up for saving. Setting it to null, will remove it from the save.
	public global::BasePlayerCarbonData basePlayerCarbonData; 

	public override void Load(global::BaseNetworkable.LoadInfo info)
	{
		base.Load(info);
		StoredModifiers.TryGetData<global::BasePlayerCarbonData>(this, ref this.basePlayerCarbonData, info);
		// ...
	}

	public override void Save(global::BaseNetworkable.SaveInfo info)
	{
		base.Save(info);
		StoredModifiers.TryUpdateData<global::BasePlayerCarbonData>(this, this.basePlayerCarbonData, info);
		// ...
	}
```
:::danger IMPORTANT
For you to access these new members inside your IDE, make sure to [follow these instructions](/devs/creating-your-project#step-6-enable-developer-mode) to get started.
:::

You can then do the following in your plugin:
```csharp
private void OnServerInitialized()
{
    var player = BasePlayer.FindAwakeOrSleeping("Raul");
  
    if (player == null)
    {
        return;
    }

    // Assigning the value of the data will tell Carbon that it should store it
    player.basePlayerCarbonData ??= new BasePlayerCarbonData();
    player.basePlayerCarbonData.timeSinceUiOpen = UnityEngine.Time.realtimeSinceStartup;
    player.basePlayerCarbonData.hasSeenWelcomeUi = true;

    // Setting it to null, will remove it from the Carbon modifier data save file 
    player.basePlayerCarbonData = null;
}
  ```