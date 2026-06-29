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

// --- mutations (drag-docking, 2b) ----------------------------------------------------

/** Where a dragged pane is dropped relative to a target leaf. center = make a tab group; the four
 *  sides = split the target, placing the moved pane on that side. */
export type DockSide = 'center' | 'left' | 'right' | 'top' | 'bottom'

/** Remove the leaf for `pane`, collapsing any split/tabs node left with a single child (or none).
 *  Returns the new tree, or null if nothing remains. */
export function removeLeaf(node: DockNode, pane: PaneId): DockNode | null {
  if (node.type === 'leaf') return node.pane === pane ? null : node
  const children: DockNode[] = []
  const sizes: number[] = []
  node.children.forEach((c, i) => {
    const r = removeLeaf(c, pane)
    if (r) {
      children.push(r)
      if (node.type === 'split') sizes.push(node.sizes[i])
    }
  })
  if (children.length === 0) return null
  if (children.length === 1) return children[0] // collapse single-child node
  if (node.type === 'split') return { ...node, children, sizes }
  return { ...node, children: children as LeafNode[], active: Math.min(node.active, children.length - 1) }
}

/** Insert `moving` relative to the leaf rendering `targetPane`. center → tab group with the target;
 *  a side → wrap the target in a split with the moved pane on that side. */
function insertRelative(node: DockNode, targetPane: PaneId, moving: PaneId, side: DockSide): DockNode {
  if (node.type === 'leaf') {
    if (node.pane !== targetPane) return node
    const movingLeaf = leaf(moving)
    if (side === 'center') return tabs([node, movingLeaf], 1) // focus the dropped pane
    const dir = side === 'left' || side === 'right' ? 'row' : 'col'
    const children = side === 'left' || side === 'top' ? [movingLeaf, node] : [node, movingLeaf]
    return split(dir, children, [1, 1])
  }
  const children = node.children.map((c) => insertRelative(c, targetPane, moving, side))
  return node.type === 'split' ? { ...node, children } : { ...node, children: children as LeafNode[] }
}

/** Collapse single-child splits and merge a child split into its parent when they share a direction,
 *  preserving size ratios — keeps the tree canonical after a move. */
export function normalize(node: DockNode): DockNode {
  if (node.type !== 'split') return node
  const norm = node.children.map(normalize)
  const children: DockNode[] = []
  const sizes: number[] = []
  norm.forEach((c, i) => {
    if (c.type === 'split' && c.dir === node.dir) {
      const subTotal = c.sizes.reduce((a, b) => a + b, 0) || 1
      c.children.forEach((cc, j) => {
        children.push(cc)
        sizes.push(node.sizes[i] * (c.sizes[j] / subTotal))
      })
    } else {
      children.push(c)
      sizes.push(node.sizes[i])
    }
  })
  if (children.length === 1) return children[0]
  return { ...node, children, sizes }
}

/** Drag-dock `moving` next to / onto `targetPane`. Returns a new normalized tree (no-op if the move
 *  is degenerate, e.g. dropping a pane onto itself). */
export function dockMove(tree: DockNode, moving: PaneId, targetPane: PaneId, side: DockSide): DockNode {
  if (moving === targetPane) return tree
  const removed = removeLeaf(cloneTree(tree), moving)
  if (!removed) return tree
  return normalize(insertRelative(removed, targetPane, moving, side))
}
