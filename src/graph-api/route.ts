/**
 * `route(graph)`: lines between boxes the caller already placed. It brings only the router, not
 * the file compiler or a layout engine, so `@draftably/runtime/route` can ship it on its own.
 */
import { emptyDiagram } from '../model/document';
import { frameRect, makeGeometry, visibleGraph, type VisibleGraph } from '../model/graph';
import { computeRoutes } from '../model/routes';
import { placedItems } from '../runtime/geometry';
import type { Diagram, Point, Rect } from '../model/types';
import type { EdgeIn, EdgeOut, Quality, RouteIn, Routed } from './core';

/**
 * `auto` routes fully when the quick routes predict a full pass within the budget. The full
 * pass reroutes each line with a crossing or crowded lane against all the others, so its cost
 * grows with lines times conflicts; this limit keeps it near the 1 s load budget. The choice
 * counts lines and conflicts, never time, so the same input always takes the same mode.
 */
export const AUTO_FULL_LIMIT = 1200;

export function routesFor(
  doc: Diagram,
  vg: VisibleGraph,
  rects: Map<string, Rect>,
  quality: Quality = 'auto',
) {
  if (quality === 'full')
    return { ...computeRoutes(doc, vg, rects, { previous: [] }), quality: 'full' as const };
  const quick = computeRoutes(doc, vg, rects, { previous: [], quick: true }),
    { edges, crossings, lanePairs, shared } = quick.result.report,
    work = edges * (1 + crossings + lanePairs + (shared ? 1 : 0));
  if (quality === 'quick' || work > AUTO_FULL_LIMIT) return { ...quick, quality: 'quick' as const };
  return { ...computeRoutes(doc, vg, rects, { previous: [] }), quality: 'full' as const };
}

/** The visible boxes of a projected document, keyed by ID. */
export function visibleRects(doc: Diagram) {
  const vg = visibleGraph(doc),
    geometry = makeGeometry(doc),
    rects = new Map<string, Rect>();
  for (const n of vg.nodes) rects.set(n.id, { ...geometry(n.id) });
  for (const g of vg.groups) rects.set(g.id, frameRect(doc, geometry, g.id));
  return { vg, rects };
}

const noun = (n: number) => `${n} line${n > 1 ? 's' : ''}`;

/** Geometry for every node, group and edge of a projected document, under the caller's IDs. */
export function placed(
  doc: Diagram,
  quality: Quality | undefined,
  objectId: (id: string) => string,
  edgeId: (id: string) => string,
) {
  const { vg, rects } = visibleRects(doc),
    routed = routesFor(doc, vg, rects, quality),
    out = placedItems(doc, rects, routed.routes, objectId, edgeId),
    blocked = Object.values(out.edges).filter(e => e.blocked).length;
  return {
    ...out,
    quality: routed.quality,
    warnings: blocked ? [`${noun(blocked)} found no clear way.`] : [],
  };
}

/** Edge IDs, numbering the ones without an ID after those the caller gave. */
export function edgeIds(edges: EdgeIn[]) {
  const given = new Set(edges.flatMap(e => (e.id ? [e.id] : [])));
  let n = 0;
  return edges.map(e => {
    if (e.id) return e.id;
    let id;
    do id = `e${++n}`;
    while (given.has(id));
    return id;
  });
}

/** Whether the segment from `a` to `b` runs through the inside of `r`; its outline does not count. */
function through(a: Point, b: Point, r: Rect) {
  const e = 0.5;
  return (
    Math.max(a.x, b.x) > r.x + e &&
    Math.min(a.x, b.x) < r.x + r.w - e &&
    Math.max(a.y, b.y) > r.y + e &&
    Math.min(a.y, b.y) < r.y + r.h - e
  );
}

/** The boxes, by ID, that a line runs through. */
function crossed(points: Point[], boxes: { id: string; r: Rect }[]) {
  return boxes
    .filter(({ r }) => points.slice(1).some((b, i) => through(points[i], b, r)))
    .map(b => b.id);
}

/**
 * Route lines between boxes the caller placed. Nothing moves. Routing is deterministic: the same
 * input gives the same lines, with no randomness and no time limit.
 */
