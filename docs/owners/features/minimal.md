---
title: Minimal
description: Carbon's minimal build, focused solely on plugin execution, stripping away Carbon exclusive features for the most part.
---

<script setup>
const features = [
    { name: 'CarbonAuto', desc: 'Carbon ConVar variables exist with the purpose of expanding on Rust\'s ConVars and add more customization to your server.', link: '/owners/features/carbonauto' },
    { name: 'Admin Panel', desc: 'The Admin module introduces a new and intuitive way of managing your server in pretty much any way that you\'d need.', link: '/owners/modules/admin-module' },
    { name: 'Carbon Modules', desc: 'Carbon modules are similar to plugins but are built directly into Carbon. They provide a lightweight way to add common functionality, such as managing players or increasing stack sizes.', link: '/owners/modules/what-are-modules' },
    { name: 'CSZIP Dev', desc: 'The carbon/plugins/cszip_dev folder allowing you to locally develop and test multi-partial-file plugins for testing purposes. 🎯 This feature is only available on Debug builds.', link: '/devs/features/zip-script-packages' }
]
</script>

# Minimal

Carbon's minimal build, focused solely on plugin execution, stripping away Carbon exclusive features for the most part.

## Differences

Here's a list of all the differences between regular Carbon builds and Minimal:

<table tabindex="0">
  <thead>
    <tr>
      <th>Feature</th>
      <th style="text-align: center; min-width: 100px">Carbon</th>
      <th style="text-align: center; min-width: 100px">Minimal</th>
    </tr>
  </thead>
  <tr v-for="feature in features">
    <td>
      <strong>{{feature.name}}</strong>
      <div style="opacity: 50%; font-size: smaller">
        {{feature.desc}} <a v-if="feature.link != null" :href="feature.link">Learn more.</a>
      </div>
    </td>
    <td><div style="opacity: 50%; font-size: smaller">✅ Present</div></td>
    <td><div style="opacity: 50%; font-size: smaller">🚫 Absent</div></td>
  </tr>
</table>


:::tip 🔥 Release Optimizations
All Minimal builds have Release optimizations and reduced debugging data. They're essentially **Release builds**.
:::
