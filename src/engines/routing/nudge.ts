import { conflicts, crossesItself, parallelConflicts, parallelNear } from './conflicts.ts';
import type { Point } from './types.ts';
import type { Context } from './context.ts';
import { cost, standoffCost } from './cost.ts';
import { clone, compress, distance, EPS, round, segments } from './geometry.ts';
import { simplify, validPath } from './paths.ts';

/**
 * Slide complete internal orthogonal segments into nearby free channels.
 * Endpoints, sides, node coordinates and authored waypoint routes stay fixed.
 * Returns how many routes it moved.
 */
export function nudge(ctx: Context) {
  const { rawOptions, s, near, edges, state, obsFor } = ctx;
  let nudged = 0;
  if (!rawOptions.quick)
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (let ri = 0; ri < state.routes.length; ri++) {
        const route = state.routes[ri],
          e = edges.find(e => e.id === route.id)!;
        if (route.blocked || e.cfg.waypoints?.length || state.fixedPlans.has(e.id)) continue;
        const used = state.routes.filter((_, j) => j !== ri),
          obs = obsFor(e);
        if (!parallelConflicts(route.points, used, s.edgeGap).lanePairs) continue;
        let best = route.points,
          bestValue = cost(best, used, s, near);
        const before = conflicts(best, used);
        for (let i = 1; i < route.points.length - 2; i++) {
          const a = route.points[i],
            b = route.points[i + 1],
            h = Math.abs(a.y - b.y) < EPS,
            axis = h ? 'y' : 'x';
          const choices = new Set<number>();
          for (const other of used)
            for (const [c, d] of segments(other.points)) {
              if (Math.abs(c.y - d.y) < EPS !== h) continue;
              if (parallelNear(a, b, c, d, s.edgeGap * 2)) {
                choices.add(round(c[axis] + s.edgeGap));
                choices.add(round(c[axis] - s.edgeGap));
              }
            }
          for (const value of choices) {
            const p = clone(route.points);
            p[i][axis] = value;
            p[i + 1][axis] = value;
            const clean = compress(p);
            if (
              !validPath(clean, e, route.fromSide, route.toSide, obs) ||
              conflicts(clean, used).crossings > before.crossings
            )
              continue;
            const score = cost(clean, used, s, near);
            if (score < bestValue - 0.1) {
              best = clean;
              bestValue = score;
            }
          }
        }
        if (best !== route.points) {
          state.routes[ri] = {
            ...route,
            points: simplify(ctx, best, e, route.fromSide, route.toSide, obs, used),
          };
          changed = true;
          nudged++;
        }
      }
      if (!changed) break;
    }
  return nudged;
}

/** A gap wider than this between two facing sides is open space, not a gap to centre in. */
const GAP_MAX = 80,
  /** A side counts as facing a segment when they run alongside each other this far. */
  ALONGSIDE = 20,
  /** A segment this short reads as a jog, not a run worth centring. */
  RUN_MIN = 40,
  /** Closer than this along a box's side, a line reads as hugging the box. */
  HUG = 15;

/**
 * Centre a line's inner segment in the gap between two facing sides (boxes or group borders)
 * when it is the only line there (#595). The standoff cost is flat across a narrow gap, so the
 * search leaves the run wherever its grid line fell. Returns how many routes it moved.
 */
