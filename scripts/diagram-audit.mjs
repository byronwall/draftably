#!/usr/bin/env node
/**
 * Diagram quality audit: objective layout metrics for a corpus of `.draft` files, plus a
 * contact sheet per diagram for the visual review. See docs/intent/diagram-quality/RUBRIC.md.
 *
 *   node scripts/diagram-audit.mjs <corpus-dir> <out-dir> [--only slug,slug] [--no-shots]
 *                                  [--baseline <previous-out-dir>]
 *
 * A corpus dir holds one folder per diagram. Each folder has `v0.draft` (the first render) and
 * optional `e1.draft`, `e2.draft`, … (the same diagram after each follow-up request). Writes
 * `<out>/<slug>/metrics.json`, `<out>/<slug>/sheet.png` and `<out>/summary.md`.
 *
 * A follow-up file states what its request should achieve in `# expect` comments, checked here:
 *
 *   # expect left-of a b       a's right edge is left of b's left edge (also right-of, above, below)
 *   # expect order-x a b c     centers run left to right (order-y: top to bottom)
 *   # expect reads-x a b c     reading order, left to right, wrapping onto lower rows (reads-y: columns)
 *   # expect aligned-x a b     centers share x within 4px (aligned-y: y)
 *   # expect near a b 80       the gap between a and b is at most 80px
 *   # expect still a b         a and b moved at most 24px from the previous version
 *   # expect still *           nothing that existed before moved more than 24px
 *   # expect keeps-order       no pair of old objects swapped sides (growth may push things aside)
 *   # expect back-edges 0      at most this many edges run against the reading direction
 *
 * With `--baseline`, the summary adds each render's defect-index change and `<slug>/compare-<v>.png`
 * puts the previous round's image beside this one's.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts/draftably.mjs');

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf(name);
  return i < 0 ? false : (args.splice(i, 1), true);
};
const option = name => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const noShots = flag('--no-shots');
const only = option('--only')?.split(',');
const baseline = option('--baseline');
const [corpusDir, outDir] = args;
if (!corpusDir || !outDir) {
  console.error(
    'Usage: node scripts/diagram-audit.mjs <corpus-dir> <out-dir> [--only a,b] [--no-shots]',
  );
  process.exit(1);
}

const run = (...a) => {
  try {
    return {
      out: execFileSync(process.execPath, [cli, ...a], { encoding: 'utf8', stdio: 'pipe' }),
      ok: true,
    };
  } catch (e) {
    return { out: `${e.stdout ?? ''}${e.stderr ?? ''}`, ok: false };
  }
};

// ---------- geometry helpers ----------
const EPS = 0.5;
const segs = pts => pts.slice(1).map((p, i) => [pts[i], p]);
const len = ([a, b]) => Math.hypot(b.x - a.x, b.y - a.y);
const shrink = (r, d) => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });
const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const rectsOverlap = (a, b) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS &&
  Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > EPS;
const inside = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;

/** Does an axis-aligned (or any) segment pass through the rectangle's interior? Sampled. */
function segHitsRect([a, b], r) {
  const n = Math.max(2, Math.ceil(len([a, b]) / 3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, r)) return true;
  }
  return false;
}

/** Proper crossing of two segments (not touching at shared endpoints, not collinear). */
function segsCross([a, b], [c, d]) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  const o1 = o(a, b, c),
    o2 = o(a, b, d),
    o3 = o(c, d, a),
    o4 = o(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** Length of collinear overlap between two axis-aligned segments. */
function collinearOverlap([a, b], [c, d]) {
  const h1 = Math.abs(a.y - b.y) < EPS,
    h2 = Math.abs(c.y - d.y) < EPS;
  const v1 = Math.abs(a.x - b.x) < EPS,
    v2 = Math.abs(c.x - d.x) < EPS;
  if (h1 && h2 && Math.abs(a.y - c.y) < 2) {
    return Math.max(
      0,
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)),
    );
  }
  if (v1 && v2 && Math.abs(a.x - c.x) < 2) {
    return Math.max(
      0,
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)),
    );
  }
  return 0;
}

const dir = ([a, b]) => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'R' : 'L') : dy >= 0 ? 'D' : 'U';
};
const opposite = { R: 'L', L: 'R', U: 'D', D: 'U' };

// ---------- source parsing (edge endpoints, declared direction) ----------
function parseSource(text) {
  const edges = new Map();
  let direction;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/(^|\s)(#|\/\/).*$/, '').trim();
    const e = line.match(/^edge\s+(\S+)\s+(\S+)\s*->\s*(\S+)/);
    if (e) edges.set(e[1], { source: e[2], target: e[3], label: /"[^"]+"/.test(line) });
    const l = line.match(/^layout\s+root\b.*direction=(right|down)/);
    if (l) direction = l[1];
  }
  return { edges, direction };
}

// ---------- SVG parsing (edge label boxes) ----------
function parseLabels(svg) {
  const canvas = svg.match(
    /<rect x="[-\d.]+" y="[-\d.]+" width="[\d.]+" height="[\d.]+" fill="(#[0-9A-Fa-f]+)"\/>/,
  )?.[1];
  const labels = [];
  const re =
    /<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="4" fill="([^"]+)"\/>\s*<text[^>]*font-weight="500"[^>]*>([^<]*)</g;
  let m;
  while ((m = re.exec(svg))) {
    if (canvas && m[5] !== canvas) continue;
    labels.push({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], text: m[6], at: m.index });
  }
  // The label's own path is the last <path d="M…"> before it in document order.
  for (const label of labels) {
    const before = svg.slice(0, label.at);
    const d = [...before.matchAll(/<path d="(M[^"]+)"[^>]*marker-end/g)].pop()?.[1];
    label.path = d
      ? [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(p => ({ x: +p[1], y: +p[2] }))
      : [];
  }
  return labels;
}

