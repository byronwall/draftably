import type {
  Diagram,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  Direction,
  Entity,
  NodeLayout,
  NodeStyle,
  Rect,
} from './types';
import { resolveAppearance } from './appearance';
import { DEFAULT_STYLE } from './styles';
import { timelineOrigin } from './timeline';

export const findNode = (doc: Diagram, id: string | null | undefined): DiagramNode | undefined =>
  id ? doc.graph.nodes.find(n => n.id === id) : undefined;
export const findGroup = (doc: Diagram, id: string | null | undefined): DiagramGroup | undefined =>
  id ? doc.graph.groups.find(g => g.id === id) : undefined;
export const findEdge = (doc: Diagram, id: string | null | undefined): DiagramEdge | undefined =>
  id ? doc.graph.edges.find(e => e.id === id) : undefined;
export const findObject = (doc: Diagram, id: string | null | undefined) =>
  findNode(doc, id) ?? findGroup(doc, id);
export const findEntity = (doc: Diagram, id: string | null | undefined): Entity | undefined =>
  findNode(doc, id) ?? findGroup(doc, id) ?? findEdge(doc, id);

export const isNode = (doc: Diagram, id: string) => !!findNode(doc, id);
export const isGroup = (doc: Diagram, id: string) => !!findGroup(doc, id);
export const isEdge = (doc: Diagram, id: string) => !!findEdge(doc, id);

export const styleOf = (doc: Diagram, id: string): NodeStyle => ({
  ...DEFAULT_STYLE,
  ...doc.styles[id],
});

/** Direct children (shapes and containers) of a container, or of the diagram root. */
/** The title band of a `cells` group; undefined for any other group. */
export const cellsBandOf = (doc: Diagram, id: string | null | undefined) =>
  id ? doc.layout.containers[id]?.cellsBand : undefined;

/** Whether a cell is a field of variable length in a byte or bit layout. */
export const isOpenCell = (doc: Diagram, id: string) =>
  !!doc.layout.containers[findNode(doc, id)?.parentId ?? '']?.cellsChrome?.open?.includes(id);

/** Whether a node is a cell of a `cells` group, which holds it in place edge to edge. */
export const isCell = (doc: Diagram, id: string) =>
  cellsBandOf(doc, findNode(doc, id)?.parentId) !== undefined;

/** Whether a node is a database row of a `layout g table` group, drawn with its key and type. */
export const isTableRow = (doc: Diagram, id: string) => {
  const n = findNode(doc, id);
  return !!n?.row && !!doc.layout.containers[n.parentId ?? '']?.table;
};

export function childrenOf(doc: Diagram, parentId: string | null | undefined) {
  const parent = parentId || null;
  return [...doc.graph.groups, ...doc.graph.nodes].filter(n => (n.parentId || null) === parent);
}

export function descendants(doc: Diagram, id: string): string[] {
  const result: string[] = [];
  const walk = (parent: string) => {
    for (const child of childrenOf(doc, parent)) {
      result.push(child.id);
      if (isGroup(doc, child.id)) walk(child.id);
    }
  };
  walk(id);
  return result;
}

/** Containers enclosing an object, nearest first. */
export function ancestors(doc: Diagram, id: string): string[] {
  const out: string[] = [];
  for (let p = findObject(doc, id)?.parentId; p; p = findGroup(doc, p)?.parentId) out.push(p);
  return out;
}

export const isCollapsed = (doc: Diagram, id: string) => doc.collapsed.includes(id);

export const isHiddenByCollapse = (doc: Diagram, id: string) =>
  ancestors(doc, id).some(a => isCollapsed(doc, a));

/** The visible object that stands in for `id`: its outermost collapsed container, if any. */
export function visibleProxy(doc: Diagram, id: string) {
  let proxy = id;
  for (const a of ancestors(doc, id)) if (isCollapsed(doc, a)) proxy = a;
  return proxy;
}

export interface VisibleEdge extends DiagramEdge {
  /** Visible source, which may be a collapsed container. */
  a: string;
  /** Visible target, which may be a collapsed container. */
  b: string;
}

export interface VisibleGraph {
  nodes: DiagramNode[];
  groups: DiagramGroup[];
  edges: VisibleEdge[];
}

/** Objects and connections that are not hidden inside a collapsed container. */
export function visibleGraph(doc: Diagram): VisibleGraph {
  const nodes = doc.graph.nodes.filter(n => visibleProxy(doc, n.id) === n.id);
  const groups = doc.graph.groups
    .filter(g => !isHiddenByCollapse(doc, g.id))
    .sort((a, b) => ancestors(doc, a.id).length - ancestors(doc, b.id).length);
  // A line between two rows of one timeline is drawn by the timeline, so no router sees it.
  const onChart = new Set((doc.layout.timelines ?? []).flatMap(t => t.edges));
  const edges = doc.graph.edges
    .filter(e => !onChart.has(e.id))
    .map(e => ({ ...e, a: visibleProxy(doc, e.from), b: visibleProxy(doc, e.to) }))
    .filter(e => e.a !== e.b || e.from === e.to);
  return { nodes, groups, edges };
}

/** A timeline row, milestone or band: placed by dates, so it selects but never moves. */
export const onTimeline = (doc: Diagram, id: string) =>
  (doc.layout.timelines ?? []).some(
    t =>
      t.ids.includes(id) ||
      doc.graph.groups.some(
        g => g.id === id && (g.parentId ?? 'root') === t.scope && t.scope !== id,
      ),
  );

