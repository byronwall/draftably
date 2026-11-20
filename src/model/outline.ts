import type { Point, Rect } from './types';

const snap = (v: number) => Math.round(v * 100) / 100;
const fmt = (v: number) => String(snap(v));

/**
 * One SVG path for the union of axis-aligned rects: each connected region is one closed outline,
 * rounded by `radius` only where that outline turns. Rects that touch or overlap merge, so their
 * joins have no seam and no rounded bites; rects apart stay separate islands. Outer outlines run
 * clockwise and holes counter-clockwise, so the default nonzero fill leaves holes empty.
 */
export function rectsOutline(rects: Rect[], radius: number): string {
  const xs = [...new Set(rects.flatMap(r => [snap(r.x), snap(r.x + r.w)]))].sort((a, b) => a - b),
    ys = [...new Set(rects.flatMap(r => [snap(r.y), snap(r.y + r.h)]))].sort((a, b) => a - b);
  const covered = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = (xs[i] + xs[i + 1]) / 2,
      cy = (ys[j] + ys[j + 1]) / 2;
    return rects.some(
      r => cx > snap(r.x) && cx < snap(r.x + r.w) && cy > snap(r.y) && cy < snap(r.y + r.h),
    );
  };

  // Every cell side between covered and empty, directed so the region is on its right.
  const edges: [Point, Point][] = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++) {
      if (!covered(i, j)) continue;
      const [l, r, t, b] = [xs[i], xs[i + 1], ys[j], ys[j + 1]];
      if (!covered(i, j - 1))
        edges.push([
          { x: l, y: t },
          { x: r, y: t },
        ]);
      if (!covered(i + 1, j))
        edges.push([
          { x: r, y: t },
          { x: r, y: b },
        ]);
      if (!covered(i, j + 1))
        edges.push([
          { x: r, y: b },
          { x: l, y: b },
        ]);
      if (!covered(i - 1, j))
        edges.push([
          { x: l, y: b },
          { x: l, y: t },
        ]);
    }

  const key = (p: Point) => `${p.x},${p.y}`,
    from = new Map<string, number[]>();
  edges.forEach(([a], k) => from.set(key(a), [...(from.get(key(a)) ?? []), k]));
  const dir = ([a, b]: [Point, Point]) => ({ x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) }),
    turn = (u: Point, v: Point) => u.x * v.y - u.y * v.x;

  const used = new Set<number>(),
    out: string[] = [];
  for (let s = 0; s < edges.length; s++) {
    if (used.has(s)) continue;
    // Walk the loop. Where two regions meet only at a corner, turn right to stay on this one.
    const loop: Point[] = [];
    for (let k = s; !used.has(k);) {
      used.add(k);
      loop.push(edges[k][0]);
      const d = dir(edges[k]),
        next = (from.get(key(edges[k][1])) ?? []).filter(n => !used.has(n) || n === s);
      if (!next.length) break;
      k = next.reduce((a, b) => (turn(d, dir(edges[b])) > turn(d, dir(edges[a])) ? b : a));
    }
    // Keep only the corners: drop points where the outline runs straight on.
    const corners = loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length],
        b = loop[(i + 1) % loop.length];
      return turn({ x: p.x - a.x, y: p.y - a.y }, { x: b.x - p.x, y: b.y - p.y }) !== 0;
    });
    if (corners.length < 4) continue;
    out.push(roundedLoop(corners, radius));
  }
  return out.join('');
}

/** A closed path through `pts`, each corner cut by an arc of up to `radius`. */
function roundedLoop(pts: Point[], radius: number) {
  const n = pts.length,
    len = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    toward = (p: Point, q: Point, d: number) => {
      const l = len(p, q) || 1;
      return { x: p.x + ((q.x - p.x) * d) / l, y: p.y + ((q.y - p.y) * d) / l };
    };
  const corner = (i: number) => {
    const p = pts[i],
      a = pts[(i + n - 1) % n],
      b = pts[(i + 1) % n],
      r = Math.min(radius, len(a, p) / 2, len(p, b) / 2),
      cw = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x) > 0;
    return { r, cw, enter: toward(p, a, r), exit: toward(p, b, r) };
  };
  const last = corner(n - 1);
  let d = `M${fmt(last.exit.x)} ${fmt(last.exit.y)}`;
  for (let i = 0; i < n; i++) {
    const c = corner(i);
    d += `L${fmt(c.enter.x)} ${fmt(c.enter.y)}`;
    if (c.r > 0)
      d += `A${fmt(c.r)} ${fmt(c.r)} 0 0 ${c.cw ? 1 : 0} ${fmt(c.exit.x)} ${fmt(c.exit.y)}`;
  }
  return `${d}Z`;
}
