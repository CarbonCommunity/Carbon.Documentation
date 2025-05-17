---
title: Creating Hooks
description: Here's a brief overview on how to create and add new hooks in Carbon, as well as adding hooks that are only processed by your plugin and/or module.
slug: creating-hooks
type: page
---

# Hooks

Here's a brief overview on how to create and add new hooks in Carbon, as well as adding hooks that are only processed by
your plugin and/or module.

## Introduction

Carbon hooks are applied at runtime whenever a plugin needs them, meaning that on a large scale, you can have multiple
variations for in-game events.

## Guidelines

There are a few things that need to be met for the hooks to be considered valid and ready to be released to the public,
please follow the guide on how to do so.

## Community Hooks

How to get started with submitting community-driven hook changes, requests and additions.

### Metadata

For documentation purposes, it's important to properly describe what the hook does, properly identify its ID and
flags.

The attributes below are used by the documentation code-generation system, with outputs used
[here](../references/hooks).

:::tabs
== [MetadataAttribute.Info]
The `Info` attribute can be applied multiple times.

```csharp
[MetadataAttribute.Info("This hook does this and that.")]
[MetadataAttribute.Info("This hook also does that and the other.")]
```

== [MetadataAttribute.Parameter]
The `Parameter` attribute can be used multiple times. Specify the parameter name and type as shown in the example.

```csharp
[MetadataAttribute.Parameter("doubloons", typeof(int))]
[MetadataAttribute.Parameter("entity", typeof(BaseEntity))]
```

== [MetadataAttribute.Return]
The `Return` attribute can be used once or omitted (if the return type is `void`). This indicates the return type in the
generated example.

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

We use Harmony patches for hooks. Choose between `Prefix`, `Postfix`, or `Transpiler` based on your needs:

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
We do not use `Interface.CallHook` for our hook system which use direct hook name strings, instead we use hook
identifiers as they're way faster to process.

> The hook IDs are generated the same way Rust uses with `StringPool` to get numeric identifiers out of string values.

You can generate your own hook identifier, [using our API](https://api.carbonmod.gg/mdhash/?hook=MyHookName).
It should look something like this: `499798872`, which then used in the HookCaller, you use it like this:

```csharp
HookCaller.CallStaticHook(499798872, /*params*/);
```

:::

## Plugin Patches / Hooks

Create hooks that are exclusively processed by your plugin.

### Automatic Patching

In `RustPlugin` or `CarbonPlugin`, Carbon handles all the logic for patching / unpatching your instructions, making it
easier so all you need to focus on is the actual implementation of your plugin.

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

```csharp
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

While this is entirely Oxide backward compatible, we've expanded on the use of the `[AutoPatch]` attribute with the
following options:

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
        // Unload plugin if patch fails // [!code focus]
        IsRequired = true, // [!code focus]
        // Specify at what time on the plugin's initialization should the patch apply // [!code focus]
        Order = AutoPatchAttribute.Orders.AfterOnServerInitialized, // [!code focus]
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
Learn more about
[`AutoPatch`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Oxide/Attributes/OxideAttributes.cs#L7).
:::

### Manual Patching

:::danger Important
**NOT RECOMMENDED** to do it manually. You can easily break others patches if done wrong.
:::

Manually manage Harmony patches:

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
        _PATCH.PatchAll(Assembly.GetExecutingAssembly());
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
