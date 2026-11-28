// A single obstacle grid serves all row connections for this resize.
import { below, atMost, compress, round, vector } from '../engines/routing/geometry';
import { standoffRun } from '../engines/routing/cost';
import type { Context } from '../engines/routing/context';
import type { Point, Route } from '../engines/routing/types';

export function createGrid(ctx: Context) {
  const { s, state } = ctx,
    gap = s.edgeGap,
    clearance = s.clearance;

  const axis = (horizontal: boolean) => {
    const pos = horizontal ? 'x' : 'y',
      size = horizontal ? 'w' : 'h';
    const coordinates = new Set<number>();
    const add = (v: number) => coordinates.add(round(v));
    const spare = (v: number) => {
      if (![...coordinates].some(c => Math.abs(c - v) < gap * 0.4)) add(v);
    };
    for (const r of state.routes)
      for (const p of [r.points[0], r.points.at(-1)!]) if (!horizontal) add(p[pos]);
    const faces = [...ctx.rects.values()].flatMap(r => [
      [r[pos], -1],
      [r[pos] + r[size], 1],
    ]);
    for (const [face, sign] of faces) add(face + sign * clearance);
    for (const [face, sign] of faces) spare(face + sign * s.standoff);
    for (let k = 1; k <= 7; k++) for (const [face, sign] of faces) spare(face + sign * k * gap);
    return [...coordinates].sort((a, b) => a - b);
  };
  const X = axis(true),
    Y = axis(false),
    nx = X.length,
    ny = Y.length,
    count = nx * ny;
  if (count > 120000) return;
  const H = new Float64Array(count),
    V = new Float64Array(count);
  const boxes = ctx.obsFor(ctx.edges[0]);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const id = j * nx + i,
        x = X[i],
        y = Y[j],
        xx = X[i + 1],
        yy = Y[j + 1];
      H[id] =
        xx === undefined || boxes.some(r => y > r.y && y < r.y + r.h && xx > r.x && x < r.x + r.w)
          ? Infinity
          : xx - x + standoffRun(true, y, x, xx, ctx.near);
      V[id] =
        yy === undefined || boxes.some(r => x > r.x && x < r.x + r.w && yy > r.y && y < r.y + r.h)
          ? Infinity
          : yy - y + standoffRun(false, x, y, yy, ctx.near);
    }
  // Charge shared runs, parallel runs and crossings on each grid arc they reach.
  const occupied = new WeakMap<Point[], { indices: number[]; charges: number[] }>();
  const occupancy = (r: Route, f: number) => {
    const saved = f > 0 ? { indices: [] as number[], charges: [] as number[] } : undefined;
    if (saved) occupied.set(r.points, saved);
    for (let k = 1; k < r.points.length; k++) {
      const a = r.points[k - 1],
        b = r.points[k],
        h = a.y === b.y,
        A = h ? X : Y,
        B = h ? Y : X;
      const lo = h ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
        hi = h ? Math.max(a.x, b.x) : Math.max(a.y, b.y),
        at = h ? a.y : a.x;
      const step = h ? 1 : nx,
        row = h ? nx : 1,
        parallel = h ? H : V,
        cross = h ? V : H;
      const l = Math.max(0, atMost(A, lo) - 1),
        u = Math.min(A.length - 1, below(A, hi));
      for (let j = below(B, at - gap); j < B.length && B[j] < at + gap; j++) {
        const sep = Math.abs(B[j] - at),
          w = f * ((1 - sep / gap) * s.parallelPenalty + (sep < 0.001 ? s.sharedPenalty * 8 : 0));
        for (let i = l; i < u; i++) {
          const id = i * step + j * row,
            overlap = Math.min(hi, A[i + 1]) - Math.max(lo, A[i]);
          parallel[id] += w * overlap;
          if (sep === 0 && saved) {
            saved.indices.push(h ? id : count + id);
            saved.charges.push(7 * s.sharedPenalty * overlap);
          }
        }
      }
      // Crossing this track costs once. Split a crossing on a grid vertex between its two arcs.
      const j = below(B, at),
        on = B[j] === at;
      for (let i = below(A, lo); i < A.length && A[i] <= hi; i++) {
        const pen = f * s.crossingPenalty * (on ? 0.5 : 1);
        if (j > 0) cross[i * step + (j - 1) * row] += pen;
        if (on && j + 1 < B.length) cross[i * step + j * row] += pen;
      }
    }
  };
  // Lines that meet a common card may share terminal runs. Reduce only their
  // extra shared-run charge during the current search. Keep their lane costs.
  const commonStubs = (r: Route, f: number) => {
    const saved = occupied.get(r.points)!;
    for (let k = 0; k < saved.indices.length; k++) {
      const i = saved.indices[k],
        v = f * saved.charges[k];
      if (i < count) H[i] += v;
      else V[i - count] += v;
    }
  };
  for (const r of state.routes) if (!r.blocked) occupancy(r, 1);
  const scores = new Float64Array(count * 2),
    parent = new Int32Array(count * 2);
  const buckets: number[][] = [],
    closed = new Uint8Array(count * 2);
  let first = 0,
    last = 0;
  const push = (k: number, f: number) => {
    const bucket = Math.max(0, Math.min(65535, Math.floor(f / 48)));
    (buckets[bucket] ??= []).push(k);
    first = Math.min(first, bucket);
    last = Math.max(last, bucket);
  };
  const xIndex = new Map(X.map((x, i) => [x, i]));
  const yIndex = new Map(Y.map((y, i) => [y, i]));
  const index = (p: Point) => {
    const i = xIndex.get(round(p.x)) ?? -1,
      j = yIndex.get(round(p.y)) ?? -1;
    return i < 0 || j < 0 ? -1 : j * nx + i;
  };
  const search = (r: Route, attraction: number) => {
    const a = r.points[0],
      b = r.points.at(-1)!,
      src = index({ x: a.x + vector[r.fromSide].x * clearance, y: a.y }),
      end = index({ x: b.x + vector[r.toSide].x * clearance, y: b.y });
    if (src < 0 || end < 0 || src === end) return;
    const tx = X[end % nx],
      ty = Y[Math.floor(end / nx)];
    scores.fill(Infinity);
    parent.fill(-1);
    closed.fill(0);
    for (let i = 0; i <= last; i++) if (buckets[i]) buckets[i].length = 0;
    first = last = 0;
    scores[2 * src] = 0;
    push(2 * src, 0);
    while (first <= last) {
      if (!buckets[first]?.length) {
        first++;
        continue;
      }
      const key = buckets[first].pop()!,
        g = scores[key];
      if (closed[key]) continue;
      closed[key] = 1;
      const cell = key >> 1,
        i = cell % nx,
        j = Math.floor(cell / nx);
      if (cell === end) {
        const points: Point[] = [b];
        for (let k = key; k !== -1; k = parent[k]) {
          const c = k >> 1;
          points.push({ x: X[c % nx], y: Y[Math.floor(c / nx)] });
        }
        points.push(a);
        return compress(points.reverse());
      }
      const visit = (n: number, axis: number, cost: number, ix: number, jy: number) => {
        const nk = n * 2 + axis,
          v =
            g +
            cost +
            ((key & 1) === axis ? 0 : s.bendPenalty) +
            (n === end && axis ? s.bendPenalty : 0);
        if (closed[nk] || v >= scores[nk] - 0.001) return;
        scores[nk] = v;
        parent[nk] = key;
        push(nk, v + attraction * (Math.abs(X[ix] - tx) + Math.abs(Y[jy] - ty)));
      };
      if (i + 1 < nx) visit(cell + 1, 0, H[cell], i + 1, j);
      if (i) visit(cell - 1, 0, H[cell - 1], i - 1, j);
      if (j + 1 < ny) visit(cell + nx, 1, V[cell], i, j + 1);
      if (j) visit(cell - nx, 1, V[cell - nx], i, j - 1);
    }
  };
  return { X, occupancy, commonStubs, search };
}
