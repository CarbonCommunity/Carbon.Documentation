<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { cssColor } from './geometry'
import type { DesignerElement } from './types'
import { useDesigner } from './useDesigner'

const { childrenOf, isSelected, select, addPanel, remove, openContextMenu } = useDesigner()

// flatten the tree depth-first so we can render an indented list without a 2nd recursive SFC
const flat = computed(() => {
  const out: { el: DesignerElement; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const el of childrenOf(parentId)) {
      out.push({ el, depth })
      walk(el.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})
</script>

<template>
  <div class="ld-tree">
    <div
      v-for="row in flat"
      :key="row.el.id"
      class="ld-tree-row"
      :class="{ active: isSelected(row.el.id) }"
      :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
      @click="select(row.el.id, $event.shiftKey || $event.ctrlKey || $event.metaKey)"
      @contextmenu.prevent.stop="openContextMenu(row.el.id, $event.clientX, $event.clientY)"
    >
      <span class="ld-swatch" :style="{ background: cssColor(row.el.props.color) }" />
      <span class="ld-tree-name">{{ row.el.name }}</span>
      <button class="ld-tree-btn" title="Add child panel" @click.stop="addPanel(row.el.id)"><Plus :size="13" /></button>
      <button class="ld-tree-btn danger" title="Delete (and children)" @click.stop="remove(row.el.id)"><Trash2 :size="13" /></button>
    </div>
    <div v-if="!flat.length" class="ld-tree-empty">No elements yet.</div>
  </div>
</template>

<style scoped>
.ld-tree {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.ld-tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border-left: 2px solid transparent;
}

.ld-tree-row:hover {
  background: var(--vp-c-bg-soft);
}

.ld-tree-row.active {
  background: var(--c-carbon-soft);
  border-left-color: var(--c-carbon-1);
  color: var(--vp-c-text-1);
}

.ld-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.ld-tree-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ld-tree-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
  padding: 2px;
}

.ld-tree-row:hover .ld-tree-btn {
  opacity: 1;
}

.ld-tree-btn:hover {
  color: var(--vp-c-text-1);
}

.ld-tree-btn.danger:hover {
  color: var(--vp-c-danger-1);
}

.ld-tree-empty {
  padding: 16px 8px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
</style>
