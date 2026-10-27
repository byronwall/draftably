import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';

const source = (extra: string[]) =>
  [
    'diagram "Scope limits" version=1',
    'group prs "Stack" color=slate',
    'node a "Base change" in=prs',
    'node b "Middle change" in=prs',
    'node c "Top change" in=prs',
    'group asks "Open questions" color=violet',
    'node q1 "Question one" in=asks',
    'node q2 "Question two" in=asks',
    'node owner "Owner" shape=pill',
    'node fix "Side fix"',
    'edge e1 a -> b',
    'edge e2 b -> c',
    'edge e3 fix -> b "ported into"',
    'layout root engine=layered direction=right',
    ...extra,
  ].join('\n');

describe('near across a group boundary', () => {
  it('places against the group around the reference, lined up with the reference', async () => {
    const scene = await compile(source(['near fix b side=above gap=32']));
    const fix = scene.byId.get('fix')!,
      b = scene.byId.get('b')!,
      prs = scene.byId.get('prs')!;
    expect(fix.x + fix.w / 2).toBe(b.x + b.w / 2);
    expect(prs.y - (fix.y + fix.h)).toBe(32);
  });

  it('still refuses a reference that is not inside a sibling', async () => {
    await expect(compile(source(['near a q1 side=above']))).rejects.toThrow(
      'place prs relative to q1',
    );
  });

  it('routes an edge to a group to its frame', async () => {
    const doc = projectScene(await compile(source(['edge e4 owner -> asks "owes"']))),
      { vg, rects } = visibleRects(doc),
      { routes } = computeRoutes(doc, vg, rects);
    const end = routes.find(r => r.id === 'e4')!.points.at(-1)!,
      frame = rects.get('asks')!;
    const onBorder =
      ([frame.x, frame.x + frame.w].some(x => Math.abs(end.x - x) < 1) &&
        end.y >= frame.y &&
        end.y <= frame.y + frame.h) ||
      ([frame.y, frame.y + frame.h].some(y => Math.abs(end.y - y) < 1) &&
        end.x >= frame.x &&
        end.x <= frame.x + frame.w);
    expect(onBorder).toBe(true);
  });

  it('refuses an edge between a group and something inside it, or to a tint', async () => {
    await expect(compile(source(['edge e4 q1 -> asks']))).rejects.toThrow('q1 is inside asks');
    await expect(
      compile(source(['edge e4 owner -> asks']).replace('color=violet', 'color=violet frame=soft')),
    ).rejects.toThrow('no frame for a line to end on');
  });
});
