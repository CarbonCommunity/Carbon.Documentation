<template>
  <span :class="['carbon-badge', variant]">
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup lang="ts">
interface Props {
  text?: string
  variant: 'add' | 'fix' | 'update' | 'misc' | 'remove' | 'date'
}

defineProps<Props>()
</script>

<style scoped>
.badges-left {
  display: flex;
  flex-wrap: wrap;
}

.carbon-badge {
  min-width: 60px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  padding: 0 5px;
  line-height: 22px;
  margin-left: 0.4em;
  border: 2px solid transparent;
  border-radius: 0%;
  /* color: color-mix(in srgb, currentColor 95%, white) !important;  */
}

/* Default badge background and border */
.carbon-badge.add {
  background-color: var(--c-carbon-release-add);
  border-color: var(--c-carbon-release-add);
  color: color-mix(in srgb, var(--c-carbon-release-add), white 70%)
}

.carbon-badge.fix {
  background-color: var(--c-carbon-release-fix);
  border-color: var(--c-carbon-release-fix);
  color: color-mix(in srgb, var(--c-carbon-release-fix), white 70%)
}

.carbon-badge.update {
  background-color: var(--c-carbon-release-update);
  border-color: var(--c-carbon-release-update);
  color: color-mix(in srgb, var(--c-carbon-release-update), white 70%)
}

.carbon-badge.misc {
  background-color: var(--c-carbon-release-misc);
  border-color: var(--c-carbon-release-misc);
  color: color-mix(in srgb, var(--c-carbon-release-misc), white 70%)
}

.carbon-badge.remove {
  background-color: var(--c-carbon-release-remove);
  border-color: var(--c-carbon-release-remove);
  color: color-mix(in srgb, var(--c-carbon-release-remove), white 70%)
}

.carbon-badge.date {
  background-color: var(--vp-badge-info-bg);
  border-color: var(--vp-badge-info-border);
  color: var(--vp-badge-info-text);
}
</style>
