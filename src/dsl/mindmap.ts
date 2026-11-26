/**
 * Mind maps: `layout <scope> mindmap root=<id>`. The file holds plain nodes and edges; this pass
 * reads the tree out of them and marks how it draws. The layout itself is the tree engine with the
 * root in the middle (`bilateralTarget`), set up in `engineArrangement`.
 *
 * - A branch line is a plain edge (no `kind=`, ends or message; a label is fine) between two topics
 *   in the scope, reached from the root by following edges forward. It draws with no head.
 * - Every other edge between two topics is a cross-link: it draws as written and does not shape
 *   the tree. A topic the tree misses sits beside the topic it links to. An edge that leaves the
 *   scope is left alone.
 * - Each first-level branch takes the next color family; deeper topics inherit their branch's
 *   family as pale cards. A topic with `color=` keeps it, and its own children inherit it.
 */
import { LayoutLab } from '../engines/layout-engine';
import { bilateralTarget } from '../engines/layout/trees';
import type { Item, Link } from '../engines/layout/types';
import type { Diagram } from '../model/types';
import {
  layoutParent,
  treeCandidates,
  treeLine,
  type Model,
  type ModelEdge,
  type ModelObject,
} from './syntax';

/** Branch colors in turn: no red beside green, and no two warm or two cool families in a row. */
export const BRANCH_FAMILIES = ['blue', 'amber', 'violet', 'teal', 'rose', 'sky', 'orange', 'mint'];

/**
 * A copy of `m` with what its mind maps draw: branch heads, cross-links, branch colors and cards.
 * The parsed model stays as written, so compare, edits and the Editor see only the source.
 */
export function withMindmaps(m: Model): Model {
  if (!m.layouts.some(l => l.mindmap)) return m;
  const out = {
    ...m,
    objects: m.objects.map(o => ({ ...o })),
    edges: m.edges.map(e => ({ ...e })),
  };
  const by = new Map(out.objects.map(o => [o.id, o]));
  // A map's topics are the scope's own members, as the layout places them. A group member is one
  // topic; what is inside it (an inner map, say) is not.
  for (const l of m.layouts)
    if (l.mindmap) markMindmap(out, by, id => layoutParent(by, id) === l.scope, l.mindmap);
  return out;
}

function markMindmap(
  m: Model,
  by: Map<string, ModelObject>,
  inside: (id: string) => boolean,
  root: string,
) {
  const out = treeCandidates(m.edges, inside);
  // Breadth first, so a topic hangs off its nearest route from the root.
  const kids = new Map<string, string[]>(),
    tree = new Set<ModelEdge>(),
    seen = new Set([root]);
  for (const q = [root]; q.length;) {
    const id = q.shift()!;
    for (const e of out.get(id) ?? [])
      if (!seen.has(e.target)) {
        seen.add(e.target);
        tree.add(e);
        kids.set(id, [...(kids.get(id) ?? []), e.target]);
        q.push(e.target);
      }
  }
  // An edge that repeats a branch's two ends is a branch too, as when compare holds an edge
  // under its old and new ID.
  const pairs = new Set([...tree].map(e => `${e.source}\0${e.target}`));
  for (const e of m.edges) {
    if (tree.has(e) || (treeLine(e) && pairs.has(`${e.source}\0${e.target}`))) e.branch = true;
    // A cross-link inside the map draws, but the tree alone places the topics.
    else if (inside(e.source) && inside(e.target)) {
      e.constraint = false;
      // The layout still sees a link to a topic off the tree, to set that topic beside its end.
      if (!seen.has(e.source) || !seen.has(e.target)) e.offTree = true;
    }
  }
  const first = kids.get(root) ?? [],
    named = new Set<string>(first.map(id => by.get(id)!.color)),
    unused = BRANCH_FAMILIES.filter(f => !named.has(f)),
    free = unused.length ? unused : BRANCH_FAMILIES;
  let next = 0;
  const paint = (id: string, family: string | undefined, depth: number) => {
    const o = by.get(id)!;
    family = o.color !== 'auto' ? o.color : (family ?? free[next++ % free.length]);
    o.branch = family;
    if (depth > 1 && o.shade === undefined) o.card = true;
    for (const k of kids.get(id) ?? []) paint(k, family, depth + 1);
  };
  for (const id of first) paint(id, undefined, 1);
}

/**
 * Place a mind map's topics straight from the two-sided tree target, with no force pass after it:
 * forces would pull the columns out of line. `scope` and `root` are ids in `doc`; an unset scope
 * is the whole drawing. A topic the tree misses but a link reaches sits past the outermost column
 * on its linked topic's side; anything else sits below them all, as the target's fallback lays it.
 */
