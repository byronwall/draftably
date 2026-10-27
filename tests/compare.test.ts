import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { compareDetailed, compareSources } from '../src/dsl/compare';
import { checkSource } from '../src/dsl/compile';
import { GROUP_INSET } from '../src/dsl/frame';
import { projectScene } from '../src/dsl/project';
import { resolveAppearance } from '../src/model/appearance';
import { panelDoc } from '../src/model/panels';

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

  it('splits an edge that joins other objects into a removed and an added line', () => {
    const before = 'node a "A"\nnode b "B"\nnode c "C"\nedge e a -> b\n';
    const after = 'group g "G"\nnode a "A"\nnode b "B" in=g\nnode c "C"\nedge e a -> c\n';
    const { merged, moved } = compareDetailed(before, after);
    expect(merged).toContain('-edge e-was a -> b-was\n+edge e a -> c\n');
    expect(moved).toEqual([]);
  });

  it('keeps a node that moved container in its old container in the older version', () => {
    const before = 'group g "G"\nnode a "A" in=g\nnode b "B"\nedge e a -> b\n';
    const after = 'group g "G"\nnode a "A"\nnode b "B"\nedge e a -> b\n';
    expect(compareSources(before, after)).toBe(
      'group g "G"\n-node a-was "A" in=g\n+node a "A"\nnode b "B"\n-edge e-was a-was -> b\n+edge e a -> b\n',
    );
  });

  it('trims a container to the members a panel keeps, on every side', () => {
    const doc = projectScene(
      checkSource(
        'group g "G"\n-node a "A" in=g\nnode b "B" in=g\nedge e a -> b\nlayout g engine=layered direction=down\n',
      ),
    );
    const after = panelDoc(doc, 'after').layout.nodes,
      header = resolveAppearance(doc.appearance).groupHeader;
    expect(after.g.y).toBe(after.b.y - header);
    expect(after.g.y + after.g.h).toBe(after.b.y + after.b.h + GROUP_INSET);
    expect(after.b).toEqual(doc.layout.nodes.b);
  });

  it('refuses files that already carry marks', () => {
    expect(() => compareSources('+node a "A"\n', AFTER)).toThrow(/already has change marks/);
  });
});
