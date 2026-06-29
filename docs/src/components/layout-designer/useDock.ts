// Dock-tree store: the persisted workspace tree + the operations the renderer needs — load/persist,
// split resize, tab activation, and (2b) drag-docking moves via dockMove.
import { ref } from 'vue'
import { dockMove, defaultDockTree, isCompleteTree, type DockNode, type DockSide, type PaneId, type SplitNode, type TabsNode } from './dockTree'

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

/** Drag-dock `moving` onto `target` at `side`. Replaces the whole tree (dockMove returns a fresh,
 *  normalized tree); a degenerate move (e.g. drop onto self) returns the same tree → no-op + no save. */
function movePane(moving: PaneId, target: PaneId, side: DockSide) {
  const next = dockMove(tree.value, moving, target, side)
  if (next === tree.value || !next) return
  tree.value = next
  persist()
}

export function useDock() {
  return { tree, persist, resetTree, setSizes, setActiveTab, movePane }
}
