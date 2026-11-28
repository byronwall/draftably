import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabels } from '../scripts/lib/audit-labels.mjs';

const helpers = {
  segs: points => points.slice(1).map((p, i) => [points[i], p]),
  center: r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 }),
  textWidth: text => text.length * 5,
  decodeText: text => text.replaceAll('&amp;', '&'),
};
const edge = (id, y, labelY, text = 'label', fill = '#ccc') => `<g data-id="${id}">
<path d="M0,${y}L100,${y}" fill="none" stroke-linecap="round"/>
<rect x="30" y="${labelY}" width="40" height="20" rx="4" fill="${fill}"/>
<text font-size="10" font-weight="500">${text}</text></g>`;
const panel = (x, y, body) => `<g transform="translate(${x},${y})">${body}</g>`;

test('reads colored and multiline labels on their own panel and path', () => {
  const svg =
    panel(
      0,
      0,
      edge('same', 10, 0, '<tspan dy="0">one</tspan><tspan dy="14">two &amp; three</tspan>'),
    ) +
    panel(200, 100, edge('same', 10, 25, 'offset', '#ff0000')) +
    panel(400, 200, edge('same', 10, 45, 'detached'));
  const labels = parseLabels(svg, helpers);
  assert.equal(labels.length, 3);
  assert.deepEqual(
    labels.map(l => [l.x, l.y, l.path[0].x, l.path[0].y]),
    [
      [30, 0, 0, 10],
      [230, 125, 200, 110],
      [430, 245, 400, 210],
    ],
  );
  assert.equal(labels[0].text, 'one\ntwo & three');
  assert.equal(labels[0].ink[1].y - labels[0].ink[0].y, 14);
  assert.notEqual(labels[0].panel, labels[1].panel);
  assert.deepEqual(
    labels.map(l => l.y - l.path[0].y),
    [-10, 15, 35],
  );
});

test('keeps translated overlaps across panels in world coordinates', () => {
  const labels = parseLabels(
    panel(0, 0, edge('a', 10, 0)) + panel(20, 0, edge('a', 10, 0)),
    helpers,
  );
  assert.ok(labels[0].x + labels[0].w > labels[1].x);
  assert.equal(labels[1].path[0].x, 20);
});

test('uses only rendered routes from the label panel, including state groups', () => {
  const nodeIcon = edge('node-icon', 10, 0);
  const svg =
    `<g data-state="before" transform="translate(100,20)">${edge('a', 10, 0)}${edge('b', 12, 2)}${nodeIcon}</g>` +
    panel(400, 20, edge('a', 10, 0));
  const labels = parseLabels(svg, { ...helpers, routeIds: new Set(['a', 'b']) });
  assert.equal(labels.length, 3);
  assert.deepEqual(
    labels[0].panel.routes.map(r => r.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    labels[2].panel.routes.map(r => r.id),
    ['a'],
  );
  assert.equal(labels[0].path[0].x, 100);
  assert.equal(labels[2].path[0].x, 400);
});

test('finds serif edge labels without taking notes or status icons', () => {
  const serif = edge('a', 10, 0, 'serif').replace('font-weight="500"', 'font-weight="600"');
  const other = edge('note', 10, 0, 'note').replace('font-weight="500"', 'font-weight="600"');
  const status = `<g data-id="status"><path d="M0,10L100,10" stroke-linecap="round"/><rect x="30" y="0" width="40" height="20" rx="4" fill="red"/><text font-weight="600">status</text></g>`;
  const labels = parseLabels(panel(0, 0, serif + other + status), {
    ...helpers,
    routeIds: new Set(['a']),
  });
  assert.deepEqual(
    labels.map(label => label.text),
    ['serif'],
  );
});

test('uses each panel’s painted group frame', () => {
  const frame =
    '<g data-id="group"><rect class="shape" x="4" y="5" width="80" height="60" rx="4"/></g>';
  const labels = parseLabels(panel(50, 100, frame + edge('a', 10, 0)), helpers);
  assert.deepEqual(labels[0].panel.frames.get('group'), { x: 54, y: 105, w: 80, h: 60 });
});
