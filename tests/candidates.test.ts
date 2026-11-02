import { describe, expect, it } from 'vitest';
import {
  holdSlots,
  pickCandidates,
  readDifference,
  sameDrawing,
  type Candidate,
  type Measure,
} from '../src/model/candidates';
import type { StaticScene } from '../src/model/static-scene';

const measures = (patch: Partial<Measure> = {}): Measure => ({
  crossings: 2,
  blocked: 0,
  overlaps: 0,
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

describe('holdSlots', () => {
  it('keeps a card in its slot and fills only the free ones', () => {
    expect(holdSlots([4, 5, 6], [4, 6], [9, 5], 3)).toEqual([4, 9, 6]);
  });

  it('fills a first sheet in order', () => {
    expect(holdSlots([], [], [7, 8, 9, 10], 3)).toEqual([7, 8, 9]);
  });
});
