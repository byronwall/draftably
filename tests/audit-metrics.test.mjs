import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const box = (id, d, x, y, w, h, text) =>
  `<g data-id="${id}"><path d="${d}" stroke-linecap="round"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="white"/><text font-weight="500">${text}</text></g>`;
const frame = body =>
  `<svg viewBox="-100 -100 700 1000"><g transform="translate(0,0)">${body}</g></svg>`;
const nodes = [
  { id: 'a', parent: 'root', x: 0, y: 0, w: 40, h: 30 },
  { id: 'b', parent: 'root', x: 200, y: 0, w: 40, h: 30 },
];
const route = (id, points) => ({ id, points: points.map(([x, y]) => ({ x, y })) });
const routes = [
  route('call', [
    [20, 100],
    [220, 100],
  ]),
  route('reply', [
    [220, 150],
    [20, 150],
  ]),
  route('act', [
    [20, 200],
    [60, 200],
    [60, 230],
    [-20, 230],
    [-20, 200],
    [20, 200],
  ]),
];
const sequence = `layout root sequence
node a "A"
node b "B"
edge call a -> b "call" message=call
edge reply b -> a "reply" answers=call
action act a "act"
`;
const drawing = frame(
  box('call', 'M20,100L220,100', 90, 79, 60, 20, 'call') +
    box('reply', 'M220,150L20,150', 90, 129, 60, 20, 'reply') +
    box('act', 'M20,200L60,200L60,230L-20,230L-20,200L20,200', -15, 205, 70, 20, 'act'),
);

function audit(source, geo, svg, mode = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-label-test-'));
  try {
    for (const file of [
      'scripts/diagram-audit.mjs',
      'scripts/lib/audit-labels.mjs',
      'scripts/lib/buckets.mjs',
      'src/model/font-metrics.json',
    ]) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    fs.mkdirSync(path.join(dir, 'input', 'case'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'input', 'case', 'v0.draft'), source);
    fs.writeFileSync(path.join(dir, 'geo.json'), JSON.stringify(geo));
    fs.writeFileSync(path.join(dir, 'drawing.svg'), svg);
    fs.writeFileSync(
      path.join(dir, 'scripts/draftably.mjs'),
      `import fs from 'node:fs';
const svg = process.argv.includes('--svg');
if (process.argv[2] === 'check') process.exit(0);
if (${JSON.stringify(mode)} === 'fail-geo' && !svg) { process.stdout.write('{'); process.exit(2); }
if (${JSON.stringify(mode)} === 'invalid-geo' && !svg) { process.stdout.write('{'); process.exit(0); }
if (${JSON.stringify(mode)} === 'fail' && svg) { process.stdout.write('<svg>'); process.exit(2); }
if (${JSON.stringify(mode)} === 'truncated' && svg) { process.stdout.write('<svg>'); process.exit(0); }
process.stdout.write(fs.readFileSync(new URL(svg ? '../drawing.svg' : '../geo.json', import.meta.url), 'utf8'));
`,
    );
    const run = spawnSync(
      process.execPath,
      [
        path.join(dir, 'scripts/diagram-audit.mjs'),
        path.join(dir, 'input'),
        path.join(dir, 'out'),
        '--no-shots',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(fs.readFileSync(path.join(dir, 'out/case/metrics.json'), 'utf8'))[0];
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('sequence calls, replies and actions use their intended label placement', () => {
  const result = audit(sequence, { nodes, routes }, drawing);
  assert.deepEqual(
    result.issues.filter(i => ['label-detached', 'label-beside-line'].includes(i.kind)),
    [],
  );
  const moved = drawing.replace('x="90" y="79"', 'x="90" y="20"');
  const displaced = audit(sequence, { nodes, routes }, moved);
  assert.ok(displaced.issues.some(i => i.kind === 'label-detached' && i.detail.includes('call')));
});

test('rejects failed and truncated SVG inspection', () => {
  for (const mode of ['fail', 'truncated']) {
    const result = audit(sequence, { nodes, routes }, drawing, mode);
    assert.match(result.error, /SVG inspect (failed|returned incomplete)/);
    assert.equal(result.defectIndex, undefined);
  }
});

test('compares proximity only within panels and uses painted group borders', () => {
  const geo = {
    nodes: [
      ...nodes,
      { id: 'group', parent: 'root', x: 0, y: 0, w: 468, h: 300 },
      { id: 'child', parent: 'group', x: 10, y: 40, w: 40, h: 30 },
    ],
    routes: [
      route('call', [
        [20, 100],
        [220, 100],
      ]),
      route('reply', [
        [20, 110],
        [220, 110],
      ]),
    ],
  };
  const source =
    'group group "Group"\nnode child "Child" in=group\nnode a "A"\nnode b "B"\nedge call a -> b "call"\nedge reply a -> b "reply"\n';
  const group =
    '<g data-id="group"><rect class="shape" x="0" y="0" width="188" height="300" rx="4"/></g>';
  const first = group + box('call', 'M20,100L220,100', 170, 50, 60, 156, 'call');
  const second = group + box('call', 'M20,100L220,100', 170, 50, 60, 156, 'call');
  const svg = `<svg viewBox="-100 -100 800 1000"><g transform="translate(0,0)">${first}</g><g transform="translate(0,260)">${second}</g></svg>`;
  const result = audit(source, geo, svg);
  assert.equal(result.issues.filter(i => i.kind === 'labels-too-close').length, 0);
  assert.equal(result.issues.filter(i => i.kind === 'label-on-group-border').length, 2);
  const overlap = svg.replace(
    first,
    first + box('reply', 'M20,110L220,110', 180, 60, 60, 156, 'reply'),
  );
  assert.ok(audit(source, geo, overlap).issues.some(i => i.kind === 'label-overlap'));
});

test('rejects failed and malformed geometry inspection', () => {
  for (const mode of ['fail-geo', 'invalid-geo']) {
    const result = audit(sequence, { nodes, routes }, drawing, mode);
    assert.match(result.error, /inspect failed|invalid inspect geometry/);
    assert.equal(result.defectIndex, undefined);
  }
});

test('normal sequence rows are not crowded but nonsequence neighbors are', () => {
  const close = drawing.replace('x="90" y="129"', 'x="90" y="112"');
  const seq = audit(sequence, { nodes, routes }, close);
  assert.equal(seq.issues.filter(i => i.kind === 'labels-too-close').length, 0);
  const flat = audit(
    sequence.replace('layout root sequence', 'layout root flow'),
    { nodes, routes },
    close,
  );
  assert.ok(flat.issues.some(i => i.kind === 'labels-too-close'));
  const overlap = drawing.replace('x="90" y="129"', 'x="90" y="90"');
  assert.ok(
    audit(sequence, { nodes, routes }, overlap).issues.some(i => i.kind === 'label-overlap'),
  );
});

test('code bodies cannot declare actions, edges, or a sequence layout', () => {
  const flat = 'node a "A"\nnode b "B"\nedge call a -> b "call"\n';
  const moved = drawing.replace('x="90" y="79"', 'x="90" y="20"');
  const original = audit(flat, { nodes, routes }, moved).issues.filter(
    i => i.kind === 'label-detached',
  );
  const code =
    'node sample shape=code <<CODE # comment\naction call a "example"\nlayout root sequence\nedge call b -> b "fake"\nCODE\n';
  const withCode = audit(flat + code, { nodes, routes }, moved).issues.filter(
    i => i.kind === 'label-detached',
  );
  assert.ok(original.some(i => i.detail.includes('call')));
  assert.deepEqual(withCode, original);
});
