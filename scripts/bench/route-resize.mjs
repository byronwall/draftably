// pnpm bench:route:resize [--compact] [--holdout | --wide | --round2-heldout | --independent] [--picture --frame=60/401/1]
// Collect fresh drawings in a separate process so their cache cannot serve a resize call.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { route } from '../../packages/runtime/dist/route.js';
import { createContext } from '../../src/engines/routing/context.ts';
import { conflicts } from '../../src/engines/routing/conflicts.ts';
import { schema } from './route-schema.mjs';

const compact = process.argv.includes('--compact');
const reserved = process.argv.includes('--round2-heldout');
const round2 = reserved || process.argv.includes('--round2');
const wide = process.argv.includes('--wide');
const picture = process.argv.includes('--picture');
const holdout = process.argv.includes('--holdout');
const independent = process.argv.includes('--independent');
const sizes = independent ? [60] : [10, 30, 60];
const seeds = reserved
  ? [1103, 1129, 1151, 1171, 1193]
  : independent
    ? [101]
    : wide
      ? [701, 702, 703, 704, 705]
      : holdout
        ? [401, 402, 403, 404, 405]
        : [101, 102, 103, 104, 105];
const dir =
  (compact ? 'tmp/compact-grid' : 'tmp/route-resize') +
  (round2 ? '/round2' : '') +
  (reserved
    ? '/reserved'
    : wide
      ? '/wide'
      : independent
        ? '/independent'
        : holdout
          ? '/heldout'
          : '');
fs.mkdirSync(dir, { recursive: true });
// These twelve layouts and seeds were reserved before tuning the compact grid.
const steps = reserved
  ? [
      [320, 220],
      [355, 234],
      [429, 281],
      [458, 292],
      [343, 257],
      [268, 198],
      [218, 162],
      [207, 158],
      [241, 171],
      [297, 223],
      [438, 277],
      [367, 215],
      [279, 193],
    ]
  : wide
    ? [
        [320, 220],
        [374, 244],
        [392, 254],
        [414, 272],
        [384, 248],
        [306, 196],
        [258, 192],
        [246, 184],
        [230, 176],
        [254, 186],
        [312, 204],
        [382, 252],
        [402, 266],
      ]
    : [
        [320, 220],
        [326, 222],
        [340, 230],
        [352, 230],
        [360, 240],
        [344, 236],
        [330, 232],
        [310, 222],
        [295, 212],
        [282, 204],
        [270, 200],
        [298, 210],
        [322, 218],
      ];
