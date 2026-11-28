/**
 * `route(graph)`: lines between boxes the caller already placed. It brings only the router, not
 * the file compiler or a layout engine, so `@draftably/runtime/route` can ship it on its own.
 */
import { emptyDiagram } from '../model/document';
import { frameRect, makeGeometry, visibleGraph, type VisibleGraph } from '../model/graph';
import { resize, resizeKey, type Previous } from './resize';
import { computeRoutes, drawRoutes, routeInput, drawnPath, type DrawnRoute } from '../model/routes';
import { placedItems } from '../runtime/geometry';
import type { Diagram, Point, Rect } from '../model/types';
import type { EdgeIn, EdgeOut, Quality, RouteIn, Routed, Shape } from './core';

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
    routed = routesFor(doc, vg, rects, quality);
  return placedRoutes(doc, rects, routed.routes, routed.quality, objectId, edgeId);
}

function placedRoutes(
  doc: Diagram,
  rects: Map<string, Rect>,
  routes: DrawnRoute[],
  quality: Routed['quality'],
  objectId = (id: string) => id,
  edgeId = (id: string) => id,
) {
  const out = placedItems(doc, rects, routes, objectId, edgeId),
    blocked = Object.values(out.edges).filter(e => e.blocked).length;
  return {
    ...out,
    quality,
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

/** Whether the box spanned by `a` and `b` overlaps the inside of `r`; its outline does not count. */
function through(a: Point, b: Point, r: Rect) {
  const e = 0.5;
  return (
    Math.max(a.x, b.x) > r.x + e &&
    Math.min(a.x, b.x) < r.x + r.w - e &&
    Math.max(a.y, b.y) > r.y + e &&
    Math.min(a.y, b.y) < r.y + r.h - e
  );
}

type Obstacle = { id: string; r: Rect; shape: Shape };

/** Whether `p` is inside a node's outline, more than half a pixel in. */
function inside(p: Point, { r, shape }: Obstacle) {
  const e = 0.5,
    a = r.w / 2 - e,
    b = r.h / 2 - e,
    dx = Math.abs(p.x - r.x - r.w / 2),
    dy = Math.abs(p.y - r.y - r.h / 2);
  if (a <= 0 || b <= 0 || dx >= a || dy >= b) return false;
  if (shape === 'diamond') return dx / a + dy / b < 1;
  if (shape === 'circle') return (dx / a) ** 2 + (dy / b) ** 2 < 1;
  if (shape === 'pill') {
    const k = Math.min(a, b);
    return Math.hypot(Math.max(0, dx - (a - k)), Math.max(0, dy - (b - k))) < k;
  }
  return true;
}

/** The straight runs and rounded corners of a drawn path, each as its start, control and end. */
function pieces(path: string, points: Point[]) {
  const n = (path.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number),
    out: Point[][] = [];
  let at = 0,
    last: Point | undefined;
  for (const op of path.match(/[MLQ]/g) ?? []) {
    const next = op === 'Q' ? n.slice(at, (at += 4)) : n.slice(at, (at += 2)),
      end = { x: next[next.length - 2], y: next[next.length - 1] };
    if (last && op !== 'M')
      out.push(op === 'Q' ? [last, { x: next[0], y: next[1] }, end] : [last, end]);
    last = end;
  }
  return out.length ? out : points.slice(1).map((b, i) => [points[i], b]);
}

/** A piece's points, at most a quarter pixel apart. */
function along(ps: Point[]) {
  const [p, c, q] = ps.length === 3 ? ps : [ps[0], ps[0], ps[1]],
    steps = Math.max(
      1,
      Math.ceil(4 * (Math.hypot(c.x - p.x, c.y - p.y) + Math.hypot(q.x - c.x, q.y - c.y))),
    );
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = k / steps,
      u = 1 - t;
    return {
      x: u * u * p.x + 2 * u * t * c.x + t * t * q.x,
      y: u * u * p.y + 2 * u * t * c.y + t * t * q.y,
    };
  });
}

