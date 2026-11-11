<script setup lang="ts">
// Bare number input that commits on change (not while typing) and hands the caller the raw
// string — parsing/validation stays with the caller's setter. Rendered as the component's
// ROOT node on purpose: the parent's scoped rules (e.g. `.ld-vec-row input[type='number']`)
// still apply to it, so it needs no styles of its own.
defineProps<{ value: number; step: number | string }>()
const emit = defineEmits<{ commit: [raw: string] }>()
</script>

<template>
  <input type="number" :step="step" :value="value" @change="emit('commit', ($event.target as HTMLInputElement).value)" />
</template>
