import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';
import { overlaps } from '../src/model/geometry';
import { edgeLabelSize } from '../src/model/labels';
import { placeEdgeLabel, placeEdgeLabels } from '../src/model/routes';
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

describe('edge label placement', () => {
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

  it('sizes long labels from the rendered edge font without a width cap', () => {
    const label = 'a connection label that is long enough to exceed the old width limit '.repeat(2);
    expect(edgeLabelSize(label).w).toBeGreaterThan(280);
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
