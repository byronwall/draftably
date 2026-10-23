import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { overlaps } from '../src/model/geometry';
import { makeGeometry, visibleGraph } from '../src/model/graph';
import { computeRoutes } from '../src/model/routes';

// A source with two branches: `a` → `b` runs straight along the row, `a` → `c` turns down to the
// second row and back, so its run across the rank gap has room for a label between the rows.
const source = (labels: { ab?: string; ac?: string; cd?: string }) =>
  [
    'diagram "Pockets" version=1',
    'node a "Source"',
    'node b "Straight on"',
    'node c "Branch"',
    'node d "After"',
    `edge e1 a -> b${labels.ab ? ` "${labels.ab}"` : ''}`,
    `edge e2 a -> c${labels.ac ? ` "${labels.ac}"` : ''}`,
    `edge e3 b -> d${labels.cd ? ` "${labels.cd}"` : ''}`,
    'layout root flow direction=right gap=48',
  ].join('\n');

const positions = (src: string) =>
  Object.fromEntries(checkSource(src).objects.map(o => [o.id, [o.x, o.y]]));

describe('a relabel puts the label in a pocket before widening a gap', () => {
  const plain = positions(source({}));

  it('keeps the gap when the label fits on the branch run between the rows', () => {
    expect(positions(source({ ac: 'metric id per language' }))).toEqual(plain);
  });

  it('draws the label on the branch, between the rows, clear of every box', () => {
    const scene = checkSource(source({ ac: 'metric id per language' })),
      doc = projectScene(scene),
      vg = visibleGraph(doc),
      geometry = makeGeometry(doc),
      rects = new Map(vg.nodes.map(n => [n.id, geometry(n.id)]));
    const label = computeRoutes(doc, vg, rects).routes.find(r => r.id === 'e2')!.label!;
    const box = { x: label.x - label.w / 2, y: label.y - label.h / 2, w: label.w, h: label.h };
    for (const r of rects.values()) expect(overlaps(box, r, 2)).toBe(false);
    const [a, c] = ['a', 'c'].map(id => scene.byId.get(id)!);
    expect(box.y).toBeGreaterThanOrEqual(a.y + a.h);
    expect(box.y + box.h).toBeLessThanOrEqual(c.y);
  });

  it('still widens the one gap whose label sits on a straight run', () => {
    const labelled = positions(source({ ab: 'metric id per language' }));
    expect(labelled.b[0]).toBeGreaterThan(plain.b[0]);
    // Only the ranks past that gap move along; the source stays.
    expect(labelled.a).toEqual(plain.a);
  });
});
