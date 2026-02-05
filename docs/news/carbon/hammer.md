---
title: Carbon Hammer
description: Expanding on Rust's built-in Creative Mode with the brand new Carbon Hammer.
header: https://files.facepunch.com/Errn/1b2211b1/20251228150843_1.jpg
logo: /news/hammer-update.webp
author: Raul
date: 2026-02-01T01:11:22.632Z
tags:
  - carbon
  - creative
  - deep
  - hammer
  - mode
  - rust
  - sea
layout: news-layout
category: news
sidebar: false
fmContentType: blogpost
published: true
showjoinus: true
hidden: false
---

<NewsSectionTitle text="Introduction" author="raulssorban"/>
<NewsSection>
With an effort to fill in some of the "gaps" of the current Rust creative mode, the Hammer tool will now be a whole lot more useful for your day-to-day life on PvE and/or PvP-type servers.
</NewsSection>

<NewsHeroSection src="https://files.facepunch.com/ashcoook/1b0311b1/dec2025_naval_update_ghost_ships_1_1080.jpg">
<NewsSectionTitle text="Hammer UI" author="raulssorban"/>
<NewsImage src="/news/hammer-firstlook1.webp"/>
<NewsImageGrid>
  <NewsImage src="/news/hammer-firstlook2.webp"/>
  <NewsImage src="/news/hammer-firstlook3.webp"/>
</NewsImageGrid>
<NewsSection>
</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/Alistair/105/11/2025/0W89/rust_nov2025update_minifridge_01.jpg">
<NewsSectionTitle text="Features" author="raulssorban"/>
<NewsSection>
Depending on what you're looking at, the Hammer UI contains relevant information of the entity based on its type. 

Here's a run-through of what information you can see for specific entities:
<NewsSectionSubtitle text="Information"/>
- <b>Most entities</b>: Toggling with Middle Mouse will switch the entity flag between On/Off and Open/Closed respectively.
  - Toggling while holding [SHIFT] switches between locked/unlocked.
- <b>Sleeping bag</b>: Shows person who's been Assigned To it 
- <b>Quarry/Pumpjack</b>: Shows the resource static type it produces.
  - Toggling will iterate through all static types and update it in real time.
- <b>Doors</b>: Shows the code and guest code number if there's a lock on it.
- <b>IO Entity</b>: Shows the current energy processed by the entity.
- <b>Planter Boxes</b>: Shows the temperature of the growable plants in it in Celsius and Fahrenheit.
- <b>Modular Cars</b>: Shows the code if there's a lock on it.
- <b>Vending Machine</b>: Toggling will flip the vending machine.
- <b>Quarry Engine Switch</b>: Toggling turn the quarry switch on/off.
- <b>Building Blocks</b>: Blocks that can be rotated will rotate upon toggling.
  - Enabling Extra Settings on the UI, will allow you to destroy an entire building.
  - Hitting a building block with the hammer, will repair all entities inside of the building.
  - Deselect the Hammer slot to cancel both batched building destruction or the repairing process.
<NewsImageGrid>
  <NewsImage h="5" src="/news/hammer-builddestroy.webp"/>
  <NewsImage h="5" src="/news/hammer-buildrepair.webp"/>
</NewsImageGrid>
<NewsSectionSubtitle text="Movement"/>
<video controls autoplay loop src="/news/hammer-move.mp4"></video>

<NewsSectionSubtitle text="Player Configuration"/>
<video controls autoplay loop src="/news/hammer-movesnapping.mp4"></video>
<NewsImage src="/news/hammer-commands.webp"/>

<NewsSectionSubtitle text="Interacts"/>
<video controls autoplay loop src="/news/hammer-interacts.mp4"></video><br></br>

<NewsSectionSubtitle text="UI Repositioning"/>
<video controls autoplay loop src="/news/hammer-moveui.mp4"></video><br></br>

</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/ashcoook/1b0311b1/rust_lr300_spacedlc_1080_3_jpg.jpg">
<NewsSectionTitle text="How To Use" author="raulssorban"/>
<NewsSection>

By default, you need to have Creative Mode enabled on your player, you can do so using `togglecreativemodeuser myname 1`.

To activate the UI, you must hold a <b>Hammer</b> or <b>Garry's Mod Tool</b>. To use the Hammer UI without having Creative Mode enabled, players with moderator and/or admins can run `hammer.creativebypass 1` to bypass that behaviour.

</NewsSection>
<NewsSectionTitle text="Source" author="raulssorban"/>
<NewsSection>

Here's the entire source code: [<b>HammerModule</b>](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Modules/HammerModule/HammerModule.cs)

</NewsSection>
<NewsSectionTitle text="Modding" author="raulssorban"/>
<NewsSection>

TBD

</NewsSection>
</NewsHeroSection>
