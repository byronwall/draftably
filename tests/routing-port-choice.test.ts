import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import type { Route } from '../src/engines/routing-engine';
import { computeRoutes } from '../src/model/routes';
import type { Point } from '../src/model/types';

// Port choice on the reproductions of issues #586–#606: which side a line leaves and enters by,
// where on the side, and whether it leaves square.
async function route(source: string) {
  const doc = projectScene(await compile(source)),
    { vg, rects } = visibleRects(doc),
    { result } = computeRoutes(doc, vg, rects, { previous: [] });
  const byId = new Map(result.routes.map(r => [r.id, r]));
  return { rect: (id: string) => rects.get(id)!, line: (id: string) => byId.get(id)! };
}
const upright = (a: Point, b: Point) => a.x === b.x && a.y !== b.y;
const level = (a: Point, b: Point) => a.y === b.y && a.x !== b.x;
const crosses = (p: Route, q: Route) => {
  const segs = (r: Route) => r.points.slice(1).map((b, i) => [r.points[i], b] as const);
  return segs(p).some(([a, b]) =>
    segs(q).some(([c, d]) => {
      const [h, v] = upright(a, b)
        ? [
            [c, d],
            [a, b],
          ]
        : [
            [a, b],
            [c, d],
          ];
      if (!level(h[0], h[1]) || !upright(v[0], v[1])) return false;
      const x = v[0].x,
        y = h[0].y;
      return (
        x > Math.min(h[0].x, h[1].x) &&
        x < Math.max(h[0].x, h[1].x) &&
        y > Math.min(v[0].y, v[1].y) &&
        y < Math.max(v[0].y, v[1].y)
      );
    }),
  );
};

describe('lines that end on a group frame', () => {
  it('leave a table square, past the cells flush with its border (#586)', async () => {
    const { rect, line } = await route(`
diagram "Bottom port to right port" version=1
group table "Collection" color=teal
node a "A" in=table
node b "B" in=table
node c "C" in=table
node d "D" in=table
node e "E" in=table
node result "Result"
edge link table -> result from=bottom to=right
layout root engine=layered direction=down
layout table cells
`);
    const r = line('link'),
      t = rect('table');
    expect(r.blocked).toBe(false);
    expect(r.points[0].y).toBe(t.y + t.h);
    expect(upright(r.points[0], r.points[1])).toBe(true);
    expect(level(r.points.at(-2)!, r.points.at(-1)!)).toBe(true);
  });

  it('meet a table on its header band, not on a cell (#590)', async () => {
    const { rect, line } = await route(`
diagram "One input, two tables" version=1
node input "Input"
group upper "Table A" color=blue
node a "A1" in=upper
node b "A2" in=upper
node c "A3" in=upper
node d "A4" in=upper
group lower "Table B" color=teal
node e "B1" in=lower
node f "B2" in=lower
edge first input -> upper
edge second input -> lower
layout root engine=compound-flow direction=right fit=slide
layout upper cells columns=2
layout lower cells columns=2
`);
    for (const [id, table, cell] of [
      ['first', 'upper', 'a'],
      ['second', 'lower', 'e'],
    ] as const) {
      const r = line(id),
        end = r.points.at(-1)!;
      expect(r.toSide).toBe('left');
      expect(end.x).toBe(rect(table).x);
      expect(end.y).toBeGreaterThan(rect(table).y);
      expect(end.y).toBeLessThan(rect(cell).y);
      expect(level(r.points.at(-2)!, end)).toBe(true);
    }
  });

  it('fan out round the middle of the side they share (#594)', async () => {
    const { rect, line } = await route(`
diagram "Two arrows into one group" version=1
group sources "Inputs" color=slate
node a "Input A" in=sources
node b "Input B" in=sources
node c "Input C" in=sources
group target "Collection" color=teal
node x "Item X" in=target
node y "Item Y" in=target
node z "Separate output"
size a width=220 height=71
size b width=220 height=71
size c width=220 height=71
size x width=232 height=71
size y width=232 height=71
size z width=204 height=71
edge first a -> target
edge second b -> target
edge third c -> z
layout root engine=compound-spring direction=right fit=slide aspect=1.6
layout sources column
layout target column
`);
    const t = rect('target'),
      [ya, yb] = ['first', 'second'].map(id => line(id).points.at(-1)!.y);
    expect(ya).toBeLessThan(yb);
    expect(yb - ya).toBeGreaterThanOrEqual(16);
    expect((ya + yb) / 2).toBeCloseTo(t.y + t.h / 2, 0);
  });
});