/**
 * The nodes, by ID, whose outline the drawn line enters, its rounded corners included. The straight
 * stub out of each port only leaves its own node, whose outline there is the router's to place.
 */
function crossed(points: Point[], path: string, nodes: Obstacle[], ends: [string, string]) {
  const all = pieces(path, points);
  return nodes
    .filter(o =>
      all.some((ps, i) => {
        if (
          ps.length === 2 &&
          ((i === 0 && o.id === ends[0]) || (i === all.length - 1 && o.id === ends[1]))
        )
          return false;
        const lo = { x: Math.min(...ps.map(p => p.x)), y: Math.min(...ps.map(p => p.y)) },
          hi = { x: Math.max(...ps.map(p => p.x)), y: Math.max(...ps.map(p => p.y)) };
        return through(lo, hi, o.r) && along(ps).some(p => inside(p, o));
      }),
    )
    .map(o => o.id);
}

const snapshots = new WeakMap<Routed, Previous>();

/**
 * Route lines between boxes the caller placed. Nothing moves. Routing is deterministic: the same
 * graph and previous result give the same lines. Pass the last result from this instance to
 * reuse fixed row-to-row lines after a resize. An incompatible result routes fresh.
 */
export function route(graph: RouteIn, previous?: Routed): Routed {
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
  // A blocked line names the boxes its stand-in runs through. In strict mode a line through a
  // box is blocked too, and a blocked line has no points, so the host never draws one.
  const boxes = graph.nodes.map(n => ({
    id: n.id,
    r: { x: n.x, y: n.y, w: n.width, h: n.height },
    shape: n.shape ?? 'box',
  }));
  const key = new Set(ids).size === ids.length ? resizeKey(graph) : undefined;
  const prior = previous && snapshots.get(previous);
  const { vg, rects } = visibleRects(doc);
  let baseline: ReturnType<typeof routesFor> | undefined;
  const fresh = () => (baseline ??= routesFor(doc, vg, rects, quality));
  const edgeById = new Map(doc.graph.edges.map(e => [e.id, e]));
  const moved =
    key !== undefined && prior?.key === key
      ? resize(
          prior,
          graph.nodes,
          routeInput(doc, vg, rects),
          { ...doc.settings.routing, quick: quality === 'quick' },
          r =>
            !crossed(
              r.points,
              drawnPath(r.points, edgeById.get(r.id), doc.settings.routing.cornerRadius),
              boxes,
              [r.from, r.to],
            ).length,
          () => fresh().result.routes,
        )
      : undefined;
  const routes = moved ?? fresh().result.routes;
  const out = moved
    ? placedRoutes(
        doc,
        rects,
        drawRoutes(doc, vg, rects, { routes }),
        quality === 'quick' ? 'quick' : 'full',
      )
    : placedRoutes(doc, rects, fresh().routes, fresh().quality);
  const edges: Record<string, EdgeOut> = {};
  let held = 0;
  for (const [id, e] of Object.entries(out.edges)) {
    const hits =
      avoidNodes === 'strict' || e.blocked
        ? crossed(e.points, e.path, boxes, [e.source, e.target])
        : [];
    if (avoidNodes === 'strict' && (e.blocked || hits.length)) {
      if (!e.blocked) held++;
      edges[id] = { ...e, points: [], path: '', label: null, blocked: true, crosses: hits };
    } else edges[id] = e.blocked ? { ...e, crosses: hits } : e;
  }
  const result = {
    edges,
    quality: out.quality,
    warnings: [
      ...out.warnings,
      ...(held
        ? [`${noun(held)} ran through a box and ${held > 1 ? 'were' : 'was'} held back.`]
        : []),
    ],
  };
  if (key)
    snapshots.set(result, {
      key,
      nodes: graph.nodes.map(n => ({ ...n })),
      routes: structuredClone(routes),
    });
  return result;
}
