import { EPS, round, same } from './geometry.ts';
import { defaults } from './settings.ts';
import type { Point, RoutingSettings } from './types.ts';

/** A routed line, as the pair checks read it: only its points. */
export type Line = { points: Point[] };

// A path's segments as flat arrays, kept per points array (paths are never changed in place):
// whether each runs level (`h`), its range along its own axis (`lo`, `hi`), and the coordinate
// across it (`at`), all as `intersection` and `parallelNear` read them; and the path's box.
export interface Span {
  /** Segment count. */
  n: number;
  h: Uint8Array;
  lo: Float64Array;
  hi: Float64Array;
  at: Float64Array;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const spans = new WeakMap<Point[], Span>();
export function spanOf(ps: Point[]): Span {
  let v = spans.get(ps);
  if (!v) {
    const n = Math.max(0, ps.length - 1),
      h = new Uint8Array(n),
      lo = new Float64Array(n),
      hi = new Float64Array(n),
      at = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = ps[i],
        b = ps[i + 1],
        level = Math.abs(a.y - b.y) < EPS;
      h[i] = level ? 1 : 0;
      lo[i] = level ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
      hi[i] = level ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
      at[i] = level ? a.y : a.x;
    }
    const xs = ps.map(p => p.x),
      ys = ps.map(p => p.y);
    v = {
      n,
      h,
      lo,
      hi,
      at,
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...xs),
      y1: Math.max(...ys),
    };
    spans.set(ps, v);
  }
  return v;
}
// Whether two paths' boxes, grown by `pad`, meet. Paths whose boxes do not can neither cross,
// share a run, nor run within `pad` of each other, so the pair checks below skip them.
const within = (a: Span, b: Span, pad: number) =>
  a.x0 - pad <= b.x1 + EPS &&
  b.x0 - pad <= a.x1 + EPS &&
  a.y0 - pad <= b.y1 + EPS &&
  b.y0 - pad <= a.y1 + EPS;
// The spans and boxes of a `used` list, flat, while `findIn` checks many candidates against it:
// a route far from a candidate is passed over on four comparisons, with no lookup.
const flat = new WeakMap<Line[], { spansOf: Span[]; box: Float64Array }>();
/** Flattens `used` for the checks below. False when it already was: the caller that got true calls `unflatten`. */
export function flatten(used: Line[]) {
  if (flat.has(used)) return false;
  const spansOf = used.map(r => spanOf(r.points)),
    box = new Float64Array(used.length * 4);
  spansOf.forEach((v, i) => box.set([v.x0, v.y0, v.x1, v.y1], i * 4));
  flat.set(used, { spansOf, box });
  return true;
}
// Whether `own`, grown by `pad`, may meet route `i` of a flattened list (`within`'s test).
export const unflatten = (used: Line[]) => flat.delete(used);
const near = (box: Float64Array, i: number, own: Span, pad: number) =>
  own.x0 - pad <= box[i * 4 + 2] + EPS &&
  box[i * 4] - pad <= own.x1 + EPS &&
  own.y0 - pad <= box[i * 4 + 3] + EPS &&
  box[i * 4 + 1] - pad <= own.y1 + EPS;
