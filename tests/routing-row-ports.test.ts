import { describe, expect, it } from 'vitest';
import {
  route,
  type EdgeIn,
  type PlacedNodeIn,
  type RoutingOptions,
} from '../src/graph-api/route-entry';

/** A schema card: a 46px header, then a 26px row per field. */
const HEADER = 46,
  ROW = 26;
const card = (id: string, x: number, y: number, rows: number): PlacedNodeIn => ({
  id,
  x,
  y,
  width: 200,
  height: HEADER + rows * ROW,
});
/** The middle of field `i` (from 0), down from the card's top edge. */
const field = (i: number) => HEADER + (i + 0.5) * ROW;

/** The IDs of the nodes a line runs through; touching an outline does not count. */
function through(points: { x: number; y: number }[], nodes: PlacedNodeIn[]) {
  return nodes
    .filter(n =>
      points
        .slice(1)
        .some(
          (b, i) =>
            Math.max(points[i].x, b.x) > n.x + 0.5 &&
            Math.min(points[i].x, b.x) < n.x + n.width - 0.5 &&
            Math.max(points[i].y, b.y) > n.y + 0.5 &&
            Math.min(points[i].y, b.y) < n.y + n.height - 0.5,
        ),
    )
    .map(n => n.id);
}

function routed(nodes: PlacedNodeIn[], edges: EdgeIn[], routing?: RoutingOptions) {
  const out = route({ nodes, edges, routing });
  for (const [id, e] of Object.entries(out.edges)) {
    expect(e.blocked, id).toBe(false);
    expect(through(e.points, nodes), id).toEqual([]);
  }
  return out;
}

describe('route row ports', () => {
  it('starts and ends a line at the rows it names', () => {
    const nodes = [card('jobs', 0, 0, 3), card('runs', 260, 40, 2)];
    const { edges } = routed(nodes, [
      {
        id: 'run',
        source: 'jobs',
        target: 'runs',
        sourceSide: 'right',
        targetSide: 'left',
        sourceAt: field(1),
        targetAt: field(0),
      },
    ]);
    const ps = edges.run.points;
    expect(ps[0]).toEqual({ x: 200, y: field(1) });
    expect(ps.at(-1)).toEqual({ x: 260, y: 40 + field(0) });
  });

  it('picks a left or right side for a row port without one', () => {
    const nodes = [card('a', 0, 0, 3), card('b', 400, 0, 3)];
    const { edges } = routed(nodes, [
      { id: 'ab', source: 'a', target: 'b', sourceAt: field(2), targetAt: field(0) },
    ]);
    expect(edges.ab.sourceSide).toBe('right');
    expect(edges.ab.targetSide).toBe('left');
    expect(edges.ab.points[0].y).toBe(field(2));
    expect(edges.ab.points.at(-1)!.y).toBe(field(0));
  });

  it('keeps a row port 10px from a corner', () => {
    const nodes = [card('a', 0, 0, 2), card('b', 400, 0, 2)];
    const { edges } = routed(nodes, [
      { id: 'ab', source: 'a', target: 'b', sourceSide: 'right', targetSide: 'left', sourceAt: 0 },
    ]);
    expect(edges.ab.points[0]).toEqual({ x: 200, y: 10 });
  });

  it('refuses a row port on a top or bottom side', () => {
    expect(() =>
      route({
        nodes: [card('a', 0, 0, 2), card('b', 0, 300, 2)],
        edges: [{ source: 'a', target: 'b', sourceSide: 'bottom', sourceAt: 20 }],
      }),
    ).toThrow('Edge "e1" sourceAt needs a left or right side, not bottom.');
  });

  it('joins two rows on the same side of cards in one column', () => {
    const nodes = [card('steps', 0, 0, 3), card('jobs', 0, 180, 3), card('runs', 0, 360, 2)];
    const { edges } = routed(nodes, [
      side('sj', 'steps', 'jobs', 'right', field(1), field(0)),
      side('jr', 'jobs', 'runs', 'right', field(2), field(0)),
      side('sr', 'steps', 'runs', 'left', field(0), field(1)),
    ]);
    expect(edges.sj.points[0]).toEqual({ x: 200, y: field(1) });
    expect(edges.sj.points.at(-1)).toEqual({ x: 200, y: 180 + field(0) });
    expect(edges.jr.points[0]).toEqual({ x: 200, y: 180 + field(2) });
    expect(edges.sr.points[0]).toEqual({ x: 0, y: field(0) });
    expect(edges.sr.points.at(-1)).toEqual({ x: 0, y: 360 + field(1) });
    // Each runs out to the right of the column and back, never through a card.
    expect(Math.max(...edges.sj.points.map(p => p.x))).toBeGreaterThan(200);
    expect(Math.min(...edges.sr.points.map(p => p.x))).toBeLessThan(0);
  });

  it('joins two rows on the same side of cards in adjacent columns', () => {
    const nodes = [card('jobs', 0, 0, 4), card('runs', 300, 60, 3), card('x', 300, 260, 2)];
    const { edges } = routed(nodes, [
      side('right', 'jobs', 'runs', 'right', field(3), field(1)),
      side('left', 'runs', 'jobs', 'left', field(0), field(0)),
    ]);
    expect(edges.right.points[0]).toEqual({ x: 200, y: field(3) });
    expect(edges.right.points.at(-1)).toEqual({ x: 500, y: 60 + field(1) });
    expect(edges.right.targetSide).toBe('right');
    expect(edges.left.points[0]).toEqual({ x: 300, y: 60 + field(0) });
    expect(edges.left.points.at(-1)).toEqual({ x: 0, y: field(0) });
  });

  it('fans several lines out of one header row', () => {
    const nodes = [card('runs', 0, 100, 4), ...[0, 1, 2].map(i => card(`a${i}`, 360, i * 140, 2))];
    const { edges } = routed(
      nodes,
      [0, 1, 2].map(i => ({
        id: `r${i}`,
        source: 'runs',
        target: `a${i}`,
        sourceSide: 'right' as const,
        targetSide: 'left' as const,
        sourceAt: HEADER / 2,
        targetAt: HEADER / 2,
      })),
    );
    for (const i of [0, 1, 2]) {
      const ps = edges[`r${i}`].points;
      expect(ps[0]).toEqual({ x: 200, y: 100 + HEADER / 2 });
      expect(ps.at(-1)).toEqual({ x: 360, y: i * 140 + HEADER / 2 });
    }
  });
});

