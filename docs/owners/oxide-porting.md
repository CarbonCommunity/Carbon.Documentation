---
title: Oxide Porting
description: An in-depth walkthrough of migrating an Oxide server over to Carbon.
---

# Oxide Porting
![Oxide Porting](/misc/oxide-to-carbon.webp){width=1640px height=502px}

This is an in-depth walkthrough of migrating an Oxide server over to Carbon.

After following **Prerequisites** and **Carbon Files Installation** sections below, follow either the **Automatic Migration** or **Manual Migration** section as desired.

:::danger Prerequisites
Both migration options require first reverting Oxide-patched Facepunch DLLs to vanilla versions. **Oxide and Carbon can NOT coexist** in the same server install, because they do the same thing (albeit via different approaches). Please carefully read the **Migration Prerequisites** section below. :::

## Migration Prerequisites

The following operations are required prior to **Carbon Files Installation** and either **Automatic** or **Manual Migration**.

### Shutdown

You must shut down your server before migrating.

### Disable Oxide Tooling

You **must** ensure that any tooling that automatically installs/updates Oxide is disabled. **Carbon and Oxide can NOT coexist.** Allowing the server to run with both of them installed will break your server!

Detailed instructions cannot be provided here; there are many different implementations of this, and they are out of scope for this documentation.

:::tip Carbon has Self Updating as a built-in feature. See **Feature Comparison** below.

### Revert Oxide-patched Facepunch DLLs

Oxide ships pre-patched versions of Facepunch DLLs, but Carbon patches them dynamically. **Your Facepunch DLLs must therefore be reverted to vanilla versions.** The easiest way to revert is to run a `steamcmd` update operation on your server with the `validate` option included.

An example is provided below. **This is just an example.** Your server may differ in install location, beta/branch, etc.
```
steamcmd +force_install_dir C:\games\rust +login anonymous +app_update 258550 -beta public validate +quit
```

:::tip If steamcmd fails to validate, delete the `steamapps` directory from the root of the server install and try again. :::

For a deeper clean, you can completely remove the `Managed` folder under `RustDedicated_Data` before running the validate - but note that **this will also wipe out any extension DLLs**, so be sure to copy those somewhere else first. See the **Extensions** section below. :::

:::info Carbon and Facepunch DLLs
With Carbon, your `RustDedicated_Data/Managed` folder will always be untouched from Facepunch's shipped configuration. :::

## Carbon Files Installation

After following the **Prerequisites** section above, unpack Carbon into your server root folder, such that the `carbon` folder becomes a top-level subdirectory of your server install, and the top-level files land in your server root folder.

## Automatic Migration

After following the **Prerequisites** and **Carbon Files Installation** sections above, simply **start your server.**

Carbon will detect the remnants of your previous Oxide installation and do the following for you:
- Copies all `config`, `data`, `lang`, and user & group data files into the appropriate locations under your Carbon install.
- Moves all extension DLLs found in `RustDedicated_Data/Managed` into Carbon's dedicated `extensions` subdirectory.

:::info One-Time Only
In order to protect your post-migration setup, this process will only run the **first time** you start your server with Carbon installed. If something goes wrong, read the **Manual** migration per the instructions below. :::

## Manual Migration

After following the **Prerequisites** and **Carbon Files Installation** sections above, follow each sub-section below.

### Plugin Files

Copy or move everything - **except for your `config` folder** _(see below)_ - from inside of your `oxide` folder to the inside of your `carbon` folder, allowing overwrites.

### Config Folder

:::danger Folder Names
Carbon uses a **different name** for the subfolder that holds your plugin configuration files. :::

Copy or move the contents of your Oxide `config` folder to Carbon's `configs` folder.

Alternatively, just remove Carbon's empty `configs` folder, copy or move your Oxide `config` folder over to your Carbon folder, then rename that to `configs`.

### Extension DLLs

