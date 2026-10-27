import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';

/** Issue #125: a group whose members span several ranks, fed from outside at its middle. */
const repro = (frame: string) =>
  [
    'node listing "Source catalog"',
    `group present "Source A: present"${frame}`,
    'node check_a "Check A" in=present',
    'node a_out "Reuse A" in=present',
    `group missing "Source B: missing"${frame}`,
    'node check_b "Check B" in=missing',
    'node fail_b "Fails" in=missing shape=pill',
    'node b_out "Read B" in=missing',
    'node drop "Discard every ETag" shape=pill',
    'edge list_a listing -> check_a "listed"',
    'edge list_b listing -> check_b "checked anyway"',
    'edge b_fails check_b -> fail_b',
    'edge b_drop fail_b -> drop "one shared try"',
    'edge a_lost check_a -> drop "ETag lost"',
    'edge drop_a drop -> a_out "re-read all"',
    'edge drop_b drop -> b_out',
    'layout root engine=layered direction=right fold=never',
    '',
  ].join('\n');

describe('soft groups', () => {
  it('rank each member by its own connections', async () => {
    const scene = await compile(repro(' frame=soft')),
      x = (id: string) => scene.byId.get(id)!.x;
    // Unlike a box, the group is not one block: check_b shares check_a's rank, after listing.
    expect(x('check_b')).toBe(x('check_a'));
    expect(x('fail_b')).toBeGreaterThan(x('check_b'));
    expect(x('drop')).toBeGreaterThan(x('fail_b'));
    expect(x('b_out')).toBeGreaterThan(x('drop'));
  });

  it('keep members of one group side by side in a rank', () => {
    const scene = checkSource(
      [
        'node src "Source"',
        'group a "A" frame=soft',
        'group b "B" frame=soft',
        'node a1 "A1" in=a',
        'node b1 "B1" in=b',
        'node a2 "A2" in=a',
        'node b2 "B2" in=b',
        ...['a1', 'b1', 'a2', 'b2'].map(id => `edge ${id}_in src -> ${id}`),
        '',
      ].join('\n'),
    );
    const order = ['a1', 'b1', 'a2', 'b2'].sort(
      (p, q) => scene.byId.get(p)!.y - scene.byId.get(q)!.y,
    );
    expect(order.map(id => id[0]).join('')).toMatch(/^(aabb|bbaa)$/);
    expect(scene.diagnostics.filter(d => d.code.startsWith('soft'))).toEqual([]);
  });

  it('keep their members and draw round them', async () => {
    const scene = await compile(repro(' frame=soft')),
      g = scene.byId.get('missing')!;
    expect(g.frame).toBe('soft');
    expect(scene.byId.get('check_b')!.parent).toBe('missing');
    for (const id of ['check_b', 'fail_b', 'b_out']) {
      const n = scene.byId.get(id)!;
      expect(n.x).toBeGreaterThan(g.x);
      expect(n.y).toBeGreaterThan(g.y);
      expect(n.x + n.w).toBeLessThan(g.x + g.w);
      expect(n.y + n.h).toBeLessThan(g.y + g.h);
    }
  });

  it('draw round an object between their members in pieces, and say so', () => {
    const scene = checkSource(
      [
        'group g "G" frame=soft',
        'node a "A" in=g',
        'node mid "Between"',
        'node b "B" in=g',
        'edge e1 a -> mid',
        'edge e2 mid -> b',
        '',
      ].join('\n'),
    );
    expect(scene.diagnostics.map(d => d.code)).toEqual(['soft-split']);
    expect(scene.byId.get('g')!.hull).toHaveLength(2);
  });

  it('have no layout or position of their own', () => {
    expect(() => checkSource('group g "G" frame=soft\nnode a "A" in=g\nlayout g row')).toThrow(
      /soft group, so it has no layout/,
    );
    expect(() => checkSource('group g "G" frame=none\nnode a "A" in=g\npin g x=0 y=0')).toThrow(
      /no position/,
    );
  });
});
