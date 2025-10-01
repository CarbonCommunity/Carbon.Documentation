---
title: CUI Update
description: Rust CUI updates, meta shift, bug fixes, Web Control Panel accounts.
header: /news/cui-update-background.jpg
logo: /news/cui-update.webp
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

<NewsSectionSubtitle text="Sources"/>
- <a href="https://github.com/Facepunch/Rust.Community/blob/master/CommunityEntity.UI.cs" target="_blank">CommunityEntity (Rust.Community)</a> 
- <a href="https://github.com/CarbonCommunity/Carbon.Common/blob/8ea6781a8dd2344c364e4d46baa60eb707c26ccd/src/Oxide/CUI/CuiCore.cs" target="_blank">CuiCore (Carbon.Common)</a> 

</NewsSection>
</NewsHeroSection>

<NewsHeroSection src="https://files.facepunch.com/mattisaac/2025/September/rust_tripod_spotlight_detail_1080.jpg">
<NewsSectionTitle text="Web Control Panel" author="raulssorban"/>
<NewsSection>


</NewsSection>

</NewsHeroSection>
