import { describe, expect, it, vi } from 'vitest';
import { RouteLab } from '../src/engines/routing-engine';
import { layout, route } from '../src/graph-api';

describe('graph api layout', () => {
  it('places and routes a graph under the caller’s own IDs', async () => {
    const out = await layout({
      groups: [{ id: 'svc', label: 'Domain services', arrange: 'row' }],
      nodes: [
        { id: '1', label: 'Web app' },
        { id: '2', label: 'API gateway' },
        { id: '3', label: 'Orders', parent: 'svc' },
        { id: '4', label: 'Payments', parent: 'svc', shape: 'pill' },
        { id: '5', label: 'Postgres', width: 140, height: 60 },
      ],
      edges: [
        { source: '1', target: '2', label: 'HTTPS' },
        { source: '2', target: '3', label: 'create order' },
        { source: '2', target: '4' },
        { source: '3', target: '5', label: 'persist', dashed: true },
        { source: '4', target: '5' },
      ],
    });
    expect(Object.keys(out.nodes).sort()).toEqual(['1', '2', '3', '4', '5']);
    expect(out.nodes['5']).toMatchObject({ width: 140, height: 60 });
    expect(out.nodes['3'].parent).toBe('svc');
    expect(out.edges.e2).toMatchObject({ source: '2', target: '3' });
    expect(out.edges.e2.label).not.toBeNull();
    expect(Object.values(out.edges).every(e => !e.blocked)).toBe(true);
    expect(out.quality).toBe('full');
    expect(out.warnings).toEqual([]);
    // The returned file draws the same graph: its node lines carry the caller's labels.
    expect(out.draft).toContain('node _0 "Web app"');
  });

  it('keeps node and edge IDs apart, and numbers edges round given IDs', async () => {
    const out = await layout({
      nodes: [{ id: 'e1' }, { id: 'e2' }, { id: '1' }, { id: '_0' }],
      edges: [
        { source: 'e1', target: 'e2' },
        { id: 'e1', source: 'e2', target: '1' },
        { id: '2 3', source: '1', target: '_0' },
      ],
    });
    expect(Object.keys(out.nodes).sort()).toEqual(['1', '_0', 'e1', 'e2']);
    expect(Object.keys(out.edges).sort()).toEqual(['2 3', 'e1', 'e2']);
    expect(out.edges.e2).toMatchObject({ source: 'e1', target: 'e2' });
    expect(out.edges['2 3']).toMatchObject({ source: '1', target: '_0' });
  });

  it('keeps a size inside the file’s range and says so', async () => {
    const out = await layout({ nodes: [{ id: 'a', width: 12, height: 5000 }] });
    expect(out.nodes.a).toMatchObject({ width: 40, height: 1200 });
    expect(out.warnings).toHaveLength(2);
  });

  it('names the object behind a bad reference', async () => {
    await expect(layout({ nodes: [{ id: 'a', parent: 'nope' }] })).rejects.toThrow(
      'Node "a" refers to unknown id "nope".',
    );
    await expect(layout({ nodes: [{ id: 'a' }, { id: 'a' }] })).rejects.toThrow(
      'Duplicate node or group id "a".',
    );
  });

  it('routes quickly when asked', async () => {
    const graph = {
      nodes: ['a', 'b', 'c', 'd'].map(id => ({ id })),
      edges: [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' },
        { source: 'b', target: 'd' },
        { source: 'c', target: 'd' },
      ],
    };
    expect((await layout({ ...graph, routing: { quality: 'quick' } })).quality).toBe('quick');
    expect((await layout({ ...graph, routing: { quality: 'full' } })).quality).toBe('full');
  });

  it('plans a large flow’s lines from its ranks, through corridors between the boxes', async () => {
    // 60 nodes; each links to one earlier node, and every fourth also to one three ranks up.
    const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}` })),
      edges = nodes.slice(1).flatMap((_, k) => {
        const i = k + 1,
          parent = Math.floor((i - 1) / 2);
        return [
          { source: `n${parent}`, target: `n${i}` },
          ...(i % 4 === 0 && i >= 15 ? [{ source: `n${Math.floor(i / 8)}`, target: `n${i}` }] : []),
        ];
      });
    const quick = await layout({ nodes, edges, direction: 'down', routing: { quality: 'quick' } }),
      full = await layout({ nodes, edges, direction: 'down', routing: { quality: 'full' } });
    const boxes = Object.entries(quick.nodes);
    for (const e of Object.values(quick.edges)) {
      expect([e.sourceSide, e.targetSide, e.blocked]).toEqual(['bottom', 'top', false]);
      // No run passes through a box other than its own ends.
      for (const [id, b] of boxes) {
        if (id === e.source || id === e.target) continue;
        for (const [p, q] of e.points.slice(1).map((q, j) => [e.points[j], q])) {
          const inX = Math.max(p.x, q.x) > b.x && Math.min(p.x, q.x) < b.x + b.width,
            inY = Math.max(p.y, q.y) > b.y && Math.min(p.y, q.y) < b.y + b.height;
          expect(inX && inY, `${e.source}→${e.target} runs through ${id}`).toBe(false);
        }
      }
    }
    // Planned lines stay as planned in the full passes.
    expect(full.edges).toEqual(quick.edges);
  });
});

describe('graph api route', () => {
  it('routes round a box between two others, and labels a line', () => {
    const nodes = [
      { id: 'a', x: 0, y: 0, width: 120, height: 60 },
      { id: 'b', x: 400, y: 0, width: 120, height: 60 },
      { id: 'c', x: 200, y: 160, width: 120, height: 60 },
      { id: 'wall', x: 180, y: -40, width: 120, height: 140 },
    ];
    const { edges, quality } = route({
      nodes,
      edges: [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c', label: 'then' },
      ],
    });
    const wall = nodes[3];
    const hits = edges.ab.points.some(
      p => p.x > wall.x && p.x < wall.x + wall.width && p.y > wall.y && p.y < wall.y + wall.height,
    );
    expect(hits).toBe(false);
    expect(edges.ac.label).not.toBeNull();
    expect(quality).toBe('full');
  });

  it('names an unknown end', () => {
    expect(() =>
      route({
        nodes: [{ id: 'a', x: 0, y: 0, width: 80, height: 40 }],
        edges: [{ source: 'a', target: 'b' }],
      }),
    ).toThrow('Edge "e1" refers to unknown id "b".');
  });
});

describe('fixed row ports during resize', () => {
  const box = (id: string, x: number, y: number) => ({ id, x, y, width: 100, height: 60 });
  const row = (id: string, source: string, target: string) => ({
    id,
    source,
    target,
    sourceSide: 'right' as const,
    targetSide: 'left' as const,
    sourceAt: 30,
    targetAt: 30,
  });
  const routing = { quality: 'full', avoidNodes: 'strict' } as const;

  it('reuses clear rows at their new coordinates and protects the stored route from caller edits', () => {
    const graph = {
      nodes: [box('a', 0, 0), box('b', 300, 0)],
      edges: [row('line', 'a', 'b')],
      routing,
    };
    const before = route(graph);
    before.edges.line.points[0].x = 9999;
    const resized = { ...graph, nodes: [{ ...graph.nodes[0], width: 124 }, box('b', 360, 0)] };
    const compute = vi.spyOn(RouteLab, 'compute');
    try {
      const out = route(resized, before);
      expect(out.edges.line.points).toEqual([
        { x: 124, y: 30 },
        { x: 360, y: 30 },
      ]);
      expect(compute).not.toHaveBeenCalled();
      expect(route(resized, before)).toEqual(out);
    } finally {
      compute.mockRestore();
    }
  });

  it('takes the shorter full route when a resize opens a straight path', () => {
    const graph = {
      nodes: [box('a', 0, 0), box('b', 500, 0), box('wall', 220, 0)],
      edges: [row('ab', 'a', 'b')],
      routing,
    };
    const before = route(graph);
    expect(before.edges.ab.points.length).toBeGreaterThan(2);
    const next = { ...graph, nodes: [...graph.nodes.slice(0, 2), box('wall', 220, 200)] };
    const resized = route(next, before);
    expect(resized).toEqual(route(next));
    expect(resized.edges.ab.points).toHaveLength(2);
  });

  it('routes a line around a newly obstructing card and keeps the other rows clear', () => {
    const nodes = [
      box('a', 0, 0),
      box('b', 500, 0),
      box('c', 0, 240),
      box('d', 500, 240),
      box('e', 0, 480),
      box('f', 500, 480),
      box('wall', 220, 120),
    ];
    const edges = [row('ab', 'a', 'b'), row('cd', 'c', 'd'), row('ef', 'e', 'f')];
    const before = route({ nodes, edges, routing });
    expect(before.edges.ab.points).toHaveLength(2);
    const wall = box('wall', 220, 0);
    const graph = { nodes: [...nodes.slice(0, -1), wall], edges, routing };
    const out = route(graph, before);
    const points = out.edges.ab.points;
    expect(out.edges.ab.blocked).toBe(false);
    expect(points.length).toBeGreaterThan(2);
    expect(points[0]).toEqual({ x: 100, y: 30 });
    expect(points.at(-1)).toEqual({ x: 500, y: 30 });
    for (const [i, b] of points.slice(1).entries()) {
      const a = points[i];
      expect(
        Math.max(a.x, b.x) > wall.x &&
          Math.min(a.x, b.x) < wall.x + wall.width &&
          Math.max(a.y, b.y) > wall.y &&
          Math.min(a.y, b.y) < wall.y + wall.height,
      ).toBe(false);
    }
    expect(out.edges.cd).toEqual(before.edges.cd);
    expect(out.edges.ef).toEqual(before.edges.ef);
    expect(route(graph, before)).toEqual(out);
  });
});