// ---------- color ----------
const luminance = hex => {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(v.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Text-on-fill pairs for shapes and group titles, plus the distinct fills used. */
function parseColors(svg) {
  const canvas = svg.match(
    /<rect x="[-\d.]+" y="[-\d.]+" width="[\d.]+" height="[\d.]+" fill="(#[0-9A-Fa-f]{6})"\/>/,
  )?.[1];
  const pairs = [];
  const re =
    /<(?:rect|path|ellipse|circle)[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*stroke="#[0-9A-Fa-f]{6}"[^>]*\/>\s*(?:<svg[\s\S]*?<\/svg>\s*)?<text[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*>(?:<tspan[^>]*>)?([^<]*)/g;
  let m;
  while ((m = re.exec(svg)))
    pairs.push({ fill: m[1], ink: m[2], text: m[3], ratio: +contrast(m[1], m[2]).toFixed(2) });
  const connection = svg.match(/<path d="M[^"]+" fill="none" stroke="(#[0-9A-Fa-f]{6})"/)?.[1];
  return {
    canvas,
    pairs,
    fills: [...new Set(pairs.map(p => p.fill.toUpperCase()))],
    connectionContrast: canvas && connection ? +contrast(canvas, connection).toFixed(2) : undefined,
  };
}

const pointSegDist = (p, [a, b]) => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
};

// ---------- metrics for one file ----------
function measure(file) {
  const source = fs.readFileSync(file, 'utf8');
  const check = run('check', file);
  const warnings = check.out.split('\n').filter(l => /warning/i.test(l));
  if (!check.ok) return { file, error: check.out.trim() };
  const geo = JSON.parse(run('inspect', file).out);
  const svg = run('inspect', file, '--svg').out;
  const { edges, direction } = parseSource(source);

  const byId = new Map(geo.nodes.map(n => [n.id, n]));
  const parents = new Set(geo.nodes.map(n => n.parent));
  const leaves = geo.nodes.filter(n => !parents.has(n.id));
  const groups = geo.nodes.filter(n => parents.has(n.id));
  const ancestors = id => {
    const out = [];
    for (let n = byId.get(id); n && n.parent !== 'root'; n = byId.get(n.parent)) out.push(n.parent);
    return out;
  };

  const issues = [];
  const note = (kind, detail) => issues.push({ kind, detail });

  // Node overlaps: leaves, and sibling groups.
  for (let i = 0; i < geo.nodes.length; i++) {
    for (let j = i + 1; j < geo.nodes.length; j++) {
      const a = geo.nodes[i],
        b = geo.nodes[j];
      if (ancestors(a.id).includes(b.id) || ancestors(b.id).includes(a.id)) continue;
      if (rectsOverlap(a, b)) note('node-overlap', `${a.id} × ${b.id}`);
    }
  }

  const routes = geo.routes.map(r => ({ ...r, ...(edges.get(r.id) ?? {}), segs: segs(r.points) }));
  let bends = 0,
    maxBends = 0,
    hooks = 0,
    totalLen = 0;
  for (const r of routes) {
    const b = Math.max(0, r.points.length - 2);
    bends += b;
    maxBends = Math.max(maxBends, b);
    totalLen += r.segs.reduce((s, sg) => s + len(sg), 0);
    if (b >= 4) note('many-bends', `${r.id} (${b})`);
    // Hook: the edge leaves one way and arrives travelling the opposite way.
    if (r.segs.length >= 3 && dir(r.segs[0]) === opposite[dir(r.segs.at(-1))]) {
      hooks++;
      note('hook', `${r.id} ${r.source}→${r.target}`);
    }
    // Edge through an unrelated leaf.
    for (const n of leaves) {
      if (n.id === r.source || n.id === r.target) continue;
      if (r.segs.some(sg => segHitsRect(sg, shrink(n, 2))))
        note('edge-through-node', `${r.id} through ${n.id}`);
    }
    // Edge through a group that holds neither endpoint.
    for (const g of groups) {
      const holds = id => id === g.id || ancestors(id).includes(g.id);
      if (holds(r.source) || holds(r.target)) continue;
      if (r.segs.some(sg => segHitsRect(sg, shrink(g, 4))))
        note('edge-through-group', `${r.id} through ${g.id}`);
    }
  }

  // Clearance: a line running alongside a box, a group border or another line, close enough that
  // a reader can't tell which is which. Only parallel runs count; crossing a border is fine.
  const sides = r => [
    { axis: 'v', at: r.x, from: r.y, to: r.y + r.h, out: -1 },
    { axis: 'v', at: r.x + r.w, from: r.y, to: r.y + r.h, out: 1 },
    { axis: 'h', at: r.y, from: r.x, to: r.x + r.w, out: -1 },
    { axis: 'h', at: r.y + r.h, from: r.x, to: r.x + r.w, out: 1 },
  ];
  const straight = ([a, b]) =>
    Math.abs(a.x - b.x) < EPS
      ? { axis: 'v', at: a.x, from: Math.min(a.y, b.y), to: Math.max(a.y, b.y) }
      : Math.abs(a.y - b.y) < EPS
        ? { axis: 'h', at: a.y, from: Math.min(a.x, b.x), to: Math.max(a.x, b.x) }
        : null;
  const alongside = (s, t) =>
    s.axis === t.axis ? Math.min(s.to, t.to) - Math.max(s.from, t.from) : 0;
  for (const r of routes) {
    const runs = r.segs.map(straight).filter(Boolean);
    for (const n of leaves) {
      const close = runs.some(s =>
        sides(n).some(side => {
          const d = (s.at - side.at) * side.out;
          return d > EPS && d < 15 && alongside(s, side) > 16;
        }),
      );
      if (close) note('edge-hugs-node', `${r.id} along ${n.id}`);
    }
    for (const g of groups) {
      const close = runs.some(s =>
        sides(g).some(side => Math.abs(s.at - side.at) < 8 && alongside(s, side) > 20),
      );
      if (close) note('edge-on-group-border', `${r.id} along ${g.id}`);
    }
  }
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const a = routes[i].segs.map(straight).filter(Boolean),
        b = routes[j].segs.map(straight).filter(Boolean);
      const close = a.some(s =>
        b.some(t => {
          const d = Math.abs(s.at - t.at);
          return d >= 2 && d < 10 && alongside(s, t) > 20;
        }),
      );
      if (close) note('edges-too-close', `${routes[i].id} & ${routes[j].id}`);
    }
  }

  // Orderliness: does routing look drawn on purpose? Lines sharing a corridor should keep one
  // pitch, edges fanning out of (or into) one side should turn at the same place, ports on a
  // side should be spread evenly, and no edge should carry a tiny zigzag.
  const allRuns = routes.flatMap(r =>
    r.segs
      .map(straight)
      .filter(s => s && s.to - s.from > 12)
      .map(s => ({ ...s, edge: r.id })),
  );
  for (const axis of ['h', 'v']) {
    const runs = allRuns.filter(s => s.axis === axis).sort((a, b) => a.at - b.at);
    const seen = new Set();
    for (const seed of runs) {
      if (seen.has(seed)) continue;
      const corridor = [seed];
      seen.add(seed);
      for (let k = 0; k < corridor.length; k++) {
        for (const s of runs) {
          if (seen.has(s) || s.edge === corridor[k].edge) continue;
          if (Math.abs(s.at - corridor[k].at) <= 40 && alongside(s, corridor[k]) > 0) {
            corridor.push(s);
            seen.add(s);
          }
        }
      }
      const lines = [...new Set(corridor.map(s => Math.round(s.at)))].sort((a, b) => a - b);
      if (lines.length < 3) continue;
      const gaps = lines.slice(1).map((v, i) => v - lines[i]);
      if (
        Math.max(...gaps) > 1.6 * Math.min(...gaps) &&
        Math.max(...gaps) - Math.min(...gaps) > 6
      ) {
        note('uneven-channel', `${axis === 'v' ? 'x' : 'y'}≈${lines[0]}: gaps ${gaps.join('/')}`);
      }
    }
  }
  const fans = new Map();
  for (const r of routes) {
    if (r.segs.length < 3) continue;
    const first = r.segs[0],
      last = r.segs.at(-1);
    const out = `${r.source}|out|${dir(first)}`,
      into = `${r.target}|in|${dir(last)}`;
    const firstTurn = 'RL'.includes(dir(first)) ? first[1].x : first[1].y;
    const lastTurn = 'RL'.includes(dir(last)) ? last[0].x : last[0].y;
    (fans.get(out) ?? fans.set(out, []).get(out)).push(firstTurn);
    (fans.get(into) ?? fans.set(into, []).get(into)).push(lastTurn);
  }
  for (const [key, turns] of fans) {
    const distinct = [...new Set(turns.map(t => Math.round(t / 3)))];
    if (turns.length >= 2 && distinct.length > 1) {
      note(
        'ragged-bends',
        `${key.replace(/\|/g, ' ')}: turns at ${turns.map(Math.round).join(', ')}`,
      );
    }
  }
  const ports = new Map();
  for (const r of routes) {
    for (const [id, p] of [
      [r.source, r.points[0]],
      [r.target, r.points.at(-1)],
    ]) {
      const n = byId.get(id);
      if (!n || !p) continue;
      const side =
        Math.abs(p.x - n.x) < 2
          ? 'left'
          : Math.abs(p.x - n.x - n.w) < 2
            ? 'right'
            : Math.abs(p.y - n.y) < 2
              ? 'top'
              : Math.abs(p.y - n.y - n.h) < 2
                ? 'bottom'
                : null;
      // A port on a diamond's slanted face is on no side of the box.
      if (!side) continue;
      const along = side === 'left' || side === 'right' ? p.y - n.y : p.x - n.x;
      const key = `${id}|${side}`;
      (ports.get(key) ?? ports.set(key, []).get(key)).push(along);
    }
  }
  for (const [key, list] of ports) {
    const [id, side] = key.split('|');
    const n = byId.get(id);
    const span = side === 'left' || side === 'right' ? n.h : n.w;
    const at = [...new Set(list.map(Math.round))].sort((a, b) => a - b);
    if (at.length < 2) continue;
    // Ports bunched around the middle are a deliberate style; lopsided ones are not.
    const offset = at.reduce((t, p) => t + p, 0) / at.length - span / 2;
    if (Math.abs(offset) > Math.max(8, span * 0.1)) {
      note('uneven-ports', `${id} ${side}: ${at.join(', ')} of ${Math.round(span)}`);
    }
  }
  for (const r of routes) {
    const inner = r.segs.slice(1, -1);
    if (inner.some(sg => len(sg) > 0 && len(sg) < 12))
      note('jog', `${r.id} has a ${Math.round(Math.min(...inner.map(len)))}px step`);
  }

  // Container fit: a group should wrap its contents with the same padding on every side, and
  // every group in a drawing should use the same padding. The top holds the title, so it is
  // compared across groups rather than with the other sides.
  const pads = [];
  for (const g of groups) {
    const kids = geo.nodes.filter(n => n.parent === g.id);
    if (!kids.length) continue;
    const x0 = Math.min(...kids.map(k => k.x)),
      y0 = Math.min(...kids.map(k => k.y)),
      x1 = Math.max(...kids.map(k => k.x + k.w)),
      y1 = Math.max(...kids.map(k => k.y + k.h));
    const pad = {
      id: g.id,
      left: Math.round(x0 - g.x),
      right: Math.round(g.x + g.w - x1),
      top: Math.round(y0 - g.y),
      bottom: Math.round(g.y + g.h - y1),
    };
    pads.push(pad);
    const sides3 = [pad.left, pad.right, pad.bottom];
    if (Math.max(...sides3) - Math.min(...sides3) > 12) {
      note('uneven-padding', `${g.id} left ${pad.left}, right ${pad.right}, bottom ${pad.bottom}`);
    }
  }
  for (const side of ['left', 'top']) {
    const values = pads.map(p => p[side]);
    if (values.length > 1 && Math.max(...values) - Math.min(...values) > 8) {
      note(
        'padding-varies',
        `${side} padding ${Math.min(...values)}–${Math.max(...values)} across groups`,
      );
    }
  }

  // Crossings and unrelated shared segments.
  let crossings = 0;
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const a = routes[i],
        b = routes[j];
      const related =
        a.source === b.source ||
        a.target === b.target ||
        a.source === b.target ||
        a.target === b.source;
      let overlap = 0;
      for (const s of a.segs) {
        for (const t of b.segs) {
          if (segsCross(s, t)) crossings++;
          overlap += collinearOverlap(s, t);
        }
      }
      if (overlap > 12 && !related)
        note('shared-segment', `${a.id} & ${b.id} (${Math.round(overlap)}px)`);
    }
  }

  // Edges against the reading direction.
  const flowDir =
    direction ??
    (() => {
      let h = 0,
        v = 0;
      for (const r of routes) {
        const s = byId.get(r.source),
          t = byId.get(r.target);
        if (!s || !t) continue;
        h += Math.abs(center(t).x - center(s).x);
        v += Math.abs(center(t).y - center(s).y);
      }
      return h >= v ? 'right' : 'down';
    })();
  // A folded flow wraps onto the next row (or column): an edge into a later row runs back along
  // the axis but forward in reading order, as `reads-x` reads it, so it is not a back edge.
  let backEdges = 0;
  const flowArrow = flowDir === 'right' ? 'R' : 'D';
  for (const r of routes) {
    const s = byId.get(r.source),
      t = byId.get(r.target);
    if (!s || !t) continue;
    const d = flowDir === 'right' ? center(t).x - center(s).x : center(t).y - center(s).y;
    const wraps = flowDir === 'right' ? t.y >= s.y + s.h - EPS : t.x >= s.x + s.w - EPS;
    r.wrap = d < -20 && wraps;
    r.back = d < -20 && !wraps;
    if (r.back) backEdges++;
    // Off-axis port: in a layout with a declared direction, a forward edge should arrive travelling
    // that way (into a child's top in a downward tree) and never leave against it. A side entry
    // reads as a sibling link.
    if (direction && d > 20 && r.segs.length) {
      if (dir(r.segs.at(-1)) !== flowArrow)
        note('off-axis-port', `${r.id} ${r.source}→${r.target} arrives sideways`);
      else if (dir(r.segs[0]) === opposite[flowArrow])
        note('off-axis-port', `${r.id} ${r.source}→${r.target} leaves backwards`);
    }
  }

  // Labels.
  const labels = parseLabels(svg);
  for (const [i, l] of labels.entries()) {
    for (const n of leaves) if (rectsOverlap(l, n)) note('label-on-node', `"${l.text}" on ${n.id}`);
    for (const g of groups) {
      const header = { x: g.x, y: g.y, w: g.w, h: 32 };
      if (rectsOverlap(l, header)) note('label-on-group-title', `"${l.text}" on ${g.id}`);
      const edgesCut = [
        { x: g.x - 1, y: g.y, w: 2, h: g.h },
        { x: g.x + g.w - 1, y: g.y, w: 2, h: g.h },
        { x: g.x, y: g.y - 1, w: g.w, h: 2 },
        { x: g.x, y: g.y + g.h - 1, w: g.w, h: 2 },
      ];
      if (edgesCut.some(c => rectsOverlap(l, c)))
        note('label-on-group-border', `"${l.text}" on ${g.id}`);
    }
    for (const m of labels.slice(i + 1))
      if (rectsOverlap(l, m)) note('label-overlap', `"${l.text}" × "${m.text}"`);
    const dist = Math.min(...segs(l.path).map(sg => pointSegDist(center(l), sg)));
    if (dist > l.h) note('label-detached', `"${l.text}" ${Math.round(dist)}px from its edge`);
    // Another edge running under the label.
    for (const r of routes) {
      if (
        r.points[0] &&
        l.path[0] &&
        Math.abs(r.points[0].x - l.path[0].x) < 1 &&
        Math.abs(r.points[0].y - l.path[0].y) < 1
      )
        continue;
      if (r.segs.some(sg => segHitsRect(sg, shrink(l, 1))))
        note('label-on-edge', `"${l.text}" over ${r.id}`);
    }
  }

  // Dead space: wide empty bands across the drawing, and edges far longer than the rest.
  for (const axis of ['x', 'y']) {
    const size = axis === 'x' ? 'w' : 'h';
    const spans = geo.nodes.map(n => [n[axis], n[axis] + n[size]]).sort((a, b) => a[0] - b[0]);
    let reach = spans[0]?.[1] ?? 0;
    for (const [start, end] of spans.slice(1)) {
      if (start - reach > 120)
        note(
          'empty-band',
          `${axis === 'x' ? 'column' : 'row'} ${Math.round(start - reach)}px at ${axis}=${Math.round(reach)}`,
        );
      reach = Math.max(reach, end);
    }
  }
  const lengths = routes.map(r => r.segs.reduce((sum, sg) => sum + len(sg), 0));
  const median = [...lengths].sort((a, b) => a - b)[Math.floor(lengths.length / 2)] ?? 0;
  for (const [i, r] of routes.entries()) {
    // A return edge in a cycle, or a fold's wrap onto the next row, is long by nature; only
    // forward edges count.
    if (!r.back && !r.wrap && lengths[i] > 400 && lengths[i] > 4 * median)
      note('long-edge', `${r.id} ${Math.round(lengths[i])}px (median ${Math.round(median)})`);
  }

  // Anything drawn outside the SVG's viewBox is cut off in every export.
  const vb = svg
    .match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/)
    ?.slice(1)
    .map(Number);
  if (vb) {
    const frame = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    const out = p =>
      p.x < frame.x || p.y < frame.y || p.x > frame.x + frame.w || p.y > frame.y + frame.h;
    for (const r of routes) if (r.points.some(out)) note('clipped', `edge ${r.id}`);
    for (const l of labels) {
      if (out({ x: l.x, y: l.y }) || out({ x: l.x + l.w, y: l.y + l.h }))
        note('clipped', `label "${l.text}"`);
    }
  }

  // Color: text must read on its fill (4.5:1), connections on the canvas (3:1).
  const colors = parseColors(svg);
  for (const p of colors.pairs)
    if (p.ratio < 4.5) note('low-contrast', `"${p.text}" ${p.ink} on ${p.fill} (${p.ratio})`);
  if (colors.connectionContrast !== undefined && colors.connectionContrast < 3) {
    note('low-contrast', `connections on canvas (${colors.connectionContrast})`);
  }

  // Shape of the whole drawing.
  const xs = geo.nodes.flatMap(n => [n.x, n.x + n.w]),
    ys = geo.nodes.flatMap(n => [n.y, n.y + n.h]);
  const width = Math.max(...xs) - Math.min(...xs),
    height = Math.max(...ys) - Math.min(...ys);
  const leafArea = leaves.reduce((s, n) => s + n.w * n.h, 0);
  const aligned = leaves.filter(a =>
    leaves.some(
      b =>
        b !== a &&
        (Math.abs(center(a).x - center(b).x) < 2 || Math.abs(center(a).y - center(b).y) < 2),
    ),
  ).length;

  const count = kind => issues.filter(i => i.kind === kind).length;
  const counts = Object.fromEntries(
    [
      'node-overlap',
      'edge-through-node',
      'label-on-node',
      'label-overlap',
      'label-on-edge',
      'label-on-group-title',
      'label-on-group-border',
      'label-detached',
      'hook',
      'shared-segment',
      'edge-through-group',
      'many-bends',
      'low-contrast',
      'clipped',
      'empty-band',
      'long-edge',
      'expectation-failed',
      'edge-hugs-node',
      'edge-on-group-border',
      'edges-too-close',
      'uneven-channel',
      'ragged-bends',
      'uneven-ports',
      'off-axis-port',
      'jog',
      'uneven-padding',
      'padding-varies',
    ].map(k => [k, count(k)]),
  );
  // Weighted defect index; hard defects dominate. Normalized per 10 edges so sizes compare.
  const weights = {
    'node-overlap': 10,
    'edge-through-node': 8,
    'label-on-node': 6,
    'label-overlap': 6,
    'label-on-edge': 3,
    'label-on-group-title': 3,
    'label-on-group-border': 1,
    'label-detached': 3,
    hook: 3,
    'shared-segment': 3,
    'edge-through-group': 2,
    'many-bends': 1,
    'low-contrast': 2,
    clipped: 8,
    'empty-band': 2,
    'long-edge': 1,
    'expectation-failed': 4,
    'edge-hugs-node': 1,
    'edge-on-group-border': 1,
    'edges-too-close': 2,
    'uneven-channel': 1,
    'ragged-bends': 1,
    'uneven-ports': 1,
    'off-axis-port': 1,
    jog: 1,
    'uneven-padding': 2,
    'padding-varies': 2,
  };
  const raw =
    Object.entries(counts).reduce((s, [k, v]) => s + v * weights[k], 0) +
    crossings * 1 +
    backEdges * 0.5;
  const defectIndex = +(raw / Math.max(1, routes.length / 10)).toFixed(1);

  const expectations = [...source.matchAll(/^\s*#\s*expect\s+(.+)$/gm)].map(m => m[1].trim());

  return {
    file: path.basename(file),
    expectations,
    nodes: leaves.length,
    groups: groups.length,
    edges: routes.length,
    warnings,
    flowDir,
    width,
    height,
    aspect: +(width / Math.max(1, height)).toFixed(2),
    density: +(leafArea / Math.max(1, width * height)).toFixed(3),
    aligned: +(aligned / Math.max(1, leaves.length)).toFixed(2),
    crossings,
    bends,
    bendsPerEdge: +(bends / Math.max(1, routes.length)).toFixed(2),
    maxBends,
    hooks,
    backEdges,
    edgeLengthPerEdge: Math.round(totalLen / Math.max(1, routes.length)),
    theme: source.match(/^theme\s+(\S+)/m)?.[1] ?? 'graphite',
    fills: colors.fills.length,
    minTextContrast: Math.min(...colors.pairs.map(p => p.ratio)),
    counts,
    defectIndex,
    issues,
    geo,
  };
}

/** How much did the drawing move between two versions? Only objects present in both count. */
function stability(a, b) {
  const pos = m => new Map(m.geo.nodes.map(n => [n.id, center(n)]));
  const pa = pos(a),
    pb = pos(b);
  const shared = [...pa.keys()].filter(id => pb.has(id));
  const moves = shared.map(id =>
    Math.hypot(pb.get(id).x - pa.get(id).x, pb.get(id).y - pa.get(id).y),
  );
  // Movement after removing the median shift: a drawing that slid as a whole kept its shape.
  const median = values => [...values].sort((x, y) => x - y)[Math.floor(values.length / 2)] ?? 0;
  const sx = median(shared.map(id => pb.get(id).x - pa.get(id).x)),
    sy = median(shared.map(id => pb.get(id).y - pa.get(id).y));
  const aligned = shared.map(id =>
    Math.hypot(pb.get(id).x - pa.get(id).x - sx, pb.get(id).y - pa.get(id).y - sy),
  );
  let flips = 0;
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      const p = pa.get(shared[i]),
        q = pa.get(shared[j]),
        r = pb.get(shared[i]),
        s = pb.get(shared[j]);
      const fx =
        Math.abs(q.x - p.x) > 20 &&
        Math.abs(s.x - r.x) > 20 &&
        Math.sign(q.x - p.x) !== Math.sign(s.x - r.x);
      const fy =
        Math.abs(q.y - p.y) > 20 &&
        Math.abs(s.y - r.y) > 20 &&
        Math.sign(q.y - p.y) !== Math.sign(s.y - r.y);
      if (fx || fy) flips++;
    }
  }
  return {
    shared: shared.length,
    meanMove: Math.round(moves.reduce((s, m) => s + m, 0) / Math.max(1, moves.length)),
    maxMove: Math.round(Math.max(0, ...moves)),
    moved: moves.filter(m => m > 24).length,
    alignedMean: Math.round(aligned.reduce((t, m) => t + m, 0) / Math.max(1, aligned.length)),
    alignedMoved: aligned.filter(m => m > 24).length,
    orderFlips: flips,
  };
}

