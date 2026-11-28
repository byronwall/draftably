import { compactResize } from './compact-resize';
import { finish } from '../engines/routing/compute';
import { conflicts, crossesItself, parallelNear } from '../engines/routing/conflicts';
import { BLOCKED_PENALTY, createContext } from '../engines/routing/context';
import { standoffCost } from '../engines/routing/cost';
import { find } from '../engines/routing/find';
import { cmp, compress, distance, EPS, lengthOf, round, same } from '../engines/routing/geometry';
import { validPath } from '../engines/routing/paths';
import { port } from '../engines/routing/ports';
import type { Point, Route, RouteInput, RoutingOptions } from '../engines/routing/types';
import type { PlacedNodeIn, RouteIn } from './core';

export interface Previous {
  key: string;
  nodes: PlacedNodeIn[];
  compact: boolean;
  routes: Route[];
}

/** Only fixed row ports on rectangular cards have the same known terminal points before and
 * after a resize. The ordinary router handles auto-selected ports, labels, shapes and groups. */
export function resizeKey(graph: RouteIn, ids: string[], settings: object) {
  if (
    !graph.routing?.quality ||
    graph.routing.quality === 'auto' ||
    graph.groups?.length ||
    !graph.edges.length ||
    graph.nodes.some(n => n.parent || (n.shape && n.shape !== 'box')) ||
    graph.edges.some(
      e =>
        e.label ||
        e.sourceAt === undefined ||
        e.targetAt === undefined ||
        (e.sourceSide !== 'left' && e.sourceSide !== 'right') ||
        (e.targetSide !== 'left' && e.targetSide !== 'right'),
    )
  )
    return;
  // Only the fields routing reads: other data on the caller's objects never changes the key,
  // and a field read through a getter or a class counts as it routes.
  return JSON.stringify([
    graph.nodes.map(n => n.id),
    graph.edges.map((e, i) => [
      ids[i],
      e.source,
      e.target,
      e.sourceSide,
      e.targetSide,
      e.sourceAt,
      e.targetAt,
    ]),
    graph.routing.quality,
    graph.routing.avoidNodes ?? null,
    // The effective settings, so a changed clearance or gap routes afresh.
    Object.entries(settings)
      .filter(([, v]) => ['number', 'string', 'boolean'].includes(typeof v))
      .sort(([a], [b]) => cmp(a, b)),
  ]);
}

/** Map vertical tracks between corresponding faces. A split or reordered column has no mapping. */
function columnMap(before: PlacedNodeIn[], after: PlacedNodeIn[], clearance?: number) {
  const faces = new Map<number, number>();
  for (const [i, a] of before.entries()) {
    const b = after[i];
    for (const [x, next] of [
      [a.x, b.x],
      [a.x + a.width, b.x + b.width],
    ]) {
      if (faces.has(x) && faces.get(x) !== next) return;
      faces.set(x, next);
    }
  }
  const xs = [...faces.keys()].sort((a, b) => a - b);
  if (!xs.length || xs.some((x, i) => i && faces.get(x)! <= faces.get(xs[i - 1])!)) return;
  return (x: number) => {
    // Keep clearance tracks attached to the faces. Scale the free space between them.
    if (clearance !== undefined && x > xs[0] && x < xs.at(-1)!) {
      const right = xs.findIndex(face => face >= x);
      const lo = xs[right - 1] + clearance,
        hi = xs[right] - clearance;
      const leftFace = faces.get(xs[right - 1])! + clearance,
        rightFace = faces.get(xs[right])! - clearance;
      if (x > lo && x < hi && leftFace < rightFace)
        return round(leftFace + ((x - lo) * (rightFace - leftFace)) / (hi - lo));
    }
    const face = xs.reduce((a, b) => (Math.abs(x - a) <= Math.abs(x - b) ? a : b));
    return round(x + faces.get(face)! - face);
  };
}

/** Distance from a run to the parallel side of a card, capped at the requested standoff.
 * A run beyond the ends of the side already has all the room it needs. */
