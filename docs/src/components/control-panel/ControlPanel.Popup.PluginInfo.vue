<script lang="ts" setup>
  import { ref } from 'vue'

  const props = defineProps<{
    textie: string
  }>()
</script>

<template>
  <div>
    Test {{ props.textie }}
  </div>
</template>