/** Check a version's `# expect` lines. `prev` is the version before it, for `still`. */
function checkExpectations(r, prev) {
  const rect = new Map(r.geo.nodes.map(n => [n.id, n]));
  const was = new Map((prev?.geo.nodes ?? []).map(n => [n.id, center(n)]));
  return r.expectations.map(line => {
    const [kind, ...ids] = line.split(/\s+/);
    const need = ids.filter(id => !/^\d+$/.test(id) && id !== '*');
    const missing = need.filter(id => !rect.has(id));
    if (missing.length) return { line, pass: false, why: `unknown ${missing.join(', ')}` };
    const [a, b] = need.map(id => rect.get(id));
    const gap = () =>
      Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const moved = id =>
      was.has(id)
        ? Math.hypot(center(rect.get(id)).x - was.get(id).x, center(rect.get(id)).y - was.get(id).y)
        : 0;
    const run = (axis, list) =>
      list.every(
        (id, i) => i === 0 || center(rect.get(list[i - 1]))[axis] < center(rect.get(id))[axis],
      );
    switch (kind) {
      case 'left-of':
        return { line, pass: a.x + a.w <= b.x };
      case 'right-of':
        return { line, pass: b.x + b.w <= a.x };
      case 'above':
        return { line, pass: a.y + a.h <= b.y };
      case 'below':
        return { line, pass: b.y + b.h <= a.y };
      case 'order-x':
        return { line, pass: run('x', need) };
      case 'order-y':
        return { line, pass: run('y', need) };
      case 'aligned-x':
        return {
          line,
          pass: need.every(id => Math.abs(center(rect.get(id)).x - center(a).x) <= 4),
        };
      case 'aligned-y':
        return {
          line,
          pass: need.every(id => Math.abs(center(rect.get(id)).y - center(a).y) <= 4),
        };
      case 'near': {
        const limit = Number(ids.find(id => /^\d+$/.test(id)) ?? 80);
        return { line, pass: gap() <= limit, why: `gap ${Math.round(gap())}px` };
      }
      case 'still': {
        const list = ids.includes('*') ? [...was.keys()].filter(id => rect.has(id)) : need;
        const off = list.filter(id => moved(id) > 24);
        return {
          line,
          pass: off.length === 0,
          why: off.length ? `moved: ${off.join(', ')}` : undefined,
        };
      }
      case 'reads-x':
      case 'reads-y': {
        // Reading order with wraps: each next object is further along the axis in the same band,
        // or starts a new band further across, like lines of text.
        // Text-like: a step forward along the axis is reading on; a step back along it must go
        // down (or right, for columns) to the next band.
        const [along, across] = kind === 'reads-x' ? ['x', 'y'] : ['y', 'x'];
        let along_ = 0,
          wraps = 0;
        const ok = need.every((id, i) => {
          if (i === 0) return true;
          const p = center(rect.get(need[i - 1])),
            q = center(rect.get(id));
          if (q[along] > p[along] + 4) return ++along_ > 0;
          wraps++;
          return q[across] > p[across];
        });
        // A single line across the axis (a column for reads-x) is not reading along it.
        return { line, pass: ok && along_ >= wraps, why: `${along_} along, ${wraps} wraps` };
      }
      case 'keeps-order': {
        const flips = r.stabilityFromPrev?.orderFlips ?? 0;
        return { line, pass: flips === 0, why: `${flips} order flips` };
      }
      case 'back-edges':
        return { line, pass: r.backEdges <= Number(ids[0] ?? 0), why: `${r.backEdges} back edges` };
      default:
        return { line, pass: false, why: 'unknown expectation' };
    }
  });
}

