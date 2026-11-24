// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';

let wholeComparisonExport: (onlySelection: boolean, selectedCount: number) => boolean;

beforeAll(async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  ({ wholeComparisonExport } = await import('../src/state/files'));
});

describe('comparison export routing', () => {
  it('crops a nonempty selection before exporting both comparison panels', () => {
    expect(wholeComparisonExport(true, 1)).toBe(false);
    expect(wholeComparisonExport(true, 0)).toBe(true);
    expect(wholeComparisonExport(false, 1)).toBe(true);
  });
});
