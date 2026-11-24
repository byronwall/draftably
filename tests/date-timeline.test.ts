import { expect, it } from 'vitest';
import { parseModel } from '../src/dsl/syntax';
import { timelineRows } from '../src/dsl/timeline';
it.each([
  'at=2025-02-29',
  'at=2025-01-01 to=open',
  'from=2025-02-01 to=2025-01-01',
  'from=2025-01-01 to=open',
  'from=2025-01-01 to=2025-01-03 steps=2025-01-03',
])('reports the line for %s', attrs => {
  expect(() => parseModel('diagram "test"\nnode x "x" ' + attrs)).toThrow(/Line 2/);
});
it('shares the authored code node identity and group label with the calendar', () => {
  const m = parseModel(
    'group g "Service"\nnode f "Parser" in=g shape=code at=2024-02-29 <<TS\nreturn 1\nTS',
  );
  expect(timelineRows(m)).toMatchObject([{ id: 'f', band: 'Service', at: '2024-02-29' }]);
});
