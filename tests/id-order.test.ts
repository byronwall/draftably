import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';

// A loose node with one async edge into a group, in a compound-flow layout. Before, its id's
// sort order against the groups' ids decided where the engine put it (and the groups too).
const source = (id: string) =>
  [
    'diagram "Ids are names" version=1',
    'group g1 "Upper" color=slate',
    'node a1 "Collect" in=g1',
    'node a2 "Validate" in=g1',
    'node a3 "Store" in=g1',
    'group g2 "Lower" color=slate',
    'node b1 "Read" in=g2',
    'node b2 "Report" in=g2',
    'group g3 "Side" color=violet',
    'node c1 "Trigger" in=g3',
    'node c2 "Retry" in=g3',
    'node sink "Archive"',
    `node ${id} "One worker per schema" color=slate`,
    'edge e1 a1 -> a2',
    'edge e2 a2 -> a3',
    'edge e3 b1 -> b2',
    'edge e4 c1 -> a1',
    'edge e5 c2 -> b1',
    'edge e6 a3 -> sink',
    'edge e7 b2 -> sink',
    `edge e8 ${id} -> b1 kind=async`,
    'layout root engine=compound-flow',
  ].join('\n');

describe('engine layout and ids', () => {
  it('places a node the same whatever its id is called', async () => {
    const where = async (id: string) => {
      const scene = await compile(source(id));
      return [id, 'g1', 'g2', 'g3', 'sink'].map(k => {
        const o = scene.byId.get(k)!;
        return [Math.round(o.x), Math.round(o.y)];
      });
    };
    const first = await where('note');
    for (const id of ['a0', 'zz', 'n21']) expect(await where(id)).toEqual(first);
  });
});

describe('order in an engine layout', () => {
  const branch = (order: string) =>
    [
      'diagram "Order across a rank" version=1',
      'node start "Start" shape=pill',
      'node ask "Has rule?" shape=diamond',
      'node ctx "Context path"',
      'node rule "Rule path"',
      'node ctx_out "Context result" shape=pill',
      'node rule_out "Rule result" shape=pill',
      'edge a start -> ask',
      'edge b ask -> rule "yes"',
      'edge c ask -> ctx "no"',
      'edge d rule -> rule_out',
      'edge e ctx -> ctx_out',
      'layout root engine=layered direction=down',
      order,
    ].join('\n');

  it('puts the ids an order line lists first on the left of their rank', async () => {
    for (const [first, second] of [
      ['rule', 'ctx'],
      ['ctx', 'rule'],
    ]) {
      const scene = await compile(
        branch(`order root start ask ${first} ${second} ${first}_out ${second}_out`),
      );
      const x = (id: string) => scene.byId.get(id)!.x;
      expect(x(first)).toBeLessThan(x(second));
      expect(x(`${first}_out`)).toBeLessThan(x(`${second}_out`));
    }
  });
});
