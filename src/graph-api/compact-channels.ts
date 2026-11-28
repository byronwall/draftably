import { compress, distance, lengthOf, round, blockedRun } from '../engines/routing/geometry';
import { conflicts, crossesItself, flatten, spanOf } from '../engines/routing/conflicts';
import { cost } from '../engines/routing/cost';
import { validPath } from '../engines/routing/paths';
import type { Context } from '../engines/routing/context';
import type { Point, Route, RouteEdge } from '../engines/routing/types';

const SHORTLIST_SIZE = 3;

interface Run {
  at: number;
  lo: number;
  hi: number;
  unrelated: boolean;
}

/** Rank edits by the runs they change. Cache neighbors only on coordinates an edit visits. */
function runEstimate(ctx: Context, r: Route, e: RouteEdge, used: Route[], unrelated: Set<Route>) {
  const { s } = ctx,
    gap = s.edgeGap;
  const runs: Run[][] = [[], []];
  for (const q of used) {
    const v = spanOf(q.points);
    for (let j = 0; j < v.n; j++)
      runs[v.h[j]].push({ at: v.at[j], lo: v.lo[j], hi: v.hi[j], unrelated: unrelated.has(q) });
  }
  const tracks = [
    new Map<number, { parallel: Run[]; across: Run[] }>(),
    new Map<number, { parallel: Run[]; across: Run[] }>(),
  ];
  const obs = ctx.obsFor(e),
    from = obs.filter(o => o.id !== r.from),
    to = obs.filter(o => o.id !== r.to);
  return (a: Point, b: Point, segment: number) => {
    const horizontal = a.y === b.y,
      axis = Number(horizontal);
    const lo = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
      hi = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y),
      at = horizontal ? a.y : a.x;
    if (lo === hi) return 0;
    if (
      blockedRun(
        horizontal,
        at,
        lo,
        hi,
        segment === 0 ? from : segment === r.points.length - 2 ? to : obs,
      )
    )
      return Infinity;
    let track = tracks[axis].get(at);
    if (!track) {
      track = {
        parallel: runs[axis].filter(o => Math.abs(at - o.at) < gap),
        across: runs[1 - axis].filter(o => at >= o.lo && at <= o.hi),
      };
      tracks[axis].set(at, track);
    }
    let value = hi - lo;
    for (const o of track.parallel) {
      const sep = Math.abs(at - o.at),
        overlap = Math.min(hi, o.hi) - Math.max(lo, o.lo);
      if (overlap <= 0) continue;
      if (overlap > 1) value += s.parallelPenalty * overlap * (1 - sep / gap);
      // A coincident unrelated run takes priority in the exact acceptance check below.
      if (sep < 0.0001) value += overlap * (s.sharedPenalty + (o.unrelated ? 1024 : 0));
    }
    for (const o of track.across) if (o.at >= lo && o.at <= hi) value += s.crossingPenalty;
    return value;
  };
}

function improve(ctx: Context, r: Route, e: RouteEdge, used: Route[]) {
  const { s } = ctx,
    ps = r.points,
    n = ps.length,
    gap = s.edgeGap;
  const unrelated = used.filter(
    q => q.from !== r.from && q.from !== r.to && q.to !== r.from && q.to !== r.to,
  );
  const estimate = runEstimate(ctx, r, e, used, new Set(unrelated));
  const prefix = [0];
  for (let j = 1; j < n; j++) prefix.push(prefix[j - 1] + estimate(ps[j - 1], ps[j], j - 1));
  const shortlist: { points: Point[]; delta: number }[] = [];
  const obs = ctx.obsFor(e);
  const propose = (j: number, k: number, mid: Point[]) => {
    const legs = [ps[j], ...mid, ps[k]];
    let delta = (mid.length - (k - j - 1)) * s.bendPenalty - (prefix[k] - prefix[j]);
    for (let m = 1; m < legs.length; m++)
      delta += estimate(legs[m - 1], legs[m], m === legs.length - 1 ? k - 1 : j);
    if (
      !(delta < -0.1) ||
      (shortlist.length >= SHORTLIST_SIZE && delta >= shortlist[shortlist.length - 1].delta)
    )
      return;
    const points = compress([...ps.slice(0, j + 1), ...mid, ...ps.slice(k)]);
    if (!validPath(points, e, r.fromSide, r.toSide, obs) || crossesItself(points)) return;
    shortlist.push({ points, delta });
    shortlist.sort((a, b) => a.delta - b.delta);
    if (shortlist.length > SHORTLIST_SIZE) shortlist.pop();
  };
  // Slide an interior track off the grid or cut a folded subpath down to one elbow.
  for (let j = 1; j < n - 2; j++) {
    const a = ps[j],
      b = ps[j + 1],
      axis = a.y === b.y ? 'y' : 'x';
    for (const shift of [-gap, gap, -gap / 2, gap / 2, -gap / 4, gap / 4]) {
      const at = round(a[axis] + shift);
      propose(j - 1, j + 2, [
        { ...a, [axis]: at },
        { ...b, [axis]: at },
      ]);
    }
  }
  for (let j = 0; j < n - 3; j++)
    for (let k = j + 3; k < n; k++) {
      const a = ps[j],
        b = ps[k];
      if (a.x === b.x || a.y === b.y) propose(j, k, []);
      else {
        propose(j, k, [{ x: a.x, y: b.y }]);
        propose(j, k, [{ x: b.x, y: a.y }]);
      }
    }
  if (!shortlist.length) return r;
  flatten(used);
  let best = r,
    shared = conflicts(ps, unrelated).shared,
    value = cost(ps, used, s, ctx.near);
  for (const { points } of shortlist) {
    const overlap = conflicts(points, unrelated).shared;
    if (overlap > shared) continue;
    const next = cost(points, used, s, ctx.near);
    if (overlap < shared || next < value) {
      best = { ...r, points };
      value = next;
      shared = overlap;
    }
  }
  return best;
}

/** Other lines have settled. Give the longest detours first choice of the free channels. */
export function relaxChannels(ctx: Context, edges: Map<string, RouteEdge>) {
  const routes = ctx.state.routes;
  const order = routes
    .map((r, i) => ({ i, excess: lengthOf(r.points) - distance(r.points[0], r.points.at(-1)!) }))
    .sort((a, b) => b.excess - a.excess);
  for (const { i } of order) {
    const r = routes[i];
    if (r.points.length >= 4)
      routes[i] = improve(
        ctx,
        r,
        edges.get(r.id)!,
        routes.filter(q => q !== r),
      );
  }
}
