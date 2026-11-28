import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';
import { overlaps } from '../src/model/geometry';
import { resolveAppearance } from '../src/model/appearance';
import { edgeLabelLines, edgeLabelSize, LABEL_WRAP } from '../src/model/labels';
import fs from 'node:fs';
import { ARROW_REACH, MARKERS, markerRects } from '../src/model/markers';
import { projectScene, visibleRects } from '../src/dsl/project';
import {
  computeRoutes,
  labelLeader,
  placeEdgeLabel,
  placeEdgeLabels,
  roomForLabel,
  routeBends,
} from '../src/model/routes';
import { buildStaticScene } from '../src/model/static-scene';
import type { Point, Rect } from '../src/model/types';

const rectOf = (l: { x: number; y: number; w: number; h: number }): Rect => ({
  x: l.x - l.w / 2,
  y: l.y - l.h / 2,
  w: l.w,
  h: l.h,
});

/** Distance from a point to the nearest segment of an orthogonal route. */
const distance = (p: Point, route: Point[]) =>
  Math.min(
    ...route.slice(1).map((b, i) => {
      const a = route[i],
        x = Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), p.x)),
        y = Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), p.y));
      return Math.hypot(p.x - x, p.y - y);
    }),
  );

describe('edge label leaders', () => {
  const label = { x: 50, y: 40, w: 40, h: 20 },
    route = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
  it('connects a detached label to an interior point of its own line', () => {
    expect(labelLeader(label, route, [], [])?.path).toBe('M 50 0 Q 58 15 50 30');
  });
  it('attaches to a painted dash and omits leaders for labels on another segment', () => {
    expect(labelLeader(label, route, [], [], '5 5')?.path).toBe('M 52.5 0 Q 60.5 15 52.5 30');
    const onOther = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 50, y: 40 },
    ];
    expect(labelLeader(label, onOther, [], [])).toBeUndefined();
  });
  it('keeps a nearby label clear of extra marks', () => {
    expect(labelLeader({ ...label, y: 17 }, route, [], [])).toBeUndefined();
  });
  it('tries the opposite bow when only one curve is blocked', () => {
    const leader = labelLeader(label, route, [{ x: 55, y: 12, w: 2, h: 6 }], []);
    expect(leader?.path).toBe('M 50 0 Q 42 15 50 30');
  });
  it.each([0, 6, 16])('keeps leaders clear of painted bends at radius %i', radius => {
    const own = [
        { x: 57, y: -40 },
        { x: 57, y: 40 },
      ],
      other = [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 45 },
      ],
      near = { x: 32, y: 4, w: 26, h: 8 },
      leader = labelLeader(near, own, routeBends(other, radius), [other], undefined, radius);
    if (radius === 0) expect(leader).toBeDefined();
    else expect(leader?.path).not.toBe('M 57 4 Q 51 12 45 4');
  });
  it.each(MARKERS.filter(kind => kind !== 'none'))('keeps leaders off a %s marker', kind => {
    const other = [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
      ],
      own = [
        { x: 74.25, y: -40 },
        { x: 74.25, y: 40 },
      ],
      label = { x: 46, y: 3.1, w: 30, h: 20 };
    expect(labelLeader(label, own, markerRects(other, { head: kind }), [other])).toBeUndefined();
  });
  it('omits a leader blocked by a shape or another line', () => {
    expect(labelLeader(label, route, [{ x: 45, y: 10, w: 10, h: 10 }], [])).toBeUndefined();
    expect(
      labelLeader(
        label,
        route,
        [],
        [
          [
            { x: 30, y: 15 },
            { x: 70, y: 15 },
          ],
        ],
      ),
    ).toBeUndefined();
  });
});

