import { describe, expect, it } from 'vitest';
import { ExplorerLab } from '../src/engines/explorer-engine.js';
import { compile } from '../src/dsl/compile';
import { applyEdits, improves, parseTry, shapeOf, sweep, vary } from '../src/cli/variants';

const SOURCE = `diagram "Orders"

# Intake
group intake "Intake" color=blue
node web "Web" in=intake
node api "API" in=intake
node queue "Queue"
node worker "Worker"
node db "Database"

edge a web -> api
edge b api -> queue
edge c queue -> worker
edge d worker -> db
edge e api -> db

layout root flow gap=48 # keep this note
stay worker x=400 y=0
`;

describe('vary', () => {
  it('changes only the layout line it names and keeps comments and refinements', () => {
    const { source, changes } = applyEdits(SOURCE, [
      { kind: 'layout', scope: 'root', attrs: { engine: 'layered', direction: 'down' } },
    ]);
    expect(changes).toEqual([
      {
        line: 17,
        before: 'layout root flow gap=48 # keep this note',
        after: 'layout root engine=layered direction=down # keep this note',
      },
    ]);
    const before = SOURCE.split('\n'),
      after = source.split('\n');
    expect(after.filter((l, i) => l !== before[i])).toEqual([changes[0].after]);
  });

  it('adds a routing line after the layout lines', () => {
    const { source, changes } = applyEdits(SOURCE, [
      { kind: 'routing', attrs: { 'crossing-penalty': '900' } },
    ]);
    expect(changes).toEqual([{ line: 0, after: 'routing crossing-penalty=900' }]);
    expect(source.split('\n')[17]).toBe('routing crossing-penalty=900');
  });

  it('gives the same variants twice and never recommends one worse than the file', async () => {
    const a = await vary(SOURCE),
      b = await vary(SOURCE);
    const strip = (r: typeof a) =>
      r.variants.map(({ id, title, edits, metrics }) => ({ id, title, edits, metrics }));
    expect(strip(a)).toEqual(strip(b));
    expect(a.variants.length).toBeLessThanOrEqual(5);
    expect(a.variants[0].id).toBe('v0');
    const pick = a.variants.find(v => v.id === a.recommended)!;
    if (pick.id !== 'v0') expect(improves(pick.metrics!, a.variants[0].metrics!)).toBe(true);
  });

  it('takes --try steps from the viewer Compare parameters', () => {
    expect(parseTry('rank-gap').values).toEqual(
      ExplorerLab.layoutParams.rankGap.values.map(String),
    );
    expect(parseTry('edge-gap').values).toEqual(ExplorerLab.routeParams.edgeGap.values.map(String));
    expect(() => parseTry('rank-gap=999')).toThrow('use 12 to 220');
  });

  it('gives a built-in recipe an engine when a sweep sets an engine setting', async () => {
    const shape = shapeOf(await compile(SOURCE));
    const [first] = sweep(shape, [parseTry('rank-gap=52'), parseTry('crossing-penalty=900')]);
    expect(first.edits).toEqual([
      { kind: 'layout', scope: 'root', attrs: { engine: 'compound-flow', 'rank-gap': '52' } },
      { kind: 'routing', attrs: { 'crossing-penalty': '900' } },
    ]);
    expect(() => sweep(shape, [parseTry('engine'), parseTry('direction')])).toThrow('12 or fewer');
  });
});
