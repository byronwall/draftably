import { describe, expect, it } from 'vitest';
import { RouteLab, type RouteInput } from '../src/engines/routing-engine.js';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';

const box = (id: string, x: number, y: number, w = 140, h = 48) => ({
  id,
  x,
  y,
  w,
  h,
  shape: 'box' as const,
});
const edge = (id: string, from: string, to: string) => ({ id, from, to, cfg: {} });

/** A parent over four children, the outer two well off to each side. */
const tree: RouteInput = {
  nodes: [
    box('root', 330, 0),
    box('a', 0, 128),
    box('b', 220, 128),
    box('c', 440, 128),
    box('d', 660, 128),
  ],
  groups: [],
  edges: ['a', 'b', 'c', 'd'].map(id => edge(id, 'root', id)),
};

describe('routing along the reading direction', () => {
  it('runs forward edges in a downward layout from bottom to top', () => {
    const { routes } = RouteLab.compute(tree, { direction: 'down' });
    for (const r of routes) {
      expect([r.id, r.fromSide, r.toSide]).toEqual([r.id, 'bottom', 'top']);
      expect(r.points.length).toBeLessThanOrEqual(4);
    }
    // The fan is symmetric: the inner pair turns on the rank gap's midline, the outer pair
    // one lane above it, so no two runs overlap.
    const turn = Object.fromEntries(routes.map(r => [r.id, r.points[1].y]));
    expect(turn).toEqual({ a: 72, b: 88, c: 88, d: 72 });
  });

  it('runs forward edges in a rightward layout from right to left', () => {
    const turned: RouteInput = {
      ...tree,
      nodes: tree.nodes.map(n => ({ ...n, x: n.y * 2, y: n.x / 2, w: 140, h: 96 })),
    };
    for (const r of RouteLab.compute(turned, { direction: 'right' }).routes)
      expect([r.id, r.fromSide, r.toSide]).toEqual([r.id, 'right', 'left']);
  });

  it('still takes another side when the reading-direction sides are blocked', () => {
    // A wall right under the parent closes its bottom side.
    const input: RouteInput = {
      nodes: [box('p', 0, 0), box('wall', -40, 64, 220, 24), box('q', 400, 104)],
      groups: [],
      edges: [edge('e', 'p', 'q')],
    };
    const [route] = RouteLab.compute(input, { direction: 'down' }).routes;
    expect(route.blocked).toBe(false);
    expect(route.fromSide).not.toBe('bottom');
    expect(route.toSide).toBe('top');
  });

  it('takes the reading direction from the file', () => {
    const doc = projectScene(
      checkSource(
        'diagram "t"\nnode a "A"\nnode b "B"\nedge e a -> b\nlayout root flow direction=down\n',
      ),
    );
    expect(doc.settings.routing.direction).toBe('down');
    const auto = projectScene(checkSource('diagram "t"\nnode a "A"\nnode b "B"\nedge e a -> b\n'));
    expect(auto.settings.routing.direction).toBeUndefined();
  });
});