Move all Oxide extension DLLs from `RustDedicated_Data/Managed` into the `extensions` subfolder of your Carbon install.

:::tip Oxide extension DLLs can be identified by their `Oxide.Ext.*.dll` naming format.

### Start

Start your server and enjoy Carbon.

## Post-Migration

After successfully migrating from Oxide, the following information may help ease your transition to _using_ Carbon.

### Cleanup

After migration is complete, the `oxide` folder under your server install is no longer used/needed. You can remove or leave it as desired.

### Commands

Oxide `o.` commands don't work in Carbon. All Carbon commands are prefixed with `c.`.

:::tip If you really want to stick with `o.` for some commands, you can define aliases; look for `alias` in the [Commands](../references/commands/) documentation. :::

### Feature Comparison
<script setup>
const features = [
    { name: 'Dynamic Patching', desc: 'With the sheer amount of roughly 800+ Oxide hooks and patches, Carbon only fires and executes them when plugins need them, keeping things fully vanilla otherwise. On Oxide, all of these hooks fire at all times regardless if there are loaded plugins needing them, adding overhead.', link: '/references/hooks', carbon: true, oxide: false },
    { name: 'Self Updating', desc: 'Carbon automatically updates the edition it\'s running (production, staging, etc.) without requiring any additional work. For example, on Rust wipe day, all you have to do is ensure that your Rust server is validated and updated, then booting it, Carbon will automatically self-patch for that Rust version.', carbon: true, oxide: false },
    { name: 'Remote Hook Updates', desc: 'On server boot, Carbon is looking to download the most recent updates for Oxide and Community hooks without requiring a full Carbon update. If there are hook failure patches (which usually doesn\'t happen), look for announcements in our Discord server, then just reboot the server to get the hook updates.', carbon: true, oxide: false },
    { name: 'Profiler', desc: 'Carbon has a built in profiler designed to profile performance of anything you wanna track (Rust, Unity, System, plugins, modules, extensions, you name it).', link: '/devs/features/mono-profiler', carbon: true, oxide: false },
    { name: 'SQLite Permissions', desc: 'This brand new system is purely designed to increase overall server performance and reduce unnecessary overhead initially caused by Oxide\'s design.', carbon: true, oxide: false, link: '/news/carbon/sql-permissions' },
    { name: 'Regular Updates', desc: 'Since the birth of Carbon (27th of August 2022), we\'ve consistently released updates addressing issues, compatibility, QoL and implemented great ideas the community has contributed to the project with.', link: '/references/release-notes', carbon: true, oxide: false },
    { name: 'Harmony 2.0', desc: 'For the longest time, Rust used the outdated Harmony 1.0 which meant that Oxide was also using that outdated version in plugins. Carbon has always ran Harmony 2.0, then only fairly recently Facepunch updated Rust\'s Harmony version to 2.0, by proxy on Oxide also.', carbon: true, oxide: true },
    { name: 'Regularly Maintained', desc: 'Carbon and Oxide have at least one thing in common; making sure the framework functions when Rust releases updates.', carbon: true, oxide: true }
]
</script>

<table tabindex="0">
  <thead>
    <tr>
      <th>Feature</th>
      <th style="text-align: center; min-width: 100px">Carbon</th>
      <th style="text-align: center; min-width: 100px">Oxide</th>
    </tr>
  </thead>
  <tr v-for="feature in features">
    <td>
      <strong>{{feature.name}}</strong>
      <div style="opacity: 50%; font-size: smaller">
        {{feature.desc}} <a v-if="feature.link != null" :href="feature.link">Learn more.</a>
      </div>
    </td>
    <td><div style="opacity: 50%; font-size: smaller">{{feature.carbon ? "✅ Present" : "🚫 Absent"}}</div></td>
    <td><div style="opacity: 50%; font-size: smaller">{{feature.oxide ? "✅ Present" : "🚫 Absent"}}</div></td>
  </tr>
</table>
