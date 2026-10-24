import { describe, expect, it } from 'vitest';
import { ago, sortFiles } from '../src/components/workspace-files';

const HOUR = 3_600_000;

describe('recent diagram times', () => {
  it('tells apart files changed on the same day last week', () => {
    const now = Date.now(),
      morning = ago(now - 30 * HOUR),
      evening = ago(now - 26 * HOUR);
    // A bare date ("Oct 22") made a correct Recent order look shuffled.
    expect(morning).toMatch(/\d/);
    expect(morning).not.toBe(evening);
  });

  it('keeps short forms for recent changes and a date for old ones', () => {
    const now = Date.now();
    expect(ago(now - 5 * 60_000)).toBe('5 min ago');
    expect(ago(now - 3 * HOUR)).toBe('3 h ago');
    expect(ago(now - 40 * 24 * HOUR)).not.toMatch(/:/);
  });

  it('sorts newest first', () => {
    const files = [
      { path: 'a.draft', title: 'A', modified: 1 },
      { path: 'b.draft', title: 'B', modified: 3 },
      { path: 'c.draft', title: 'C', modified: 2 },
    ];
    expect(sortFiles(files, 'recent').map(f => f.path)).toEqual(['b.draft', 'c.draft', 'a.draft']);
  });
});