describe('edge label placement', () => {
  it('adds modest room only to an implicit preferred near gap', () => {
    const source = `diagram "Near labels"
node a "First"
node b "Second"
edge e a -> b "AI"
near b a side=below`;
    const gap = (text: string) => {
      const scene = checkSource(text),
        a = scene.byId.get('a')!,
        b = scene.byId.get('b')!;
      return b.localY - a.localY - a.h;
    };
    expect(gap(source)).toBe(40);
    expect(gap(source + ' gap=28')).toBe(28);
    expect(gap(source + ' strength=required')).toBe(28);
  });
  it.each(['pin', 'stay'])('does not close an anchored sibling corridor with %s', kind => {
    const source = `diagram "Corridor"
node a "A"
node b "B"
node c "C"
node d "D"
edge e a -> b "AI"
near b a side=below
edge out c -> d from=top
${kind} c x=0 y=164
pin d x=195 y=110`;
    const scene = checkSource(source),
      plain = checkSource(source.replace('side=below', 'side=below gap=28'));
    for (const quick of [false, true]) {
      const blocked = (scene: ReturnType<typeof checkSource>) => {
        const doc = projectScene(scene),
          { vg, rects } = visibleRects(doc);
        return computeRoutes(doc, vg, rects, { previous: [], quick })
          .routes.filter(r => r.blocked)
          .map(r => r.id);
      };
      expect(blocked(scene)).toEqual(blocked(plain));
      expect(blocked(scene)).not.toContain('out');
    }
  });
  it('keeps the Srcly fingerprint on its direct near edge', async () => {
    const source = fs.readFileSync(
      'docs/intent/diagram-quality/corpus/srcly-scan-lifecycle/e2.draft',
      'utf8',
    );
    const scene = await compile(source),
      a = scene.byId.get('jobs')!,
      b = scene.byId.get('cache')!;
    expect(b.localY - a.localY - a.h).toBe(40);
    const doc = projectScene(scene),
      { vg, rects } = visibleRects(doc);
    const route = computeRoutes(doc, vg, rects, { previous: [] }).routes.find(
      r => r.id === 'lookup',
    )!;
    expect(distance(route.label!, route.points)).toBe(0);
    expect(route.label!.leader).toBeUndefined();
  });
  it('leaves a stayed endpoint in place while making room for its label', async () => {
    const source = fs.readFileSync(
      'docs/intent/diagram-quality/corpus/draftably-code-layers/e2.draft',
      'utf8',
    );
    const scene = await compile(source);
    const plain = await compile(
      source.replace(
        'edge l13 package -> components "viewer build"',
        'edge l13 package -> components',
      ),
    );
    expect(
      Math.abs(scene.byId.get('components')!.localY - plain.byId.get('components')!.localY),
    ).toBeLessThanOrEqual(1);
    const doc = projectScene(scene),
      { vg, rects } = visibleRects(doc);
    const route = computeRoutes(doc, vg, rects, { previous: [] }).routes.find(r => r.id === 'l13')!;
    expect(distance(route.label!, route.points)).toBe(0);
  });
  it('keeps a label on a short edge when separating a pinned sibling', () => {
    const source = fs.readFileSync('examples/checkout.draft', 'utf8');
    const doc = projectScene(
      checkSource(`${source}\npin payments x=0 y=0\nrouting clearance=30\n`),
    );
    const { vg, rects } = visibleRects(doc);
    const route = computeRoutes(doc, vg, rects, { previous: [] }).routes.find(
      r => r.id === 'charge',
    )!;
    expect(route.label).toBeTruthy();
    expect(distance(route.label!, route.points)).toBe(0);
  });
  it('keeps a label on its arrow when only the middle of the gap fits', () => {
    const points = [
      { x: 100, y: 40 },
      { x: 149, y: 40 },
    ];
    const boxes = [
      { x: 0, y: 0, w: 100, h: 80 },
      { x: 149, y: 0, w: 100, h: 80 },
    ];
    const label = placeEdgeLabel('AI', points, boxes);
    expect(distance(label, points)).toBe(0);
    expect(boxes.some(box => overlaps(rectOf(label), box, 4))).toBe(false);

    // The second crossing misses the glyphs, but the halo would erase their left edge.
    for (const [name, x] of [
      ['AI', 124.5],
      ['Pass', 112],
    ] as const) {
      const crossing = [
        { x, y: 0 },
        { x, y: 80 },
      ];
      const clear = placeEdgeLabel(name, points, boxes, [], undefined, { routes: [crossing] });
      // Include the 4px half-width of the painted halo around the crossing line.
      const ink = {
        x: clear.x - clear.w / 2 + 8,
        y: clear.y - clear.h / 2,
        w: clear.w - 16,
        h: clear.h,
      };
      expect(overlaps(ink, { x: x - 4, y: 0, w: 8, h: 80 })).toBe(false);
    }
  });

  it.each([12, 32])('keeps a label clear of objects across a %ipx gap', gap => {
    const label = 'makes this connection clear',
      bounds = edgeLabelSize(label),
      obstacles = [
        { x: 0, y: 60, w: 100, h: 80 },
        { x: 100 + gap, y: 60, w: 100, h: 80 },
        { x: 0, y: 0, w: 200 + gap, h: 32 }, // Group header.
      ],
      existing = [{ x: 80, y: 35, w: 72, h: 21 }],
      placed = placeEdgeLabel(
        label,
        [
          { x: 100, y: 100 },
          { x: 100 + gap, y: 100 },
        ],
        obstacles,
        existing,
      ),
      rect = rectOf(placed);

    expect(bounds.w).toBeGreaterThan(gap);
    expect(placed.y).not.toBe(100);
    expect(obstacles.some(o => overlaps(rect, o, 4))).toBe(false);
    expect(existing.some(o => overlaps(rect, o, 6))).toBe(false);
  });

  it('wraps a long flow label and breaks it at each \\n', () => {
    const look = resolveAppearance(),
      long = 'a connection label that is long enough to need more than one line',
      one = edgeLabelSize('short');
    expect(edgeLabelSize(long).w).toBeLessThanOrEqual(LABEL_WRAP + 16);
    expect(edgeLabelLines(long, look).length).toBeGreaterThan(1);
    expect(edgeLabelLines('first line\nsecond line', look)).toEqual(['first line', 'second line']);
    expect(edgeLabelSize('first line\nsecond line').h).toBe(one.h + look.annotation.lineHeight);
  });

  it('stays on its own route instead of sitting on another edge', () => {
    // A short level edge whose middle another edge crosses; the label slides along its own line.
    const own = [
        { x: 0, y: 100 },
        { x: 240, y: 100 },
      ],
      other = [
        { x: 120, y: 0 },
        { x: 120, y: 200 },
      ],
      placed = placeEdgeLabel('pick a path', own, [], [], undefined, { routes: [other] }),
      rect = rectOf(placed);

    expect(rect.x + rect.w <= 118 || rect.x >= 122).toBe(true);
    expect(distance(placed, own)).toBeLessThanOrEqual(placed.h);
  });

  it('sits beside its segment rather than on a parallel line or a node', () => {
    // Another edge runs along the same line; the label moves just above or below its own edge.
    const own = [
        { x: 0, y: 100 },
        { x: 200, y: 100 },
      ],
      other = [
        { x: -20, y: 100 },
        { x: 220, y: 100 },
      ],
      placed = placeEdgeLabel('valid', own, [], [], undefined, { routes: [other] });

    expect(placed.y).not.toBe(100);
    expect(distance(placed, own)).toBeLessThanOrEqual(placed.h);
  });

  it('widens a flow gap to fit the labels that cross it', () => {
    const gapBetween = (source: string) => {
      const scene = checkSource(source),
        a = scene.byId.get('a')!,
        b = scene.byId.get('b')!;
      return b.x - (a.x + a.w);
    };
    const plain = gapBetween(
        'layout root flow direction=right gap=48\nnode a "A"\nnode b "B"\nedge e1 a -> b',
      ),
      labelled = gapBetween(
        'layout root flow direction=right gap=48\nnode a "A"\nnode b "B"\nedge e1 a -> b "markdown + source id"',
      );

    expect(plain).toBe(48);
    expect(labelled).toBeGreaterThanOrEqual(edgeLabelSize('markdown + source id').w + 20);
  });

  it('shifts off-centre on an upright segment to clear a line running alongside', () => {
    // Two lines leave one box 16px apart; the label stays crossed by its own line only.
    const own = [
        { x: 100, y: 0 },
        { x: 100, y: 50 },
      ],
      other = [
        { x: 116, y: 0 },
        { x: 116, y: 50 },
      ],
      placed = placeEdgeLabel('import error', own, [], [], undefined, { routes: [other] }),
      rect = rectOf(placed);

    expect(rect.x + rect.w).toBeLessThan(116);
    expect(rect.x + rect.w).toBeGreaterThan(100);
  });
});

