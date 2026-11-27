import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scanNodeBorders } from './node-border.mjs';

function inspect(source, svg = false, options = []) {
  const args = [
    'scripts/draftably.mjs',
    'inspect',
    '/dev/stdin',
    ...(svg ? ['--svg'] : []),
    ...options,
  ];
  const result = spawnSync(process.execPath, args, { input: source, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return svg ? result.stdout : JSON.parse(result.stdout);
}

function gate(source, svg = inspect(source, true)) {
  const geo = inspect(source);
  const parents = new Set(geo.nodes.map(n => n.parent));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'border-emitted-'));
  try {
    fs.writeFileSync(path.join(dir, 'v0.svg'), svg);
    fs.writeFileSync(
      path.join(dir, 'metrics.json'),
      JSON.stringify([
        {
          file: 'v0.draft',
          nodes: geo.nodes.filter(n => !parents.has(n.id)).length,
          edges: geo.routes.length,
        },
      ]),
    );
    return spawnSync(process.execPath, ['scripts/audit-node-border.mjs', dir, '--check'], {
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
}

test('a linked text node does not become an extra edge', () => {
  const source = `node a "Docs" shape=text href="https://example.com/docs"
node b "Next"
edge e a -> b
layout root flow\n`;
  const svg = inspect(source, true);
  assert.deepEqual(scanNodeBorders(svg).routeIds, ['e']);
  const result = gate(source, svg);
  assert.equal(result.status, 0, result.stderr);
});

test('comparison projections check only edges whose endpoints exist in that panel', () => {
  const source = `compare "Before" "After"
node a "A"
node b "B"
+node c "C"
-node d "D"
edge e a -> b
edge intoNew b -> c
edge fromOld b -> d
layout root flow\n`;
  const svg = inspect(source, true);
  const result = gate(source, svg);
  assert.equal(result.status, 0, result.stderr);
  const pattern = /<g data-id="e"[^>]*>[\s\S]*?<\/g>/;
  assert.match(svg, pattern);
  const damaged = svg.replace(pattern, '');
  const failed = gate(source, damaged);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /panel 1 missing edge e/);
});

function markerSource(id, shape = 'marker') {
  return `node source "Sender"
group top "Seam group"
layout top cells
node tleft "L" in=top
node ${id} "Mark" shape=${shape} in=top
node tright "R" in=top
pin top x=72.5 y=130
group g "Cells"
layout g cells columns=4
node a "A" in=g
node b "B" in=g
node c "C" in=g
node d "D" in=g
node left "L" in=g
node target "T" in=g span=2
node right "R" in=g
node end "End" in=g span=4
size b width=73 height=32
pin source x=100 y=0
pin g x=0 y=200
edge e source -> target
layout root flow direction=down\n`;
}

test('marker IDs retain punctuation when painted strokes touch', () => {
  const results = ['mark', 'mark-', 'mark_'].map(id => {
    const source = markerSource(id);
    const svg = inspect(source, true);
    const hits = scanNodeBorders(svg).findings.filter(
      r => r.kind === 'paint-overlap' && r.node === id,
    );
    assert(hits.length > 0, `No marker hit for ${id}`);
    const result = gate(source, svg);
    assert.notEqual(result.status, 0);
    return hits.map(({ node: _node, ...rest }) => rest);
  });
  assert.deepEqual(results[1], results[0]);
  assert.deepEqual(results[2], results[0]);
});

test('comparison coverage follows projected routes when a group endpoint is not drawn', () => {
  const source = `compare "Before" "After"
group g "Group"
node a "A" in=g
node b "B"
edge e g -> b
layout root flow\n`;
  const svg = inspect(source, true);
  const scan = scanNodeBorders(svg);
  assert.deepEqual(scan.expectedRouteIds, []);
  const result = gate(source, svg);
  assert.equal(result.status, 0, result.stderr);
});

test('timeline connectors remain visible to the audit with marked edge strokes', () => {
  const source = fs.readFileSync('examples/roadmap.draft', 'utf8');
  const svg = inspect(source, true);
  const scan = scanNodeBorders(svg);
  assert.deepEqual(new Set(scan.routeIds), new Set(inspect(source).routes.map(r => r.id)));
  const result = gate(source, svg);
  assert.equal(result.status, 0, result.stderr);
});

test('quoted and unquoted marker shapes detect the same painted overlap, including legacy SVG', () => {
  const findings = ['marker', '"marker"'].map(shape => {
    const source = markerSource('mark-', shape);
    const svg = inspect(source, true);
    assert.match(svg, /class="node-marker"/);
    const hits = scanNodeBorders(svg).findings.filter(
      r => r.node === 'mark-' && r.kind === 'paint-overlap',
    );
    assert(hits.length > 0);
    assert.notEqual(gate(source, svg).status, 0);
    const legacy = svg
      .replace(' class="node-marker"', '')
      .replace(/ class="edge-stroke"/g, '')
      .replace(/ data-panel-nodes="[^"]*"/g, '');
    assert.deepEqual(
      scanNodeBorders(legacy).findings.filter(
        r => r.node === 'mark-' && r.kind === 'paint-overlap',
      ),
      hits,
    );
    assert.notEqual(gate(source, legacy).status, 0);
    return hits;
  });
  assert.deepEqual(findings[1], findings[0]);
});

test('empty framed and frameless groups do not count as nodes in border coverage', () => {
  for (const option of ['', ' frame=none']) {
    const source = `group g "Future work"${option}
node a "A"
node b "B"
edge e a -> b
layout root flow\n`;
    const svg = inspect(source, true);
    const scan = scanNodeBorders(svg);
    assert.deepEqual(new Set(scan.expectedNodeIds), new Set(['a', 'b']));
    const result = gate(source, svg);
    assert.equal(result.status, 0, result.stderr);
    const damaged = svg.replace(/<g data-id="b"[^>]*>[\s\S]*?<\/g>/, '');
    const failure = gate(source, damaged);
    assert.notEqual(failure.status, 0);
    assert.match(failure.stderr, /missing node b/);
  }
});

test('a stacked marker checks its main face as well as the offset copies', () => {
  const source = markerSource('mark').replace('shape=marker in=top', 'shape=marker count=3 in=top');
  const svg = inspect(source, true);
  const hits = scanNodeBorders(svg).findings.filter(
    r => r.node === 'mark' && r.kind === 'paint-overlap',
  );
  assert(hits.length > 0);
  assert(hits.every(r => r.shape === 2));
  assert.notEqual(gate(source, svg).status, 0);
  const legacy = svg
    .replace(/ class="node-marker"/g, '')
    .replace(/ class="edge-stroke"/g, '')
    .replace(/ data-panel-nodes="[^"]*"/g, '');
  assert.notEqual(gate(source, legacy).status, 0);
  const clear = source.replace('x=72.5 y=130', 'x=100 y=130');
  const result = gate(clear);
  assert.equal(result.status, 0, result.stderr);
});

function pillSource(width, height, shape) {
  return markerSource('mark')
    .replace(/group top[^\n]*\n|layout top[^\n]*\n|node t(?:left|right)[^\n]*\n/g, '')
    .replace('shape=marker in=top', `shape=${shape}`)
    .replace(
      'pin top x=72.5 y=130',
      `size mark width=${width} height=${height}\npin mark x=133 y=240`,
    );
}

test('wide and tall pills do not invent straight sides, while box faces still count', () => {
  for (const [width, height] of [
    [40, 180],
    [180, 40],
  ]) {
    const clear = pillSource(width, height, 'pill');
    const clearResult = gate(clear);
    assert.equal(clearResult.status, 0, clearResult.stderr);
    const overlap = pillSource(width, height, 'box');
    const result = gate(overlap);
    assert.notEqual(result.status, 0);
    const hits = scanNodeBorders(inspect(overlap, true)).findings;
    assert(hits.some(r => r.node === 'mark' && r.kind === 'paint-overlap'));
  }
});

test('each emphasis state validates its own rendered edges', () => {
  const source = `node a "A"
node b "B"
edge e a -> b
state one "One" a
state two "Two" b
state three "Both" a b
state four "Again" a\n`;
  for (const count of [2, 3, 4]) {
    let input = source;
    if (count < 4) input = input.replace('state four "Again" a\n', '');
    if (count < 3) input = input.replace('state three "Both" a b\n', '');
    const svg = inspect(input, true, ['--states']);
    const result = gate(input, svg);
    assert.equal(result.status, 0, result.stderr);
    const edges = [...svg.matchAll(/<g data-id="e"[^>]*>[\s\S]*?<\/g>/g)];
    assert.equal(edges.length, count);
    const last = edges.at(-1);
    const damaged = svg.slice(0, last.index) + svg.slice(last.index + last[0].length);
    const failure = gate(input, damaged);
    assert.notEqual(failure.status, 0);
    assert.match(failure.stderr, new RegExp(`panel ${count} missing edge e`));
  }
});
