import { describe, expect, it } from 'vitest';
import { qualityNotes } from '../src/cli/variants';
import type { DrawnRoute } from '../src/model/routes';

const route = (id: string, from: string, to: string, points: Array<[number, number]>) =>
  ({ id, from, to, points: points.map(([x, y]) => ({ x, y })) }) as unknown as DrawnRoute;
const box = (x: number, y: number) => ({ x, y, w: 100, h: 40 });

const drawn = (routes: DrawnRoute[], size = { width: 1000, height: 600 }) =>
  ({
    metrics: { ...size, crossings: 0, bends: 0, length: 0, warnings: 0 },
    routes,
    rects: new Map([
      ['a', box(0, 0)],
      ['b', box(400, 0)],
      ['c', box(200, -200)],
      ['d', box(200, 200)],
      ['far', box(1400, 0)],
    ]),
    nodes: ['a', 'b', 'c', 'd', 'far'],
    centers: new Map(),
    key: '',
    svg: '',
  }) as Parameters<typeof qualityNotes>[0];

describe('check --metrics notes', () => {
  it('names two edges that cross', () => {
    const notes = qualityNotes(
      drawn([
        route('ab', 'a', 'b', [
          [100, 20],
          [400, 20],
        ]),
        route('cd', 'c', 'd', [
          [250, -160],
          [250, 200],
        ]),
      ]),
    );
    expect(notes.map(n => n.code)).toEqual(['crossing']);
    expect(notes[0].ids).toEqual(['ab', 'cd']);
  });

  it('flags a detour, a stranded node and an extreme aspect', () => {
    const notes = qualityNotes(
      drawn(
        [
          route('ab', 'a', 'b', [
            [100, 20],
            [100, 500],
            [400, 500],
            [400, 40],
          ]),
          route('bf', 'b', 'far', [
            [500, 20],
            [1400, 20],
          ]),
        ],
        { width: 3200, height: 600 },
      ),
    );
    expect(notes.map(n => n.code).sort()).toEqual(['aspect', 'detour', 'stranded']);
    expect(notes.find(n => n.code === 'stranded')?.ids).toEqual(['far']);
  });

  it('holds the aspect to --fit', () => {
    expect(qualityNotes(drawn([]), 'tall').map(n => n.code)).toEqual(['aspect']);
    expect(qualityNotes(drawn([]), 'slide')).toEqual([]);
  });
});