export function arrangeMindmap(
  doc: Diagram,
  scope: string | undefined,
  root: string,
  vertical: boolean,
): Diagram {
  const parent = new Map(
      [...doc.graph.nodes, ...doc.graph.groups].map(o => [o.id, o.parentId || undefined]),
    ),
    items: Item[] = [...parent.keys()]
      .filter(id => parent.get(id) === scope)
      .map(id => ({ id, ...doc.layout.nodes[id] })),
    ids = new Set(items.map(p => p.id));
  // Each end as the member of the scope that holds it.
  const owner = (id: string | undefined): string | undefined =>
    id === undefined || ids.has(id) ? id : owner(parent.get(id));
  // The tree is the branch lines alone; an undirected link (to a topic off the tree) only sets
  // where that topic sits. Any other line, such as one into a frame's contents, places nothing.
  const links: Link[] = doc.graph.edges
    .filter(e => e.branch || e.directed === false)
    .map(e => ({ from: owner(e.from)!, to: owner(e.to)!, directed: e.directed !== false }))
    .filter(e => e.from && e.to && e.from !== e.to);
  const s = LayoutLab.settings({
      ...doc.settings,
      algorithm: 'tree',
      direction: vertical ? 'DOWN' : 'RIGHT',
      rootId: root,
    }),
    t = LayoutLab.topology(items, links, { start: { id: root, placement: 'center' } }),
    at = bilateralTarget(items, t, s);
  if (!at) return doc;
  const by = new Map(items.map(p => [p.id, p])),
    sides = t.branchSides ?? new Map<string, number>(),
    across = (id: string) => (vertical ? by.get(id)!.w : by.get(id)!.h),
    along = (id: string) => (vertical ? by.get(id)!.h : by.get(id)!.w),
    a = (id: string) => (vertical ? at.get(id)!.y : at.get(id)!.x),
    b = (id: string) => (vertical ? at.get(id)!.x : at.get(id)!.y);
  // Each side's outer edge: at least the root's own half, for a side with no branch yet.
  const edge = { 1: along(root) / 2, '-1': along(root) / 2 } as Record<number, number>;
  for (const [id, sign] of sides)
    if (sign) edge[sign] = Math.max(edge[sign], sign * a(id) + along(id) / 2);
  const free = { 1: -Infinity, '-1': -Infinity } as Record<number, number>;
  const beside = items
    .filter(p => !sides.has(p.id))
    .flatMap(p => {
      const l = links.find(
        l => (l.from === p.id && sides.has(l.to)) || (l.to === p.id && sides.has(l.from)),
      );
      if (!l) return [];
      const n = l.from === p.id ? l.to : l.from;
      return [{ id: p.id, sign: sides.get(n) || 1, near: b(n) }];
    })
    .sort((x, y) => x.near - y.near);
  for (const { id, sign, near } of beside) {
    const cross = Math.max(near, free[sign] + across(id) / 2),
      main = sign * (edge[sign] + s.rankGap + along(id) / 2);
    at.set(id, vertical ? { x: cross, y: main } : { x: main, y: cross });
    free[sign] = cross + across(id) / 2 + s.nodeGap;
  }
  // The target's fallback put unlinked shapes below the tree; keep them below the beside ones too.
  const placed = new Set([...sides.keys(), ...beside.map(x => x.id)]),
    rest = items.filter(p => !placed.has(p.id));
  if (rest.length && beside.length) {
    const bottom = Math.max(...[...placed].map(id => at.get(id)!.y + by.get(id)!.h / 2)),
      top = Math.min(...rest.map(p => at.get(p.id)!.y - p.h / 2)),
      dy = Math.max(0, bottom + s.rankGap - top);
    for (const p of rest) at.set(p.id, { ...at.get(p.id)!, y: at.get(p.id)!.y + dy });
  }
  // Move each member, and everything inside a group member with it.
  const nodes = { ...doc.layout.nodes };
  for (const p of items) {
    const c = at.get(p.id)!,
      dx = c.x - p.w / 2 - p.x,
      dy = c.y - p.h / 2 - p.y;
    for (const id of parent.keys())
      if (owner(id) === p.id)
        nodes[id] = { ...nodes[id], x: nodes[id].x + dx, y: nodes[id].y + dy };
  }
  return { ...doc, layout: { ...doc.layout, nodes } };
}