// Lane spacing is separate from port spacing and node clearance. Measure the
// length of overlapping parallel runs, not merely exact shared coordinates.
export function parallelNear(a: Point, b: Point, c: Point, d: Point, gap: number) {
  const h = Math.abs(a.y - b.y) < EPS,
    k = Math.abs(c.y - d.y) < EPS;
  if (h !== k) return null;
  const axis = h ? 'x' : 'y',
    line = h ? 'y' : 'x';
  const overlap =
    Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
    Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
  const separation = Math.abs(a[line] - c[line]);
  return overlap > 1 && separation < gap - 0.05
    ? { overlap, separation, deficit: (overlap * (gap - separation)) / gap }
    : null;
}
// The pair checks below work on `spanOf` arrays: `parallelNear` and the crossing test on numbers,
// in the same order, without building a point or result for every pair.
export function parallelConflicts(points: Point[], used: Line[], gap: number, terms?: number[]) {
  let deficit = 0,
    pairs = 0,
    minGap = Infinity;
  const own = spanOf(points),
    limit = gap - 0.05,
    f = flat.get(used);
  for (let q = 0; q < used.length; q++) {
    if (f && !near(f.box, q, own, gap)) continue;
    const other = f ? f.spansOf[q] : spanOf(used[q].points);
    if (!within(own, other, gap)) continue;
    const o = sortedOf(other);
    for (let i = 0; i < own.n; i++) {
      // Only the other line's segments this way within `limit` across can count: found by
      // `sortedOf` a unit wide of it, then added in the other line's order.
      const at = own.at[i],
        ids = own.h[i] ? o.lv : o.up,
        ats = own.h[i] ? o.lvAt : o.upAt;
      let one = -1,
        many: number[] | null = null;
      for (let k = from(ats, at - limit - 1); k < ats.length && ats[k] <= at + limit + 1; k++) {
        const j = ids[k];
        if (!(Math.min(own.hi[i], other.hi[j]) - Math.max(own.lo[i], other.lo[j]) > 1)) continue;
        if (!(Math.abs(at - other.at[j]) < limit)) continue;
        if (one < 0) one = j;
        else (many ??= [one]).push(j);
      }
      if (one < 0) continue;
      if (many) many.sort((a, b) => a - b);
      for (const j of many ?? [one]) {
        const overlap = Math.min(own.hi[i], other.hi[j]) - Math.max(own.lo[i], other.lo[j]),
          separation = Math.abs(at - other.at[j]);
        // Duplicate terminals need a short common fan-out; do not count the single
        // endpoint itself, but a shared run with positive length still counts.
        pairs++;
        const term = (overlap * (gap - separation)) / gap;
        deficit += term;
        if (terms) terms.push(term);
        minGap = Math.min(minGap, separation);
      }
    }
  }
  return {
    lanePairs: pairs,
    laneDeficit: round(deficit),
    minGap: Number.isFinite(minGap) ? round(minGap) : null,
  };
}
// Lane deficit against `used` from runs at least `min` apart.
export function siblingDeficit(points: Point[], used: Line[], min: number, gap: number) {
  let deficit = 0;
  const own = spanOf(points),
    limit = gap - 0.05,
    f = flat.get(used);
  for (let q = 0; q < used.length; q++) {
    if (f && !near(f.box, q, own, gap)) continue;
    const other = f ? f.spansOf[q] : spanOf(used[q].points);
    if (!within(own, other, gap)) continue;
    for (let i = 0; i < own.n; i++)
      for (let j = 0; j < other.n; j++) {
        if (own.h[i] !== other.h[j]) continue;
        const overlap = Math.min(own.hi[i], other.hi[j]) - Math.max(own.lo[i], other.lo[j]);
        if (!(overlap > 1)) continue;
        const separation = Math.abs(own.at[i] - other.at[j]);
        if (separation < limit && separation >= min)
          deficit += (overlap * (gap - separation)) / gap;
      }
  }
  return deficit;
}
// A span's level and upright segments, each sorted by the coordinate across them (`at`), so
// `conflicts` reads only those near a segment: `lv`/`up` hold segment indices, `lvAt`/`upAt`
// their `at`.
interface Sorted {
  lv: Int32Array;
  lvAt: Float64Array;
  up: Int32Array;
  upAt: Float64Array;
}
const sorted = new WeakMap<Span, Sorted>();
function sortedOf(v: Span): Sorted {
  let o = sorted.get(v);
  if (!o) {
    const lv: number[] = [],
      up: number[] = [];
    for (let i = 0; i < v.n; i++) (v.h[i] ? lv : up).push(i);
    const by = (a: number, b: number) => v.at[a] - v.at[b] || a - b;
    lv.sort(by);
    up.sort(by);
    o = {
      lv: Int32Array.from(lv),
      lvAt: Float64Array.from(lv, i => v.at[i]),
      up: Int32Array.from(up),
      upAt: Float64Array.from(up, i => v.at[i]),
    };
    sorted.set(v, o);
  }
  return o;
}
// The first index in sorted `a` whose value is at least `v`.
function from(a: Float64Array, v: number) {
  let lo = 0,
    hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < v) lo = m + 1;
    else hi = m;
  }
  return lo;
}
// Crossing points already counted by `conflicts`, as route index, x, y: a crossing at a corner
// meets two segments of a line but counts once. Reused between calls.
let seen = new Float64Array(96);
const NONE: number[] = [];
// A finite bound needs only enough conflicts to rule out a candidate. Reports use Infinity.
// Each segment meets only the other line's segments near it, found by `sortedOf`: shared runs in
// the other line's order, so their sum is the same; crossings by position, which changes only
// where a finite bound stops, never whether it does.
export function conflicts(
  points: Point[],
  used: Line[],
  bound = Infinity,
  s: RoutingSettings = defaults,
  terms?: number[],
) {
  let shared = 0,
    hits = 0;
  const own = spanOf(points),
    f = flat.get(used),
    p0 = points[0],
    p1 = points.at(-1)!;
  for (let q = 0; q < used.length; q++) {
    if (f && !near(f.box, q, own, 0)) continue;
    const r = used[q],
      other = f ? f.spansOf[q] : spanOf(r.points);
    if (!within(own, other, 0)) continue;
    const first = hits, // A crossing can repeat only within this route.
      o = sortedOf(other);
    for (let i = 0; i < own.n; i++) {
      // A segment that misses the other line's box can neither cross nor share a run with it.
      const level = own.h[i] === 1,
        at = own.at[i],
        lo = own.lo[i],
        hi = own.hi[i],
        x0 = level ? lo : at,
        x1 = level ? hi : at,
        y0 = level ? at : lo,
        y1 = level ? at : hi;
      if (
        x1 < other.x0 - 2 * EPS ||
        x0 > other.x1 + 2 * EPS ||
        y1 < other.y0 - 2 * EPS ||
        y0 > other.y1 + 2 * EPS
      )
        continue;
      // Shared runs: the other line's segments this way within `EPS` across, in its order.
      const same0 = level ? o.lv : o.up,
        sameAt = level ? o.lvAt : o.upAt;
      // Mostly none or one: more are put back in the other line's order.
      let one = -1,
        many: number[] | null = null;
      for (let k = from(sameAt, at - 2 * EPS); k < sameAt.length && sameAt[k] <= at + 2 * EPS; k++)
        if (!(Math.abs(at - other.at[same0[k]]) > EPS)) {
          if (one < 0) one = same0[k];
          else (many ??= [one]).push(same0[k]);
        }
      if (many) many.sort((a, b) => a - b);
      for (const j of many ?? (one < 0 ? NONE : [one])) {
        const amount = Math.min(hi, other.hi[j]) - Math.max(lo, other.lo[j]);
        if (amount > EPS) {
          shared += amount;
          if (terms) terms.push(amount);
        }
        if (bound < Infinity && hits * s.crossingPenalty + shared * s.sharedPenalty >= bound)
          return { crossings: hits, shared };
      }
      // Crossings: the other line's segments the other way whose `at` lies along this one.
      const across = level ? o.up : o.lv,
        acrossAt = level ? o.upAt : o.lvAt;
      for (
        let k = from(acrossAt, lo - 2 * EPS);
        k < acrossAt.length && acrossAt[k] <= hi + 2 * EPS;
        k++
      ) {
        const j = across[k];
        // One level, one upright: they meet where the upright's x crosses the level's y.
        const l = level ? own : other,
          li = level ? i : j,
          u = level ? other : own,
          ui = level ? j : i,
          x = u.at[ui],
          y = l.at[li];
        if (x < l.lo[li] - EPS || x > l.hi[li] + EPS || y < u.lo[ui] - EPS || y > u.hi[ui] + EPS)
          continue;
        const p = { x, y };
        // A shared shape terminal is connectivity, not an edge crossing.
        if ((same(p, p0) || same(p, p1)) && (same(p, r.points[0]) || same(p, r.points.at(-1)!)))
          continue;
        const rx = round(x),
          ry = round(y);
        let m = first;
        while (m < hits && !(seen[m * 3] === q && seen[m * 3 + 1] === rx && seen[m * 3 + 2] === ry))
          m++;
        if (m < hits) continue;
        if (hits * 3 + 3 > seen.length) {
          const grown = new Float64Array(seen.length * 2);
          grown.set(seen);
          seen = grown;
        }
        seen.set([q, rx, ry], hits++ * 3);
        if (bound < Infinity && hits * s.crossingPenalty + shared * s.sharedPenalty >= bound)
          return { crossings: hits, shared };
      }
    }
  }
  return { crossings: hits, shared };
}

