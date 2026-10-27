import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';

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
