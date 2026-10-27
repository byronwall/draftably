import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';

import { resolveAppearance } from '../src/model/appearance';
import { edgeLabelLines } from '../src/model/labels';

const login = readFileSync(path.join(__dirname, '../examples/login-sequence.draft'), 'utf8');

describe('sequence diagrams', () => {
  it('put participants across the top and messages on rows in file order', () => {
    const scene = checkSource(login),
      xs = ['user', 'app', 'auth', 'db'].map(id => scene.byId.get(id)!);
    xs.slice(1).forEach((p, i) => expect(p.x).toBeGreaterThan(xs[i].x + xs[i].w));
    expect(new Set(xs.map(p => p.y))).toEqual(new Set([0]));
    const rows = scene.edges.map(e => e.row!);
    rows.slice(1).forEach((r, i) => expect(r).toBeGreaterThan(rows[i]));
    for (const p of xs) expect(p.y + p.h + p.lifeline!).toBeGreaterThan(rows.at(-1)!);
  });

  it('draws each message straight between the two lifelines', () => {
    const doc = projectScene(checkSource(login)),
      { vg, rects } = visibleRects(doc),
      { routes } = computeRoutes(doc, vg, rects),
      mid = (id: string) => rects.get(id)!.x + rects.get(id)!.w / 2,
      verify = routes.find(r => r.id === 'm2')!;
    expect(verify.points).toEqual([
      { x: mid('app'), y: doc.layout.edges.m2.row },
      { x: mid('auth'), y: doc.layout.edges.m2.row },
    ]);
    expect(routes.find(r => r.id === 'm5')!.points).toHaveLength(4);
  });

  it('has no groups', () => {
    expect(() => checkSource('group g "G"\nnode a "A" in=g\nlayout root sequence')).toThrow(
      /participants and messages, not groups/,
    );
  });
});

describe('sequence messages', () => {
  const source = [
    'diagram "S" version=1',
    'node a "Job"',
    'node b "Ledger output"',
    'edge m1 a -> b "Output queue schedule request output worker"',
    'edge m2 b -> b "Upload ledger retry preview result sync"',
    'layout root sequence',
  ].join('\n');

  it('wraps labels, sits them above their line, and keeps participants narrow', async () => {
    const doc = projectScene(await compile(source)),
      look = resolveAppearance(doc.appearance),
      { vg, rects } = visibleRects(doc),
      { routes } = computeRoutes(doc, vg, rects);
    const m1 = routes.find(r => r.id === 'm1')!,
      m2 = routes.find(r => r.id === 'm2')!;
    expect(edgeLabelLines('Output queue schedule request output worker', look, true).length).toBe(
      2,
    );
    // Above the line, centred between the lifelines.
    expect(m1.label!.y + m1.label!.h / 2).toBeLessThanOrEqual(m1.points[0].y);
    expect(m1.label!.x).toBe((m1.points[0].x + m1.points[1].x) / 2);
    // A self-message's label sits beside its loop.
    expect(m2.label!.x - m2.label!.w / 2).toBeGreaterThan(m2.points[1].x);
    // A short title gets a box only as wide as it needs, not the default 164.
    expect(rects.get('a')!.w).toBeLessThan(164);
    // The first message's label clears the participant row.
    expect(m1.label!.y - m1.label!.h / 2).toBeGreaterThan(rects.get('a')!.y + rects.get('a')!.h);
  });
});
