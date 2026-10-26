import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { compareSources } from '../src/dsl/compare';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';

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

  it('draws each line both panels keep along the same path', () => {
    const source = fs.readFileSync('examples/checkout-change.draft', 'utf8') + 'compare\n';
    const panels = renderSvg(projectScene(checkSource(source)))
      .split('<g transform=')
      .slice(1)
      .map(p => new Set([...p.matchAll(/<path d="(M-?[\d.]+,[^"]+)"/g)].map(m => m[1])));
    // dispatch, charge, persist and trail are in both panels and must not move between them.
    expect([...panels[0]].filter(d => panels[1].has(d))).toHaveLength(4);
  });

  it('refuses files that already carry marks', () => {
    expect(() => compareSources('+node a "A"\n', AFTER)).toThrow(/already has change marks/);
  });
});
