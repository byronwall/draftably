import { expect, it } from 'vitest';
import { parseModel } from '../src/dsl/syntax';
import { timelineRows } from '../src/dsl/timeline';
import { timelineMarkup } from '../src/runtime/svg-renderer';
import { resolveAppearance } from '../src/model/appearance';
it.each([
  'at=2025-02-29',
  'at=2025-01-01 to=open',
  'from=2025-02-01 to=2025-01-01',
  'from=2025-01-01 to=open',
  'from=2025-01-01 to=2025-01-03 steps=2025-01-03',
])('reports the line for %s', attrs => {
  expect(() => parseModel('diagram "test"\nnode x "x" ' + attrs)).toThrow(/Line 2/);
});
it('shares the authored code node identity and group label with the calendar', () => {
  const m = parseModel(
    'group g "Service"\nnode f "Parser" in=g shape=code at=2024-02-29 <<TS\nreturn 1\nTS',
  );
  expect(timelineRows(m)).toMatchObject([{ id: 'f', band: 'Service', at: '2024-02-29' }]);
});

it('projects current graph membership, labels and world coordinates after JSON import', async () => {
  const { compile } = await import('../src/dsl/compile');
  const { projectScene, canonicalGeometry } = await import('../src/dsl/project');
  const { normalize } = await import('../src/model/document');
  const { calendarFor } = await import('../src/dsl/calendar-layout');
  const { panelDoc } = await import('../src/model/panels');
  const scene = await compile(
    'layout root timeline\n+node a "First" at=2025-03-03\nnode b "Second" at=2025-03-04',
  );
  const doc = normalize(JSON.parse(JSON.stringify(projectScene(scene))));
  expect(Object.keys(calendarFor(panelDoc(doc, 'before'))!.boxes)).toEqual(['b']);
  doc.graph.nodes = doc.graph.nodes.filter(n => n.id === 'b');
  doc.graph.nodes[0].title = 'Renamed';
  const chart = calendarFor(doc)!;
  expect(chart.marks.some(m => m.kind === 'text' && m.text === 'Renamed')).toBe(true);
  expect(canonicalGeometry(doc).timeline?.items).toEqual([
    { ...chart.boxes.b, id: 'b', x: chart.x + chart.boxes.b.x, y: chart.y + chart.boxes.b.y },
  ]);
});

it('keeps timeline row hit targets behind dated marks', async () => {
  const { compile } = await import('../src/dsl/compile');
  const { projectScene } = await import('../src/dsl/project');
  const { normalize } = await import('../src/model/document');
  const scene = await compile(
    'layout root timeline zoom=2025-11-01..2025-11-23\nnode item "Item" from=2025-11-01 to=2025-11-16 steps=2025-11-04,2025-11-05',
  );
  const doc = normalize(JSON.parse(JSON.stringify(projectScene(scene))));
  const markup = timelineMarkup(doc, resolveAppearance(doc.appearance));
  const fill = markup.indexOf('<rect x="18" y="220" width="944" height="52"');
  const target = markup.indexOf('<rect data-timeline-id="item"');
  const mark = markup.indexOf('<g data-timeline-id="item"><title>Step 2025-11-04</title>');
  expect(fill).toBeGreaterThan(-1);
  expect(fill).toBeLessThan(target);
  expect(target).toBeGreaterThan(-1);
  expect(mark).toBeGreaterThan(target);
});
