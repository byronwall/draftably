import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nodeBorderRuns, scanNodeBorders } from './node-border.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function svg(
  path,
  shape = '<rect x="0" y="0" width="20" height="20" rx="2" class="shape" stroke-width="2"/>',
) {
  return `<svg><metadata>node a "A"\nedge e a -&gt; b</metadata>
    <g data-id="group"><rect x="0" y="0" width="20" height="20" class="shape"/></g>
    <g data-id="e"><path d="${path}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="a">${shape}</g></svg>`;
}

test('reports short actual overlaps, including the source node, but not group outlines', () => {
  const runs = nodeBorderRuns(svg('M5,20L5.25,20'));
  assert.equal(runs.length, 1);
  assert.deepEqual(
    [runs[0].kind, runs[0].edge, runs[0].node, runs[0].side, runs[0].length],
    ['overlap', 'e', 'a', 'bottom', 0.25],
  );
  assert.deepEqual(runs[0].overlapFrom, { x: 5, y: 20 });
});

test('excludes perpendicular port contact, rounded corners and ellipse tangencies', () => {
  assert.deepEqual(nodeBorderRuns(svg('M10,20L10,30')), []);
  assert.deepEqual(nodeBorderRuns(svg('M0,20L2,20')), []);
  assert.deepEqual(
    nodeBorderRuns(svg('M0,20L20,20', '<ellipse cx="10" cy="10" rx="10" ry="10" class="shape"/>')),
    [],
  );
});

test('distinguishes painted stroke overlap from a visible gap', () => {
  assert.equal(nodeBorderRuns(svg('M5,21L10,21'))[0].kind, 'paint-overlap');
  assert.equal(nodeBorderRuns(svg('M5,23L10,23'))[0].kind, 'near');
});

test('counts straight parts, not quadratic corner control points', () => {
  const runs = nodeBorderRuns(svg('M5,20L10,20Q12,20 12,22L12,30'));
  assert.equal(runs.length, 1);
  assert.equal(runs[0].length, 5);
  assert.deepEqual(runs[0].end, { x: 10, y: 20 });
});

test('handles a polygon node outline without treating its bounding box as an outline', () => {
  const shape = '<path d="M0,0 L20,0 L10,20 Z" class="shape"/>';
  assert.equal(nodeBorderRuns(svg('M5,0L15,0', shape))[0].length, 10);
  assert.deepEqual(nodeBorderRuns(svg('M0,20L20,20', shape)), []);
});

test('uses generated IDs and real node shapes without source metadata', () => {
  const markup = `<svg><g data-id="generated-edge"><path d="M1,20L3,20" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="generated-node"><rect x="0" y="0" width="20" height="20" class="shape"/></g></svg>`;
  assert.deepEqual(
    nodeBorderRuns(markup).map(r => [r.edge, r.node, r.length]),
    [['generated-edge', 'generated-node', 2]],
  );
  assert.throws(() => nodeBorderRuns('<svg></svg>'), /no recognizable routes/);
});

test('separates translated comparison panels', () => {
  const markup = `<svg><g transform="translate(0,0)">
    <g data-id="first"><path d="M0,0L5,0" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="first-node"><rect x="20" y="0" width="10" height="10" class="shape"/></g></g>
    <g transform="translate(100,0)"><g data-id="second"><path d="M20,0L25,0" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="second-node"><rect x="0" y="0" width="10" height="10" class="shape"/></g></g></svg>`;
  assert.deepEqual(nodeBorderRuns(markup), []);
});

test('checks timeline bar faces and graph connectors, not the chart axes', () => {
  const markup = `<svg><metadata>node bar "Bar"\nedge e bar -&gt; bar</metadata>
    <g transform="translate(100,50)"><g class="timeline">
    <line x1="0" y1="10" x2="10" y2="10" stroke-width="6" stroke-linecap="round"/>
    <line x1="0" y1="7" x2="10" y2="7" stroke-width="1"/>
    <g data-id="e"><line x1="0" y1="7" x2="10" y2="7" stroke-width="1.3"/></g>
    <rect data-id="bar" x="0" y="0" width="20" height="20" fill="transparent"/>
    </g></g></svg>`;
  const overlaps = nodeBorderRuns(markup).filter(r => r.kind === 'overlap');
  assert.equal(overlaps.length, 1);
  assert.deepEqual(
    [overlaps[0].edge, overlaps[0].node, overlaps[0].side, overlaps[0].length],
    ['e', 'bar', 'top', 10],
  );
  assert.deepEqual(overlaps[0].start, { x: 100, y: 57 });
});

test('checks each comparison panel even when an edge ID appears in the other panel', () => {
  const markup = `<svg><metadata>edge a x -&gt; y\nedge b x -&gt; y</metadata>
    <g transform="translate(0,0)"><g data-id="a"><path d="M0,0L5,0" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="b"><path d="M0,4L5,4" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="x"><rect x="10" y="10" width="5" height="5" class="shape"/></g></g>
    <g transform="translate(100,0)"><g data-id="a"><path d="M0,0L5,0" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g data-id="x"><rect x="10" y="10" width="5" height="5" class="shape"/></g></g></svg>`;
  assert.deepEqual(scanNodeBorders(markup).validationErrors, ['panel 2 missing edge b']);
});

test('the check rejects a missing SVG listed in saved metrics', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'border-check-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'metrics.json'),
      JSON.stringify([{ file: 'missing.draft', nodes: 1, edges: 0 }]),
    );
    const result = spawnSync(process.execPath, ['scripts/audit-node-border.mjs', dir, '--check'], {
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing SVG render/);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