const reference = process.argv.includes('--fresh');
const compare = process.argv.includes('--compare');
if (!reference && !compare && !picture) {
  const child = spawnSync(
    process.execPath,
    [import.meta.filename, '--fresh', ...process.argv.slice(2)],
    {
      stdio: 'inherit',
    },
  );
  if (child.status !== 0) process.exit(child.status ?? 1);
}
const filename = dir + '/reference.json';
const fresh = reference || picture ? {} : JSON.parse(fs.readFileSync(filename, 'utf8'));
const ctx = createContext({ nodes: [], edges: [], groups: [] }, {});
function measure(out) {
  const lines = Object.entries(out.edges).map(([id, r]) => ({ id, ...r }));
  const drawn = lines.filter(r => !r.blocked);
  const unrelated = drawn.reduce(
    (sum, r, i) =>
      sum +
      conflicts(
        r.points,
        drawn
          .slice(0, i)
          .filter(
            o =>
              ![o.source, o.target].includes(r.source) && ![o.source, o.target].includes(r.target),
          ),
      ).shared,
    0,
  );
  return { ...ctx.metrics(lines), total: ctx.total(lines), unrelated };
}
function svg(graph, out, { x, y, w, h }) {
  // Both panels use the same extent, with room for paths outside the card columns.
  const paths = Object.values(out.edges)
    .map(e => `<path d="${e.path}"/>`)
    .join('');
  const cards = graph.nodes
    .map(n => {
      const rows = Math.round((n.height - 46) / 26);
      const labels = Array.from(
        { length: rows },
        (_, i) => `<text x="${n.x + 10}" y="${n.y + 46 + i * 26 + 17}">field ${i + 1}</text>`,
      ).join('');
      return `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="3"/>
      <text class="title" x="${n.x + 10}" y="${n.y + 27}">${n.id}</text>${labels}`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">
    <style>text{font:12px system-ui;fill:#4a5968;stroke:none}.title{font-weight:650;fill:#1c3449}</style>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>
    <g stroke="#315d82" stroke-width="2" fill="none">${paths}</g>
    <g fill="#f3f6f8" stroke="#7c8e9d">${cards}</g></svg>`;
}
if (picture) {
  const frame = process.argv.find(a => a.startsWith('--frame='))?.slice(8) ?? '60/401/1';
  const [lines, seed, target] = frame.split('/').map(Number);
  assert.ok(
    frame.split('/').length === 3 &&
      sizes.includes(lines) &&
      Number.isInteger(seed) &&
      Number.isInteger(target) &&
      target > 0 &&
      target < steps.length,
    'Use --frame=lines/seed/step',
  );
  const base = schema(lines, seed);
  const routing = { quality: 'full', avoidNodes: 'strict' };
  const at = ([pitch, width]) => ({
    ...base,
    ...(compact && { resize: 'compact' }),
    routing,
    nodes: base.nodes.map(n => ({ ...n, x: (n.x / 320) * pitch, width })),
  });
  let before;
  for (const step of steps.slice(0, target)) before = route(at(step), before);
  const graph = at(steps[target]),
    moved = route(graph, before);
  const full = route(graph);
  const points = [
    ...graph.nodes.flatMap(n => [n, { x: n.x + n.width, y: n.y + n.height }]),
    ...[full, moved].flatMap(o => Object.values(o.edges).flatMap(e => e.points)),
  ];
  const x = Math.floor(Math.min(...points.map(p => p.x))) - 16,
    y = Math.floor(Math.min(...points.map(p => p.y))) - 16;
  const bounds = {
    x,
    y,
    w: Math.ceil(Math.max(...points.map(p => p.x))) - x + 16,
    h: Math.ceil(Math.max(...points.map(p => p.y))) - y + 16,
  };
  fs.writeFileSync(dir + '/fresh.svg', svg(graph, full, bounds));
  fs.writeFileSync(dir + '/reuse.svg', svg(graph, moved, bounds));
  console.log({
    fresh: measure(full),
    reuse: measure(moved),
    movedLines: Object.keys(before.edges).filter(
      id => JSON.stringify(before.edges[id].points) !== JSON.stringify(moved.edges[id].points),
    ).length,
  });
  process.exit(0);
}
// Positive control for the cost lower bound. Each row has its own pair of cards.
function separateRows(lines) {
  const nodes = [],
    edges = [];
  for (let i = 0; i < lines; i++) {
    const source = 'a' + i,
      target = 'b' + i;
    for (const [id, x] of [
      [source, 0],
      [target, 320],
    ])
      nodes.push({ id, x, y: i * 100, width: 220, height: 60 });
    edges.push({
      id: 'e' + i,
      source,
      target,
      sourceSide: 'right',
      targetSide: 'left',
      sourceAt: 30,
      targetAt: 30,
    });
  }
  return { nodes, edges };
}
const results = [];
route({ ...schema(30, 999), routing: { quality: 'full' } });
for (const lines of sizes)
  for (const seed of seeds) {
    const g = independent ? separateRows(lines) : schema(lines, seed);
    let previous;
    for (const [step, [pitch, width]] of steps.entries()) {
      const graph = {
        ...g,
        ...(compact && { resize: 'compact' }),
        nodes: g.nodes.map(n => ({ ...n, x: (n.x / 320) * pitch, width })),
        routing: { quality: 'full', avoidNodes: 'strict' },
      };
      const key = [lines, seed, step].join('/');
      const start = performance.now();
      const out = route(graph, reference ? undefined : previous);
      const ms = performance.now() - start;
      const score = measure(out);
      const boxes = new Map(graph.nodes.map(n => [n.id, n]));
      for (const edge of graph.edges) {
        const r = out.edges[edge.id];
        assert.ok(!r.blocked, key + ' blocked ' + edge.id);
        assert.equal(r.points[0].y, boxes.get(edge.source).y + edge.sourceAt);
        assert.equal(r.points.at(-1).y, boxes.get(edge.target).y + edge.targetAt);
        assert.ok(
          !graph.nodes.some(n =>
            r.points
              .slice(1)
              .some(
                (b, i) =>
                  Math.max(b.x, r.points[i].x) > n.x + 0.5 &&
                  Math.min(b.x, r.points[i].x) < n.x + n.width - 0.5 &&
                  Math.max(b.y, r.points[i].y) > n.y + 0.5 &&
                  Math.min(b.y, r.points[i].y) < n.y + n.height - 0.5,
              ),
          ),
          key,
        );
      }
      if (reference) fresh[key] = { score, ms };
      else if (step)
        results.push({ lines, seed, step, pitch, width, ms, score, fresh: fresh[key] });
      previous = out;
    }
    console.log(reference ? 'fresh' : 'reuse', lines, seed);
  }
fs.writeFileSync(
  reference ? filename : dir + '/replay.json',
  JSON.stringify(reference ? fresh : results),
);

if (!reference) {
  for (const lines of sizes) {
    const rows = results.filter(r => r.lines === lines);
    const times = rows.map(r => r.ms).sort((a, b) => a - b);
    const worse = rows.filter(
      r => r.score.total > r.fresh.score.total || r.score.unrelated > r.fresh.score.unrelated,
    );
    console.log({
      lines,
      calls: rows.length,
      median: (times[Math.floor((times.length - 1) / 2)] + times[Math.floor(times.length / 2)]) / 2,
      p95: times[Math.ceil(times.length * 0.95) - 1],
      max: times.at(-1),
      worse: worse.map(r => [
        r.seed,
        r.step,
        r.score.total - r.fresh.score.total,
        r.score.unrelated - r.fresh.score.unrelated,
      ]),
    });
    if (worse.length) process.exitCode = 1;
  }
}
