#!/usr/bin/env node
/**
 * Router-only harness: times `route()` from the built `@draftably/runtime/route` on schema-like
 * drawings, with cards in five fixed columns and lines from row to row, and reports the entry's
 * minified size.
 *
 * Usage: pnpm bench:route [--runs N]
 *
 * Each run routes a new seeded schema, so the router's cache never helps. Fails (exit 1) when a
 * line runs through a card under `avoidNodes: 'strict'`, a line misses its row, or the same input
 * draws differently.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { schema } from './route-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entry = path.join(root, 'packages/runtime/dist/route.js');
const { route } = await import(entry);
const i = process.argv.indexOf('--runs'),
  runs = i > 0 ? Number(process.argv[i + 1]) : 5;

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
for (const quality of ['quick', 'full'])
  for (const lines of [10, 30, 60]) {
    const times = [];
    let blocked = 0;
    for (let r = 0; r < runs; r++) {
      const g = schema(lines, 101 + r),
        routing = { quality, avoidNodes: 'strict' },
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
