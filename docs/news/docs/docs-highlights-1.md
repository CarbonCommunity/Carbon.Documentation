---
title: Docs Highlights — 1
description: An initial introduction to the Carbon Documentation and website in general. It comes packed with lots of automatically updated content and reliable APIs for developers to use or owners to study!
header: /news/c4c_loading_8.png
logo: /news/docs-highlights.webp
author: Raul
date: 2025-07-03T23:52:07.701Z
tags:
    - docs
    - news
    - server owners
layout: news-layout
category: news
sidebar: false
fmContentType: blogpost
published: true
---

<NewsSectionTitle text="Introduction" author="raulssorban"/>
<NewsSection>
Welcome! These docs have been crafted by community members with the approach and perspective of server owners and developers/modders. 

**The following is a brief rundown of what's currently available for you to check out in a nutshell and an exploration to unannounced newly introduced features.**
</NewsSection>

<NewsSectionTitle text="Rust — References & Resources"/>
<NewsImage src="/news/items-showcase.png"/>

<NewsSection>
This heavy packed documentation website is filled with loads of resources for accessing all, up-to-date in-game information and more!

- <a href="../../references/items" target="_blank">Items</a> — This section contains a comprehensive list of all items available in the game.
- <a href="../../references/entities" target="_blank">Entities</a> — This section contains a comprehensive list of all entity prefabs available in the game.
- <a href="../../references/prefabs" target="_blank">Prefabs</a> — This section contains a comprehensive list of all prefabs available in the game.
- <a href="../../references/rust-convars" target="_blank">ConVars</a> — All available Rust console variables.
- <a href="../../references/blueprints" target="_blank">Blueprints</a> — This section contains a comprehensive list of all crafting blueprints available in the game.
- <a href="../../references/rust-commands" target="_blank">Commands</a> — Here's a full list of all currently available CarbonAuto variables you can use to expand on what Rust already provides.

</NewsSection>
<NewsSectionTitle text="Carbon — References & Resources"/>
<NewsImage src="/news/hooks-showcase.png"/>

<NewsSection>
The docs are filled with lots of framework related information and resources.

- <a href="../../references/hooks" target="_blank">Hooks</a> — This section contains a comprehensive list of all hooks available in Carbon.
- <a href="../../references/convars" target="_blank">ConVars</a> — Here's a full list of all currently available Carbon commands you can use.
- <a href="../../references/switches" target="_blank">Switches</a> — Here's a full list of all currently available Carbon switches you can use.
- <a href="../../references/commands" target="_blank">Commands</a> — Here's a full list of all currently available Carbon commands you can use.
</NewsSection>

<NewsSectionTitle text="Modules"/>
<NewsImage src="/misc/admin_f.webp"/>
<NewsSection>
Carbon modules are similar to plugins but are built directly into Carbon. They provide a lightweight way to add common functionality, such as managing players or increasing stack sizes.

You can check them out <a href="../../owners/modules/what-are-modules" target="_blank">here</a>
</NewsSection>

<NewsSectionTitle text="Oxide Porting"/>
<NewsSection>
<NewsImage src="/misc/oxide-to-carbon.webp"/>

An in-depth understanding of the necessary changes that are done when you're transferring your Oxide server over to Carbon.

Get started with learning the differences between Carbon and Oxide <a href="../../owners/oxide-porting" target="_blank">here</a>
</NewsSection>

<NewsSectionTitle text="Release Notes"/>
<NewsSection>
We're releasing consistent updates every month with the Rust wipe and sometimes mid-month updates addressing potential bugs that were newly introduced or found as well as soft-launching Carbon features which get announced throughout the month.

Read current or previous update patch notes over <a href="../../references/release-notes" target="_blank">here</a>
</NewsSection>

<NewsSectionTitle text="Server Browser" author="evs-ptr"/>
<NewsImage src="/news/serverbrowser-showcase.png"/>
<NewsSection>

Carbon's integrated **Server Browser** puts the entire Rust multiplayer landscape at your fingertips. An intuitive interface, powered by a lightning-fast fuzzy index, lets you drill down from thousands of servers to the perfect match in just a few clicks.

- **Smart search** - instantly match on hostname, IP (with optional port), map name or even tag keywords.
- **Visual population meter** - colour-coded bars and exact player counts make it easy to spot crowded hubs or quiet hideaways.
- **Deep filtering** - stack AND/OR filters for tags, pick a geographic region, lock in a specific Rust build, or set min/max player ranges.
- **One-click join** - copy the server's `IP:Port` straight to your clipboard, ready for the in-game console.

[Check it out](/tools/server-browser/)

</NewsSection>

<NewsSectionTitle text="Control Panel"/>
<NewsSection marginless>
High-fidelity WebRcon based control panel allowing you to manage players, entities, permissions and more, straight from your browser! Get started <a href="../../tools/control-panel" target="_blank">here</a>!
</NewsSection>

<NewsImage src="/news/controlp-1-showcase.png"/>
<NewsSection marginless>
Everything that's happening is in-browser and <strong>does not</strong> make any requests to any third-party servers (including ours).

<NewsSectionSubtitle text="Connections"/>
The actual connections are also done in your browser and RCon password never leaves your network other than when sent to the server you're trying to connect.

All servers and overall data is stored in your browser Local Storage.
</NewsSection>

<NewsSectionSubtitle text="Player and Inventory Management"/>
<NewsImage src="/news/controlp-2-showcase.png"/>
<NewsSection marginless>
Under the <strong>Players</strong> tab, you can inspect active players on the server, as well as preview and manage their inventories. Yes, manage. You can drag and drop items in their inventories, or even give them items.
</NewsSection>

<NewsSectionSubtitle text="Entity Search & Inspection"/>
<NewsImageGrid>
    <NewsImage src="/news/controlp-3-showcase.png"/>
    <NewsImage src="/news/controlp-4-showcase.png"/>
</NewsImageGrid>

<NewsSection marginless>
Use the <strong>Entities</strong> tab to search for any entities active on the server and manage general properties, like position, health, and manage players' metabolism stats and more!
</NewsSection>

<NewsSectionSubtitle text="Permission Management"/>
<NewsImage src="/news/controlp-5-showcase.png"/>
<NewsSection marginless>
Manage permissions for plugins and modues straight from the control panel!
</NewsSection>

<NewsSectionSubtitle text="Chatting"/>
<NewsImage src="/news/controlp-6-showcase.png"/>
<NewsSection marginless>
Preview and interact with people chatting on your server, all within the Control Panel! (Clicking on player names opens up their Steam profile)
</NewsSection>

<NewsReleaseNotes version="2.0.196"/>