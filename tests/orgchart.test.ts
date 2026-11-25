import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { parseModel, printSource, readSource } from '../src/dsl/syntax';
import { removeReferences } from '../src/dsl/source-edits';
import { computeRoutes } from '../src/model/routes';

const sample = fs.readFileSync(path.join(__dirname, '../examples/org-chart.draft'), 'utf8');

const routed = async (source: string) => {
  const scene = await compile(source),
    doc = projectScene(scene),
    { vg, rects } = visibleRects(doc),
    routes = computeRoutes(doc, vg, rects, { previous: [] }).routes;
  return { scene, doc, routes, at: (id: string) => scene.byId.get(id)! };
};

describe('layout … orgchart', () => {
  it('needs a root that is a node in its scope', () => {
    const base = 'node a "A"\nnode b "B"\nedge e a -> b\n';
    expect(() => parseModel(base + 'layout root orgchart')).toThrow(/needs its top person/);
    expect(() =>
      parseModel(base + 'group g "G"\nnode c "C" in=g\nlayout g orgchart root=a'),
    ).toThrow(/must be a member of g/);
    expect(() => parseModel(base + 'node c "C" role=boss')).toThrow(/role=assistant\|vacant/);
  });

  it('keeps people in rows on their level and the chart under 2:1', async () => {
    const { scene, at } = await routed(sample);
    for (const level of [
      ['cto', 'cpo', 'cfo'],
      ['plat', 'apps', 'sec'],
      ['infra', 'data', 'web', 'mobile'],
    ])
      expect(new Set(level.map(id => at(id).y)).size).toBe(1);
    const top = scene.objects.filter(o => o.parent === 'root'),
      w = Math.max(...top.map(o => o.x + o.w)) - Math.min(...top.map(o => o.x)),
      h = Math.max(...top.map(o => o.y + o.h)) - Math.min(...top.map(o => o.y));
    expect(w / h).toBeLessThan(2);
  });

  it('draws each reporting line on one bus per manager, with no head', async () => {
    const { doc, routes, at } = await routed(sample),
      route = (id: string) => routes.find(r => r.id === id)!;
    expect(routes.filter(r => r.blocked).map(r => r.id)).toEqual([]);
    const reporting = doc.graph.edges.filter(e => e.branch);
    expect(reporting).toHaveLength(22);
    expect(reporting.every(e => e.head === 'none')).toBe(true);
    // Every line from one manager leaves the middle of its bottom.
    for (const e of reporting) {
      const b = at(e.from);
      expect(route(e.id).points[0]).toEqual({ x: b.x + b.w / 2, y: b.y + b.h });
    }
    // The CEO's reports share one bar height.
    const bars = ['r2', 'r3', 'r4'].map(id => route(id).points[1].y);
    expect(new Set(bars).size).toBe(1);
    // The dotted line draws as written and places nothing.
    expect(doc.graph.edges.find(e => e.id === 'dot')!.dashed).toBe(true);
  });

  it('hangs an assistant off the stem, above the other reports', async () => {
    const { routes, at } = await routed(sample),
      ceo = at('ceo'),
      ea = at('ea'),
      stem = ceo.x + ceo.w / 2;
    expect(ea.x).toBeGreaterThan(stem);
    expect(ea.y + ea.h).toBeLessThan(at('cto').y);
    const r1 = routes.find(r => r.id === 'r1')!;
    expect(r1.points.at(-1)).toEqual({ x: ea.x, y: ea.y + ea.h / 2 });
  });

  it('stacks rows of leaves as leaves= says', async () => {
    const chart = (leaves: string) =>
      routed(sample.replace('orgchart root=ceo', `orgchart root=ceo leaves=${leaves}`));
    const row = await chart('row'),
      stack = await chart('stack'),
      xs = (c: typeof row, ids: string[]) => new Set(ids.map(id => c.at(id).x)).size,
      engineers = ['web1', 'web2', 'web3'];
    expect(new Set(engineers.map(id => row.at(id).y)).size).toBe(1);
    expect(xs(stack, engineers)).toBe(1);
    // A stacked leaf is fed from the stem's side.
    const web = stack.at('web'),
      r19 = stack.routes.find(r => r.id === 'r19')!;
    expect(r19.points[0].x).toBe(web.x + web.w / 2);
    expect(r19.toSide).toBe('left');
    // fit=tall stacks more rows than the default, so the chart is narrower.
    const tall = await routed(sample.replace('orgchart root=ceo', 'orgchart root=ceo fit=tall')),
      plain = await routed(sample),
      width = (c: typeof row) => Math.max(...c.scene.objects.map(o => o.x + o.w));
    expect(width(tall)).toBeLessThan(width(plain));
  });

  it('draws a vacant role dashed, with an Open role line', async () => {
    const { doc } = await routed(sample),
      sec = doc.graph.nodes.find(n => n.id === 'sec')!;
    expect(sec.title).toBe('Head of Security\nOpen role');
    expect(doc.styles.sec.vacant).toBe(true);
  });

  it('drops the layout line when its root is deleted', () => {
    const src = readSource(sample);
    removeReferences(src, 'ceo');
    expect(printSource(src)).not.toMatch(/orgchart/);
  });
});