// ---------- run ----------
fs.mkdirSync(outDir, { recursive: true });
const slugs = fs
  .readdirSync(corpusDir)
  .filter(s => fs.statSync(path.join(corpusDir, s)).isDirectory())
  .filter(s => !only || only.includes(s))
  .sort();

const rows = [];
/**
 * Sheets are 1000 CSS px wide, so the 2x PNG is 2000px: what a reviewer sees without
 * downscaling. The column count is the one that leaves each card largest once the whole sheet
 * fits a 2000x2000 view.
 */
const SHEET_WIDTH = 1000;
function sheetCols(renders, cards) {
  const aspects = renders.filter(r => !r.error).map(r => r.aspect);
  const aspect = aspects.reduce((a, b) => a + b, 0) / Math.max(1, aspects.length) || 1;
  let best = 1;
  let bestWidth = 0;
  for (let cols = 1; cols <= cards; cols++) {
    const card = (SHEET_WIDTH - 32 - 16 * (cols - 1)) / cols;
    const height = 32 + Math.ceil(cards / cols) * (card / aspect + 30) + 16;
    const shown = card / Math.max(1, height / SHEET_WIDTH);
    if (shown > bestWidth) [best, bestWidth] = [cols, shown];
  }
  return best;
}

for (const slug of slugs) {
  const dir = path.join(corpusDir, slug);
  const variants = fs
    .readdirSync(dir)
    .filter(f => /^(v0|e\d+)\.draft$/.test(f))
    .sort((a, b) =>
      a === 'v0.draft'
        ? -1
        : b === 'v0.draft'
          ? 1
          : a.localeCompare(b, undefined, { numeric: true }),
    );
  const results = variants.map(v => measure(path.join(dir, v)));
  for (const [i, r] of results.entries()) {
    if (r.error || i === 0 || results[i - 1].error) continue;
    r.stabilityFromPrev = stability(results[i - 1], r);
    r.stabilityFromV0 = stability(results[0], r);
  }
  for (const [i, r] of results.entries()) {
    if (r.error) continue;
    r.checks = checkExpectations(r, i > 0 && !results[i - 1].error ? results[i - 1] : undefined);
    for (const c of r.checks)
      if (!c.pass)
        r.issues.push({
          kind: 'expectation-failed',
          detail: `${c.line}${c.why ? ` (${c.why})` : ''}`,
        });
    // A missed request counts like the other defects (weight 4 per 10 edges).
    const failed = r.checks.filter(c => !c.pass).length;
    r.counts['expectation-failed'] = failed;
    r.defectIndex = +(r.defectIndex + (failed * 4) / Math.max(1, r.edges / 10)).toFixed(1);
  }
  const before =
    baseline && fs.existsSync(path.join(baseline, slug, 'metrics.json'))
      ? JSON.parse(fs.readFileSync(path.join(baseline, slug, 'metrics.json'), 'utf8'))
      : [];
  for (const r of results) {
    const old = before.find(b => b.file === r.file && !b.error);
    if (old && !r.error) r.baselineDI = old.defectIndex;
  }
  const outSlug = path.join(outDir, slug);
  fs.mkdirSync(outSlug, { recursive: true });
  fs.writeFileSync(
    path.join(outSlug, 'metrics.json'),
    JSON.stringify(
      results.map(({ geo: _geo, ...r }) => r),
      null,
      2,
    ),
  );
  if (!noShots) {
    for (const v of variants) {
      execFileSync(
        process.execPath,
        [
          path.join(root, 'scripts/shoot.mjs'),
          path.join(dir, v),
          path.join(outSlug, v.replace('.draft', '.png')),
        ],
        { stdio: 'ignore' },
      );
    }
    if (variants.length > 1) {
      const cards = variants.map(v => `${slug} ${v.replace('.draft', '')}::${path.join(dir, v)}`);
      execFileSync(
        process.execPath,
        [
          path.join(root, 'scripts/shoot.mjs'),
          '--sheet',
          path.join(outSlug, 'sheet.png'),
          '--size',
          `${SHEET_WIDTH}x800`,
          '--cols',
          String(sheetCols(results, variants.length)),
          ...cards,
        ],
        { stdio: 'ignore' },
      );
    }
  }
  if (!noShots && baseline) {
    for (const v of variants) {
      const png = v.replace('.draft', '.png');
      const old = path.join(baseline, slug, png);
      if (!fs.existsSync(old)) continue;
      execFileSync(
        process.execPath,
        [
          path.join(root, 'scripts/shoot.mjs'),
          '--sheet',
          path.join(outSlug, `compare-${png}`),
          '--size',
          `${SHEET_WIDTH}x800`,
          '--cols',
          String(
            sheetCols(
              results.filter(r => r.file === v),
              2,
            ),
          ),
          `before ${slug} ${v}::${old}`,
          `after ${slug} ${v}::${path.join(outSlug, png)}`,
        ],
        { stdio: 'ignore' },
      );
    }
  }
  for (const r of results) rows.push({ slug, ...r });
  console.log(
    `${slug}: ${results.map(r => (r.error ? `${r.file} ERROR` : `${r.file} DI=${r.defectIndex}`)).join(', ')}`,
  );
}

