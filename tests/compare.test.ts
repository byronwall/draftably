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

  it('marks any changed attribute and names what has no old version to draw', () => {
    const { merged, unshown } = compareDetailed(
      'node a "A" count=2 shape=circle\nnode b "B"\nedge e a -> b\n',
      'node a "A" shape=diamond count=3\nnode b "B"\nedge e a -> b kind=async\n',
    );
    expect(merged).toBe(
      '~node a "A" shape=diamond count=3\nnode b "B"\n~edge e a -> b kind=async\n',
    );
    expect(unshown).toEqual(['a (count, shape)', 'e (kind)']);
  });

  it('leaves a label change, which the older panel can draw, out of the list', () => {
    expect(compareDetailed('node a "A"\n', 'node a "B"\n').unshown).toEqual([]);
  });

  it('reports changes outside declarations, and order in a sequence', () => {
    const before =
      'layout root sequence\nnode a "A"\nnode b "B"\nedge m1 a -> b\nedge m2 b -> a\nphase p "P" m1\n';
    const after =
      'layout root sequence\nnode a "A"\nnode b "B"\nedge m2 b -> a\nedge m1 a -> b\nphase p "P" m2\nnote "N" near=a\n';
    const { merged, unshown } = compareDetailed(before, after);
    expect(merged).toBe(after);
    expect(unshown).toEqual(['phase p', 'note', 'message order']);
  });

  it('counts the same file with other comments and attribute order as unchanged', () => {
    const { merged, unshown } = compareDetailed(
      'layout root flow gap=48 direction=down\nnode a "A" shape=box\n',
      'layout root flow direction=down gap=48 # tidy\nnode a "A"\n',
    );
    expect(merged).not.toMatch(/^~/m);
    expect(unshown).toEqual([]);
  });

  it('refuses files that already carry marks', () => {
    expect(() => compareSources('+node a "A"\n', AFTER)).toThrow(/already has change marks/);
  });
});
