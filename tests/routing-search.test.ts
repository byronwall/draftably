import { describe, expect, it } from 'vitest';
import { search } from '../src/engines/routing/search.ts';
import { defaults } from '../src/engines/routing/settings.ts';
import type { Route } from '../src/engines/routing/types.ts';

const line = (id: string, x: number) =>
  ({
    id,
    points: [
      { x, y: -30 },
      { x, y: 30 },
    ],
  }) as unknown as Route;

describe('route search', () => {
  // Two lines with one id (the API accepts repeated ids) cross a grid line at one point once,
  // even with another line listed between them.
  it('counts a crossing once per id, however the lines are listed', () => {
    const s = { ...defaults, crossingPenalty: 50, bendPenalty: 28 };
    const path = search(
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      [],
      [line('dup', 50), line('mid', 70), line('dup', 50)],
      s,
    );
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 0 },
    ]);
  });
});
