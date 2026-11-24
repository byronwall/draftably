import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_FAMILIES,
  contrast,
  resolveAppearance,
  swatchFor,
  THEME_IDS,
} from '../src/model/appearance';
import { timelineColor } from '../src/model/timeline';

// Every theme, on the page and inside a group: bars and family-colored text stay readable, and a
// progress track and a period's wash stay visible but quieter than a bar.
describe('timeline colors', () => {
  it('hold their contrast on every theme and backdrop', () => {
    for (const theme of THEME_IDS) {
      const look = resolveAppearance({ theme, overrides: {}, colors: [] });
      for (const backdrop of [look.canvas, swatchFor(look, undefined, undefined, 'group').fill])
        for (const family of BUILT_IN_FAMILIES) {
          const c = (tone?: 'ink' | 'track' | 'tint') =>
            contrast(timelineColor(look, { family, tone }, backdrop), backdrop);
          const where = `${theme} ${family} on ${backdrop}`;
          expect(c(), where).toBeGreaterThanOrEqual(3);
          expect(c('ink'), where).toBeGreaterThanOrEqual(4.5);
          expect(c('track'), where).toBeGreaterThanOrEqual(1.3);
          expect(c('track'), where).toBeLessThan(c());
          expect(c('tint'), where).toBeGreaterThanOrEqual(1.1);
        }
    }
  });
});
