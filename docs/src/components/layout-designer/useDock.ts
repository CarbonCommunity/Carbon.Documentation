// Dock-tree store: the persisted workspace tree + the operations the renderer needs. Drag/dock
// mutations land here in sub-slice 2b; for now it's load/persist + split resize + tab activation.
import { ref } from 'vue'
import { defaultDockTree, isCompleteTree, type DockNode, type SplitNode, type TabsNode } from './dockTree'

const STORAGE = 'carbon-layout-designer:workspace:dockTree'

function load(): DockNode {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      const t = JSON.parse(raw)
      if (t && isCompleteTree(t)) return t // ignore stale trees missing/duplicating panes
    }
  } catch {
    /* SSR (no localStorage) or bad JSON → default */
  }
  return defaultDockTree()
}

// Module-singleton (like useDesigner) so every consumer shares one tree.
const tree = ref<DockNode>(load())

function persist() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(tree.value))
  } catch {
    /* storage unavailable */
  }
}

function resetTree() {
  tree.value = defaultDockTree()
  persist()
}

/** Set a split's child weights (live during a divider drag; persisted on release). */
function setSizes(node: SplitNode, sizes: number[], save = true) {
  node.sizes = sizes
  if (save) persist()
}

function setActiveTab(node: TabsNode, index: number) {
  node.active = index
  persist()
}

export function useDock() {
  return { tree, persist, resetTree, setSizes, setActiveTab }
}
