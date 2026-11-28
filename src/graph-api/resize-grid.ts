// Experimental shared grid. A full route supplies the starting occupancy of the new layout.
import { below, atMost, compress, distance, round, vector } from '../engines/routing/geometry';
import { validPath } from '../engines/routing/paths';
import { cost, standoffRun } from '../engines/routing/cost';
import { conflicts, crossesItself } from '../engines/routing/conflicts';
import type { Context } from '../engines/routing/context';
import type { Point, Route } from '../engines/routing/types';

export function replayGrid(ctx: Context) {
  const { s, state } = ctx,
    gap = s.edgeGap,
    clearance = s.clearance;
  const byId = new Map(ctx.edges.map(e => [e.id, e]));
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
  const occupancy = (r: Route, f: number) => {
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
        for (let i = l; i < u; i++)
          parallel[i * step + j * row] += w * (Math.min(hi, A[i + 1]) - Math.max(lo, A[i]));
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
  for (const r of state.routes) occupancy(r, 1);
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
  const index = (p: Point) => {
    const i = X.indexOf(round(p.x)),
      j = Y.indexOf(round(p.y));
    return i < 0 || j < 0 ? -1 : j * nx + i;
  };
  const search = (r: Route) => {
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
        push(nk, v + 2 * (Math.abs(X[ix] - tx) + Math.abs(Y[jy] - ty)));
      };
      if (i + 1 < nx) visit(cell + 1, 0, H[cell], i + 1, j);
      if (i) visit(cell - 1, 0, H[cell - 1], i - 1, j);
      if (j + 1 < ny) visit(cell + nx, 1, V[cell], i, j + 1);
      if (j) visit(cell - nx, 1, V[cell - nx], i, j - 1);
    }
  };
  const others = (r: Route) => state.routes.filter(o => o.id !== r.id);
  const order = state.routes
    .map((r, i) => ({
      i,
      score: cost(r.points, others(r), s, ctx.near) - distance(r.points[0], r.points.at(-1)!),
    }))
    .sort((a, b) => b.score - a.score);
  for (const { i } of order) {
    const r = state.routes[i],
      e = byId.get(r.id)!;
    occupancy(r, -1);
    const next = search(r);
    if (next && validPath(next, e, r.fromSide, r.toSide, ctx.obsFor(e)) && !crossesItself(next)) {
      const used = others(r),
        unrelated = used.filter(
          o => o.from !== r.from && o.to !== r.from && o.from !== r.to && o.to !== r.to,
        );
      const was = conflicts(r.points, unrelated).shared,
        now = conflicts(next, unrelated).shared;
      if (
        now < was ||
        (now === was && cost(next, used, s, ctx.near) < cost(r.points, used, s, ctx.near))
      )
        state.routes[i] = { ...r, points: next };
    }
    occupancy(state.routes[i], 1);
  }
}