export function centre(ctx: Context) {
  const { rawOptions, s, rects, groups, edges, state, obsFor } = ctx;
  if (rawOptions.quick || !s.standoff) return 0;
  const boxes = [
    ...[...rects.values()].filter(r => !r.frame).map(r => ({ ...r, node: true })),
    ...[...groups.values()].filter(g => !g.collapsed).map(g => ({ ...g, node: false })),
  ];
  // Upright faces (x) and level faces (y), each with the span it covers and whether a box (not
  // a group border) owns it.
  const faces = (upright: boolean) =>
    boxes.flatMap(r =>
      upright
        ? [r.x, r.x + r.w].map(at => ({ at, lo: r.y, hi: r.y + r.h, node: r.node }))
        : [r.y, r.y + r.h].map(at => ({ at, lo: r.x, hi: r.x + r.w, node: r.node })),
    );
  const sides = [faces(false), faces(true)];
  const borders = ctx.near.filter(box => box.border);
  let moved = 0;
  for (let ri = 0; ri < state.routes.length; ri++) {
    const route = state.routes[ri],
      e = edges.find(e => e.id === route.id)!;
    if (route.blocked || e.cfg.waypoints?.length || state.fixedPlans.has(e.id)) continue;
    const others = state.routes.filter((_, j) => j !== ri);
    let points = route.points;
    for (let i = 1; i < points.length - 2; i++) {
      const a = points[i],
        b = points[i + 1],
        upright = Math.abs(a.x - b.x) < EPS,
        axis = upright ? 'x' : 'y',
        along = upright ? 'y' : 'x',
        at = a[axis],
        lo = Math.min(a[along], b[along]),
        hi = Math.max(a[along], b[along]);
      if (hi - lo <= ALONGSIDE) continue;
      const facing = sides[upright ? 1 : 0].filter(
        f => Math.min(hi, f.hi) - Math.max(lo, f.lo) > ALONGSIDE,
      );
      if (facing.some(f => Math.abs(f.at - at) < 1.5)) continue;
      const below = facing.filter(f => f.at < at).reduce((m, f) => Math.max(m, f.at), -Infinity),
        above = facing.filter(f => f.at > at).reduce((m, f) => Math.min(m, f.at), Infinity);
      let mid: number;
      if (above - below <= GAP_MAX) {
        if (hi - lo < RUN_MIN) continue;
        mid = Math.round(below + above) / 2;
      } else {
        if (!ctx.facingFans) continue;
        // In open space, give the nearest face its requested clearance.
        const nearer = at - below < above - at ? below : above;
        if (Math.abs(nearer - at) >= Math.min(HUG, s.standoff)) continue;
        mid = nearer + Math.sign(at - nearer) * s.standoff;
      }
      if (Math.abs(mid - at) < 1) continue;
      // A gap too narrow to clear a box by `HUG` on both sides: the middle would bring the line
      // close along a box it now keeps clear of. Leave it where it is.
      const hugs = facing.some(
        f => f.node && Math.abs(mid - f.at) < HUG && Math.abs(at - f.at) >= HUG,
      );
      if (hugs) continue;
      // Another line in the gap shares it: the lanes, not the middle, decide where each runs.
      const wide = above - below > GAP_MAX;
      const laneLo = wide ? Math.min(at, mid) : below;
      const laneHi = wide ? Math.max(at, mid) : above;
      const shared = others.some(o =>
        segments(o.points).some(
          ([c, d]) =>
            Math.abs(c[axis] - d[axis]) < EPS &&
            c[axis] > laneLo &&
            c[axis] < laneHi &&
            Math.min(hi, Math.max(c[along], d[along])) -
              Math.max(lo, Math.min(c[along], d[along])) >
              ALONGSIDE,
        ),
      );
      if (shared) continue;
      // A slide must not reverse a neighboring leg and fold the route back across itself.
      if ([points[i - 1], points[i + 2]].some(end => (at - end[axis]) * (mid - end[axis]) <= 0))
        continue;
      const p = clone(points);
      p[i][axis] = mid;
      p[i + 1][axis] = mid;
      // The segments either side keep their length clear of a jog.
      if (distance(p[i - 1], p[i]) < 8 || distance(p[i + 1], p[i + 2]) < 8) continue;
      // Sliding the run also changes the length of each leg that meets it.
      if (
        wide &&
        [i - 1, i + 1].some(k => {
          const beside = (ps: Point[], lo: number, hi: number) =>
            Math.min(Math.max(ps[k][axis], ps[k + 1][axis]), hi) -
              Math.max(Math.min(ps[k][axis], ps[k + 1][axis]), lo) >
            ALONGSIDE;
          return sides[upright ? 0 : 1].some(
            f =>
              f.node &&
              Math.abs(p[k][along] - f.at) < HUG &&
              beside(p, f.lo, f.hi) &&
              !beside(points, f.lo, f.hi),
          );
        })
      )
        continue;
      const beforeLane = parallelConflicts(points, others, s.edgeGap);
      const afterLane = parallelConflicts(p, others, s.edgeGap);
      if (
        wide &&
        (afterLane.laneDeficit > beforeLane.laneDeficit + EPS ||
          standoffCost(p, borders) > standoffCost(points, borders) + EPS ||
          crossesItself(p))
      )
        continue;
      if (
        !validPath(p, e, route.fromSide, route.toSide, obsFor(e)) ||
        conflicts(p, others).crossings > conflicts(points, others).crossings ||
        afterLane.lanePairs > beforeLane.lanePairs
      )
        continue;
      points = p;
    }
    if (points !== route.points) {
      state.routes[ri] = { ...route, points };
      moved++;
    }
  }
  return moved;
}