describe('route strict mode', () => {
  // `a`'s right side is walled in: a line that must leave it there has no clear way.
  const nodes = [
    card('a', 0, 0, 2),
    { id: 'wall', x: 200, y: -20, width: 40, height: 140 },
    card('b', 400, 0, 2),
  ];
  const edges: EdgeIn[] = [
    { id: 'ab', source: 'a', target: 'b', sourceSide: 'right', targetSide: 'left' },
  ];

  it('draws a fallback through the box by default', () => {
    const out = route({ nodes, edges });
    expect(out.edges.ab.blocked).toBe(true);
    expect(out.edges.ab.points.length).toBeGreaterThan(0);
    expect(out.edges.ab.crosses).toEqual(['wall']);
  });

  it('returns a blocked line with no points, naming the box in the way', () => {
    const out = route({ nodes, edges, routing: { avoidNodes: 'strict' } });
    expect(out.edges.ab).toMatchObject({ blocked: true, points: [], path: '', crosses: ['wall'] });
    expect(out.warnings).toEqual(['1 line found no clear way.']);
  });

  // Codex's repros: with a large corner radius and a small clearance, the drawn corner cuts
  // into `obs` though the route's points clear it. A clip under 0.5px counts as the outline.
  it.each([
    [{ x: 0, y: 62 }, { x: 270, y: 196 }, { x: 166, y: 95, width: 82, height: 202 }, 64],
    [{ x: 0, y: 72 }, { x: 270, y: 287 }, { x: 127, y: 126, width: 88, height: 196 }, 128],
    [{ x: 0, y: 21 }, { x: 270, y: 76 }, { x: 220, y: 20, width: 23, height: 188 }, 256],
  ])('holds back a line whose rounded corner clips a box', (a, b, obs, cornerRadius) => {
    const out = route({
      nodes: [
        { id: 'a', ...a, width: 100, height: 100 },
        { id: 'b', ...b, width: 100, height: 100 },
        { id: 'obs', ...obs },
      ],
      edges: [
        {
          id: 'e',
          source: 'a',
          target: 'b',
          sourceSide: 'right',
          targetSide: 'left',
          sourceAt: 50,
          targetAt: 50,
        },
      ],
      routing: { quality: 'quick', avoidNodes: 'strict', cornerRadius, clearance: 4 },
    });
    expect(out.edges.e).toMatchObject({ blocked: true, points: [], crosses: ['obs'] });
  });

  it.each([64, 57.25])(
    'catches a corner that clips a box between its ends (radius %s)',
    cornerRadius => {
      const out = route({
        nodes: [
          { id: 'a', x: 0, y: 17, width: 100, height: 100 },
          { id: 'b', x: 270, y: 136, width: 100, height: 100 },
          { id: 'obs', x: 192, y: 50, width: 47, height: 181 },
        ],
        edges: [
          {
            id: 'e',
            source: 'a',
            target: 'b',
            sourceSide: 'right',
            targetSide: 'left',
            sourceAt: 50,
            targetAt: 50,
          },
        ],
        routing: { quality: 'quick', avoidNodes: 'strict', cornerRadius },
      });
      expect(out.edges.e).toMatchObject({ blocked: true, crosses: ['obs'] });
    },
  );

  it('keeps a row port on a diamond that the line leaves cleanly', () => {
    const out = route({
      nodes: [
        { id: 'd', x: 91, y: 59, width: 100, height: 100, shape: 'diamond' },
        { id: 'b', x: 400, y: 59, width: 100, height: 100 },
      ],
      edges: [
        {
          id: 'e',
          source: 'd',
          target: 'b',
          sourceSide: 'right',
          targetSide: 'left',
          sourceAt: 59,
          targetAt: 59,
        },
      ],
      routing: { avoidNodes: 'strict' },
    });
    expect(out.edges.e.blocked).toBe(false);
  });

  it.each(['pill', 'circle', 'diamond'] as const)('keeps a row port on a tall %s', shape => {
    const out = route({
      nodes: [
        { id: 's', x: 0, y: 0, width: 100, height: 200, shape },
        { id: 'b', x: 300, y: 0, width: 200, height: 120 },
      ],
      edges: [
        {
          id: 'e',
          source: 's',
          target: 'b',
          sourceSide: 'right',
          targetSide: 'left',
          sourceAt: 60,
          targetAt: 60,
        },
      ],
      routing: { avoidNodes: 'strict' },
    });
    expect(out.edges.e.blocked).toBe(false);
  });

  it('keeps a fallback line on its rows', () => {
    const out = route({
      nodes: [
        { id: 'a', x: 0, y: 0, width: 200, height: 98 },
        { id: 'b', x: 400, y: 0, width: 200, height: 98 },
        { id: 'obs', x: 220, y: -50, width: 40, height: 250 },
      ],
      edges: [
        {
          id: 'e',
          source: 'a',
          target: 'b',
          sourceSide: 'right',
          targetSide: 'left',
          sourceAt: 59,
          targetAt: 23,
        },
      ],
    });
    expect(out.edges.e.blocked).toBe(true);
    expect(out.edges.e.points[0]).toEqual({ x: 200, y: 59 });
    expect(out.edges.e.points.at(-1)).toEqual({ x: 400, y: 23 });
  });

  it('leaves clear lines alone', () => {
    const open = [card('a', 0, 0, 2), card('b', 400, 0, 2)];
    const out = route({ nodes: open, edges, routing: { avoidNodes: 'strict' } });
    expect(out.edges.ab.blocked).toBe(false);
    expect(out.edges.ab.points.length).toBeGreaterThan(1);
  });
});