const fmtStab = s =>
  s
    ? `${s.meanMove}/${s.maxMove}px, ${s.moved} moved (${s.alignedMoved} after shift), ${s.orderFlips} flips`
    : '';
const lines = [
  '| Diagram | Ver | Theme | Fills | N/G/E | Aspect | Cross | Bends/e | Hooks | Back | Hard | Label | Route | Clear | Order | Fit | Space | Expect | DI | Base DI | Δ prev (mean/max) |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(r => {
    if (r.error) return `| ${r.slug} | ${r.file} | ERROR | | | | | | | | | | | | | | | | | | |`;
    const c = r.counts;
    const hard = c['node-overlap'] + c['edge-through-node'] + c.clipped;
    const label =
      c['label-on-node'] +
      c['label-overlap'] +
      c['label-on-edge'] +
      c['label-on-group-title'] +
      c['label-detached'] +
      c['label-on-group-border'];
    const route = c['shared-segment'] + c['edge-through-group'] + c['many-bends'];
    const clear = c['edge-hugs-node'] + c['edge-on-group-border'] + c['edges-too-close'];
    const order =
      c['uneven-channel'] + c['ragged-bends'] + c['uneven-ports'] + c['off-axis-port'] + c.jog;
    const fit = c['uneven-padding'] + c['padding-varies'];
    return `| ${r.slug} | ${r.file.replace('.draft', '')} | ${r.theme} | ${r.fills} | ${r.nodes}/${r.groups}/${r.edges} | ${r.aspect} | ${r.crossings} | ${r.bendsPerEdge} | ${r.hooks} | ${r.backEdges} | ${hard} | ${label} | ${route} | ${clear} | ${order} | ${fit} | ${c['empty-band'] + c['long-edge']} | ${r.checks.length ? `${r.checks.filter(x => x.pass).length}/${r.checks.length}` : ''} | ${r.defectIndex} | ${r.baselineDI ?? ''} | ${fmtStab(r.stabilityFromPrev)} |`;
  }),
];
const ok = rows.filter(r => !r.error);
const totals = {};
for (const r of ok) for (const i of r.issues) totals[i.kind] = (totals[i.kind] ?? 0) + 1;
lines.push(
  '',
  `Mean defect index: ${(ok.reduce((s, r) => s + r.defectIndex, 0) / Math.max(1, ok.length)).toFixed(1)} over ${ok.length} renders.`,
  '',
  '| Issue | Count |',
  '| --- | --- |',
  ...Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`),
);
fs.writeFileSync(path.join(outDir, 'summary.md'), lines.join('\n') + '\n');
console.log(`\nWrote ${path.join(outDir, 'summary.md')}`);