/**
 * One line's terms against one other line, in the order `conflicts` and `parallelConflicts` add
 * them: crossings, each shared run, lane pairs, each lane deficit, and the closest lane gap.
 */
export interface PairTerms {
  crossings: number;
  shared: number[];
  lanePairs: number;
  deficits: number[];
  minGap: number | null;
  gap: number;
}
const NO_TERMS: PairTerms = {
  crossings: 0,
  shared: [],
  lanePairs: 0,
  deficits: [],
  minGap: null,
  gap: NaN,
};
// Kept per pair of points arrays, which are never changed in place.
const pairs = new WeakMap<Point[], WeakMap<Point[], PairTerms>>();
/**
 * `conflicts` and `parallelConflicts` of `a` against the one line `b`, kept for the pair. A caller
 * that adds a pair's terms in order, pair after pair, gets the very sums the two give for a list.
 */
export function pairTerms(a: Point[], b: Point[], gap: number) {
  // Lines whose boxes, grown by the gap, do not meet have no terms: nothing is kept for them.
  if (!within(spanOf(a), spanOf(b), gap)) return NO_TERMS;
  let byB = pairs.get(a);
  if (!byB) pairs.set(a, (byB = new WeakMap()));
  let t = byB.get(b);
  if (!t || t.gap !== gap) {
    const other = [{ points: b }],
      shared: number[] = [],
      deficits: number[] = [],
      c = conflicts(a, other, Infinity, defaults, shared),
      p = parallelConflicts(a, other, gap, deficits);
    t =
      c.crossings || shared.length || deficits.length
        ? {
            crossings: c.crossings,
            shared,
            lanePairs: p.lanePairs,
            deficits,
            minGap: p.minGap,
            gap,
          }
        : { ...NO_TERMS, gap };
    byB.set(b, t);
  }
  return t;
}
/** `conflicts` and `parallelConflicts` of `points` against `used`, from the pairs' kept terms. */
export function pairSums(points: Point[], used: Line[], gap: number) {
  let crossings = 0,
    shared = 0,
    lanePairs = 0,
    deficit = 0,
    minGap = Infinity;
  for (const q of used) {
    const t = pairTerms(points, q.points, gap);
    crossings += t.crossings;
    for (const v of t.shared) shared += v;
    lanePairs += t.lanePairs;
    for (const v of t.deficits) deficit += v;
    if (t.minGap !== null) minGap = Math.min(minGap, t.minGap);
  }
  return {
    crossings,
    shared,
    lanePairs,
    laneDeficit: round(deficit),
    minGap: Number.isFinite(minGap) ? minGap : null,
  };
}

// Check each segment against the part of its own path before the preceding bend.
export function crossesItself(points: Point[]) {
  for (let i = 2; i < points.length - 1; i++) {
    const earlier = { points: points.slice(0, i) };
    const hit = conflicts([points[i], points[i + 1]], [earlier]);
    if (hit.crossings || hit.shared) return true;
  }
  return false;
}
