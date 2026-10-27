import { describe, expect, it } from 'vitest';
import { HALO_REACH, haloPath } from '../src/model/routes';

const p = (x: number, y: number) => ({ x, y });

describe('edge halo', () => {
  it('is empty for a line that crosses nothing', () => {
    expect(haloPath([p(0, 0), p(200, 0)], [], [])).toBe('');
  });

  it('runs only a short way either side of a crossing line or a frame border', () => {
    const line = [p(0, 50), p(300, 50)],
      other = [p(100, 0), p(100, 100)],
      frame = { x: 200, y: 0, w: 200, h: 100 };
    expect(haloPath(line, [other], [frame])).toBe(
      `M${100 - HALO_REACH} 50L${100 + HALO_REACH} 50M${200 - HALO_REACH} 50L${200 + HALO_REACH} 50`,
    );
  });

  it('ignores lines that only touch at an end', () => {
    expect(haloPath([p(0, 50), p(100, 50)], [[p(100, 0), p(100, 100)]], [])).toBe('');
  });
});
