import { compress, distance, round, same, vector } from '../engines/routing/geometry';
import { validPath } from '../engines/routing/paths';
import { cost } from '../engines/routing/cost';
import { conflicts, crossesItself, flatten } from '../engines/routing/conflicts';
import { find } from '../engines/routing/find';
import { REPAIR_EDGES } from '../engines/routing/tuning';
import type { Context } from '../engines/routing/context';
import type { Point, Route } from '../engines/routing/types';
import { relaxChannels } from './compact-channels';
import { outsideCardBounds, outwardPort } from './card-envelope';
import { createGrid } from './resize-grid';

/** Move the most expensive row connections first. The grid suggests candidates;
 * exact geometry checks and the router's line cost decide which ones to keep. */
export function compactResize(ctx: Context, previousOutside: number) {
  const { s, state } = ctx,
    gap = s.edgeGap,
    clearance = s.clearance;
  const grid = createGrid(ctx);
  if (!grid) return false;
  const { X, occupancy, commonStubs, search, bounds } = grid;
  const forced = state.routes.filter(r => outwardPort(r, bounds)).length;
  const target = forced + Math.floor(Math.max(0, previousOutside - forced) * 0.85);
  const byId = new Map(ctx.edges.map(e => [e.id, e]));
  const others = (r: Route) => state.routes.filter(o => o.id !== r.id && !o.blocked);
  const priority = () =>
    state.routes
      .map((r, i) => ({
        i,
        score: r.blocked
          ? Infinity
          : cost(r.points, others(r), s, ctx.near) - distance(r.points[0], r.points.at(-1)!),
      }))
      .sort((a, b) => b.score - a.score);
  const refine = (i: number, polish: boolean) => {
    const r = state.routes[i],
      e = byId.get(r.id)!;
    const used = others(r);
    const unrelated = used.filter(
      o => o.from !== r.from && o.to !== r.from && o.from !== r.to && o.to !== r.to,
    );
    flatten(used);
    const obs = ctx.obsFor(e);
    const outside = used.filter(q => outsideCardBounds(q.points, bounds)).length;
    const price =
      (outside < target ? 1 : state.routes.length <= REPAIR_EDGES ? 24 : 50) * s.crossingPenalty;
    grid.priceBoundary(price);
    const shapeCost = (points: Point[]) =>
      cost(points, used, s, ctx.near) + (outsideCardBounds(points, bounds) ? price : 0);
    let best = r.points,
      shared = r.blocked ? Infinity : conflicts(best, unrelated).shared,
      value = r.blocked ? Infinity : shapeCost(best);
    const consider = (points: Point[]) => {
      if (!same(points[0], r.points[0]) || !same(points.at(-1)!, r.points.at(-1)!)) return;
      if (!validPath(points, e, r.fromSide, r.toSide, obs) || crossesItself(points)) return;
      const overlap = conflicts(points, unrelated).shared;
      if (overlap > shared) return;
      const v = shapeCost(points);
      if (overlap < shared || v < value) {
        best = points;
        shared = overlap;
        value = v;
      }
    };
    if (!r.blocked) occupancy(r, -1);
    const related = used.filter(
      o => o.from === r.from || o.to === r.from || o.from === r.to || o.to === r.to,
    );
    for (const q of related) commonStubs(q, -1);
    const next = search(r, state.routes.length <= REPAIR_EDGES ? 2 : 4);
    for (const q of related) commonStubs(q, 1);
    if (next) consider(next);

    // A coarse search may skirt several cards to avoid a short shared stub.
    // Price the direct trunk explicitly on each legal track next to the ports.
    const a = r.points[0],
      b = r.points.at(-1)!;
    if (a.y === b.y) consider([a, b]);
    else {
      const low = Math.min(a.x, b.x) - 4 * gap,
        high = Math.max(a.x, b.x) + 4 * gap;
      for (const x of X) {
        if (x < low || x > high || Math.min(Math.abs(x - a.x), Math.abs(x - b.x)) > 5 * gap)
          continue;
        if (
          (x - a.x) * vector[r.fromSide].x < clearance ||
          (x - b.x) * vector[r.toSide].x < clearance
        )
          continue;
        consider([a, { x, y: a.y }, { x, y: b.y }, b]);
      }
    }
    // Revisit short paths and folded runs after their neighbors have moved.
    if (polish) {
      const rerouted = find(ctx, e, used, r);
      if (!rerouted.blocked) consider(rerouted.points);
      const ps = best;
      for (let j = 0; j < ps.length - 3; j++) {
        for (let k = ps.length - 1; k >= j + 3; k--) {
          const a = ps[j],
            b = ps[k];
          for (const mid of [
            { x: a.x, y: b.y },
            { x: b.x, y: a.y },
          ]) {
            const cut = compress([...ps.slice(0, j + 1), mid, ...ps.slice(k)]);
            if (cut.length < best.length) consider(cut);
          }
        }
      }
    }
    // Release coincident unrelated runs, including off-grid lanes carried by the resize.
    if (shared) {
      const ps = best;
      for (let k = 1; k < ps.length - 2 && shared; k++) {
        if (!conflicts([ps[k], ps[k + 1]], unrelated).shared) continue;
        const axis = ps[k].x === ps[k + 1].x ? 'x' : 'y';
        for (const shift of [-gap, gap, -gap / 2, gap / 2]) {
          const moved = ps.slice();
          for (const j of [k, k + 1]) moved[j] = { ...ps[j], [axis]: round(ps[j][axis] + shift) };
          consider(compress(moved));
        }
      }
    }
    // A shared first or last run cannot slide off its row. Keep a terminal
    // stub and try a parallel lane for the rest of the run.
    if (shared && Number.isFinite(shared)) {
      for (const reverse of [false, true]) {
        const ps = reverse ? best.toReversed() : best;
        const [a, b] = ps;
        if (ps.length < 3 || !conflicts([a, b], unrelated).shared) continue;
        const stub = a.x + Math.sign(b.x - a.x) * clearance;
        if (Math.abs(b.x - a.x) <= clearance) continue;
        for (const shift of [-gap, gap, -gap / 2, gap / 2]) {
          const y = round(a.y + shift);
          const proposal = compress([
            a,
            { x: stub, y: a.y },
            { x: stub, y },
            { x: b.x, y },
            ...ps.slice(2),
          ]);
          consider(reverse ? proposal.reverse() : proposal);
        }
      }
    }
    if (!Number.isFinite(value)) return false;
    state.routes[i] = { ...r, points: best, blocked: false };
    occupancy(state.routes[i], 1);
    return true;
  };
  for (const { i } of priority()) if (!refine(i, false)) return;
  if (state.routes.length <= REPAIR_EDGES)
    for (const { i } of priority().slice(0, 24)) if (!refine(i, true)) return;
  relaxChannels(ctx, byId);
  relaxChannels(ctx, byId);
  return true;
}
