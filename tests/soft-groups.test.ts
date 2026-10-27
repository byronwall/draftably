import { describe, expect, it } from 'vitest';
import { checkSource, compile, type Scene } from '../src/dsl/compile';

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

const flat = repro('')
  .split('\n')
  .filter(l => !l.startsWith('group '))
  .map(l => l.replace(/ in=\w+/, ''))
  .join('\n');

const nodes = (scene: Scene) =>
  scene.objects.filter(o => o.type === 'node').map(({ id, x, y }) => ({ id, x, y }));

describe('soft groups', () => {
  it('lay their members out as if the group were not there', async () => {
    expect(nodes(await compile(repro(' frame=soft')))).toEqual(nodes(await compile(flat)));
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

  it('note a tint that covers an object outside the group', () => {
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
    expect(scene.diagnostics.find(d => d.code === 'soft-overlap')?.ids).toEqual(['g', 'mid']);
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
