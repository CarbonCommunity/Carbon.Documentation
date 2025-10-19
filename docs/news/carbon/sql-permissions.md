---
title: SQLite Permissions & More
description: QoL improvements, bug fixes, module updates and extension hotloading removal.
header: https://files.facepunch.com/paddy/20230904/homingrocketlauncher_01.jpg
logo: /news/sql-perms.webp
author: Raul
date: 2025-08-07T16:48:47.544Z
tags:
  - news
  - permissions
  - server owners
  - sql
  - carbon
layout: news-layout
category: news
sidebar: false
fmContentType: blogpost
published: true
showjoinus: true
---

<NewsSection>

Forget giant `oxide.users.data` files filled with players that joined your server about 6 years ago for 2 seconds, all of that stored in your memory. Experience seamless transition to SQL-based permission management, which only keeps in memory what is necessary.

</NewsSection>

<NewsHeroSection src="https://files.facepunch.com/paddy/20250314/rust_abysspack_sunkenknife_01.jpg">
<NewsSectionTitle text="Motivation"/>
<NewsSection>
A few years ago when Carbon was just a concept — and initially called Rexide🤮 (that name still haunts me) — one of the bigger things we wanted to do with Carbon besides dynamic patching, was to have a more performant permissions system which takes memory usage into account as well as data it stores in memory at server runtime.
</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/Alistair/104/06/2025/0S59/juneupdate_silencer_both_03.jpg">
<NewsSectionTitle text="Protobuf to SQL Migration" author="raulssorban"/>

This newly available solution is purely designed to increase overall server performance and reduce unnecessary overhead initially caused by Oxide's design.

<NewsImage src="/news/sql-1-showcase.webp"/>
<NewsSection>

Since 2MB of `oxide.users.data` is the equivalent to 50K unique users, there have been server owners who have 50MB or above worth of that with hundreds of thousands of users of which percentage of active players is expectedly low.<br><br>

All of these users would be not only loaded in the memory, but also saved again and again with each server save (which was to ensure consistent permission data being stored). **Migrating to SQL will no longer need the database to be saved on server save.**

<NewsSectionSubtitle text="How to migrate?"/>
The migration process is as simple as running a command on the server.

:::tip GET STARTED
To begin migrating, run **`c.migrate_perms_sql`**, then a new SQLite database will be created at `<root>/servers/<identity>/carbon.perms.db`
:::

<NewsSectionSubtitle text="What's happening?"/>

The **`c.migrate_perms_sql`** command will:
1. Copy over all of your groups and group permissions associated 
1. User info with their associated groups and permissions 
1. Switching your server Permissions serialization setting to SQL **without** requiring a server restart or plugin reloads.

:::tip NOTICE
An important thing to note is that while the server is active using SQL mode, the database is locked; cannot R/W to it while server's online.
:::

You can continue using the server as you normally would. **Your permissions system is now fully switched to SQL.**

<NewsSectionSubtitle text="Rollback / Migrating back to Proto?"/>

You can also switch back to the **Protobuf**-based permissions database with **`c.migrate_perms_proto`** which works just the same way (it imports all users, groups and their perms into the in-memory Protobuf database straight from the SQL database).

</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/paddy/20240905/rust_202409_ttk_heroimage.jpg">
<NewsSectionTitle text="Admin Extensions Module" author="bubbafett5611"/>
<NewsImage src="/misc/admin_a.webp" h="200px"/>

<NewsSection>

We've also added a new module named `AdminExtensions` which is dedicated to give a configurable and first-hand chat command permission-based access to Carbon Admin Module features that you would normally need to click through.

<NewsSectionSubtitle text="Configuration"/>

