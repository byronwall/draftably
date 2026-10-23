import { describe, expect, it } from 'vitest';
import { RouteLab, type RouteInput } from '../src/engines/routing-engine.js';

const box = (id: string, x: number, y: number, w = 164, h = 57) => ({
  id,
  x,
  y,
  w,
  h,
  shape: 'box' as const,
});

describe('ports centred on a side', () => {
  // A straight line into b's left side, and a second line from below into the same side, one
  // port gap under it: the uneven-ports shape of round 3 (`29, 45 of 57`). The gap between the
  // columns is narrow, so the second line turns in a stub from b.
  const input: RouteInput = {
    nodes: [box('a', 0, 0), box('b', 200, 0), box('c', 0, 160)],
    groups: [],
    edges: [
      { id: 'ab', from: 'a', to: 'b', cfg: { fromSide: 'right', toSide: 'left' } },
      { id: 'cb', from: 'c', to: 'b', cfg: { toSide: 'left' } },
    ],
  };
  const arrivals = (routes: Array<{ to: string; points: Array<{ y: number }> }>) =>
    routes.filter(r => r.to === 'b').map(r => r.points.at(-1)!.y);

  it('sat lopsided without the tidy pass', () => {
    const ys = arrivals(RouteLab.compute(input, { tidy: false }).routes);
    expect(ys.reduce((n, y) => n + y, 0) / ys.length - 28.5).toBeGreaterThan(4);
  });

  it('slides both ports about the middle, the straight line whole', () => {
    const { routes } = RouteLab.compute(input);
    const ys = arrivals(routes);
    expect(ys.reduce((n, y) => n + y, 0) / ys.length).toBeCloseTo(28.5, 0);
    const straight = routes.find(r => r.id === 'ab')!;
    expect(straight.points).toHaveLength(2);
    expect(straight.points[0].y).toBe(straight.points[1].y);
  });

  it('turns the other line a standoff out rather than hugging the side', () => {
    const { routes } = RouteLab.compute(input);
    const turn = routes.find(r => r.id === 'cb')!.points.at(-2)!;
    expect(200 - turn.x).toBeGreaterThanOrEqual(20);
  });
});
