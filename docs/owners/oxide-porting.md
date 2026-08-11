---
title: Oxide Porting
description: An in-depth understanding of the necessary changes that are done when you're transferring your Oxide server over to Carbon.
---

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

# Oxide Porting
![Oxide Porting](/misc/oxide-to-carbon.webp){width=1640px height=502px}

An in-depth understanding of the necessary changes that are done when you're transferring your Oxide server over to Carbon.

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

## Automatic

Carbon has a built-in process which detects an existent Oxide installation and upon clean Carbon install (patch unzipped
in the server root directory), will appropriately move all extensions found in `RustDedicated_Data/Managed` previously
used with Oxide, in Carbon's dedicated directory.

Carbon also copies all config, data, lang, user & group data files and migrates it all at launch of the server, after
files have been validated with Steam, since they're still patched with Oxide.

:::tip
Ensure you validate all server files before initially starting up the server with Carbon for a clean boot. If things
don't update, delete `steamapps` directory from the root of the folder first.
:::

## Manual

To understand changes necessary for handling things manually, follow the following instructions.

:::info Config Folder
The `<root>/oxide/config` folder **becomes `<root>/carbon/configs`**. This is because early in the development of
Carbon, we've named it that way since it makes more sense.
:::

### Extensions

The Oxide extensions, which in Oxide (for some reason) you place then in the brain folder of your Rust server, aka
`RustDedicated_Data/Managed`, **in Carbon it goes in its own dedicated directory, namely `<root>/carbon/extensions`**.

If you need help to identify what an Oxide extension looks like in your files, any file with `Oxide.Ext.*.dll` format
would be found in the Managed folder of an Oxide server.

:::danger Oxide (o.*) Commands
They don't work, this is Carbon. It might be difficult to get used to it, but all our commands are prefixed with c.*.
Although you may create aliases which reflect commands.

Look for `alias` in the Commands page. [Read more here.](../references/commands/)
:::

## Successful Transfer

There's a requirement where you must delete all `Oxide.*.dll` from your `<root>/RustDedicated_Data/Managed` folder, as
well as verifying and re-updating your Rust server so files like `Assembly-CSharp.dll` get redownloaded, since Oxide
processes them.

Take all extensions out of your `<root>/RustDedicated_Data/Managed` directory, and putting them in the respective Carbon
extensions folder, removing Managed folder altogether, then performing an update & validation with steamcmd. This
ensures that your server is cleansed and vanilla.