Here are the following commands you can configure:
- `/spectate`: Will spectate a player (syntax: `/spectate someplayer`), requiring configurable permission `adminextension.spectate` for it to work
- `/blind`: Will blind/lock down a player (syntax: `/blind someplayer`), requiring configurable permission `adminextension.blind` for it to work
- `/empower`: Will maximize all positive stats on a player (syntax: `/empower someplayer`), requiring configurable permission `adminextension.empower` for it to work
- `/cpm`: Will send a private message to a specific player (syntax: `/cpm someplayer message`), requiring configurable permission `adminextension.cpm` for it to work
- `/lock`: Will lock up one or all of the inventory containers of a player (syntax: `/lock someplayer [main|belt|wear|all] [0|1]`), requiring configurable permission `adminextension.lock` for it to work
- `/tpm`: It's a toggle command which will teleport the player when they're placing a map marker to the marker position, requiring configurable permission `adminextension.tpm` for it to work
</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/Alistair/122/04/2025/6J27/jungleUpdate_biome_02.jpg">
<NewsSectionTitle text="Redirect URI" author="raulssorban"/>
<NewsSection>

We've added a new configuration option in Carbon's config file under the `SelfUpdating` section called `RedirectURI`, designed for the self-updating process to use as Carbon's endpoint it will automatically update from. This could be ideally used to build and maintain your own Carbon build in-house.

```json
  "Analytics": {
    "Enabled": true
  },
  "SelfUpdating": {
    "Enabled": false,
    "HookUpdates": true,
    "RedirectUri": "https://my.endpoint/carbon.tar.gz" // [!code focus]
  },
  "Debugging": {
    "ScriptDebuggingOrigin": "",
    "HookLagSpikeThreshold": 1000
  },
```
</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/paddy/20230201/indst_storageadapter_02.jpg">
<NewsSectionTitle text="Admin Module Hooks" author="bubbafett5611"/>
<NewsSection>

With the exposing, polish and cleanup of some of our duplicated Admin Module code, we've also introduced a few new Carbon-only hooks plugins can use.
```cs
- OnCarbonBlinded (BasePlayer invoker, BasePlayer target)
- OnCarbonUnblinded (BasePlayer invoker, BasePlayer target)
- OnCarbonEmpowerPlayerStats (BasePlayer invoker, BasePlayer target)
- OnCarbonLockPlayerContainer (BasePlayer invoker, BasePlayer target, ItemContainer container, bool locked)
- OnCarbonPrivateMessage (BasePlayer invoker, BaesPlayer target, string message)
- OnCarbonSpectateStart (BasePlayer invoker, BaesPlayer target)
- OnCarbonSpectateEnd (BasePlayer invoker, BaesPlayer target)
```

ModerationTools has also been merged all within AdminExtensions as it makes the most sense, and it's better to keep it all contained.
```cs
- OnCarbonBanPlayer (BasePlayer invoker, BasePlayer target, string reason, long expiry)
- OnCarbonUnbanPlayer (BasePlayer invoker, BasePlayer target)
- OnCarbonKickPlayer (BasePlayer invoker, BasePlayer target, string reason)
- OnCarbonMutePlayer (BasePlayer invoker, BasePlayer target, bool wants reason, string reason)
```
</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/Alistair/102/04/2025/9w14/apr2025_impactdecals_02_4k.jpg">
<NewsSectionTitle text="Pterodactyl Profiler Crashes" author="raulssorban"/>
<NewsSection>

We've addressed a short-lasting issue where the profiler would cause `Out of Memory` crashes on certain Ubuntu distros. 

</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/paddy/20250314/rust_abysspack_sunkenknife_01.jpg">
<NewsSectionTitle text="Extension and Module Removal"/>
<NewsSection>
Module and Extension hotloading removal comes from the sole reason of .NET disallowing us to properly unload assemblies, where instances where modules or extensions depending on other module and extensions will not properly hotload or sync up their dependencies, causing unexpected behavior.
</NewsSection>
</NewsHeroSection>

<NewsReleaseNotes version="2.0.203"/>
<NewsReleaseNotes version="2.0.202"/>