function cardGap(a: Point, b: Point, card: PlacedNodeIn, band: number) {
  const flat = a.y === b.y,
    along = flat ? 'x' : 'y',
    across = flat ? 'y' : 'x';
  const lo = card[along],
    hi = lo + (flat ? card.width : card.height);
  if (Math.min(hi, Math.max(a[along], b[along])) - Math.max(lo, Math.min(a[along], b[along])) <= 1)
    return band;
  const face = card[across];
  return Math.min(
    band,
    Math.max(0, face - a[across], a[across] - face - (flat ? card.height : card.width)),
  );
}

function keepsLane(r: Route, moved: Point[], other: Route, prior: Route, gap: number) {
  for (let i = 1; i < moved.length; i++)
    for (let j = 1; j < other.points.length; j++) {
      const after = parallelNear(moved[i - 1], moved[i], other.points[j - 1], other.points[j], gap);
      if (!after) continue;
      const before = parallelNear(
        r.points[i - 1],
        r.points[i],
        prior.points[j - 1],
        prior.points[j],
        gap,
      );
      if (!before || after.separation + EPS < before.separation) return false;
    }
  return true;
}

/** Shared length for pairs with no common card, and for pairs with no common row port. */
function unrelatedShared(routes: Route[]) {
  let cards = 0,
    rows = 0;
  for (const [i, r] of routes.entries()) {
    for (const q of routes.slice(0, i)) {
      const ends = [
        [r.from, r.points[0]],
        [r.to, r.points.at(-1)!],
      ] as const;
      const others = [
        [q.from, q.points[0]],
        [q.to, q.points.at(-1)!],
      ] as const;
      if (ends.some(([id, p]) => others.some(([other, at]) => id === other && same(p, at))))
        continue;
      const shared = conflicts(r.points, [q]).shared;
      rows += shared;
      if (r.from !== q.from && r.from !== q.to && r.to !== q.from && r.to !== q.to) cards += shared;
    }
  }
  return { cards, rows };
}

/** A clear candidate can still lose to a fresh full route on the new geometry. Every candidate,
 * guarded or compact, passes one acceptance step (`accept`): each line clears the cards as
 * drawn, then the drawing either reaches a lower bound on every term of the routing objective
 * or, in guarded mode, ties or beats a fresh route. */
