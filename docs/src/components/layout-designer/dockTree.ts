// Recursive dock-tree model for the workspace (issue #6 Part 2). Tool panes arrange around the
// pinned centre canvas as a tree of:
//   - split: children laid out in a row or column, each with a flex weight; resizable dividers
//   - tabs:  a tool-window tab group (children shown one at a time, tabs along the bottom edge)
//   - leaf:  a single pane
// The canvas is a leaf too, but pinned (never dragged/closed) so the fragile canvas math is untouched.

export type PaneId = 'project' | 'elements' | 'dataSources' | 'inspector' | 'canvas' | 'code' | 'debug' | 'screenShare'
/** Every known pane. `project`/`screenShare` are OPTIONAL (may be absent from a saved tree) — see REQUIRED_PANES. */
export const PANE_IDS: PaneId[] = ['project', 'elements', 'dataSources', 'inspector', 'canvas', 'code', 'debug', 'screenShare']
/** Panes that must be present in a valid tree. The optional ones (project, screen share) may be present 0/1×. */
export const REQUIRED_PANES: PaneId[] = ['elements', 'dataSources', 'inspector', 'canvas', 'code', 'debug']
/** Panes that can be hidden via View / dragged / closed. The canvas is pinned. */
export const DOCKABLE_PANES: PaneId[] = ['project', 'elements', 'dataSources', 'inspector', 'code', 'debug', 'screenShare']
/** Display titles, shared by the dock renderer, the drop overlay and the drag ghost. */
export const PANE_TITLES: Record<PaneId, string> = {
  project: 'Project',
  elements: 'Elements',
  dataSources: 'Data Sources',
  inspector: 'Inspector',
  canvas: 'Canvas',
  code: 'Code',
  debug: 'Debug',
  screenShare: 'Screen Share',
}