/** 30 cards in five columns and `lines` lines between their rows, some across several columns. */
function schema(lines: number) {
  const nodes: PlacedNodeIn[] = [],
    edges: EdgeIn[] = [];
  for (let c = 0; c < 5; c++) {
    let y = 0;
    for (let r = 0; r < 6; r++) {
      const rows = 2 + ((c * 7 + r * 3) % 5);
      nodes.push(card(`c${c}r${r}`, c * 320, y, rows));
      y += HEADER + rows * ROW + 40;
    }
  }
  const rows = (id: string) => (nodes.find(n => n.id === id)!.height - HEADER) / ROW;
  for (let i = 0; edges.length < lines; i++) {
    const a = nodes[(i * 7) % nodes.length],
      b = nodes[(i * 11 + 5) % nodes.length];
    if (a === b) continue;
    const same = a.x === b.x,
      right = a.x < b.x;
    edges.push({
      id: `l${i}`,
      source: a.id,
      target: b.id,
      sourceSide: same || right ? 'right' : 'left',
      targetSide: same ? 'right' : right ? 'left' : 'right',
      sourceAt: field(i % rows(a.id)),
      targetAt: i % 4 ? field((i * 3) % rows(b.id)) : HEADER / 2,
    });
  }
  return { nodes, edges };
}

describe('route determinism', () => {
  it('draws the same lines every time', () => {
    const { nodes, edges } = schema(20);
    const once = route({ nodes, edges, routing: { quality: 'full', avoidNodes: 'strict' } });
    const twice = route({ nodes, edges, routing: { quality: 'full', avoidNodes: 'strict' } });
    expect(twice).toEqual(once);
    for (const [id, e] of Object.entries(once.edges))
      if (!e.blocked) expect(through(e.points, nodes), id).toEqual([]);
  });
});

function side(
  id: string,
  source: string,
  target: string,
  s: 'left' | 'right',
  sourceAt: number,
  targetAt: number,
): EdgeIn {
  return { id, source, target, sourceSide: s, targetSide: s, sourceAt, targetAt };
}
