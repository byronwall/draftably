import { describe, expect, it } from 'vitest';
import {
  describeMeasure,
  holdSlots,
  pickCandidates,
  readDifference,
  sameDrawing,
  type Candidate,
  type Measure,
} from '../src/model/candidates';
import { emptyDiagram } from '../src/model/document';
import { labelHits } from '../src/model/label-hits';
import type { StaticScene } from '../src/model/static-scene';
import type { Point } from '../src/model/types';

const measures = (patch: Partial<Measure> = {}): Measure => ({
  crossings: 2,
  blocked: 0,
  overlaps: 0,
  labels: 0,
  bends: 10,
  length: 1000,
  area: 10000,
  aspect: 1.5,
  ...patch,
});

const scene = (x: number) =>
  ({
    bounds: { x: 0, y: 0, w: 200, h: 100 },
    rects: new Map([
      ['a', { x: 0, y: 0, w: 50, h: 20 }],
      ['b', { x, y: 40, w: 50, h: 20 }],
    ]),
    routes: [],
  }) as unknown as StaticScene;

const candidate = (index: number, x: number, patch: Partial<Measure> = {}): Candidate => ({
  index,
  scene: scene(x),
  measure: measures(patch),
});

describe('Compare candidates', () => {
  it('treats drawings a pixel apart as the same drawing', () => {
    expect(sameDrawing(scene(100), scene(101))).toBe(true);
    expect(sameDrawing(scene(100), scene(120))).toBe(false);
  });

  it('reads gains and costs from measures, and ignores small changes', () => {
    const r = readDifference(
      measures({ crossings: 0, area: 8000, length: 1020, bends: 13 }),
      measures(),
    );
    expect(r.gains).toEqual(['2 fewer crossings', '20% smaller']);
    expect(r.costs).toEqual(['3 more bends']);
    expect(r.defects).toEqual([]);
  });

  it('shows a real improvement before a sameness, and drops repeats', () => {
    const current = candidate(0, 100);
    const sheet = pickCandidates(
      current,
      [
        candidate(1, 101, { crossings: 0 }), // the same drawing as the current one
        candidate(2, 140, { bends: 12 }), // only worse
        candidate(3, 160, { crossings: 1 }),
        candidate(4, 161, { crossings: 1 }), // a repeat of 3
      ],
      3,
    );
    expect(sheet.shown).toEqual([3, 2]);
    expect(sheet.alike).toBe(2);
  });

  it('keeps a candidate with a new hard defect behind every sound one', () => {
    const sheet = pickCandidates(
      candidate(0, 100),
      [candidate(1, 180, { crossings: 0, blocked: 1 }), candidate(2, 140, { bends: 12 })],
      1,
    );
    expect(sheet.shown).toEqual([2]);
    expect(sheet.others).toEqual([1]);
  });
});

describe('label collisions', () => {
  it('states them as a defect and as a gain', () => {
    expect(readDifference(measures({ labels: 2 }), measures()).defects).toEqual([
      '2 label collisions',
    ]);
    expect(readDifference(measures(), measures({ labels: 1 })).gains).toEqual([
      '1 fewer label collision',
    ]);
    expect(describeMeasure(measures({ labels: 1 }))).toBe(
      '2 crossings · 10 bends · 1 label collision',
    );
  });

  it('ranks a card with collided labels below an equal card without them', () => {
    const sheet = pickCandidates(
      candidate(0, 100),
      [candidate(1, 140, { area: 8000, labels: 1 }), candidate(2, 180, { area: 8000 })],
      1,
    );
    expect(sheet.shown).toEqual([2]);
    expect(sheet.others).toEqual([1]);
  });

  it('keeps a collision behind a card that gains less', () => {
    const sheet = pickCandidates(
      candidate(0, 100),
      [
        candidate(1, 180, { crossings: 0, length: 500, labels: 1 }),
        candidate(2, 140, { bends: 12 }),
      ],
      2,
    );
    expect(sheet.shown).toEqual([2, 1]);
  });

  it('leads with the card that clears the most, when the current drawing has collisions', () => {
    const current = candidate(0, 100, { labels: 3 });
    const sheet = pickCandidates(
      current,
      [
        candidate(1, 140, { labels: 3, crossings: 0 }),
        candidate(2, 180, { labels: 2 }),
        candidate(3, 220, { labels: 0 }),
      ],
      3,
    );
    expect(sheet.shown).toEqual([3, 1, 2]);
  });

  it('orders the flawed cards by how many defects they have', () => {
    const sheet = pickCandidates(
      candidate(0, 100),
      [candidate(1, 140, { labels: 3 }), candidate(2, 180, { labels: 1 })],
      2,
    );
    expect(sheet.shown).toEqual([2, 1]);
  });

  describe('in a drawing', () => {
    const bare = { x: 0, y: 0, w: 400, h: 300 };
    const route = (id: string, x: number, y: number, points: Point[]) => ({
      id,
      from: 'a',
      to: 'b',
      points,
      label: { x, y, w: 60, h: 20 },
    });
    const drawn = (
      routes: unknown[],
      nodes = [{ id: 'n', title: 'Box', rect: { x: 300, y: 200, w: 80, h: 60 } }],
    ) =>
      ({
        doc: emptyDiagram(),
        vg: {
          nodes: nodes.map(({ id, title }) => ({ id, title })),
          groups: [],
          edges: routes.map(r => ({
            id: (r as { id: string }).id,
            label: (r as { id: string }).id,
          })),
        },
        rects: new Map(nodes.map(n => [n.id, n.rect])),
        routes,
        bounds: bare,
      }) as unknown as StaticScene;
    const line = (y: number): Point[] => [
      { x: 0, y },
      { x: 200, y },
    ];

    it('finds a label on a label, a shape and a line, and no more', () => {
      const notes = (routes: unknown[]) => labelHits(drawn(routes)).map(h => h.note);
      expect(notes([route('one', 100, 50, line(50)), route('two', 100, 150, line(150))])).toEqual(
        [],
      );
      expect(notes([route('one', 100, 50, line(50)), route('two', 110, 55, line(55))])).toEqual([
        'The label "one" covers the label "two".',
        'The label "one" sits on another line.',
        'The label "two" sits on another line.',
      ]);
      expect(notes([route('one', 320, 210, line(50))])).toEqual(['The label "one" covers "Box".']);
      const across = [
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      expect(notes([route('one', 100, 50, line(50)), route('two', 300, 50, across)])).toEqual([
        'The label "one" sits on another line.',
      ]);
    });

    it('lets lines from one port share a trunk under a label', () => {
      const twin = line(50);
      expect(
        labelHits(
          drawn([route('one', 100, 50, line(50)), { ...route('two', 0, 0, twin), label: null }]),
        ),
      ).toEqual([]);
    });

    it('finds a title too tall for its shape', () => {
      const small = [
        {
          id: 'n',
          title: 'A title much too long for so small a box',
          rect: { x: 300, y: 200, w: 80, h: 30 },
        },
      ];
      expect(labelHits(drawn([], small)).map(h => h.note)).toEqual([
        `"${small[0].title}" does not fit in its shape.`,
      ]);
    });
  });
});

describe('holdSlots', () => {
  it('keeps a card in its slot and fills only the free ones', () => {
    expect(holdSlots([4, 5, 6], [4, 6], [9, 5], 3)).toEqual([4, 9, 6]);
  });

  it('fills a first sheet in order', () => {
    expect(holdSlots([], [], [7, 8, 9, 10], 3)).toEqual([7, 8, 9]);
  });
});
