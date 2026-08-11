---
title: CarbonAuto
description: CarbonAuto variables, or Carbon ConVars exist with the purpose of expanding on Rust's ConVars and add more customization to your server.
---

<script setup lang="ts">
import CarbonButton from '@/components/CarbonButton.vue'
import { DatabaseIcon } from 'lucide-vue-next'
</script>


# CarbonAuto

CarbonAuto variables, or Carbon ConVars exist with the purpose of expanding on Rust's ConVars and add more customization
to your server.

:::tip Explore
There's an always up-to-date list of all of our CarbonAuto variables.

<CarbonButton :icon="DatabaseIcon" href="/references/convars" text="Carbon ConVars"/><p></p>
:::

### Editing CarbonAuto Config
You can edit your CarbonAuto config in three ways.
1. As commands, similar to the build in ConVars
    - Example: `c.custommapname "My Awesome Map"`
2. Editing the CarbonAuto config file.
    - Navigate to `./carbon/config.auto.json` and edit the values to your liking
3. Through the Carbon Panel.
    - Click the green gear icon in the top right

### Default CarbonAuto Config
```json
c.recycletickmultiplier "-1"
c.safezonerecycletickmultiplier "-1"
c.researchdurationmultiplier "-1"
c.vendingbuydurationmultiplier "-1"
c.craftingspeedmultiplier_nowb "-1"
c.craftingspeedmultiplier_wb1 "-1"
c.craftingspeedmultiplier_wb2 "-1"
c.craftingspeedmultiplier_wb3 "-1"
c.mixingspeedmultiplier "-1"
c.exacavatorresourcetickratemultiplier "-1"
c.excavatortimeforfullresourcesmultiplier "-1"
c.excavatorbeltspeedmaxmultiplier "-1"
c.ovenspeedmultiplier "-1"
c.ovenblacklistspeedmultiplier "-1"
c.oventemperaturemultiplier "-1"
c.ovenblacklisttemperaturemultiplier "-1"
c.defaultserverchatname "-1"
c.defaultserverchatcolor "-1"
c.defaultserverchatid "-1"
c.ovenblacklist "furnace,bbq.static,furnace.large"
c.notechtreeunlock "-1"
c.nogivenotices "-1"
c.custommapname "-1"
```
