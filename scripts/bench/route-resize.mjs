// From the repository root, run pnpm runtime:build, then node scripts/bench/route-resize.mjs.
// Collect fresh drawings in a separate process so their cache cannot serve a resize call.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { route } from '../../packages/runtime/dist/route.js';
import { createContext } from '../../src/engines/routing/context.ts';
import { conflicts } from '../../src/engines/routing/conflicts.ts';
import { schema } from './route-schema.mjs';

const dir = 'tmp/route-resize';
fs.mkdirSync(dir, { recursive: true });
const steps = [
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
if (!reference && !compare) {
  const child = spawnSync(process.execPath, [import.meta.filename, '--fresh'], {
    stdio: 'inherit',
  });
  if (child.status !== 0) process.exit(child.status ?? 1);
}
const filename = dir + '/reference.json';
const fresh = reference ? {} : JSON.parse(fs.readFileSync(filename, 'utf8'));
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
function svg(graph, out) {
  const paths = Object.values(out.edges)
    .map(e => '<path d="' + e.path + '"/>')
    .join('');
  const boxes = graph.nodes
    .map(
      n =>
        '<rect x="' +
        n.x +
        '" y="' +
        n.y +
        '" width="' +
        n.width +
        '" height="' +
        n.height +
        '"/><text x="' +
        (n.x + 8) +
        '" y="' +
        (n.y + 23) +
        '">' +
        n.id +
        '</text>',
    )
    .join('');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1650" height="1500" viewBox="-70 -75 1650 1500"><rect x="-70" y="-75" width="100%" height="100%" fill="white"/><g fill="none" stroke="#345d80" stroke-width="2">' +
    paths +
    '</g><g fill="#f3f5f6" stroke="#62727c">' +
    boxes +
    '</g></svg>'
  );
}
const results = [];
route({ ...schema(30, 999), routing: { quality: 'full' } });
for (const lines of [10, 30, 60])
  for (const seed of [101, 102, 103, 104, 105]) {
    const g = schema(lines, seed);
    let previous;
    for (const [step, [pitch, width]] of steps.entries()) {
      const graph = {
        ...g,
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
      if (lines === 60 && seed === 101 && step === 9)
        fs.writeFileSync(dir + (reference ? '/fresh.svg' : '/reuse.svg'), svg(graph, out));
      previous = out;
    }
    console.log(reference ? 'fresh' : 'reuse', lines, seed);
  }
fs.writeFileSync(
  reference ? filename : dir + '/replay.json',
  JSON.stringify(reference ? fresh : results),
);
