import { standoffCost } from './cost.ts';
import { conflicts, parallelConflicts } from './conflicts.ts';
import { REPAIR_EDGES, SHORT_STEP } from './tuning.ts';
import type { Route } from './types.ts';
import type { Context } from './context.ts';
import { find } from './find.ts';
import { cmp, distance } from './geometry.ts';

/**
 * Routes again each line that is blocked, crosses, shares a run, runs too close to another or
 * uses a far side, worst first, and keeps a new route when the whole drawing costs less. Returns
 * how many it kept.
 */
export function improve(ctx: Context) {
  const { rawOptions, s, edges, state, metrics, total, far, syncOpen } = ctx;
  let accepted = 0;
  const checkClearance = ctx.facingFans && s.standoff > 0 && edges.length <= REPAIR_EDGES;
  const costs = new WeakMap<Route, number>();
  const clearanceCost = (r: Route) => {
    if (!checkClearance) return 0;
    const known = costs.get(r);
    if (known !== undefined) return known;
    const value = standoffCost(r.points, ctx.near);
    costs.set(r, value);
    return value;
  };
  if (!rawOptions.quick)
    for (let pass = 1; pass < s.passes; pass++) {
      const before = accepted;
      const currentMetrics = metrics(state.routes);
      if (
        !currentMetrics.crossings &&
        !currentMetrics.shared &&
        !currentMetrics.blocked &&
        !currentMetrics.lanePairs &&
        !state.routes.some(r => far(r) || clearanceCost(r) > s.standoff)
      )
        break;
      // Each route's crossings with the others, counted once rather than in every comparison.
      const crossed = new Map(
        state.routes.map(r => [
          r.id,
          conflicts(
            r.points,
            state.routes.filter(q => q !== r),
          ).crossings,
        ]),
      );
      const order = [...edges].sort((a, b) => {
        const ra = state.routes.find(r => r.id === a.id)!,
          rb = state.routes.find(r => r.id === b.id)!;
        return (
          Number(rb.blocked) - Number(ra.blocked) ||
          crossed.get(rb.id)! - crossed.get(ra.id)! ||
          cmp(a.id, b.id)
        );
      });
      let current = total(state.routes);
      for (const e of order) {
        if (state.fixedPlans.has(e.id)) continue;
        const i = state.routes.findIndex(r => r.id === e.id),
          used = state.routes.filter((_, j) => j !== i),
          c = conflicts(state.routes[i].points, used);
        const clearanceOnly =
          !state.routes[i].blocked &&
          !c.crossings &&
          !c.shared &&
          !parallelConflicts(state.routes[i].points, used, s.edgeGap).lanePairs &&
          !far(state.routes[i]);
        const old = state.routes[i];
        if (clearanceOnly && (old.points.length < 3 || clearanceCost(old) <= s.standoff)) continue;
        // Let the tidy pass straighten a short step before trading the route for clearance.
        if (
          clearanceOnly &&
          rawOptions.tidy !== false &&
          rawOptions.jogs !== false &&
          old.points.slice(1, -2).some((p, k) => distance(p, old.points[k + 2]) < SHORT_STEP)
        )
          continue;
        const next = find(ctx, e, used, old, [], clearanceOnly);
        if (clearanceOnly && clearanceCost(old) - clearanceCost(next) < s.standoff) continue;
        const candidate = [...state.routes];
        candidate[i] = next;
        const value = total(candidate);
        // A route tried only for clearance must gain room without increasing the routing cost.
        if (clearanceOnly ? value <= current : value < current - 0.1) {
          state.routes = candidate;
          current = value;
          syncOpen();
          accepted++;
        }
      }
      if (accepted === before) break;
    }
  return accepted;
}