export function route(graph: RouteIn): Routed {
  const doc = emptyDiagram(),
    groups = graph.groups ?? [],
    known = new Map<string, { width: number; height: number }>(),
    { quality, avoidNodes, ...routing } = graph.routing ?? {},
    ids = edgeIds(graph.edges);
  doc.settings.routing = { ...doc.settings.routing, ...routing };
  for (const o of [...groups, ...graph.nodes]) {
    if (known.has(o.id)) throw Error(`Duplicate node or group id "${o.id}".`);
    known.set(o.id, o);
  }
  const check = (id: string | undefined, from: string) => {
    if (id !== undefined && !known.has(id)) throw Error(`${from} refers to unknown id "${id}".`);
  };
  for (const g of groups) {
    check(g.parent, `Group "${g.id}"`);
    doc.graph.groups.push({
      id: g.id,
      title: g.label ?? '',
      ...(g.parent ? { parentId: g.parent } : {}),
    });
    doc.layout.containers[g.id] = { direction: 'inherit', padding: 0, manualSize: true };
  }
  for (const n of graph.nodes) {
    check(n.parent, `Node "${n.id}"`);
    doc.graph.nodes.push({ id: n.id, title: '', ...(n.parent ? { parentId: n.parent } : {}) });
    doc.styles[n.id] = { shape: n.shape ?? 'box', color: 'auto', icon: '' };
  }
  for (const o of [...groups, ...graph.nodes])
    doc.layout.nodes[o.id] = { x: o.x, y: o.y, w: o.width, h: o.height };
  graph.edges.forEach((e, i) => {
    const id = ids[i];
    check(e.source, `Edge "${id}"`);
    check(e.target, `Edge "${id}"`);
    // A row port is a distance down a left or right side; the router counts from the middle.
    const at = (v: number | undefined, side: EdgeIn['sourceSide'], box: string, end: string) => {
      if (v === undefined) return undefined;
      if (!Number.isFinite(v)) throw Error(`Edge "${id}" ${end} must be a finite number.`);
      if (side === 'top' || side === 'bottom')
        throw Error(`Edge "${id}" ${end} needs a left or right side, not ${side}.`);
      return v - known.get(box)!.height / 2;
    };
    const fromAt = at(e.sourceAt, e.sourceSide, e.source, 'sourceAt'),
      toAt = at(e.targetAt, e.targetSide, e.target, 'targetAt');
    doc.graph.edges.push({
      id,
      from: e.source,
      to: e.target,
      label: e.label ?? '',
      directed: true,
      emphasis: false,
      dashed: !!e.dashed,
    });
    doc.layout.edges[id] = {
      ...(e.sourceSide ? { fromSide: e.sourceSide } : {}),
      ...(e.targetSide ? { toSide: e.targetSide } : {}),
      ...(fromAt !== undefined ? { fromAt } : {}),
      ...(toAt !== undefined ? { toAt } : {}),
    };
  });
  const out = placed(
    doc,
    quality,
    id => id,
    id => id,
  );
  // A blocked line names the boxes its stand-in runs through. In strict mode a line through a
  // box is blocked too, and a blocked line has no points, so the host never draws one.
  const boxes = graph.nodes.map(n => ({
    id: n.id,
    r: { x: n.x, y: n.y, w: n.width, h: n.height },
  }));
  const edges: Record<string, EdgeOut> = {};
  let held = 0;
  for (const [id, e] of Object.entries(out.edges)) {
    const hits = avoidNodes === 'strict' || e.blocked ? crossed(e.points, boxes) : [];
    if (avoidNodes === 'strict' && (e.blocked || hits.length)) {
      if (!e.blocked) held++;
      edges[id] = { ...e, points: [], path: '', label: null, blocked: true, crosses: hits };
    } else edges[id] = e.blocked ? { ...e, crosses: hits } : e;
  }
  return {
    edges,
    quality: out.quality,
    warnings: [
      ...out.warnings,
      ...(held
        ? [`${noun(held)} ran through a box and ${held > 1 ? 'were' : 'was'} held back.`]
        : []),
    ],
  };
}