describe('port choice', () => {
  it('crosses a row in the way rather than run along its own box (#586)', async () => {
    const { rect, line } = await route(`
group first "Row 1"
group middle "Row 2"
group last "Row 3"
node c "C" in=first
node f "F" in=middle
node h "H" in=last
node i "I" in=last
edge ch c -> h kind=async from=bottom to=top
edge fi f -> i
layout root lanes fit=slide
`);
    const r = line('ch'),
      c = rect('c');
    expect(r.blocked).toBe(false);
    expect(r.points[0].y).toBe(c.y + c.h);
    expect(upright(r.points[0], r.points[1])).toBe(true);
    expect(upright(r.points.at(-2)!, r.points.at(-1)!)).toBe(true);
  });

  it('leaves a lone bottom port at the middle, clear of the group beside it (#596)', async () => {
    const { rect, line } = await route(`
diagram "A dashed route beside a group" version=1
group n7 "Example collection" color=violet
node n4 "A" in=n7
node n8 "B" in=n7
node n6 "C" in=n7
node n1 "Source 1"
node n3 "Source 2"
node n2 "Source 3"
node n5 "Source 4"
size n1 width=164 height=71
size n3 width=192 height=71
size n2 width=200 height=71
size n5 width=164 height=72
edge e1 n1 -> n4 "One"
edge e2 n3 -> n8 "Two"
edge e3 n2 -> n6 "Three"
edge e4 n5 -> n6 "Short route"
edge e5 n5 -> n4 "Follow the longer dashed route" kind=async
layout root engine=compound-flow direction=down
`);
    const n = rect('n5');
    expect(line('e5').points[0]).toEqual({ x: n.x + n.w / 2, y: n.y + n.h });
  });

  it('swaps two ports of a fan whose lines cross just past the side (#599)', async () => {
    const { line } = await route(`
diagram "Two bottom ports feed stacked destinations" version=1
group group1 "Group 1" color=sky
node A "A" in=group1
size A width=208 height=71
node B "B" in=group1
size B width=208 height=71
node C "C" in=group1
size C width=208 height=71
group group2 "Group 2" color=violet
node D "D" in=group2
size D width=256 height=71
node E "E" in=group2
size E width=256 height=71
group group3 "Group 3" color=amber
node F "F" in=group3
size F width=264 height=71
node G "G" in=group3
size G width=264 height=71
node H "H" in=group3
size H width=264 height=71
group group4 "Group 4" color=slate
node I "I" in=group4
size I width=188 height=71
node J "J" in=group4
size J width=188 height=71
node K "K" in=group4
size K width=188 height=71
node L "L" in=group4
size L width=188 height=71
edge e1 A -> F "Route 1"
edge e2 B -> F "Route 2"
edge e3 C -> G "Route 3"
edge e4 D -> G
edge e5 E -> F kind=async
edge e6 F -> G
edge e7 G -> H
edge e8 F -> I
edge e9 G -> J
edge e10 F -> K
edge e11 F -> L
layout root engine=compound-flow direction=right
`);
    expect(crosses(line('e10'), line('e11'))).toBe(false);
  });

  it('leaves forward toward a cell rather than round the outside (#602)', async () => {
    const { line } = await route(`
diagram "Route to a highlighted cell" version=1
group tableA "Table A" color=teal
node r1 "R1" in=tableA
size r1 width=108 height=36
node r2 "R2" in=tableA
size r2 width=216 height=36
node r3 "R3" in=tableA
size r3 width=108 height=36
node r4 "R4" in=tableA color=amber shade=200
size r4 width=216 height=36
node r5 "R5" in=tableA
size r5 width=108 height=36
node r6 "R6" in=tableA
size r6 width=216 height=36
node r7 "R7" in=tableA
size r7 width=108 height=36
node r8 "R8" in=tableA
size r8 width=216 height=36
node r9 "R9" in=tableA
size r9 width=108 height=36
node r10 "R10" in=tableA
size r10 width=216 height=36
group tableB "Table B" color=teal
node k1 "K1" in=tableB
size k1 width=142 height=36
node k2 "K2" in=tableB
size k2 width=199 height=36
group tableC "Table C" color=teal
node i1 "I1" in=tableC
size i1 width=152 height=52
node i2 "I2" in=tableC
size i2 width=240 height=52
group tableD "Table D" color=teal
node o1 "O1" in=tableD
size o1 width=109 height=36
node o2 "O2" in=tableD
size o2 width=142 height=36
node source "Source" color=blue shade=200
size source width=260 height=71
edge primary source -> r4
edge secondary source -> tableD "Other route"
layout root engine=layered fit=slide
layout tableA cells columns=2
layout tableB cells
layout tableC cells columns=2
layout tableD cells columns=2
`);
    expect(line('primary').fromSide).toBe('right');
  });

  it('takes the facing bottom and top ports of offset rows (#606)', async () => {
    const { line } = await route(`
diagram "A downward connection between rows" version=1
group group1 "Collection 1" color=slate
node A "A" in=group1
size A width=328 height=87
node B "B" in=group1
size B width=328 height=56
node C "C" in=group1
size C width=328 height=71
group group2 "Collection 2" color=blue
node D "D" in=group2
size D width=272 height=71
node E "E" in=group2
size E width=272 height=86
node F "F" in=group2
size F width=272 height=86
node G "G" color=amber
size G width=256 height=71
node H "H" color=blue
size H width=248 height=86
group group3 "Collection 3" color=slate
layout group3 cells columns=2
node I "I" in=group3 color=red
size I width=205 height=36
node J "J" in=group3 color=red
size J width=185 height=36
node K "K" in=group3 color=mint
size K width=205 height=36
node L "L" in=group3 color=mint
size L width=185 height=36
node M "M" in=group3 color=amber
size M width=205 height=36
node N "N" in=group3
size N width=185 height=36
edge r1 A -> D
edge r2 B -> E
edge r3 C -> F
edge f1 D -> H "Example connection detail"
edge f2 E -> H
edge f3 F -> H "Example connection detail"
edge i1 G -> H
edge b1 H -> group3
layout root engine=compound-flow direction=down
`);
    const r = line('r1');
    expect([r.fromSide, r.toSide]).toEqual(['bottom', 'top']);
    expect(r.points).toHaveLength(4);
  });
});