/** The timelines the drawing shows: one inside a collapsed group draws nothing. */
export const shownTimelines = (doc: Diagram) =>
  (doc.layout.timelines ?? []).filter(
    t => t.scope === 'root' || (!isCollapsed(doc, t.scope) && !isHiddenByCollapse(doc, t.scope)),
  );

/** Selected shapes and containers whose own container is not also selected. */
export function selectionRoots(doc: Diagram, selected: Iterable<string>) {
  const set = new Set(selected);
  return [...set].filter(id => findObject(doc, id) && !ancestors(doc, id).some(a => set.has(a)));
}

/** Layout direction for the contents of an object's container. */
export function inheritedDirection(doc: Diagram, id: string): Direction {
  for (const p of [id, ...ancestors(doc, id)]) {
    const direction = doc.layout.containers[p]?.direction;
    if (direction && direction !== 'inherit') return direction;
  }
  return doc.settings.direction;
}

export const COLLAPSED_HEIGHT = 58;
export const CONTAINER_HEADER = 28;

/** Read geometry for an object, preferring a temporary override (preview, animation, brush). */
export type GeometryLookup = (id: string) => NodeLayout;

export function makeGeometry(doc: Diagram, override?: Record<string, NodeLayout> | null) {
  return (id: string): NodeLayout =>
    override?.[id] ?? doc.layout.nodes[id] ?? { x: 0, y: 0, w: 176, h: 68 };
}

/**
 * Container frame as drawn: collapsed containers shrink to their title band plus a line for the
 * shape count, so the title stays where it was in the open frame.
 */
export function frameRect(doc: Diagram, geometry: GeometryLookup, id: string): NodeLayout {
  const r = { ...geometry(id) };
  if (isCollapsed(doc, id)) {
    r.w = Math.min(r.w, 210);
    r.h = Math.max(COLLAPSED_HEIGHT, resolveAppearance(doc.appearance).groupHeader + 10);
  }
  return r;
}

export const objectRect = (doc: Diagram, geometry: GeometryLookup, id: string): Rect =>
  isGroup(doc, id) ? frameRect(doc, geometry, id) : geometry(id);

/**
 * The one rule every edit passes through (`commit` in state/session/document.ts): a timeline places
 * its rows, bands and milestones by date, so an edit never moves, sizes or reparents them on its
 * own. Each keeps its place from `before`, shifted only by its timeline group's own move. An edit
 * that adds an object inside a timeline or a band is refused, because a new row needs dates the
 * editor cannot give; the returned message says so. Mutates `after`.
 */
export function holdTimelines(before: Diagram, after: Diagram): string | undefined {
  const timelines = before.layout.timelines ?? [];
  if (!timelines.length) return undefined;
  const existed = new Set([...before.graph.nodes, ...before.graph.groups].map(o => o.id));
  const bandsOf = (scope: string) =>
    before.graph.groups
      .filter(g => (g.parentId ?? 'root') === scope && g.id !== scope)
      .map(g => g.id);
  for (const o of [...after.graph.nodes, ...after.graph.groups]) {
    if (existed.has(o.id)) continue;
    const parent = o.parentId ?? 'root';
    if (timelines.some(t => t.scope === parent || bandsOf(t.scope).includes(parent)))
      return 'Timelines place rows by their dates. Add a row as a dated line in the source.';
  }
  const exists = new Set([...after.graph.nodes, ...after.graph.groups].map(o => o.id));
  for (const t of timelines) {
    // Removing a timeline group but not its rows would leave dated rows outside any timeline.
    if (t.scope !== 'root' && !exists.has(t.scope) && t.ids.some(id => exists.has(id)))
      return "A timeline's rows need their timeline. Delete the timeline with its rows, or remove its layout line in the source.";
  }
  for (const t of timelines) {
    const was = t.scope === 'root' ? undefined : before.layout.nodes[t.scope],
      now = t.scope === 'root' ? undefined : after.layout.nodes[t.scope];
    if (t.scope !== 'root' && (!was || !now)) continue;
    const dx = was && now ? now.x - was.x : 0,
      dy = was && now ? now.y - was.y : 0;
    for (const id of [...t.ids, ...bandsOf(t.scope)]) {
      const r = before.layout.nodes[id],
        n = after.layout.nodes[id];
      if (!r || !n) continue;
      after.layout.nodes[id] = { ...n, x: r.x + dx, y: r.y + dy, w: r.w, h: r.h };
      // A row stays in its band: an edit cannot move it to another container.
      const prior = [...before.graph.nodes, ...before.graph.groups].find(o => o.id === id),
        next = [...after.graph.nodes, ...after.graph.groups].find(o => o.id === id);
      // (A band that was removed lets its rows move up into the timeline itself.)
      if (
        prior &&
        next &&
        next.parentId !== prior.parentId &&
        (!prior.parentId || exists.has(prior.parentId))
      )
        next.parentId = prior.parentId;
    }
  }
  return undefined;
}

/**
 * Every line a timeline draws between its rows, in world coordinates: the one source that public
 * geometry, `inspect`, metrics and exports read, since these lines never reach the router.
 */
export function timelineRoutes(doc: Diagram, rects: ReadonlyMap<string, Rect>) {
  return shownTimelines(doc).flatMap(t => {
    const o = timelineOrigin(t, rects.get(t.scope));
    return Object.entries(t.links ?? {}).flatMap(([id, link]) =>
      Array.isArray(link?.points) && link.points.length >= 2
        ? [
            {
              id,
              from: link.from,
              to: link.to,
              points: link.points.map(p => ({ x: p.x + o.x, y: p.y + o.y })),
              ...(link.label
                ? { label: { ...link.label, x: link.label.x + o.x, y: link.label.y + o.y } }
                : {}),
            },
          ]
        : [],
    );
  });
}
