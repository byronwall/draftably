/**
 * Geometry as hosts see it: the graph API's shapes (`Box`, `PlacedBox`, `EdgeOut`) in world units,
 * built from the boxes and routes a drawing uses. `renderSvg`, the viewer, the editor and the graph
 * API all build it here, so their numbers agree.
 */
import { shownTimelines } from '../model/graph';
import { timelineOrigin } from '../model/timeline';
import type { Box, EdgeOut, PlacedBox } from '../graph-api/core';
import type { Diagram, Point, Rect, Side } from '../model/types';

export type { Box, EdgeOut, PlacedBox };

/** The graph API's shapes, in world units, for the drawing now committed. */
export interface Geometry {
  revision: number;
  /** Everything drawn: heading, legend, notes, footnotes. */
  frame: Box;
  /** Shapes, lines and labels only. */
  bounds: Box;
  nodes: Record<string, PlacedBox>;
  groups: Record<string, PlacedBox>;
  /** The routes as drawn. */
  edges: Record<string, EdgeOut>;
}

/** The route fields geometry reads; `computeRoutes` returns more. */
export interface DrawnRoute {
  id: string;
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  points: Point[];
  path: string;
  label?: { x: number; y: number; w: number; h: number } | null;
  blocked?: boolean;
}

export function boundsOf(boxes: readonly Box[]): Box {
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map(b => b.x)),
    y = Math.min(...boxes.map(b => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map(b => b.x + b.width)) - x,
    height: Math.max(...boxes.map(b => b.y + b.height)) - y,
  };
}

/** An edge's box: its route's points and its label. */
export const edgeBox = (e: EdgeOut): Box =>
  boundsOf([...e.points.map(p => ({ ...p, width: 0, height: 0 })), ...(e.label ? [e.label] : [])]);

/**
 * Every visible node, group and edge of a projected document, under the caller's IDs. `rects`
 * holds the visible objects' boxes; `routes` the lines as drawn.
 */
export function placedItems(
  doc: Diagram,
  rects: ReadonlyMap<string, Rect>,
  routes: readonly DrawnRoute[],
  objectId: (id: string) => string = id => id,
  edgeId: (id: string) => string = id => id,
) {
  const parent = new Map([...doc.graph.nodes, ...doc.graph.groups].map(o => [o.id, o.parentId])),
    // A route's ends may be router stubs, such as a group's frame; report the edge's own ends.
    ends = new Map(doc.graph.edges.map(e => [e.id, e]));
  const box = (id: string): PlacedBox => {
    const r = rects.get(id)!,
      p = parent.get(id);
    return { x: r.x, y: r.y, width: r.w, height: r.h, ...(p ? { parent: objectId(p) } : {}) };
  };
  // In the order the layout placed them.
  const isGroup = new Set(doc.graph.groups.map(g => g.id)),
    ids = [...rects.keys()];
  const nodes = Object.fromEntries(
      ids.filter(id => !isGroup.has(id)).map(id => [objectId(id), box(id)]),
    ),
    groups = Object.fromEntries(
      ids.filter(id => isGroup.has(id)).map(id => [objectId(id), box(id)]),
    ),
    edges = Object.fromEntries(
      routes.map(r => [
        edgeId(r.id),
        {
          source: objectId(ends.get(r.id)?.from ?? r.from),
          target: objectId(ends.get(r.id)?.to ?? r.to),
          sourceSide: r.fromSide,
          targetSide: r.toSide,
          points: r.points,
          path: r.path,
          label: r.label
            ? {
                x: r.label.x - r.label.w / 2,
                y: r.label.y - r.label.h / 2,
                width: r.label.w,
                height: r.label.h,
              }
            : null,
          blocked: !!r.blocked,
        } satisfies EdgeOut,
      ]),
    );
  // Lines a timeline draws between its rows never reach the router; report them as drawn.
  for (const t of shownTimelines(doc)) {
    const o = timelineOrigin(t, rects.get(t.scope));
    for (const [id, link] of Object.entries(t.links ?? {})) {
      if (!Array.isArray(link?.points) || link.points.length < 2) continue;
      const points = link.points.map(p => ({ x: p.x + o.x, y: p.y + o.y })),
        [a, b] = [points[0], points[1]],
        last = points[points.length - 1],
        prev = points[points.length - 2];
      const vertical = (from: Point, to: Point): Side => (to.y > from.y ? 'bottom' : 'top');
      (edges as Record<string, EdgeOut>)[edgeId(id)] = {
        source: objectId(link.from),
        target: objectId(link.to),
        sourceSide: vertical(a, b),
        targetSide: prev.y === last.y ? (last.x > prev.x ? 'left' : 'right') : vertical(last, prev),
        points,
        path: points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(''),
        label: link.label
          ? {
              x: link.label.x + o.x,
              y: link.label.y + o.y,
              width: link.label.w,
              height: link.label.h,
            }
          : null,
        blocked: false,
      };
    }
  }
  const all: Box[] = [
    ...Object.values(nodes),
    ...Object.values(groups),
    ...Object.values(edges).map(edgeBox),
    // A timeline draws past its rows' boxes: its axis, rules, labels and legend.
    ...shownTimelines(doc).map(t => {
      const o = timelineOrigin(t, rects.get(t.scope));
      return { x: o.x + t.bounds.x, y: o.y + t.bounds.y, width: t.bounds.w, height: t.bounds.h };
    }),
  ];
  return { nodes, groups, edges, bounds: boundsOf(all) };
}

/** The box of any item in a geometry, or undefined. */
export function itemBox(g: Geometry, id: string): Box | undefined {
  const o = g.nodes[id] ?? g.groups[id];
  if (o) return { x: o.x, y: o.y, width: o.width, height: o.height };
  const e = g.edges[id];
  return e ? edgeBox(e) : undefined;
}