// `collapsed` (#8): a node that is the direct child of a ROW split can be minimised to a thin strip
// on its outer edge — present, just shrunk, click the strip to restore. Honoured only inside a row
// split (left/right edges); ignored in a col (the bottom dock never collapses) and on the canvas.
export interface LeafNode {
  type: 'leaf'
  pane: PaneId
  collapsed?: boolean
}
export interface TabsNode {
  type: 'tabs'
  children: LeafNode[]
  active: number
  collapsed?: boolean
}
export interface SplitNode {
  type: 'split'
  dir: 'row' | 'col' // row = children side by side (vertical dividers); col = stacked (horizontal dividers)
  children: DockNode[]
  sizes: number[] // flex weights, one per child (normalised lazily; only ratios matter)
  collapsed?: boolean
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

/** The default workspace: a left column (Elements over Data Sources), a centre column (canvas on top,
 *  Code/Debug split left/right beneath it), and the Inspector down the right. Screen Share is added on
 *  demand to the right of the canvas (see addScreenShare). */
export function defaultDockTree(): SplitNode {
  return split(
    'row',
    [
      // Project shares a tab group with Elements (Elements is the active tab); Data Sources sits below.
      split('col', [tabs([leaf('project'), leaf('elements')], 1), leaf('dataSources')], [1.9, 1]),
      split('col', [leaf('canvas'), split('row', [leaf('code'), leaf('debug')], [1, 1])], [3.6, 1]),
      leaf('inspector'),
    ],
    [1.15, 3.7, 1.25],
  )
}

// --- queries -------------------------------------------------------------------------

/** Every pane that appears somewhere in the tree. */
export function leavesOf(node: DockNode, out: PaneId[] = []): PaneId[] {
  if (node.type === 'leaf') out.push(node.pane)
  else node.children.forEach((c) => leavesOf(c, out))
  return out
}

/** Titles of every leaf under a node, in order — used to label a collapsed edge strip
 *  (e.g. a collapsed left column reads "Elements / Data Sources"). */
export function titlesOf(node: DockNode): string[] {
  return leavesOf(node).map((p) => PANE_TITLES[p])
}

/** A tree is usable if it only contains known panes, with no duplicates, and the pinned canvas is
 *  present. Other panes may be absent — since #9, hiding a pane *removes* it from the tree (View is
 *  folded into the tree, not a parallel visibility flag), so a saved tree legitimately omits the
 *  panes the user has hidden. Returns false → caller falls back to the default tree. */
export function isCompleteTree(node: DockNode): boolean {
  const found = leavesOf(node)
  const set = new Set(found)
  if (set.size !== found.length) return false // no duplicates
  if (!found.every((p) => PANE_IDS.includes(p))) return false // only known panes
  return set.has('canvas') // the pinned canvas must be there
}

/** Where `pane` sits relative to a surviving neighbour, so a hidden/closed pane can later be re-docked
 *  next to where it was. Returns null if the pane isn't in the tree or has no neighbour to anchor to. */
export function locate(node: DockNode, pane: PaneId): { target: PaneId; side: DockSide } | null {
  if (node.type === 'leaf') return null
  if (node.type === 'tabs') {
    if (!node.children.some((c) => c.pane === pane)) return null
    const other = node.children.find((c) => c.pane !== pane)
    return other ? { target: other.pane, side: 'center' } : null // rejoin the tab group
  }
  const idx = node.children.findIndex((c) => c.type === 'leaf' && c.pane === pane)
  if (idx !== -1) {
    const ni = idx > 0 ? idx - 1 : idx + 1
    const neighbour = node.children[ni]
    if (!neighbour) return null
    const target = leavesOf(neighbour)[0]
    const side: DockSide = node.dir === 'row' ? (idx < ni ? 'left' : 'right') : idx < ni ? 'top' : 'bottom'
    return { target, side }
  }
  for (const c of node.children) {
    const r = locate(c, pane)
    if (r) return r
  }
  return null
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
  let freed = 0 // weight of a removed split child, handed to a neighbour below
  let gapAt = -1 // index in `children` the removed child sat in front of
  node.children.forEach((c, i) => {
    const r = removeLeaf(c, pane)
    if (r) {
      children.push(r)
      if (node.type === 'split') sizes.push(node.sizes[i])
    } else if (node.type === 'split') {
      freed += node.sizes[i]
      gapAt = children.length
    }
  })
  if (children.length === 0) return null
  // Hand a removed pane's space to the sibling it sat next to (the one before it, else the one
  // after) so that neighbour reclaims it — instead of letting the freed weight vanish and the
  // split's ratios skew. Without this, repeatedly docking a pane into a region and pulling it back
  // out starves that region geometrically until it collapses (issue #6). No-op when the node
  // collapses to a single child (its weight is inherited via the parent slot) or for tabs.
  if (freed > 0 && children.length > 1) sizes[gapAt > 0 ? gapAt - 1 : 0] += freed
  if (children.length === 1) return children[0] // collapse single-child node
  if (node.type === 'split') return { ...node, children, sizes }
  return { ...node, children: children as LeafNode[], active: Math.min(node.active, children.length - 1) }
}

/** Wrap a node in a 2-child split, the moved pane on `side`. Clears any collapsed flag on the
 *  wrapped node: its row context just changed, so a stale "minimised" state would be misleading. */
function wrapNode(node: DockNode, moving: PaneId, side: DockSide): SplitNode {
  const dir = side === 'left' || side === 'right' ? 'row' : 'col'
  const target = node.collapsed ? { ...node, collapsed: false } : node
  const children = side === 'left' || side === 'top' ? [leaf(moving), target] : [target, leaf(moving)]
  return split(dir, children, [1, 1])
}

/** Dock `moving` onto a single leaf: center → tab group; a side → split. */
function wrapLeaf(node: LeafNode, moving: PaneId, side: DockSide): DockNode {
  if (side === 'center') return tabs([node, leaf(moving)], 1) // focus the dropped pane
  return wrapNode(node, moving, side)
}

/** Insert `moving` relative to the leaf rendering `targetPane`. center → tab group with the target;
 *  a side → wrap the target in a split with the moved pane on that side. When the target lives inside
 *  a tabs group, center adds another tab to that group and a side splits the WHOLE group (so we never
 *  nest a split/tabs node inside `tabs.children`, which must stay LeafNode[]). */
function insertRelative(node: DockNode, targetPane: PaneId, moving: PaneId, side: DockSide): DockNode {
  if (node.type === 'leaf') {
    return node.pane === targetPane ? wrapLeaf(node, moving, side) : node
  }
  if (node.type === 'tabs') {
    if (!node.children.some((c) => c.pane === targetPane)) return node
    if (side === 'center') {
      const children = [...node.children, leaf(moving)]
      return { ...node, children, active: children.length - 1 } // focus the dropped pane
    }
    return wrapNode(node, moving, side) // split the entire tab group
  }
  return { ...node, children: node.children.map((c) => insertRelative(c, targetPane, moving, side)) }
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

/** Insert an optional pane not yet in the tree, docked relative to `target`. No-op if already present. */
export function addPane(tree: DockNode, pane: PaneId, target: PaneId, side: DockSide = 'center'): DockNode {
  if (leavesOf(tree).includes(pane)) return tree
  return normalize(insertRelative(cloneTree(tree), target, pane, side))
}

/** Remove a pane from the tree (collapsing emptied splits/tabs). No-op if absent. */
export function closePane(tree: DockNode, pane: PaneId): DockNode {
  if (!leavesOf(tree).includes(pane)) return tree
  const next = removeLeaf(cloneTree(tree), pane)
  return next ? normalize(next) : tree
}
