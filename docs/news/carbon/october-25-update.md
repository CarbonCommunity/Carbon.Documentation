---
title: October Update
description: Rust CUI updates, meta shift, bug fixes, Web Control Panel accounts.
header: https://files.facepunch.com/lewis/1b2511b1/brutalist-7.jpg
logo: /news/october-25-update.webp
author: Raul
date: 2025-10-01T16:00:24.712Z
tags:
  - carbon
  - control
  - cui
  - rust
  - update
  - panel
layout: news-layout
category: news
sidebar: false
fmContentType: blogpost
published: false
showjoinus: true
hidden: false
---

<NewsHeroSection src="https://files.facepunch.com/mattisaac/2025/September/rust_wall_cabinet_1080.jpg">
<NewsSectionTitle text="CUI" author="raulssorban"/>
<NewsSection>
With this update, various long anticipated community curated <a href="https://github.com/Facepunch/Rust.Community" target="_blank">PRs</a> have been finally merged into the game, allowing plugin developers and CUI designers to expand on the possibilities of what they can do!

<NewsSectionSubtitle text="Draggables" author="Kulltero"/>
<video controls src="/news/draggables-demo.mp4"></video><br>
Introduced by Kulltero in PR <a href="https://github.com/Facepunch/Rust.Community/pull/55" target="_blank">#55</a>, drag & drop allows us to mark a panel as draggable & listening to its movements when dragged by the player, opening up a whole new way of player interaction.

<NewsSectionSubtitle text="RectTransform Rotation" author="codefling-0xf"/>
Introduced by 0xF in PR <a href="https://github.com/Facepunch/Rust.Community/pull/69" target="_blank">#69</a> (nice), you're now able to rotate any UI elements you're creating.

<NewsSectionSubtitle text="Sources"/>
- <a href="https://github.com/Facepunch/Rust.Community/blob/master/CommunityEntity.UI.cs" target="_blank">**CommunityEntity** (Rust.Community)</a> 
- <a href="https://github.com/CarbonCommunity/Carbon.Common/blob/8ea6781a8dd2344c364e4d46baa60eb707c26ccd/src/Oxide/CUI/CuiCore.cs" target="_blank">**CuiCore** (Carbon.Common)</a> 

</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/ianhenderson/1b0111b1/Photos_p1CM7u1uEf.jpg">
<NewsSectionTitle text="Extra Community Features" author="raulssorban"/>
<NewsSection>
With this update, Jake continued adding a few new awesome features in addition to the CUI changes. 

<NewsSectionSubtitle text="Custom Vitals" author="Jake-Rich"/>
Introduced by Jake Rich in <a href="https://github.com/Facepunch/Rust.Community/commit/f1eef905473105e7814b984bc5745d4d9cbaa006" target="_blank">commit</a>, in Protobuf format you're now able to add entirely custom player vital elements with very high customisation, allowing you to change the following:

:::code-group
```cs [CustomVitalInfo]
public Color backgroundColor;
public Color leftTextColor;
public Color rightTextColor;
public Color iconColor;
public string leftText;
public string rightText;
public string icon;
public bool active;
public int timeLeft;
```
:::

:::warning
Be sure to manage the list of `CustomVitalInfo` and `CustomVitals` instance properly by using `Facepunch.Pool.Get` and `Free` as they are pooled objects.
:::

<NewsSectionSubtitle text="Entity Scaling" author="Jake-Rich"/>
You can now change the scale of entities. And it's fairly easy too, as well as optimal on the network. The scale only gets networked if the `BaseEntity.networkEntityScale` is set to `true`. To actually update and sync the change, you just update the `transform.localScale` and run `entity.SendNetworkUpdate()`.

</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/mattisaac/2025/September/rust_tripod_spotlight_detail_1080.jpg">
<NewsSectionTitle text="Web Control Panel" author="raulssorban"/>
<NewsSection>

While you're still able to use the <a href="/tools/control-panel" target="_blank">WebControlPanel</a> using Rust's default WebRCon with one defined password granting the ability to execute owner-level commands, we're introducing **Accounts** with this brand new update!

:::info
Due to browser limitations, if you're using the WebControlPanel tool with secured connection, aka `https://` mode, you're required to set up a SSL certificate on your Rust WebRCon connection. **To use an insecure connection (bypass the certificate), switch to `http://`.**
:::

<NewsSectionSubtitle text="Carbon Bridge"/>
A new mode will be available on the panel, named **Bridge**. Once configured on your server, it will start a new RCon-like TCP connection which is entirely buffer-based (relative to Rust's WebRCon JSON-based communication) running under Carbon's <a href="/devs/features/bridge">Bridge system</a>. 

<NewsSectionSubtitle text="Accounts"/>
As the name might tell, with the introduction of the brand new Bridge connection, you're now able to have multiple passwords for the Bridge connection, which grant the people with access different permissions, opposite to granting them the rights to execute any owner-level commands.

<NewsSectionSubtitle text="How to set up?"/>
The location of the brand new WebPanel config is at `<root>/carbon/config.webpanel.json` by default. Depending on the viewing permissions, once accounts log in, they will only see and access the tabs that they have permission to.
<br><br>
The config can be reloaded on the fly as well as the Bridge server connection and port can be changed when reloading the config. Here're the available relevant commands:

- `c.webpanel.loadcfg`: Reloads the config, (re)starting the connection.
- `c.webpanel.savecfg`: Saves the config in case any changes haven't saved.
- `c.webpanel.setenabled`: Changes on-the-fly the status of the server if was previously configured to be enabled.
- `c.webpanel.clients`: Prints a table list of all connected web clients. 
- `c.webpanel.connected`: Is a readonly Carbon variable which lets you know if the Bridge server is broadcasting.

:::info
Whenever the config gets reloaded and new permission changes apply, all currently connected web clients will be disconnected, requiring them to reconnect with fresh account permissions.
:::

:::code-group
```json [config.webpanel.json]
{
  "Enabled": true,
  "BridgeServer": {
    "Ip": "localhost",
    "Port": 28608
  },
  "WebAccounts": [
    {
      "Name": "owner",
      "Password": "BMjgFMH",
      "Permissions": {
        "console_view": true,
        "console_input": true,
        "chat_view": true,
        "chat_input": true,
        "players_view": true,
        "players_ip": true,
        "players_inventory": true,
        "entities_view": true,
        "entities_edit": true,
        "permissions_view": true,
        "permissions_edit": true
      }
    },
    {
      "Name": "guest",
      "Password": "guest",
      "Permissions": {
        "console_view": false,
        "console_input": false,
        "chat_view": true,
        "chat_input": true,
        "players_view": true,
        "players_ip": false,
        "players_inventory": false,
        "entities_view": false,
        "entities_edit": false,
        "permissions_view": false,
        "permissions_edit": false
      }
    }
  ]
}
```
:::

</NewsSection>
</NewsHeroSection>

<NewsReleaseNotes version="2.0.203"/>
