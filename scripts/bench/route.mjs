#!/usr/bin/env node
/**
 * Router-only harness: times `route()` from the built `@draftably/runtime/route` on schema-like
 * drawings, with cards in five fixed columns and lines from row to row, and reports the entry's
 * minified size.
 *
 * Usage: pnpm bench:route [--runs N] [--quality resize|quick|full] [--sweep]
 * --sweep moves the columns of each 60-line schema through twelve widths (three seeds by default).
 *
 * Each run routes a new seeded schema, so the router's cache never helps. Fails (exit 1) when a
 * line runs through a card under `avoidNodes: 'strict'`, a line misses its row, or the same input
 * draws differently.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entry = path.join(root, 'packages/runtime/dist/route.js');
const { route } = await import(entry);
const sweep = process.argv.includes('--sweep');
const i = process.argv.indexOf('--runs');
const runs = i > 0 ? Number(process.argv[i + 1]) : sweep ? 3 : 5;
if (!Number.isInteger(runs) || runs < 1) throw Error('--runs needs a positive integer');

const HEADER = 46,
  ROW = 26;
const field = k => HEADER + (k + 0.5) * ROW;

/**
 * Three columns of table cards (2–7 fields) and two of analysis cards, six cards each. A quarter
 * of `lines` join two table rows in one column or the next; the rest run from a table's header
 * to an analysis's header.
 */
export function schema(lines, seed) {
  const rand = n => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  const nodes = [],
    edges = [],
    cols = [];
  for (let c = 0; c < 5; c++) {
    let y = 0;
    cols.push([]);
    for (let r = 0; r < 6; r++) {
      const rows = c < 3 ? 2 + rand(6) : 0,
        n = { id: `c${c}r${r}`, x: c * 320, y, width: 220, height: HEADER + rows * ROW };
      nodes.push(n);
      cols[c].push(n);
      y += n.height + 48;
    }
  }
  const rows = n => (n.height - HEADER) / ROW;
  let k = 0;
  while (edges.length < Math.round(lines * 0.4)) {
    const c = rand(3),
      a = cols[c][rand(6)],
      next = rand(3) !== 0 && c < 2,
      b = cols[c + (next ? 1 : 0)][rand(6)];
    if (a === b) continue;
    const side = next || rand(2) ? 'right' : 'left';
    edges.push({
      id: `rel${k++}`,
      source: a.id,
      target: b.id,
      sourceSide: side,
      targetSide: next ? 'left' : side,
      sourceAt: field(rand(rows(a))),
      targetAt: field(rand(rows(b))),
    });
  }
  while (edges.length < lines) {
    const a = cols[rand(3)][rand(6)],
      b = cols[3 + rand(2)][rand(6)];
    edges.push({
      id: `use${k++}`,
      source: a.id,
      target: b.id,
      sourceSide: 'right',
      targetSide: 'left',
      sourceAt: HEADER / 2,
      targetAt: HEADER / 2,
    });
  }
  return { nodes, edges };
}

const through = (ps, n) =>
  ps
    .slice(1)
    .some(
      (b, j) =>
        Math.max(ps[j].x, b.x) > n.x + 0.5 &&
        Math.min(ps[j].x, b.x) < n.x + n.width - 0.5 &&
        Math.max(ps[j].y, b.y) > n.y + 0.5 &&
        Math.min(ps[j].y, b.y) < n.y + n.height - 0.5,
    );

const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
let failed = false;
const rowsOut = [];
// Warm the engine once, as a host that reroutes on every resize has.
route({ ...schema(30, 999), routing: { quality: 'full' } });
const q = process.argv.indexOf('--quality');
const qualities = q > 0 ? [process.argv[q + 1]] : ['quick', 'full'];
if (qualities.some(q => !['resize', 'quick', 'full'].includes(q))) throw Error('Unknown quality');
for (const quality of qualities)
  for (const lines of sweep ? [60] : [10, 30, 60]) {
    const times = [];
    let blocked = 0;
    for (let r = 0; r < runs * (sweep ? 12 : 1); r++) {
      const g = schema(lines, sweep ? 401 + Math.floor(r / 12) : 101 + r);
      if (sweep) {
        const pitch = 260 + (r % 12) * 10;
        for (const n of g.nodes) n.x = (n.x / 320) * pitch;
      }
      const routing = { quality, avoidNodes: 'strict' },
        t = performance.now(),
        out = route({ ...g, routing });
      times.push(performance.now() - t);
      const again = route({ ...g, routing });
      if (JSON.stringify(again) !== JSON.stringify(out)) {
        console.error(`${quality} ${lines}: the same input drew differently`);
        failed = true;
      }
      const byId = new Map(g.nodes.map(n => [n.id, n]));
      for (const e of g.edges) {
        const o = out.edges[e.id];
        if (o.blocked) {
          blocked++;
          continue;
        }
        if (g.nodes.some(n => through(o.points, n))) {
          console.error(`${quality} ${lines}: ${e.id} runs through a card`);
          failed = true;
        }
        const s = byId.get(e.source),
          d = byId.get(e.target);
        if (o.points[0].y !== s.y + e.sourceAt || o.points.at(-1).y !== d.y + e.targetAt) {
          console.error(`${quality} ${lines}: ${e.id} misses its row`);
          failed = true;
        }
      }
    }
    if (sweep) {
      const ordered = times.toSorted((a, b) => a - b);
      const p95 = ordered[Math.ceil(ordered.length * 0.95) - 1];
      console.log(
        `${quality} resize sweep: ${times.filter(t => t < 100).length}/${times.length} under 100 ms, p95 ${Math.round(p95)} ms`,
      );
    }
    rowsOut.push(
      `| ${quality} | 30 | ${lines} | ${Math.round(median(times))} | ${Math.round(Math.max(...times))} | ${blocked} |`,
    );
  }

const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  write: false,
});
const bytes = bundled.outputFiles[0].contents.length;
console.log(`\`@draftably/runtime/route\`: ${(bytes / 1024).toFixed(1)} KB minified.\n`);
console.log('| Quality | Cards | Lines | Median ms | Max ms | Blocked |');
console.log('| ------- | ----- | ----- | --------- | ------ | ------- |');
for (const row of rowsOut) console.log(row);
if (failed) process.exit(1);
