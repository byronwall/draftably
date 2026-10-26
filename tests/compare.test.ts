import { describe, expect, it } from 'vitest';
import { compareSources } from '../src/dsl/compare';

const BEFORE = `diagram "Checkout" version=1
node api "API"
node orders "Orders"
node hook "Webhook"
edge dispatch api -> orders "create"
edge notify api -> hook
layout root flow gap=48
`;

const AFTER = `diagram "Checkout" version=1
node api "API"
node orders "Orders service"
node refunds "Refunds"
edge dispatch api -> orders "create"
edge refund orders -> refunds
layout root flow gap=48
`;

describe('compare', () => {
  it('marks added, removed and changed lines and keeps removed ones where they stood', () => {
    expect(compareSources(BEFORE, AFTER)).toBe(`diagram "Checkout" version=1
node api "API"
~node orders "Orders service" was="Orders"
-node hook "Webhook"
+node refunds "Refunds"
edge dispatch api -> orders "create"
-edge notify api -> hook
+edge refund orders -> refunds
layout root flow gap=48
`);
  });

  it('leaves an unchanged file unmarked', () => {
    expect(compareSources(AFTER, AFTER)).toBe(AFTER);
  });

  it('refuses files that already carry marks', () => {
    expect(() => compareSources('+node a "A"\n', AFTER)).toThrow(/already has change marks/);
  });
});
