---
title: Auto Updates
description: Carbon automatically updates by default, keeping your Carbon version ready to go relative to the Rust branch you're running.
slug: auto-updates
---

# Auto Updates
![Auto Updates](/misc/auto-updates.webp){width=1640px height=502px}
A formal explanation and in-depth understanding of all of the events that occur when Carbon self-updates.

:::tabs
===carbon/config.json
```json
...
  "Analytics": {
    "Enabled": true
  },
  "SelfUpdating": { // [!code focus]
    "Enabled": true, // [!code focus]
    "HookUpdates": true, // [!code focus]
    "RedirectUri": null // [!code focus]
  }, // [!code focus]
  "Debugging": {
    "ScriptDebuggingOrigin": "",
    "HookLagSpikeThreshold": 1000
  }
...
```
:::

## Update Schedule
We release production updates sually twice a month on the stable builds (Carbon `production` build for the `public` Rust branch), with follow-up hotfix patches when applicable. 

We release the `production` build for the Rust wipe update 1 hour before the actual Rust server update drops, using the `release` branch to build against (it's the build that gets merged to `public` on the clock). 

Our other beta builds get updated accordingly to Facepunch's progression in the development of said branches. For example, `staging` branch only begins to have significant changes necessary for Carbon to update to, roughly mid-month.

## Self Updating
**When does the self-updating actually happen?** It's entirely relative to the version you're actively running. 

### Production
**If you're running the stable version of the game (`public` branch) alongside the `production` stable Carbon build and there is a major protocol change for Carbon (eg. Rust wipe day), Carbon only self updates if you update to the latest Rust version.**

### Staging (Betas)
If you're running Rust staging branch, along the Carbon staging beta build and we release an update for that Staging beta build, your next restart will automatically update to it regardless of protocol.

## What's Happening
As soon as you start the Rust server with Carbon installed, here's what's happening:
1. First and foremost before any Rust assemblies are loaded, **we're downloading the version list from our servers and then compare the locally installed build**.
1. If we determine that you are out of date, **we're downloading the patch [from GitHub](https://github.com/CarbonCommunity/Carbon/releases) for the exact same build type you're running for your operating system, then we unzip all core files in the Carbon directory, primarily the `carbon/managed` files**.
1. After this, the publicisation step happens, **where we publicise all relevant Rust assemblies and load those ones into memory for Unity to use, instead of the vanilla ones**.
1. After all of that, the server boots up normally. The period of self updating is very, very brief, varying slightly relative to your server CPU and internet connection speed.

## Hook Self-Updating
The hook updates happen after the self-updating process, actually when you start seeing logs of the server booting up, and before any extensions or plugins get loaded. 

**This is entirely tied to the Carbon protocol.**