describe('the label pass', () => {
  it('lets a label with a clean spot keep it, and keeps two labels apart', () => {
    // `b` crosses a line wherever it goes; placed first in route order, it would take `a`'s spot.
    const a = [
        { x: 0, y: 100 },
        { x: 200, y: 100 },
      ],
      b = [
        { x: 60, y: 60 },
        { x: 60, y: 130 },
      ],
      jobs = [
        { label: 'crossing', points: b, avoid: { routes: [a] } },
        { label: 'clean', points: a, avoid: { routes: [b] } },
      ],
      [pb, pa] = placeEdgeLabels(jobs, []).map(rectOf);

    expect(overlaps(pa, pb, 6)).toBe(false);
    // `clean` is not crossed by `b`'s line.
    expect(pa.x > 62 || pa.x + pa.w < 58).toBe(true);
    // Nor do the two read as one pair: they stand at least a label's height apart.
    expect(overlaps(pa, pb, pa.h)).toBe(false);
  });
});

describe('room for a label at a bend', () => {
  // A line across a 170px gap that drops 40px half way: neither 85px run holds a 140px label.
  const z = [
    { x: 0, y: 0 },
    { x: 85, y: 0 },
    { x: 85, y: 40 },
    { x: 170, y: 40 },
  ];
  const level = (ps: Point[]) =>
    Math.max(...ps.slice(1).map((p, i) => (p.y === ps[i].y ? Math.abs(p.x - ps[i].x) : 0)));

  it('slides the bend so one level run holds the label', () => {
    expect(level(roomForLabel(z, 140, 21, [], []))).toBeGreaterThanOrEqual(148);
  });

  it('keeps the bend when sliding it would cross a box', () => {
    const boxes = [
      { x: 10, y: 10, w: 12, h: 20 },
      { x: 148, y: 10, w: 12, h: 20 },
    ];
    expect(roomForLabel(z, 140, 21, boxes, [])).toEqual(z);
  });
});

