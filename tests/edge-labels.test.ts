import { describe, expect, it } from 'vitest';
import { overlaps } from '../src/model/geometry';
import { edgeLabelSize } from '../src/model/labels';
import { placeEdgeLabel } from '../src/model/routes';

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
      rect = { x: placed.x - placed.w / 2, y: placed.y - placed.h / 2, w: placed.w, h: placed.h };

    expect(bounds.w).toBeGreaterThan(gap);
    expect(placed.y).not.toBe(100);
    expect(obstacles.some(o => overlaps(rect, o, 4))).toBe(false);
    expect(existing.some(o => overlaps(rect, o, 6))).toBe(false);
  });

  it('sizes long labels from the rendered edge font without a width cap', () => {
    const label = 'a connection label that is long enough to exceed the old width limit '.repeat(2);
    expect(edgeLabelSize(label).w).toBeGreaterThan(280);
  });
});
