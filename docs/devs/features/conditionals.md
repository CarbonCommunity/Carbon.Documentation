---
title: Conditionals
description: Execute code that's only compiled when a condition is met.
---

# Conditionals

If you have a plugin which has code that is supposed to be executed only on a specific framework, operating system,
branch or even a specific Rust or Carbon protocol, you can use this system.

## Framework

Since Carbon is for the most part compatible with over `95%` of the plugins written for Oxide out there, you may want to
use features that are only present in Carbon and not on Oxide.

It's as simple using as the following example:

```csharp
private void OnServerInitialized()
{
#if CARBON
    Puts("This is called on Carbon.");
#endif

#if !CARBON
    Puts("This is called on Oxide.");
#endif
}
```

## Operating System

Carbon feeds the Roslyn compiler the `WIN` or `UNIX` compilation symbols. They work as the following:

```csharp
private void OnServerInitialized()
{
#if WIN
    Puts("This is called on Windows Rust servers.");
#elif UNIX
    Puts("This is called on Linux Rust servers.");
#endif
}
```

## Rust Branch

You may want to have code that gets executed only on a specific branch of Rust. If that's the case, this is how you do
that:

```csharp
private void OnServerInitialized()
{
#if STAGING
    Puts("This is called on Rust staging-branch servers.");
#elif AUX01
    Puts("This is called on Rust aux01-branch servers.");
#elif AUX02
    Puts("This is called on Rust aux02-branch servers.");
#endif
}
```

## Rust (and Carbon) Protocol

This might be the most helpful; let's say a future update of Rust or Carbon will release a new feature you'd like to use
ASAP, although it'll make your plugin not compile until next update is released, but you want to publish the plugin
update earlier.

You'd also want the version that implements that new logic only accessible in a future update to be within the currently
released file, but want it to still compile. You can now use this:

```csharp
private void OnServerInitialized()
{
#if RUST_ABV_2511_243_1
    Puts("This is called when the current server protocol is above 2511.243.1.");
#endif

#if RUST_BLW_2510
    Puts("This is called when the current server protocol is below 2510.*.*.");
#elif RUST_IS_2511_243_1
    Puts("This is called when the current server protocol is 2511.243.1.");
#endif

#if CARBON_ABV_2022_05_06 || RUST_IS_2511_243_1
    Puts("This is called when the current Rust protocol is 2511.243.1.");
    Puts("As well as Carbon protocol is above 2022.05.06.");
#endif
}
```
