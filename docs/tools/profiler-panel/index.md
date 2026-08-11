---
layout: page
title: Profiler Panel
description: Web version of the in-game Carbon Profiler UI panel tab.
sidebar: false
---

<script setup lang="ts">
    import ProfilerPanel from '@/components/profiler-panel/ProfilerPanel.vue'
</script>

<ClientOnly>
    <ProfilerPanel></ProfilerPanel>
</ClientOnly>