/** Issue reproductions, drawn as the static scene draws them. */
const issueScene = (slug: string) => {
  const source = fs.readFileSync(`docs/intent/diagram-quality/issues/${slug}/v0.draft`, 'utf8'),
    doc = projectScene(checkSource(source)),
    { vg, rects } = visibleRects(doc);
  return buildStaticScene(doc, computeRoutes(doc, vg, rects, {}).result);
};

describe('edge labels in a crowded drawing', () => {
  it('keeps every other line out of a label in a bundle of parallel routes (#587)', () => {
    const { routes } = issueScene('i587-label-hides-routes');
    for (const route of routes) {
      if (!route.label) continue;
      const text = { ...rectOf(route.label), y: route.label.y - route.label.h / 2 + 3 };
      text.h -= 6;
      for (const other of routes) {
        if (other === route) continue;
        const hit = other.points.slice(1).some((b, i) => {
          const a = other.points[i];
          return (
            Math.max(a.x, b.x) > text.x &&
            Math.min(a.x, b.x) < text.x + text.w &&
            Math.max(a.y, b.y) > text.y &&
            Math.min(a.y, b.y) < text.y + text.h
          );
        });
        expect(hit, `${other.id} through ${route.id}'s label`).toBe(false);
      }
    }
  });
});

it.each(['right', 'left', 'top', 'bottom'] as const)(
  'leaves the %s arrowhead visible in a tight gap',
  side => {
    const doc = projectScene(checkSource('node a "A"\nnode b "B"\nedge go a -> b "Go"'));
    const flat = side === 'right' || side === 'left';
    const forward = side === 'right' || side === 'bottom';
    const axis = flat ? 'x' : 'y';
    const size = flat ? 'w' : 'h';
    Object.assign(doc.layout.nodes.a, { x: 0, y: 0, w: 80, h: 50 });
    Object.assign(doc.layout.nodes.b, {
      x: 0,
      y: 0,
      w: 80,
      h: 50,
      [axis]: (forward ? 1 : -1) * ((flat ? 80 : 50) + (flat ? 50 : 32)),
    });
    doc.layout.edges.go = { [flat ? 'labelDx' : 'labelDy']: (forward ? 1 : -1) * (flat ? 8 : 0) };
    const { vg, rects } = visibleRects(doc);
    const route = computeRoutes(doc, vg, rects).routes[0],
      tip = route.points.at(-1)!;
    expect(
      Math.abs(tip[axis] - route.label![axis]) - route.label![size] / 2,
    ).toBeGreaterThanOrEqual(ARROW_REACH);
  },
);
