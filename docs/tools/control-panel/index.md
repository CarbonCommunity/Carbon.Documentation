---
layout: page
title: Control Panel
description: A Carbon-aware remote admin dashboard — console, chat, players, permissions, entities, plugins and the profiler, straight from your browser.
sidebar: false
---

<script setup lang="ts">
    import ControlPanel from '@/components/control-panel/ControlPanel.vue'
</script>

<ClientOnly>
    <ControlPanel></ControlPanel>
</ClientOnly>
