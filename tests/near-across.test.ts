import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';

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

  it('names members to connect to instead of a group', async () => {
    await expect(compile(source(['edge e4 owner -> asks "owes"']))).rejects.toThrow(
      'Connect to one of its members instead: q1, q2.',
    );
  });
});
