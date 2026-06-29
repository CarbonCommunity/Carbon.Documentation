// Recursive dock-tree model for the workspace (issue #6 Part 2). Tool panes arrange around the
// pinned centre canvas as a tree of:
//   - split: children laid out in a row or column, each with a flex weight; resizable dividers
//   - tabs:  a tool-window tab group (children shown one at a time, tabs along the bottom edge)
//   - leaf:  a single pane
// The canvas is a leaf too, but pinned (never dragged/closed) so the fragile canvas math is untouched.

export type PaneId = 'elements' | 'dataSources' | 'inspector' | 'canvas' | 'code' | 'debug'
export const PANE_IDS: PaneId[] = ['elements', 'dataSources', 'inspector', 'canvas', 'code', 'debug']
/** Panes that can be hidden via View / dragged / closed. The canvas is pinned. */
export const DOCKABLE_PANES: PaneId[] = ['elements', 'dataSources', 'inspector', 'code', 'debug']

export interface LeafNode {
  type: 'leaf'
  pane: PaneId
}
export interface TabsNode {
  type: 'tabs'
  children: LeafNode[]
  active: number
}
export interface SplitNode {
  type: 'split'
  dir: 'row' | 'col' // row = children side by side (vertical dividers); col = stacked (horizontal dividers)
  children: DockNode[]
  sizes: number[] // flex weights, one per child (normalised lazily; only ratios matter)
}
export type DockNode = SplitNode | TabsNode | LeafNode

export const leaf = (pane: PaneId): LeafNode => ({ type: 'leaf', pane })
export const tabs = (children: LeafNode[], active = 0): TabsNode => ({ type: 'tabs', children, active })
export const split = (dir: 'row' | 'col', children: DockNode[], sizes?: number[]): SplitNode => ({
  type: 'split',
  dir,
  children,
  sizes: sizes ?? children.map(() => 1),
})

/** The default workspace: left column (Elements over Data Sources), centre canvas, right Inspector,
 *  and a full-width Code/Debug tab group docked along the bottom. Mirrors the pre-dock-tree layout. */
export function defaultDockTree(): SplitNode {
  return split(
    'col',
    [
      split(
        'row',
        [split('col', [leaf('elements'), leaf('dataSources')], [1.6, 1]), leaf('canvas'), leaf('inspector')],
        [1.25, 3.2, 1.4],
      ),
      tabs([leaf('code'), leaf('debug')], 0),
    ],
    [3, 1.1],
  )
}

// --- queries -------------------------------------------------------------------------

/** Every pane that appears somewhere in the tree. */
export function leavesOf(node: DockNode, out: PaneId[] = []): PaneId[] {
  if (node.type === 'leaf') out.push(node.pane)
  else node.children.forEach((c) => leavesOf(c, out))
  return out
}

/** A tree is usable only if every pane appears exactly once (catches stale/old persisted trees and
 *  any pane added to the model later). Returns false → caller falls back to the default tree. */
export function isCompleteTree(node: DockNode): boolean {
  const found = leavesOf(node)
  if (found.length !== PANE_IDS.length) return false
  const set = new Set(found)
  return set.size === found.length && PANE_IDS.every((p) => set.has(p))
}

/** Deep clone (trees are small, plain JSON). */
export function cloneTree<T extends DockNode>(node: T): T {
  return JSON.parse(JSON.stringify(node))
}
