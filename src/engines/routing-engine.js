/* Diagram Studio 5 — joint port selection and obstacle-aware routing.
 * Original local implementation, not libavoid. Pure input/output, Browser + Node.
 * Node positions are never changed. Explicit sides and waypoints are constraints.
 */

const SIDES = ['right', 'bottom', 'left', 'top'],
  EPS = 0.0001;
const round = n => Math.round(n * 100) / 100,
  clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const clone = v => JSON.parse(JSON.stringify(v)),
  cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const same = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const vector = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};
const defaults = {
  clearance: 10,
  portGap: 16,
  edgeGap: 16,
  bendPenalty: 32,
  crossingPenalty: 360,
  sharedPenalty: 8,
  parallelPenalty: 18,
  portStability: 20,
  fanoutPenalty: 50,
  passes: 3,
  cornerRadius: 6,
  standoff: 20,
};
function settings(raw = {}) {
  const s = { ...defaults, ...raw },
    ranges = {
      clearance: [4, 30],
      portGap: [6, 28],
      bendPenalty: [0, 100],
      crossingPenalty: [0, 1200],
      sharedPenalty: [0, 20],
      portStability: [0, 150],
      fanoutPenalty: [0, 160],
      passes: [1, 5],
      edgeGap: [4, 48],
      parallelPenalty: [0, 60],
      cornerRadius: [0, 16],
      standoff: [0, 40],
    };
  for (const [k, [lo, hi]] of Object.entries(ranges)) {
    if (typeof s[k] !== 'number' || !Number.isFinite(s[k]))
      throw Error('Routing ' + k + ' must be a finite number.');
    s[k] = clamp(s[k], lo, hi);
  }
  s.passes = Math.round(s.passes);
  return s;
}
function inflate(r, p) {
  return {
    ...r,
    x: round(r.x - p),
    y: round(r.y - p),
    w: round(r.w + 2 * p),
    h: round(r.h + 2 * p),
  };
}
function contains(p, r) {
  return p.x > r.x + EPS && p.x < r.x + r.w - EPS && p.y > r.y + EPS && p.y < r.y + r.h - EPS;
}
// An `across` obstacle can be crossed vertically but not run along: a header band beside
// its title. With `gates`, only on those lines: the band is crossed only by a line straight
// into or out of a member's top.
const passes = (r, x) => r.across && (!r.gates || r.gates.some(g => Math.abs(g - x) < EPS));
function blocked(a, b, obs) {
  if (same(a, b)) return obs.some(r => !r.across && contains(a, r));
  if (Math.abs(a.x - b.x) < EPS)
    return obs.some(
      r =>
        !passes(r, a.x) &&
        a.x > r.x + EPS &&
        a.x < r.x + r.w - EPS &&
        Math.max(a.y, b.y) > r.y + EPS &&
        Math.min(a.y, b.y) < r.y + r.h - EPS,
    );
  if (Math.abs(a.y - b.y) < EPS)
    return obs.some(
      r =>
        a.y > r.y + EPS &&
        a.y < r.y + r.h - EPS &&
        Math.max(a.x, b.x) > r.x + EPS &&
        Math.min(a.x, b.x) < r.x + r.w - EPS,
    );
  return true;
}
function compress(ps) {
  const out = [];
  for (const raw of ps) {
    const p = { x: round(raw.x), y: round(raw.y) };
    if (out.length && same(out.at(-1), p)) continue;
    while (out.length >= 2) {
      const a = out.at(-2),
        b = out.at(-1);
      const collinear =
        (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - p.x) < EPS) ||
        (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - p.y) < EPS);
      // Never erase a reversal: it would hide a backtracking stub.
      if (collinear && (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y) >= 0) out.pop();
      else break;
    }
    out.push(p);
  }
  return out;
}
function segments(ps) {
  return ps.slice(1).map((b, i) => [ps[i], b]);
}
function intersection(a, b, c, d) {
  const h = Math.abs(a.y - b.y) < EPS,
    k = Math.abs(c.y - d.y) < EPS;
  if (h === k) {
    const axis = h ? 'x' : 'y',
      line = h ? 'y' : 'x';
    if (Math.abs(a[line] - c[line]) > EPS) return null;
    const amount =
      Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
      Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
    return amount > EPS ? { shared: amount } : null;
  }
  const [u, v, w, z] = h ? [a, b, c, d] : [c, d, a, b];
  const p = { x: w.x, y: u.y };
  if (
    p.x < Math.min(u.x, v.x) - EPS ||
    p.x > Math.max(u.x, v.x) + EPS ||
    p.y < Math.min(w.y, z.y) - EPS ||
    p.y > Math.max(w.y, z.y) + EPS
  )
    return null;
  return p;
}
// Lane spacing is separate from port spacing and node clearance. Measure the
// length of overlapping parallel runs, not merely exact shared coordinates.
function parallelNear(a, b, c, d, gap) {
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
function parallelConflicts(points, used, gap) {
  let deficit = 0,
    pairs = 0,
    minGap = Infinity;
  for (const r of used)
    for (const [a, b] of segments(points))
      for (const [c, d] of segments(r.points)) {
        const p = parallelNear(a, b, c, d, gap);
        if (!p) continue;
        // Duplicate terminals need a short common fan-out; do not count the single
        // endpoint itself, but a shared run with positive length still counts.
        pairs++;
        deficit += p.deficit;
        minGap = Math.min(minGap, p.separation);
      }
  return {
    lanePairs: pairs,
    laneDeficit: round(deficit),
    minGap: Number.isFinite(minGap) ? round(minGap) : null,
  };
}
function conflicts(points, used) {
  const hits = new Set();
  let shared = 0;
  for (const r of used) {
    for (const [a, b] of segments(points))
      for (const [c, d] of segments(r.points)) {
        const p = intersection(a, b, c, d);
        if (!p) continue;
        if (p.shared) {
          shared += p.shared;
          continue;
        }
        // A shared shape terminal is connectivity, not an edge crossing.
        if (
          (same(p, points[0]) || same(p, points.at(-1))) &&
          (same(p, r.points[0]) || same(p, r.points.at(-1)))
        )
          continue;
        hits.add(r.id + ':' + round(p.x) + ',' + round(p.y));
      }
  }
  return { crossings: hits.size, shared };
}
// Soft clearance: a run parallel to a box side inside `band` costs more the closer
// it gets. Group borders (`border`) count from both sides. The hard clearance
// still decides what is passable, so tight gaps stay routable.
const STANDOFF_WEIGHT = 0.5,
  // A line along a group border reads as part of the frame: worse than one beside a box.
  BORDER_WEIGHT = 2;
function standoffCost(ps, near) {
  let n = 0;
  for (const [a, b] of segments(ps)) {
    const h = Math.abs(a.y - b.y) < EPS;
    if (!h && Math.abs(a.x - b.x) >= EPS) continue;
    const lo = h ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
      hi = h ? Math.max(a.x, b.x) : Math.max(a.y, b.y),
      at = h ? a.y : a.x;
    for (const r of near) {
      const run = Math.min(hi, h ? r.x + r.w : r.y + r.h) - Math.max(lo, h ? r.x : r.y);
      if (run <= 1) continue;
      const s0 = h ? r.y : r.x,
        s1 = h ? r.y + r.h : r.x + r.w;
      let d;
      if (r.border) d = Math.min(Math.abs(at - s0), Math.abs(at - s1));
      else if (at <= s0) d = s0 - at;
      else if (at >= s1) d = at - s1;
      // Inside a box (only an edge's own end lets it in): as close as it gets.
      else d = 0;
      if (d < r.band) n += run * (1 - d / r.band) * (r.weight ?? 1);
    }
  }
  return n * STANDOFF_WEIGHT;
}
function standoffLines(near, xs, ys) {
  for (const r of near) {
    const add = r.border ? [-r.band, r.band] : [-r.band];
    for (const k of add) {
      xs.push(r.x + k, r.x + r.w - k);
      ys.push(r.y + k, r.y + r.h - k);
    }
  }
}
function cost(ps, used, s, near = []) {
  const c = conflicts(ps, used);
  return (
    (near.length ? standoffCost(ps, near) : 0) +
    segments(ps).reduce((n, [a, b]) => n + distance(a, b), 0) +
    Math.max(0, ps.length - 2) * s.bendPenalty +
    c.crossings * s.crossingPenalty +
    c.shared * s.sharedPenalty +
    parallelConflicts(ps, used, s.edgeGap).laneDeficit * s.parallelPenalty +
    segments(ps)
      .slice(1, -1)
      .reduce((sum, [a, b]) => sum + Math.max(0, 8 - distance(a, b)) * 4, 0)
  );
}
class Heap {
  constructor() {
    this.q = [];
  }
  push(v) {
    let i = this.q.length;
    this.q.push(v);
    while (i) {
      const p = (i - 1) >> 1;
      if (this.q[p].f <= v.f) break;
      this.q[i] = this.q[p];
      i = p;
    }
    this.q[i] = v;
  }
  pop() {
    const r = this.q[0],
      v = this.q.pop();
    if (this.q.length) {
      let i = 0;
      while (i * 2 + 1 < this.q.length) {
        let j = i * 2 + 1;
        if (j + 1 < this.q.length && this.q[j + 1].f < this.q[j].f) j++;
        if (this.q[j].f >= v.f) break;
        this.q[i] = this.q[j];
        i = j;
      }
      this.q[i] = v;
    }
    return r;
  }
  get length() {
    return this.q.length;
  }
}
function search(start, end, obs, used, s, near = [], limit = 16000) {
  const xs = [start.x, end.x],
    ys = [start.y, end.y];
  for (const r of obs) {
    xs.push(r.x, r.x + r.w);
    ys.push(r.y, r.y + r.h);
  }
  standoffLines(near, xs, ys);
  for (const p of [start, end]) {
    xs.push(p.x - s.edgeGap, p.x + s.edgeGap);
    ys.push(p.y - s.edgeGap, p.y + s.edgeGap);
  }
  // Extra lanes beside existing paths allow rerouting without bundling them.
  for (const r of used)
    for (const p of r.points) {
      xs.push(p.x - s.edgeGap, p.x + s.edgeGap);
      ys.push(p.y - s.edgeGap, p.y + s.edgeGap);
    }
  xs.push(Math.min(...xs) - 32, Math.max(...xs) + 32);
  ys.push(Math.min(...ys) - 32, Math.max(...ys) + 32);
  const X = [...new Set(xs.map(round))].sort((a, b) => a - b),
    Y = [...new Set(ys.map(round))].sort((a, b) => a - b),
    nx = X.length,
    ny = Y.length;
  const startCell = Y.indexOf(round(start.y)) * nx + X.indexOf(round(start.x)),
    endCell = Y.indexOf(round(end.y)) * nx + X.indexOf(round(end.x));
  const heap = new Heap(),
    scores = new Map(),
    prev = new Map(),
    cache = new Map();
  // Compile route geometry once per search; avoid allocating paths and segment
  // arrays for every grid edge visited by A*. Touching terminals are excluded.
  const existing = used.flatMap(r =>
    segments(r.points).map(([a, b]) => ({
      a,
      b,
      id: r.id,
      first: r.points[0],
      last: r.points.at(-1),
    })),
  );
  function segmentCost(a, b) {
    let shared = 0;
    const hits = new Set();
    for (const t of existing) {
      const p = intersection(a, b, t.a, t.b);
      if (!p) continue;
      if (p.shared) {
        shared += p.shared;
        continue;
      }
      if ((same(p, start) || same(p, end)) && (same(p, t.first) || same(p, t.last))) continue;
      hits.add(t.id + ':' + p.x + ',' + p.y);
    }
    let lanes = 0;
    for (const t of existing) {
      const q = parallelNear(a, b, t.a, t.b, s.edgeGap);
      if (q) lanes += q.deficit;
    }
    return (
      distance(a, b) +
      (near.length ? standoffCost([a, b], near) : 0) +
      hits.size * s.crossingPenalty +
      shared * s.sharedPenalty +
      lanes * s.parallelPenalty
    );
  }

  for (const dir of [0, 1]) {
    const key = startCell * 2 + dir;
    scores.set(key, 0);
    heap.push({ key, g: 0, f: distance(start, end) });
  }
  let result = null,
    visits = 0;
  while (heap.length && visits++ < limit) {
    const c = heap.pop();
    if (c.g !== scores.get(c.key)) continue;
    const cell = Math.floor(c.key / 2),
      dir = c.key % 2;
    if (cell === endCell) {
      result = c.key;
      break;
    }
    const x = cell % nx,
      y = Math.floor(cell / nx),
      a = { x: X[x], y: Y[y] };
    for (const [dx, dy, nd] of [
      [1, 0, 0],
      [0, 1, 1],
      [-1, 0, 0],
      [0, -1, 1],
    ]) {
      const xx = x + dx,
        yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
      const nc = yy * nx + xx,
        key = nc * 2 + nd,
        b = { x: X[xx], y: Y[yy] },
        ck = Math.min(cell, nc) + ':' + Math.max(cell, nc);
      let k = cache.get(ck);
      if (k === undefined) {
        k = blocked(a, b, obs) ? Infinity : segmentCost(a, b);
        cache.set(ck, k);
      }
      if (!Number.isFinite(k)) continue;
      const g = c.g + k + (dir !== nd ? s.bendPenalty : 0);
      if (g >= (scores.get(key) ?? Infinity) - 0.001) continue;
      scores.set(key, g);
      prev.set(key, c.key);
      heap.push({ key, g, f: g + distance(b, end) });
    }
  }
  if (result === null) return null;
  const ps = [];
  for (let k = result; k !== undefined; k = prev.get(k)) {
    const cell = Math.floor(k / 2);
    ps.push({ x: X[cell % nx], y: Y[Math.floor(cell / nx)] });
  }
  return compress(ps.reverse());
}
function doglegs(a, b, obs, s, used = [], near = []) {
  const choices = [
      [a, b],
      [a, { x: b.x, y: a.y }, b],
      [a, { x: a.x, y: b.y }, b],
    ],
    xs = new Set([(a.x + b.x) / 2]),
    ys = new Set([(a.y + b.y) / 2]);
  for (const r of obs) {
    if (r.x < Math.max(a.x, b.x) + 80 && r.x + r.w > Math.min(a.x, b.x) - 80) {
      ys.add(r.y);
      ys.add(r.y + r.h);
    }
    if (r.y < Math.max(a.y, b.y) + 80 && r.y + r.h > Math.min(a.y, b.y) - 80) {
      xs.add(r.x);
      xs.add(r.x + r.w);
    }
  }
  for (const r of used)
    for (const [u, v] of segments(r.points)) {
      if (Math.abs(u.x - v.x) < EPS) {
        xs.add(u.x - s.edgeGap);
        xs.add(u.x + s.edgeGap);
      } else {
        ys.add(u.y - s.edgeGap);
        ys.add(u.y + s.edgeGap);
      }
    }
  const lines = { x: [], y: [] };
  standoffLines(near, lines.x, lines.y);
  for (const x of lines.x)
    if (x > Math.min(a.x, b.x) - 80 && x < Math.max(a.x, b.x) + 80) xs.add(x);
  for (const y of lines.y)
    if (y > Math.min(a.y, b.y) - 80 && y < Math.max(a.y, b.y) + 80) ys.add(y);
  xs.add(Math.min(a.x, b.x) - s.portGap);
  xs.add(Math.max(a.x, b.x) + s.portGap);
  ys.add(Math.min(a.y, b.y) - s.portGap);
  ys.add(Math.max(a.y, b.y) + s.portGap);
  for (const x of xs) choices.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  for (const y of ys) choices.push([a, { x: a.x, y }, { x: b.x, y }, b]);
  return choices.map(compress).filter(ps => !segments(ps).some(([c, d]) => blocked(c, d, obs)));
}
function port(rect, side, offset = 0) {
  const r = rect,
    shape = r.shape || 'box';
  let x = r.x + r.w / 2,
    y = r.y + r.h / 2;
  if (side === 'left' || side === 'right') {
    y += clamp(offset, -r.h / 2 + 10, r.h / 2 - 10);
    let inset = 0;
    if (['circle', 'icon', 'pill'].includes(shape)) {
      const radius = shape === 'pill' ? Math.min(r.h / 2, r.w / 2) : r.w / 2;
      inset = radius * (1 - Math.sqrt(Math.max(0, 1 - ((y - r.y - r.h / 2) / (r.h / 2)) ** 2)));
    }
    if (shape === 'diamond') inset = (Math.abs(y - r.y - r.h / 2) * r.w) / r.h;
    x = side === 'left' ? r.x + inset : r.x + r.w - inset;
  } else {
    x += clamp(offset, -r.w / 2 + 10, r.w / 2 - 10);
    let inset = 0;
    if (['circle', 'icon'].includes(shape))
      inset = (r.h / 2) * (1 - Math.sqrt(Math.max(0, 1 - ((x - r.x - r.w / 2) / (r.w / 2)) ** 2)));
    if (shape === 'pill') {
      const radius = Math.min(r.h / 2, r.w / 2),
        beyond = Math.max(0, Math.abs(x - r.x - r.w / 2) - (r.w / 2 - radius));
      inset = radius - Math.sqrt(Math.max(0, radius * radius - beyond * beyond));
    }
    if (shape === 'diamond') inset = (Math.abs(x - r.x - r.w / 2) * r.h) / r.w;
    y = side === 'top' ? r.y + inset : r.y + r.h - inset;
  }
  return { x: round(x), y: round(y) };
}
function slot(id, side, r, used, s, other) {
  const vertical = side === 'left' || side === 'right',
    span = (vertical ? r.h : r.w) - 24,
    cross = vertical ? 'y' : 'x',
    desired = center(other)[cross] - center(r)[cross];
  const separation = Math.max(s.portGap, s.edgeGap);
  const occupied = [];
  for (const q of used) {
    if (q.from === id && q.fromSide === side) occupied.push(q.fromOffset);
    if (q.to === id && q.toSide === side) occupied.push(q.toOffset);
  }
  const options = [0];
  for (let i = 1; i <= 8; i++)
    for (const sign of [1, -1])
      if (i * separation <= span / 2 + EPS) options.push(sign * i * separation);
  options.sort((a, b) => Math.abs(a) - Math.abs(b) || (desired < 0 ? a - b : b - a));
  for (const n of options) if (occupied.every(v => Math.abs(n - v) >= separation - 0.01)) return n;
  // Crowded small sides degrade to evenly-spaced choices. Overlap is reported.
  let best = 0,
    score = -1;
  for (let n = -span / 2; n <= span / 2; n += 2) {
    const d = Math.min(...occupied.map(v => Math.abs(n - v)));
    if (d > score) {
      score = d;
      best = n;
    }
  }
  return round(best);
}
const AXIS_PENALTY = 100,
  TRAILING = { right: 'right', down: 'bottom' },
  LEADING = { right: 'left', down: 'top' };
const HOOK_PENALTY = 80;
const PORT_SLACK = 4;
const FAR_PENALTY = 100,
  OWN_STANDOFF = 1;
// Gate a group's header bands to the terminal lines of a route through a member's top.
function gate(obs, start, fs, end, ts) {
  if (!obs.some(r => r.gates)) return obs;
  const gates = [...(fs === 'top' ? [start.x] : []), ...(ts === 'top' ? [end.x] : [])];
  return obs.map(r => (r.gates ? { ...r, gates } : r));
}
function compute(input, rawOptions = {}) {
  const facingFans = rawOptions.facing !== false,
    titleBands = rawOptions.titleBands !== false;
  const began = Date.now(),
    s = settings(rawOptions),
    rects = new Map(input.nodes.map(n => [n.id, { ...n }])),
    groups = new Map((input.groups || []).map(g => [g.id, { ...g }]));
  for (const [id, g] of groups) if (g.collapsed) rects.set(id, { ...g, shape: 'box' });
  const all = new Map([...groups, ...rects]);
  const near = s.standoff
    ? [
        ...[...rects.values()].map(r => ({ ...r, band: s.standoff })),
        ...[...groups.values()]
          .filter(g => !g.collapsed)
          .map(g => ({ ...g, band: s.standoff, border: true, weight: BORDER_WEIGHT })),
      ]
    : [];
  function ancestors(id) {
    const list = [];
    for (let p = all.get(id)?.parentId; p; p = all.get(p)?.parentId) {
      if (list.includes(p)) break;
      list.push(p);
    }
    return list;
  }
  const previous = new Map((rawOptions.previous || []).map(r => [r.id, r]));
  const edges = input.edges
    .filter(e => rects.has(e.from) && rects.has(e.to))
    .map(e => ({ ...e, cfg: e.cfg || {} }));
  edges.sort((a, b) => {
    const locks = e =>
      (e.cfg.waypoints?.length ? 4 : 0) +
      (e.cfg.fromSide && e.cfg.fromSide !== 'auto' ? 1 : 0) +
      (e.cfg.toSide && e.cfg.toSide !== 'auto' ? 1 : 0);
    return (
      locks(b) - locks(a) ||
      distance(center(rects.get(a.from)), center(rects.get(a.to))) -
        distance(center(rects.get(b.from)), center(rects.get(b.to))) ||
      cmp(a.id, b.id)
    );
  });
  const obsFor = e => {
    const allowed = new Set([...ancestors(e.from), ...ancestors(e.to)]),
      obstacles = [...rects.values()].map(r => inflate(r, s.clearance));
    for (const [id, g] of groups) {
      if (g.collapsed) continue;
      if (!allowed.has(id)) obstacles.push(inflate(g, s.clearance));
      else {
        // The title blocks the header band. Beside it, a line may cross the band
        // straight into the group but not run along it under the border.
        const title = Math.max(1, Math.min(g.w - 6, g.titleWidth ?? Infinity)),
          band = { y: g.y + 2, h: 28 + s.clearance },
          lip = Math.max(s.clearance, s.standoff);
        obstacles.push({ id: id + ':header', x: g.x + 3, w: title, ...band });
        if (titleBands)
          // The whole band, from a clearance above the border, is crossed only by a line
          // straight into or out of a member's top: never run along or through.
          obstacles.push({
            id: id + ':header-band',
            x: g.x - lip,
            w: g.w + 2 * lip,
            y: g.y - lip,
            h: band.y + band.h - g.y + lip,
            across: true,
            gates: [],
          });
        else if (title < g.w - 6)
          obstacles.push({
            id: id + ':header-band',
            x: g.x + 3 + title,
            w: g.w - 6 - title,
            ...band,
            across: true,
          });
      }
    }
    const common = ancestors(e.from).find(id => ancestors(e.to).includes(id));
    const g = groups.get(common);
    if (g) {
      const wall = 2000000;
      obstacles.push(
        { id: 'wall-l', x: g.x - wall, y: g.y - wall, w: wall, h: 2 * wall },
        { id: 'wall-r', x: g.x + g.w, y: g.y - wall, w: wall, h: 2 * wall },
        { id: 'wall-t', x: g.x, y: g.y - wall, w: g.w, h: wall },
        { id: 'wall-b', x: g.x, y: g.y + g.h, w: g.w, h: wall },
      );
    }
    return obstacles;
  };
  function validPath(points, e, fs, ts, obs) {
    if (points.length < 2) return false;
    obs = gate(obs, points[0], fs, points.at(-1), ts);
    const start = points[0],
      next = points[1],
      end = points.at(-1),
      prev = points.at(-2),
      v = vector[fs],
      w = vector[ts];
    if (
      v.x * (next.x - start.x) + v.y * (next.y - start.y) <= EPS ||
      w.x * (prev.x - end.x) + w.y * (prev.y - end.y) <= EPS
    )
      return false;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if (Math.abs(a.x - b.x) > EPS && Math.abs(a.y - b.y) > EPS) return false;
      const obstacles = obs.filter(
        r => !(i === 1 && r.id === e.from) && !(i === points.length - 1 && r.id === e.to),
      );
      if (blocked(a, b, obstacles)) return false;
      if (i >= 2) {
        const c = points[i - 2];
        if ((b.x - a.x) * (a.x - c.x) + (b.y - a.y) * (a.y - c.y) < -EPS) return false;
      }
    }
    return true;
  }
  function simplify(points, e, fs, ts, obs, used) {
    if (e.cfg.waypoints?.length) return points;
    let result = compress(points),
      bestCost = cost(result, used, s, near);
    // Replacing a subpath removes staircase artefacts only if the complete path
    // remains obstacle-safe, respects terminal normals, and does not add a lane
    // conflict or crossing. This is geometric simplification, not SVG cosmetics.
    for (let sweep = 0; sweep < 4; sweep++) {
      let improved = false;
      const before = conflicts(result, used),
        beforeLane = parallelConflicts(result, used, s.edgeGap);
      outer: for (let span = result.length - 1; span >= 2; span--)
        for (let i = 0; i + span < result.length; i++) {
          const j = i + span,
            a = result[i],
            b = result[j];
          for (const mid of [[{ x: a.x, y: b.y }], [{ x: b.x, y: a.y }], []]) {
            const p = compress([...result.slice(0, i + 1), ...mid, ...result.slice(j)]);
            if (p.length >= result.length || !validPath(p, e, fs, ts, obs)) continue;
            const c = conflicts(p, used),
              lane = parallelConflicts(p, used, s.edgeGap),
              score = cost(p, used, s, near);
            if (
              c.crossings > before.crossings ||
              lane.laneDeficit > beforeLane.laneDeficit + 0.1 ||
              score >= bestCost - 0.01
            )
              continue;
            result = p;
            bestCost = score;
            improved = true;
            break outer;
          }
        }
      if (!improved) break;
    }
    return result;
  }
  function find(e, used, old) {
    const a = rects.get(e.from),
      b = rects.get(e.to),
      cfg = e.cfg,
      edgeObs = obsFor(e),
      ca = center(a),
      cb = center(b);
    const from =
        cfg.fromSide && cfg.fromSide !== 'auto'
          ? [cfg.fromSide]
          : rawOptions.quick && old
            ? [old.fromSide]
            : SIDES,
      to =
        cfg.toSide && cfg.toSide !== 'auto'
          ? [cfg.toSide]
          : rawOptions.quick && old
            ? [old.toSide]
            : SIDES;
    // A forward edge in a layout with a declared reading direction leaves its source's
    // trailing side and enters its target's leading side (bottom → top going down), so
    // it reads as parent → child. Other sides cost `AXIS_PENALTY` each, more than the
    // standoff or fan-out a clean Z pays, so they win only when the axis sides are blocked.
    const flow = [cfg.flow, rawOptions.direction].find(d => d === 'right' || d === 'down');
    const along = flow === 'down' ? cb.y - ca.y : cb.x - ca.x,
      forward = flow && e.from !== e.to && along > 20,
      axis = c =>
        forward
          ? (c.fs !== TRAILING[flow] ? AXIS_PENALTY : 0) +
            (c.ts !== LEADING[flow] ? AXIS_PENALTY : 0)
          : 0,
      onAxis = (side, end) => forward && side === (end === 'from' ? TRAILING : LEADING)[flow];
    const candidates = [];
    let best = null;
    // A line that leaves a box and turns to run alongside it, just past the stub, reads as
    // hugging its own box. Runs beside the edge's own ends pay the standoff again.
    const own = facingFans ? near.filter(r => !r.border && (r.id === e.from || r.id === e.to)) : [];
    // Ports already on side `side` of node `id`, from this edge's end of the fan.
    const taken = (id, side, end) =>
      used.filter(r => r[end] === id && r[end + 'Side'] === side).length;
    // A side faces the other end when it points toward it. A fan spreads along a
    // facing side for free until the side runs out of port slots (`slot` spacing),
    // and only then pays the fan-out penalty that pushes it round to another side.
    const facing = (side, from, to) =>
      vector[side].x * (to.x - from.x) + vector[side].y * (to.y - from.y) > 0.01;
    const roomy = (side, r, n) => {
      const span = (side === 'left' || side === 'right' ? r.h : r.w) - 24,
        separation = Math.max(s.portGap, s.edgeGap);
      return n < 1 + 2 * Math.floor(span / 2 / separation + EPS);
    };
    function fan(side, r, from, to, end, id) {
      const n = taken(id, side, end);
      if (!n || (end === 'from' ? onAxis(side, 'from') : onAxis(side, 'to'))) return 0;
      if (facingFans && facing(side, from, to) && roomy(side, r, n)) return 0;
      return n * s.fanoutPenalty;
    }
    function score(points, c) {
      const v = vector[c.fs],
        w = vector[c.ts],
        delta = { x: cb.x - ca.x, y: cb.y - ca.y };
      // Leaving or arriving by a far side (one that points away from the other end)
      // draws a hook round the box; it is worth a detour only when the facing sides
      // are blocked.
      const far = facingFans ? FAR_PENALTY : 18;
      const backwards =
        (v.x * delta.x + v.y * delta.y < -0.01 ? far : 0) +
        (w.x * -delta.x + w.y * -delta.y < -0.01 ? far : 0);
      const stability = old
        ? (c.fs !== old.fromSide ? s.portStability : 0) +
          (c.ts !== old.toSide ? s.portStability : 0)
        : 0;
      const fanout = fan(c.fs, a, ca, cb, 'from', e.from) + fan(c.ts, b, cb, ca, 'to', e.to);
      // Out of one side and back into the same side of the other end: a U-turn, which a line
      // into a perpendicular side draws with one bend fewer.
      const hook = facingFans && c.fs === c.ts && points.length > 3 ? HOOK_PENALTY : 0;
      return (
        cost(points, used, s, near) +
        (own.length ? standoffCost(points, own) * OWN_STANDOFF : 0) +
        backwards +
        hook +
        stability +
        fanout +
        axis(c)
      );
    }
    const remember = (points, c, o = c.obs) => {
      if (!points) return;
      const full = compress([c.start, ...points, c.end]);
      for (let i = 2; i < full.length; i++) {
        const a = full[i - 2],
          b = full[i - 1],
          d = full[i];
        if (
          ((Math.abs(a.x - b.x) < EPS && Math.abs(b.x - d.x) < EPS) ||
            (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - d.y) < EPS)) &&
          (b.x - a.x) * (d.x - b.x) + (b.y - a.y) * (d.y - b.y) < -0.001
        )
          return;
      }

      // No doubled-back first/last segments after attaching shape stubs.
      if (
        full.length < 2 ||
        segments(full).some(([u, v], i) => i > 0 && i < full.length - 2 && blocked(u, v, o))
      )
        return;
      const scoreValue = score(full, c);
      if (!best || scoreValue < best.score - 0.01) best = { ...c, points: full, score: scoreValue };
    };
    for (const fs of from)
      for (const ts of to) {
        if (e.from === e.to && fs === ts) continue;
        let fo = slot(e.from, fs, a, used, s, b),
          toff = slot(e.to, ts, b, used, s, a);
        const sameAxis = (fs === 'left' || fs === 'right') === (ts === 'left' || ts === 'right');
        if (sameAxis && e.from !== e.to) {
          const vertical = fs === 'left' || fs === 'right',
            axis = vertical ? 'y' : 'x',
            limit = (vertical ? b.h : b.w) / 2 - 12;
          const desired = port(a, fs, fo)[axis] - center(b)[axis];
          const taken = used.flatMap(q => [
            ...(q.from === e.to && q.fromSide === ts ? [q.fromOffset] : []),
            ...(q.to === e.to && q.toSide === ts ? [q.toOffset] : []),
          ]);
          if (
            Math.abs(desired) <= limit &&
            taken.every(v => Math.abs(desired - v) >= Math.max(s.portGap, s.edgeGap) - 0.01)
          )
            toff = desired;
        }
        // A lane may say where along the target's side the edge arrives.
        if (typeof cfg.toOffset === 'number' && cfg.toSide === ts) toff = cfg.toOffset;
        const start = port(a, fs, fo),
          end = port(b, ts, toff),
          obs = gate(edgeObs, start, fs, end, ts);
        // Stacked neighbours closer than two stubs: meet halfway across the gap
        // between the facing sides instead of hooking round the outside.
        const gap = s.standoff
            ? {
                right: b.x - a.x - a.w,
                left: a.x - b.x - b.w,
                bottom: b.y - a.y - a.h,
                top: a.y - b.y - b.h,
              }[fs]
            : 0,
          tight =
            vector[fs].x === -vector[ts].x &&
            vector[fs].y === -vector[ts].y &&
            gap > 0 &&
            gap < 2 * (s.clearance + 3),
          stub = tight ? gap / 2 : s.clearance + 3,
          ends = tight ? obs.filter(r => r.id !== e.from && r.id !== e.to) : null;
        const as = {
            x: round(fs === 'left' ? a.x - stub : fs === 'right' ? a.x + a.w + stub : start.x),
            y: round(fs === 'top' ? a.y - stub : fs === 'bottom' ? a.y + a.h + stub : start.y),
          },
          bs = {
            x: round(ts === 'left' ? b.x - stub : ts === 'right' ? b.x + b.w + stub : end.x),
            y: round(ts === 'top' ? b.y - stub : ts === 'bottom' ? b.y + b.h + stub : end.y),
          };
        if (
          blocked(start, as, ends || obs.filter(r => r.id !== e.from)) ||
          blocked(end, bs, ends || obs.filter(r => r.id !== e.to))
        )
          continue;
        const c = { fs, ts, fo, toff, start, end, as, bs, obs };
        if (tight) {
          if (cfg.waypoints?.length) continue;
          const o = [...ends, { ...a, id: e.from }, { ...b, id: e.to }];
          for (const path of doglegs(as, bs, o, s, used, near)) remember(path, c, o);
          continue;
        }
        // Through any waypoints, so a side facing away from the first one ranks last.
        const via = [start, ...(cfg.waypoints || []), end];
        c.lower =
          via.reduce((sum, p, i) => (i ? sum + distance(via[i - 1], p) : 0), 0) +
          axis(c) +
          (old && fs !== old.fromSide ? s.portStability : 0) +
          (old && ts !== old.toSide ? s.portStability : 0);
        candidates.push(c);
        if (cfg.waypoints?.length) continue;
        // Preserve genuinely straight facing connections even when two 13px
        // stubs would overlap inside a narrow but valid inter-node gap.
        const v = vector[fs],
          w = vector[ts],
          dx = end.x - start.x,
          dy = end.y - start.y;
        if (
          (start.x === end.x || start.y === end.y) &&
          v.x * dx + v.y * dy > 0 &&
          w.x * -dx + w.y * -dy > 0 &&
          !blocked(
            start,
            end,
            obs.filter(r => r.id !== e.from && r.id !== e.to),
          )
        )
          remember([start, end], c);
        for (const path of doglegs(as, bs, obs, s, used, near)) remember(path, c);
      }
    candidates.sort((a, b) => a.lower - b.lower || cmp(a.fs + ':' + a.ts, b.fs + ':' + b.ts));
    // Search is reserved for candidates whose lower bound can beat the best.
    // Dragging keeps this bounded; settled diagrams receive refinement passes.
    let searches = 0;
    for (const c of candidates) {
      if (best && c.lower > best.score) continue;
      if (searches++ >= (rawOptions.quick ? 1 : 3)) break;
      if (
        best &&
        !conflicts(best.points, used).crossings &&
        !parallelConflicts(best.points, used, s.edgeGap).lanePairs &&
        !cfg.waypoints?.length &&
        best.points.length <= 6
      )
        break;
      const points = [c.as, ...(cfg.waypoints || []), c.bs],
        path = [];
      let ok = true;
      for (let i = 1; i < points.length; i++) {
        // The standoff makes some searches wander; a failed one gets a larger budget once.
        const part =
          search(points[i - 1], points[i], c.obs, used, s, near) ||
          (near.length ? search(points[i - 1], points[i], c.obs, used, s, near, 64000) : null);
        if (!part) {
          ok = false;
          break;
        }
        path.push(...part);
      }
      if (ok) remember(path, c);
    }
    if (!best && rawOptions.quick && old) return find(e, used, null);
    if (!best) {
      const fs = from[0],
        ts = to[0],
        start = port(a, fs),
        end = port(b, ts);
      return {
        id: e.id,
        from: e.from,
        to: e.to,
        fromSide: fs,
        toSide: ts,
        fromOffset: 0,
        toOffset: 0,
        points: compress([start, { x: end.x, y: start.y }, end]),
        blocked: true,
        reason: 'No clear route within the search budget and current side / waypoint constraints.',
      };
    }
    best.points = simplify(best.points, e, best.fs, best.ts, edgeObs, used);
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      fromSide: best.fs,
      toSide: best.ts,
      fromOffset: best.fo,
      toOffset: best.toff,
      points: best.points,
      blocked: false,
    };
  }
  let routes = [];
  for (const e of edges) routes.push(find(e, routes, previous.get(e.id)));
  const metrics = rs => {
    let crossings = 0,
      shared = 0,
      lanePairs = 0,
      laneDeficit = 0,
      minGap = Infinity;
    for (let i = 0; i < rs.length; i++) {
      const used = rs.slice(0, i),
        c = conflicts(rs[i].points, used),
        p = parallelConflicts(rs[i].points, used, s.edgeGap);
      crossings += c.crossings;
      shared += c.shared;
      lanePairs += p.lanePairs;
      laneDeficit += p.laneDeficit;
      if (p.minGap !== null) minGap = Math.min(minGap, p.minGap);
    }
    return {
      crossings,
      shared: round(shared),
      lanePairs,
      laneDeficit: round(laneDeficit),
      minimumConflictingGap: Number.isFinite(minGap) ? round(minGap) : null,
      requestedEdgeGap: s.edgeGap,
      blocked: rs.filter(r => r.blocked).length,
      bends: rs.reduce((n, r) => n + Math.max(0, r.points.length - 2), 0),
      length: round(
        rs.reduce((n, r) => n + segments(r.points).reduce((v, [a, b]) => v + distance(a, b), 0), 0),
      ),
    };
  };
  const total = rs => {
    const m = metrics(rs);
    return (
      m.blocked * 1e8 +
      m.length +
      m.bends * s.bendPenalty +
      m.crossings * s.crossingPenalty +
      m.shared * s.sharedPenalty +
      m.laneDeficit * s.parallelPenalty
    );
  };
  const before = metrics(routes);
  let accepted = 0;
  if (!rawOptions.quick)
    for (let pass = 1; pass < s.passes; pass++) {
      const currentMetrics = metrics(routes);
      if (
        !currentMetrics.crossings &&
        !currentMetrics.shared &&
        !currentMetrics.blocked &&
        !currentMetrics.lanePairs
      )
        break;
      const order = [...edges].sort((a, b) => {
        const ra = routes.find(r => r.id === a.id),
          rb = routes.find(r => r.id === b.id);
        return (
          Number(rb.blocked) - Number(ra.blocked) ||
          conflicts(
            rb.points,
            routes.filter(r => r !== rb),
          ).crossings -
            conflicts(
              ra.points,
              routes.filter(r => r !== ra),
            ).crossings ||
          cmp(a.id, b.id)
        );
      });
      for (const e of order) {
        const i = routes.findIndex(r => r.id === e.id),
          used = routes.filter((_, j) => j !== i),
          c = conflicts(routes[i].points, used);
        if (
          !routes[i].blocked &&
          !c.crossings &&
          !c.shared &&
          !parallelConflicts(routes[i].points, used, s.edgeGap).lanePairs
        )
          continue;
        const next = find(e, used, routes[i]),
          candidate = [...routes];
        candidate[i] = next;
        if (total(candidate) < total(routes) - 0.1) {
          routes = candidate;
          accepted++;
        }
      }
    }
  // Slide complete internal orthogonal segments into nearby free channels.
  // Endpoints, sides, node coordinates and authored waypoint routes stay fixed.
  let nudged = 0;
  if (!rawOptions.quick)
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (let ri = 0; ri < routes.length; ri++) {
        const route = routes[ri],
          e = edges.find(e => e.id === route.id);
        if (route.blocked || e.cfg.waypoints?.length) continue;
        const used = routes.filter((_, j) => j !== ri),
          obs = obsFor(e);
        if (!parallelConflicts(route.points, used, s.edgeGap).lanePairs) continue;
        let best = route.points,
          bestValue = cost(best, used, s, near),
          before = conflicts(best, used);
        for (let i = 1; i < route.points.length - 2; i++) {
          const a = route.points[i],
            b = route.points[i + 1],
            h = Math.abs(a.y - b.y) < EPS,
            axis = h ? 'y' : 'x';
          const choices = new Set();
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
          routes[ri] = {
            ...route,
            points: simplify(best, e, route.fromSide, route.toSide, obs, used),
          };
          changed = true;
          nudged++;
        }
      }
      if (!changed) break;
    }
  // Tidy: make routes look drafted on purpose. Ports on a side sit symmetrically
  // about its centre, edges fanning from one side turn on one line, and parallel
  // runs in a corridor keep one pitch. A move stands only when every moved route
  // stays valid and nothing gets worse: no crossing, shared run, lane conflict,
  // short step or standoff cost is added.
  const tidyOn = !rawOptions.quick && rawOptions.tidy !== false;
  let tidied = 0;
  if (tidyOn) {
    const byId = new Map(edges.map(e => [e.id, e])),
      obsCache = new Map(),
      obsOf = e => {
        if (!obsCache.has(e.id)) obsCache.set(e.id, obsFor(e));
        return obsCache.get(e.id);
      },
      steps = ps =>
        segments(ps)
          .slice(1, -1)
          .filter(([a, b]) => distance(a, b) < 12).length;
    // Whether `p` lies on the polyline `ps`.
    const onPath = (p, ps) =>
      segments(ps).some(
        ([a, b]) =>
          (Math.abs(a.x - b.x) < EPS &&
            Math.abs(p.x - a.x) < EPS &&
            p.y > Math.min(a.y, b.y) - EPS &&
            p.y < Math.max(a.y, b.y) + EPS) ||
          (Math.abs(a.y - b.y) < EPS &&
            Math.abs(p.y - a.y) < EPS &&
            p.x > Math.min(a.x, b.x) - EPS &&
            p.x < Math.max(a.x, b.x) + EPS),
      );
    // `throughWaypoints` lets a waypoint route change when it still passes every waypoint.
    // Runs alongside a box side, outside it and closer than a stub (clearance + 3), for longer
    // than a port gap.
    const boxes = [...rects.values()],
      hugs = ps => {
        let n = 0;
        for (const [a, b] of segments(ps)) {
          const h = Math.abs(a.y - b.y) < EPS;
          if (!h && Math.abs(a.x - b.x) >= EPS) continue;
          const at = h ? a.y : a.x,
            lo = h ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
            hi = h ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
          for (const r of boxes) {
            const s0 = h ? r.y : r.x,
              s1 = h ? r.y + r.h : r.x + r.w,
              run = Math.min(hi, h ? r.x + r.w : r.y + r.h) - Math.max(lo, h ? r.x : r.y),
              d = at < s0 ? s0 - at : at > s1 ? at - s1 : -1;
            if (run > s.portGap && d > EPS && d < s.clearance + 5) n++;
          }
        }
        return n;
      };
    const attempt = (changes, extra = {}, throughWaypoints = false, slack = 0.5) => {
      const next = routes.map((r, i) =>
        changes.has(i) ? { ...r, ...extra[i], points: compress(changes.get(i)) } : r,
      );
      for (const i of changes.keys()) {
        const r = next[i],
          e = byId.get(r.id),
          waypoints = e.cfg.waypoints || [];
        // Waypoint routes stay as authored, as in the nudge pass.
        if (waypoints.length && !(throughWaypoints && waypoints.every(p => onPath(p, r.points))))
          return false;
        if (!validPath(r.points, e, r.fromSide, r.toSide, obsOf(e))) return false;
        if (steps(r.points) > steps(routes[i].points)) return false;
      }
      const m0 = metrics(routes),
        m1 = metrics(next);
      if (
        m1.crossings > m0.crossings ||
        m1.shared > m0.shared + 0.01 ||
        m1.lanePairs > m0.lanePairs ||
        m1.laneDeficit > m0.laneDeficit + 0.1
      )
        return false;
      let before = 0,
        after = 0;
      for (const i of changes.keys()) {
        before += standoffCost(routes[i].points, near);
        after += standoffCost(next[i].points, near);
      }
      if (after > before + slack) return false;
      // Slack never buys a new hug: a run closer than a stub's length to a box beside it.
      if (slack > 0.5) {
        let h0 = 0,
          h1 = 0;
        for (const i of changes.keys()) {
          h0 += hugs(routes[i].points);
          h1 += hugs(next[i].points);
        }
        if (h1 > h0) return false;
      }
      routes = next;
      tidied++;
      return true;
    };
    const flat = r => !['pill', 'circle', 'diamond', 'icon'].includes(r.shape),
      ends = ['from', 'to'],
      tip = (ps, end, k = 0) => (end === 'from' ? ps[k] : ps[ps.length - 1 - k]);

    // Ports: shift a side's ports so their mean sits on the side's centre.
    const sides = new Map();
    routes.forEach((r, i) => {
      for (const end of ends) {
        const key = r[end] + '|' + r[end + 'Side'];
        if (!sides.has(key)) sides.set(key, []);
        sides.get(key).push({ i, end });
      }
    });
    for (const [key, list] of sides) {
      const [id, side] = key.split('|'),
        rect = rects.get(id),
        vertical = side === 'left' || side === 'right',
        axis = vertical ? 'y' : 'x',
        mid = center(rect)[axis],
        limit = (vertical ? rect.h : rect.w) / 2 - 10,
        at = [...new Set(list.map(({ i, end }) => round(tip(routes[i].points, end)[axis])))];
      // Diamonds and round shapes keep their ports on the tips.
      if (at.length < 2 || !flat(rect)) continue;
      const d = round(mid - at.reduce((n, v) => n + v, 0) / at.length);
      if (Math.abs(d) < 2 || at.some(v => Math.abs(v + d - mid) > limit + EPS)) continue;
      const changes = new Map(),
        extra = {};
      for (const { i, end } of list) {
        const ps = clone(changes.get(i) ?? routes[i].points),
          offset = round(tip(ps, end)[axis] + d - mid),
          moved = port(rect, side, offset);
        Object.assign(tip(ps, end), moved);
        extra[i] = { ...extra[i], [end + 'Offset']: offset };
        if (ps.length === 2) {
          // A straight route slides as a whole, moving its other port too.
          const other = end === 'from' ? 'to' : 'from',
            far = rects.get(routes[i][other]),
            otherOffset = round(tip(ps, other)[axis] + d - center(far)[axis]);
          if (!flat(far)) {
            changes.clear();
            break;
          }
          Object.assign(tip(ps, other), port(far, routes[i][other + 'Side'], otherOffset));
          extra[i][other + 'Offset'] = otherOffset;
        } else tip(ps, end, 1)[axis] = moved[axis];
        changes.set(i, ps);
      }
      if (!changes.size) continue;
      // A line that turns in beside the side runs alongside it a stub away; the shift can
      // lengthen that run into a hug. Turn a full standoff out instead, where the line allows.
      const across = vertical ? 'x' : 'y',
        face = { left: rect.x, right: rect.x + rect.w, top: rect.y, bottom: rect.y + rect.h }[side],
        out = side === 'left' || side === 'top' ? -1 : 1,
        wide = new Map(
          [...changes].map(([i, ps]) => {
            const end = list.find(l => l.i === i).end,
              q = clone(ps);
            if (
              q.length >= 4 &&
              Math.abs(tip(q, end, 1)[across] - tip(q, end, 2)[across]) < EPS &&
              Math.abs(tip(q, end, 1)[across] - face) < s.standoff
            ) {
              tip(q, end, 1)[across] = face + out * s.standoff;
              tip(q, end, 2)[across] = face + out * s.standoff;
            }
            return [i, q];
          }),
        );
      // Centring a side is worth a little standoff: a port gap's shift barely moves a line.
      const slack = PORT_SLACK * changes.size;
      if (!attempt(wide, extra, false, slack)) attempt(changes, extra, false, slack);
    }

    // Fans: edges leaving (or entering) one side turn on a shared line.
    const fans = new Map();
    routes.forEach((r, i) => {
      if (r.points.length < 4) return;
      for (const end of ends) {
        const key = r[end] + '|' + end + '|' + r[end + 'Side'];
        if (!fans.has(key)) fans.set(key, []);
        fans.get(key).push(i);
      }
    });
    for (const [key, list] of fans) {
      if (list.length < 2) continue;
      const [, end, side] = key.split('|'),
        axis = side === 'left' || side === 'right' ? 'x' : 'y',
        turn = i => round(tip(routes[i].points, end, 1)[axis]),
        values = [...new Set(list.map(turn))];
      if (values.length < 2) continue;
      const spread = t => list.reduce((n, i) => n + Math.abs(turn(i) - t), 0);
      values.sort((a, b) => spread(a) - spread(b) || a - b);
      for (const t of values) {
        const changes = new Map();
        for (const i of list) {
          if (turn(i) === t) continue;
          const ps = clone(routes[i].points);
          tip(ps, end, 1)[axis] = t;
          tip(ps, end, 2)[axis] = t;
          changes.set(i, ps);
        }
        if (attempt(changes)) break;
      }
    }

    // Jogs: a step under 12px between two parallel runs straightens by sliding one run onto
    // the other's line. A run that ends at a port slides the port too, when its side has room
    // and no other port sits there.
    if (rawOptions.jogs !== false)
      for (let i = 0; i < routes.length; i++) {
        const separation = Math.max(s.portGap, s.edgeGap);
        // Slide the run of segment `j` to `value` on `axis`; null when its port can't follow.
        const slide = (ps, j, axis, value) => {
          const next = clone(ps),
            extra = {};
          next[j][axis] = value;
          next[j + 1][axis] = value;
          for (const [k, end] of [
            [j, 'from'],
            [j + 1, 'to'],
          ]) {
            if (k !== (end === 'from' ? 0 : ps.length - 1)) continue;
            const id = routes[i][end],
              side = routes[i][end + 'Side'],
              rect = rects.get(id);
            if (!rect || !flat(rect) || (side === 'left' || side === 'right') !== (axis === 'y'))
              return null;
            const offset = round(value - center(rect)[axis]);
            if (Math.abs(offset) > (axis === 'y' ? rect.h : rect.w) / 2 - 10 + EPS) return null;
            const crowded = routes.some((q, m) =>
              ends.some(
                e2 =>
                  (m !== i || e2 !== end) &&
                  q[e2] === id &&
                  q[e2 + 'Side'] === side &&
                  Math.abs(tip(q.points, e2)[axis] - value) < separation - 0.01,
              ),
            );
            if (crowded) return null;
            Object.assign(next[k], port(rect, side, offset));
            extra[end + 'Offset'] = offset;
          }
          return { next, extra };
        };
        const ps = routes[i].points;
        for (let k = 1; k < ps.length - 2; k++) {
          if (distance(ps[k], ps[k + 1]) >= 12) continue;
          // The step runs along `axis`'s other coordinate; its neighbours run across it.
          const axis = Math.abs(ps[k].x - ps[k + 1].x) < EPS ? 'y' : 'x';
          const options = [
            slide(ps, k - 1, axis, ps[k + 1][axis]),
            slide(ps, k + 1, axis, ps[k][axis]),
          ];
          if (options.some(o => o && attempt(new Map([[i, o.next]]), { [i]: o.extra }, true)))
            break;
        }
      }

    // Corridors: parallel inner runs close together keep one pitch.
    const pitch = s.edgeGap;
    for (const h of [true, false]) {
      const axis = h ? 'y' : 'x',
        along = h ? 'x' : 'y',
        runs = [];
      routes.forEach((r, i) =>
        segments(r.points).forEach(([a, b], k) => {
          if (k === 0 || k === r.points.length - 2 || distance(a, b) <= 12) return;
          if (Math.abs(a.y - b.y) < EPS !== h) return;
          runs.push({
            i,
            k,
            at: round(a[axis]),
            lo: Math.min(a[along], b[along]),
            hi: Math.max(a[along], b[along]),
          });
        }),
      );
      runs.sort((a, b) => a.at - b.at);
      for (let j = 1; j < runs.length; j++) {
        const run = runs[j],
          prev = runs
            .slice(0, j)
            .filter(
              q =>
                q.i !== run.i &&
                q.at < run.at &&
                Math.min(q.hi, run.hi) - Math.max(q.lo, run.lo) > 1,
            )
            .at(-1);
        if (!prev) continue;
        const gap = run.at - prev.at;
        if (Math.abs(gap - pitch) <= 1 || gap > 2.5 * pitch) continue;
        const target = round(prev.at + pitch),
          ps = clone(routes[run.i].points);
        if (
          Math.abs(ps[run.k][axis] - run.at) > EPS ||
          Math.abs(ps[run.k + 1][axis] - run.at) > EPS
        )
          continue;
        ps[run.k][axis] = target;
        ps[run.k + 1][axis] = target;
        if (attempt(new Map([[run.i, ps]]))) run.at = target;
      }
    }
  }
  routes.sort((a, b) => cmp(a.id, b.id));
  const report = {
    ...metrics(routes),
    initial: before,
    accepted,
    nudged,
    ...(tidyOn ? { tidied } : {}),
    edges: routes.length,
    milliseconds: Date.now() - began,
    passes: rawOptions.quick ? 1 : s.passes,
  };
  return { routes, report };
}
const api = {
  compute,
  settings,
  defaults,
  port,
  blocked,
  conflicts,
  parallelConflicts,
  metrics: routes => {
    let crossings = 0,
      shared = 0;
    routes.forEach((r, i) => {
      const c = conflicts(r.points, routes.slice(0, i));
      crossings += c.crossings;
      shared += c.shared;
    });
    return { crossings, shared };
  },
};

export const RouteLab = api;
