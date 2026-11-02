import { describe, expect, it } from 'vitest';
import { RouteLab, type RouteInput } from '../src/engines/routing-engine.js';

const box = (id: string, x: number, y: number, w = 160, h = 80) => ({
  id,
  x,
  y,
  w,
  h,
  shape: 'box' as const,
});
const edge = (id: string, from: string, to: string) => ({ id, from, to, cfg: {} });

/** A hub with three targets to its right: one level, one above, one below. */
const fan: RouteInput = {
  nodes: [box('hub', 0, 120), box('a', 320, 0), box('b', 320, 120), box('c', 320, 240)],
  groups: [],
  edges: [edge('ea', 'hub', 'a'), edge('eb', 'hub', 'b'), edge('ec', 'hub', 'c')],
};

describe('fans on facing sides', () => {
  it('fans out of the side that faces the targets', () => {
    const { routes } = RouteLab.compute(fan);
    expect(routes.map(r => r.fromSide)).toEqual(['right', 'right', 'right']);
    // Every target is entered from a side that faces the hub, so nothing hooks round.
    for (const r of routes) expect(['left', 'top', 'bottom']).toContain(r.toSide);
    expect(new Set(routes.map(r => r.fromOffset)).size).toBe(3);
  });

  it('spreads round to the far sides without the facing rule', () => {
    const { routes } = RouteLab.compute(fan, { facing: false });
    expect(new Set(routes.map(r => r.fromSide)).size).toBeGreaterThan(1);
  });

  it('gathers a fan-in on the side facing its sources', () => {
    // Three sources left of one target: all arrive on its left, where the old rule
    // pushed the second and third round to its top and bottom.
    const input: RouteInput = {
      nodes: [box('a', 0, 0), box('b', 0, 120), box('c', 0, 240), box('t', 320, 120)],
      groups: [],
      edges: [edge('ea', 'a', 't'), edge('eb', 'b', 't'), edge('ec', 'c', 't')],
    };
    const { routes } = RouteLab.compute(input);
    expect(routes.map(r => r.toSide)).toEqual(['left', 'left', 'left']);
  });
});
