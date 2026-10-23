/**
 * Planned lanes for returns and skips in a flow.
 *
 * A fold's wrap edges already return along shared lanes in the band gaps (`wrapLanes` in
 * compile.ts). This plans the rest of a flow's long way round: an edge that runs back against the
 * reading direction, or forward past siblings standing in its way, within one band. Each takes a
 * lane outside the band, on the side nearer its two ends (a tie puts forward skips before the band
 * and returns after it, the way a draftsman draws a return line under the work), and lanes on one
 * side share an even pitch, nested so that shorter spans run inside longer ones and none cross.
 *
 * The edge leaves its source by the side facing the lane, runs along the lane, and turns into the
 * target by the side that faces back toward the source, so it never arrives travelling the way it
 * left. Only edges between two leaves of the drawing's top-level flow are planned, and only on a
 * side of the band with nothing beyond it.
 */
import { edgeLabelSize } from '../model/labels';
import type { Lane } from '../model/types';
import type { ModelEdge } from './syntax';

interface Box {
  id: string;
  type: string;
  parent: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A scope arranged along a reading axis, with its fold's bands when it folded. */
export interface FlowScope {
  scope: string;
  axis: 'right' | 'down';
  bands?: string[][];
}

/** Space between a band and its first lane, and between lanes. */
const STANDOFF = 20,
  PITCH = 20;
/** As `laneBends` draws the turn into the target: inset from a corner, one port gap off centre. */
const LANE_INSET = 12,
  LANE_PORT = 16;

export function returnLanes(
  flows: FlowScope[],
  edges: ModelEdge[],
  byId: Map<string, Box>,
  taken: Set<string>,
  labelSize: (label: string) => { w: number; h: number } = label => edgeLabelSize(label),
): Map<string, Lane> {
  const out = new Map<string, Lane>();
  // Only the drawing's own flow: inside a group, the side before the band is the title band and
  // the side after it is the group's inset.
  for (const flow of flows.filter(f => f.scope === 'root')) {
    const level = flow.axis === 'right',
      // `u` runs along the reading axis, `v` across it.
      u0 = (o: Box) => (level ? o.x : o.y),
      u1 = (o: Box) => (level ? o.x + o.w : o.y + o.h),
      v0 = (o: Box) => (level ? o.y : o.x),
      v1 = (o: Box) => (level ? o.y + o.h : o.x + o.w),
      um = (o: Box) => (u0(o) + u1(o)) / 2,
      vm = (o: Box) => (v0(o) + v1(o)) / 2;
    const kids = [...byId.values()].filter(o => o.parent === flow.scope);
    const bands = flow.bands?.map(ids => ids.map(id => byId.get(id)!)) ?? [kids];
    bands.forEach(band => {
      const lo = Math.min(...band.map(v0)),
        hi = Math.max(...band.map(v1)),
        ulo = Math.min(...band.map(u0)),
        uhi = Math.max(...band.map(u1));
      const inBand = new Set(band.map(o => o.id));
      // A side is free when nothing else in the drawing lies beyond it, across the band.
      const beyond = (before: boolean) =>
        [...byId.values()].some(
          o =>
            o.parent === flow.scope &&
            !inBand.has(o.id) &&
            u0(o) < uhi &&
            u1(o) > ulo &&
            (before ? v1(o) <= lo : v0(o) >= hi),
        );
      const free = { before: !beyond(true), after: !beyond(false) };
      const plans: Array<{ id: string; before: boolean; from: number; to: number; back: boolean }> =
        [];
      for (const e of edges) {
        if (taken.has(e.id) || e.from !== 'auto' || e.to !== 'auto') continue;
        const a = byId.get(e.source),
          b = byId.get(e.target);
        if (!a || !b || a === b || !inBand.has(a.id) || !inBand.has(b.id)) continue;
        if (a.type === 'group' || b.type === 'group') continue;
        const back = um(b) < um(a);
        const [first, last] = back ? [b, a] : [a, b];
        // Siblings standing between the two ends, across the line joining them.
        const vlo = Math.min(vm(a), vm(b)) - 8,
          vhi = Math.max(vm(a), vm(b)) + 8;
        const between = band.filter(
          o => o !== a && o !== b && u0(o) >= u1(first) - 1 && u1(o) <= u0(last) + 1,
        );
        const blocked = between.some(o => v0(o) < vhi && v1(o) > vlo);
        if (!blocked && !(back && between.length)) continue;
        // The shorter way: from each end to the band's edge on that side, past anything in
        // the way. A tie sends forward skips before the band and returns after it.
        const clear = (n: Box, before: boolean) =>
          !band.some(
            o =>
              o !== n &&
              u0(o) < u1(n) &&
              u1(o) > u0(n) &&
              (before ? v1(o) <= v0(n) : v0(o) >= v1(n)),
          );
        const cost = (before: boolean) =>
          !free[before ? 'before' : 'after'] || !clear(a, before) || !clear(b, before)
            ? Infinity
            : before
              ? v0(a) - lo + (v0(b) - lo)
              : hi - v1(a) + (hi - v1(b));
        const [cb, ca] = [cost(true), cost(false)];
        if (!Number.isFinite(cb) && !Number.isFinite(ca)) continue;
        const before = cb === ca ? !back : cb < ca;
        plans.push({ id: e.id, before, from: um(first), to: um(last), back });
      }
      for (const before of [true, false]) {
        const side = plans
          .filter(p => p.before === before)
          .sort((p, q) => p.to - p.from - (q.to - q.from) || p.from - q.from);
        const levels: Array<Array<[number, number]>> = [];
        // One lane per end and side: two lanes turning into (or out of) one side would have to
        // nest their turns there too, so the rest are left to the router.
        const ends = new Set<string>();
        for (const p of side) {
          const e0 = edges.find(x => x.id === p.id)!;
          if (ends.has(e0.source) || ends.has(e0.target)) continue;
          ends.add(e0.source).add(e0.target);
          let k = 0;
          while (levels[k]?.some(([f, t]) => p.from < t + PITCH && p.to > f - PITCH)) k++;
          (levels[k] ??= []).push([p.from, p.to]);
          const e = edges.find(x => x.id === p.id)!,
            target = byId.get(e.target)!,
            at = before ? lo - STANDOFF - k * PITCH : hi + STANDOFF + k * PITCH,
            // Turn into the target halfway across the gap on the side facing the source.
            // The turn runs one port gap off the side's middle; a gap whose label reaches that far
            // across is closed, since the turn would run through its text. That gap is the same
            // from either side of the band, so the edge then arrives square on the target's face
            // toward the lane instead.
            gap = gapBeside(target, band, !p.back, u0, u1),
            port = Math.min(LANE_PORT, (v1(target) - v0(target)) / 2 - LANE_INSET),
            face = labelledGap(target, band, !p.back, e.id, edges, u0, u1, v0, v1).some(label => {
              const { w, h } = labelSize(label);
              return (level ? h : w) / 2 + 2 > port;
            }),
            enter = face ? um(target) : p.back ? u1(target) + gap / 2 : u0(target) - gap / 2;
          out.set(p.id, {
            ...(level ? { y: Math.round(at) } : { x: Math.round(at) }),
            enter: Math.round(enter),
            out: true,
            ...(face ? { face: true } : {}),
          });
        }
      }
    });
  }
  return out;
}

/** Room along the axis between `n` and its nearest band neighbour before (or after) it. */
function gapBeside(
  n: Box,
  band: Box[],
  before: boolean,
  u0: (o: Box) => number,
  u1: (o: Box) => number,
) {
  const gaps = band
    .filter(o => o !== n && (before ? u1(o) <= u0(n) : u0(o) >= u1(n)))
    .map(o => (before ? u0(n) - u1(o) : u0(o) - u1(n)));
  return Math.min(48, ...gaps);
}

/**
 * The labels in the gap beside `n`, before (or after) it along the axis: those of other edges
 * joining `n` to a band neighbour on that side, level with it across the axis.
 */
function labelledGap(
  n: Box,
  band: Box[],
  before: boolean,
  self: string,
  edges: ModelEdge[],
  u0: (o: Box) => number,
  u1: (o: Box) => number,
  v0: (o: Box) => number,
  v1: (o: Box) => number,
) {
  const side = new Set(
    band
      .filter(
        o =>
          o !== n && (before ? u1(o) <= u0(n) : u0(o) >= u1(n)) && v0(o) < v1(n) && v1(o) > v0(n),
      )
      .map(o => o.id),
  );
  return edges
    .filter(
      e =>
        e.id !== self &&
        !!e.label &&
        ((e.source === n.id && side.has(e.target)) || (e.target === n.id && side.has(e.source))),
    )
    .map(e => e.label!);
}