export function resize(
  old: Previous,
  nodes: PlacedNodeIn[],
  input: RouteInput,
  options: RoutingOptions,
  clear: (route: Route) => boolean,
  fresh: () => Route[],
  compact: boolean,
) {
  const ctx = createContext(input, options);
  const byId = (rs: Route[]) => rs.sort((a, b) => cmp(a.id, b.id));
  // No route can cost less: no conflicts, no standoff, and each line at its Manhattan length
  // with the fewest bends. A line with level ends needs two bends to reach another row.
  // If any line is blocked, the objective starts at 1e8.
  const atBound = (routes: Route[]) => {
    const m = ctx.metrics(routes);
    return (
      !m.crossings &&
      !m.lanePairs &&
      !m.shared &&
      ctx.total(routes) < BLOCKED_PENALTY &&
      routes.every(r => {
        const a = r.points[0],
          b = r.points.at(-1)!;
        return (
          r.points.length === (Math.abs(a.y - b.y) < EPS ? 2 : 4) &&
          Math.abs(lengthOf(r.points) - distance(a, b)) < EPS
        );
      }) &&
      routes.every(r => standoffCost(r.points, ctx.near) === 0)
    );
  };
  // The one acceptance step. `checked`: the drawing must tie or beat a fresh route unless it
  // reaches the lower bound.
  const accept = (routes: Route[], checked: boolean) => {
    if (routes.some(r => r.blocked || !clear(r))) return;
    if (atBound(routes) || !checked) return byId(routes);
    const baseline = fresh();
    // Strict mode can withhold even an engine-clear line when a rounded corner enters a card.
    if (baseline.some(r => r.blocked || !clear(r))) return;
    const m = ctx.metrics(routes),
      base = ctx.metrics(baseline);
    if (
      ctx.total(routes) > ctx.total(baseline) ||
      m.laneDeficit > base.laneDeficit ||
      m.shared > base.shared
    )
      return;
    const shared = unrelatedShared(routes),
      reference = unrelatedShared(baseline);
    if (shared.cards > reference.cards || shared.rows > reference.rows) return;
    const standoff = (rs: Route[]) => rs.reduce((s, r) => s + standoffCost(r.points, ctx.near), 0);
    return standoff(routes) <= standoff(baseline) ? byId(routes) : undefined;
  };
  if (
    nodes.every((n, i) => {
      const a = old.nodes[i];
      return a.x === n.x && a.y === n.y && a.width === n.width && a.height === n.height;
    })
  )
    return structuredClone(old.routes);
  const move = columnMap(old.nodes, nodes, compact ? ctx.s.clearance : undefined);
  if (!move) return;
  const prior = new Map(old.routes.map(r => [r.id, r]));
  const missing = [];
  for (const e of ctx.edges) {
    const r = prior.get(e.id)!;
    const first = r.points[0],
      last = r.points.at(-1)!;
    const a = port(ctx.rects.get(e.from)!, r.fromSide, e.cfg.fromAt),
      b = port(ctx.rects.get(e.to)!, r.toSide, e.cfg.toAt);
    let ps = compress(
      // The ends sit on their new ports; a point between follows the nearer end's row.
      r.points.map((p, i) =>
        i === 0
          ? { x: move(p.x), y: a.y }
          : i === r.points.length - 1
            ? { x: move(p.x), y: b.y }
            : {
                x: move(p.x),
                y: round(
                  p.y +
                    (Math.abs(p.y - first.y) <= Math.abs(p.y - last.y)
                      ? a.y - first.y
                      : b.y - last.y),
                ),
              },
      ),
    );
    // A straight line whose rows moved apart turns once each way, midway across the gap.
    if (ps.length === 2 && Math.abs(ps[0].y - ps[1].y) >= EPS) {
      const mid = round((ps[0].x + ps[1].x) / 2);
      ps = [ps[0], { x: mid, y: ps[0].y }, { x: mid, y: ps[1].y }, ps[1]];
    }
    const moved = { ...r, fromOffset: e.cfg.fromAt!, toOffset: e.cfg.toAt!, points: ps };
    // The room checks compare each segment with the one it came from, so they hold only while
    // the segments still correspond. A line whose segments changed is judged as a whole, by
    // `accept`.
    const corresponds = ps.length === r.points.length;
    if (
      !r.blocked &&
      same(a, ps[0]) &&
      same(b, ps.at(-1)!) &&
      validPath(ps, e, r.fromSide, r.toSide, ctx.obsFor(e)) &&
      !crossesItself(ps) &&
      clear(moved) &&
      (compact ||
        !corresponds ||
        (ps.every(
          (p, i) =>
            !i ||
            nodes.every(
              (n, j) =>
                cardGap(ps[i - 1], p, n, ctx.s.standoff) + EPS >=
                cardGap(r.points[i - 1], r.points[i], old.nodes[j], ctx.s.standoff),
            ),
        ) &&
          ctx.state.routes.every(q => {
            const was = prior.get(q.id)!;
            return was.points.length !== q.points.length || keepsLane(r, ps, q, was, ctx.s.edgeGap);
          })))
    ) {
      ctx.state.routes.push(moved);
      ctx.state.fixedPlans.add(e.id);
    } else {
      if (compact) {
        ctx.state.routes.push({ ...moved, points: [a, b], blocked: true });
        continue;
      }
      missing.push(e);
      if (missing.length > ctx.edges.length / 3) return;
    }
  }
  if (compact) {
    // Lines that all moved clear and already meet the lower bound need no grid.
    if (!ctx.state.routes.some(r => r.blocked) && atBound(ctx.state.routes))
      return accept(ctx.state.routes, false);
    if (!compactResize(ctx)) return;
    return accept(ctx.state.routes, false);
  }
  // A conflict between two fixed lines survives every repair of the missing lines.
  if (missing.length) {
    const kept = ctx.metrics(ctx.state.routes);
    if (kept.crossings || kept.shared || kept.lanePairs) return;
  }
  for (const e of missing) ctx.state.routes.push(find(ctx, e, ctx.state.routes));
  if (missing.length) {
    const ids = new Map(ctx.state.routes.map(r => [r.id, r]));
    ctx.state.routes = ctx.edges.map(e => ids.get(e.id)!);
    finish(ctx);
  }
  return accept(ctx.state.routes, true);
}
