---
title: Creating Hooks
description: Here's a brief overview on how to create and add new hooks in Carbon, as well as adding hooks that are only processed by your plugin &/or module.
slug: creating-hooks
type: page
---

# <CarbonIcons icon="braces" /> Hooks
Here's a brief overview on how to create and add new hooks in Carbon, as well as adding hooks that are only processed by your plugin &/or module.

## Introduction
Carbon hooks are only applied at runtime whenever a plugin needs them, meaning that at large scale, you can have multiple variations for events that happen in-game.

## Guidelines
There are a few things that need to be met for the hooks to be considered valid and ready to be released to the public, please follow the guide on how to do so.

## <CarbonIcons icon="star" /> Community Hooks
How to get started with submitting community-driven hook changes, requests and additions.

### Metadata
For documentation purposes, it's important to properly describe what the hook does, properly identify its ID and flags.

The following attributes are entirely used by the documentation code-generation system of which outputs can be found [here](../references/hooks).


:::tabs
== [MetadataAttribute.Info]
`Info` attribute, can be multiple.

```csharp
[MetadataAttribute.Info("This hook does this and that.")]
[MetadataAttribute.Info("This hook also does that and the other.")]```

== [MetadataAttribute.Parameter]
`Parameter` attribute, can be multiple. Are the exact parameter types and a readable name shown in the example.

```csharp
[MetadataAttribute.Parameter("dabloons", typeof(int))]
[MetadataAttribute.Parameter("entity", typeof(BaseEntity))]
```
== [MetadataAttribute.Return]
`Return` attribute, can only be one or none (`void`). It's the displayed return type in the generated example of the hook.


```csharp
[MetadataAttribute.Return(typeof(bool))]
```
:::

### Implementation
A primary requirement is the location of the patch, as well as the `Prefix`, `Postfix` and/or `Transpiler` methods.

```csharp
[HookAttribute.Patch("OnHookName", "OnHookName [main]", typeof(Type), "Method", [/* Method params */])]
```

### Patching
We use regular Harmony patches for our hooks, so depending on the purpose of your hook, you may choose to use between a **Prefix**, **Postfix** and/or **Transpiler**. For example:

```csharp
public static bool Prefix(BasePlayer ply, ref PatrolHelicopterAI __instance, out bool __result)
{
	if (HookCaller.CallStaticHook(1610282469, __instance, ply) is bool boolean) // [!code focus]
	{
		__result = boolean;
		
		// Disallow original code from executing
		return false;
	}
	__result = default;
	
	// Allow original code to execute
	return true;
}
```

:::tip IMPORTANT
We do not use `Interface.CallHook` for our hook system which use direct hook name strings, instead we use hook identifiers as they're way faster to process.

> The hook IDs are generated the same way Rust uses with `StringPool` to get numeric identifiers out of string values.

You can generate your own hook identifier, [using our API](https://carbonmod.gg/mdhash/?hook=MyHookName).
It should look something like this: `499798872`, which then used in the HookCaller, you use it like this:
```csharp
HookCaller.CallStaticHook(499798872, /*params*/);
```
:::


## <CarbonIcons icon="star" /> Plugin Patches / Hooks
Hooks that only get patched & unpatched inside plugins.

### Automatic Way
In `RustPlugin` or `CarbonPlugin`, Carbon handles all the logic for patching / unpatching your instructions, making it easier so all you need to focus on is the actual implementation of your plugin.

:::info
You need to add this line which lets Carbon know that it should automatically handle everything for you.
```csharp
using Oxide.Core.Plugins;

[AutoPatch]
[HarmonyPatch(...)]
public class MyPatch { ... }
```
:::

Example:
```csharp {12-13}
using System;
using HarmonyLib;
using Oxide.Core.Plugins;

namespace Carbon.Plugins;

[Info("Collaborate", "Carbon Community", "1.0.0")]
public class Collaborate : CarbonPlugin
{
    #region Patches
    
    [AutoPatch] // [!code focus]
    [HarmonyPatch(typeof(BasePlayer), "CanSuicide", new Type[] { })] // [!code focus]
    public class Patch_1
    {
       public static bool Prefix(BasePlayer __instance, ref bool __result)
       {
          Logger.Log("Works!");
          __result = false;
          return false;
       }
    }

    #endregion
}
```

While this is entirely Oxide backward compatible, we've expanded on the use of the `[AutoPatch]` attribute with the following options:

```csharp
using System;
using HarmonyLib;
using Oxide.Core.Plugins;

namespace Carbon.Plugins;

[Info("Collaborate", "Carbon Community", "1.0.0")]
public class Collaborate : CarbonPlugin
{
     #region Patches

     public void OnPatchComplete()
     {
     	// Run special code here only if the patch is successful
     }

     [AutoPatch( // [!code focus]
     	IsRequired = true, // If the patch fails, automatically unload the plugin // [!code focus]
     	Order = AutoPatchAttribute.Orders.AfterOnServerInitialized, // Specify at what time on the plugin's initialization should the patch apply // [!code focus]
     	PatchSuccessCallback = nameof(OnPatchComplete))] // [!code focus]
     [HarmonyPatch(typeof(BasePlayer), "CanSuicide", new Type[] { })]
     public class Patch_1
     {
     	public static bool Prefix(BasePlayer __instance, ref bool __result)
     	{
     		Logger.Log("Works!");
     		__result = false;
     		return false;
     	}
     }

     #endregion
}
```

:::info
[More info here](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Oxide/Attributes/OxideAttributes.cs#L7) on what `[AutoPatch]` provides!
:::

### Manual Way
Here's an example to how this works when you manually add patches to your plugin:

```csharp
using System;
using HarmonyLib;

namespace Carbon.Plugins;

[Info("Collaborate", "Carbon Community", "1.0.0")]
public class Collaborate : CarbonPlugin
{
    public Harmony _PATCH;
    public const string DOMAIN = "com.carbon.mypatch";

    private void Init()
    {
       _PATCH = new Harmony(DOMAIN);
       _PATCH.PatchAll(Type.Assembly);

       Puts("Patched.");
    }

    private void Unload()
    {
       _PATCH.UnpatchAll(DOMAIN);

       Puts("Unpatched.");
    }

    #region Patches

    [HarmonyPatch(typeof(BasePlayer), "CanSuicide", new Type[] { })]
    public class Patch_1
    {
       public static bool Prefix(BasePlayer __instance, ref bool __result)
       {
          Logger.Log("Works!");
          __result = false;
          
          // Returning false will prohibit the original code from executing
          // Only applies to Prefixes
          return false;
       }
    }

    #endregion
}
```