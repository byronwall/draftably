import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { normalize } from '../src/model/document';
import { drawingBounds } from '../src/model/bounds';
import { visibleRects } from '../src/dsl/project';
import { placedItems } from '../src/runtime/geometry';
import { isMermaidCandidate } from '../packages/markdown/src/mermaid';
import { renderSvg } from '../src/runtime/svg-renderer';
import { writeArrangement } from '../src/dsl/layout-edits';
import { printSource, readSource } from '../src/dsl/syntax';
import { translateEdit } from '../src/dsl/translate';

const example = (name: string) =>
  readFileSync(path.join(__dirname, `../examples/${name}.draft`), 'utf8');

const errorOf = (source: string) => {
  try {
    checkSource(source);
  } catch (e) {
    return (e as Error).message;
  }
  return '';
};

describe('timeline', () => {
  it('maps equal elapsed time to equal distance', () => {
    const scene = checkSource(`diagram "T"
layout root timeline
node a "A" at=2025-01-01
node b "B" at=2025-01-11
node c "C" at=2025-01-21
node s "S" from=2025-01-01 to=2025-01-11`);
    const plan = scene.timelines![0];
    // Event dots are the colored 6-radius marks, one per point row (the legend's sample is gray).
    const xs = plan.over.flatMap(m =>
      m.k === 'dot' && m.r === 6 && typeof m.ink === 'object' ? [m.x] : [],
    );
    expect(xs).toHaveLength(3);
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
    // The span's end dot sits where B's dot sits: the same date, the same place.
    const end = plan.over.find(m => m.k === 'dot' && m.r === 5.6 && typeof m.ink === 'object');
    expect(end && end.k === 'dot' && end.x).toBeCloseTo(xs[1], 6);
  });

  it('keeps file order: bands, then rows within each band', () => {
    const scene = checkSource(example('bug-timeline'));
    const y = (id: string) => scene.byId.get(id)!.y;
    expect(y('b1')).toBeLessThan(y('b2'));
    expect(y('b8')).toBeLessThan(y('c1'));
    expect(y('c8')).toBeLessThan(y('r1'));
  });

  it('draws a zoom window as an overview plus a detail panel with its magnification', () => {
    const scene = checkSource(example('bug-timeline'));
    const texts = scene.timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    expect(texts.some(t => t.includes('full history'))).toBe(true);
    expect(texts.some(t => /\d+× wider$/.test(t))).toBe(true);
    // The open bugs stay in the overview; November's fixes move to the detail panel below.
    expect(scene.byId.get('c1')!.y).toBeGreaterThan(scene.byId.get('b8')!.y + 100);
  });

  it('sits beside ordinary boxes, with lines from rows to them', async () => {
    const scene = await compile(example('release-investigation'));
    const doc = projectScene(scene);
    const t = doc.layout.timelines![0];
    expect(t.scope).toBe('history');
    const group = scene.byId.get('history')!,
      planner = scene.byId.get('planner')!;
    // The other group stands clear of the timeline's frame.
    expect(planner.x).toBeGreaterThanOrEqual(group.x + group.w);
    // A row's box spans the whole timeline, so its line leaves past every bar and label.
    const row = scene.byId.get('c2')!;
    expect(row.x + row.w).toBe(t.x + t.bounds.w);
    const svg = renderSvg(doc);
    expect(svg).toContain('v2.1.0');
    expect(svg).toContain('Query planner');
    // Rows are drawn by the timeline, never as boxes with centered titles.
    expect(svg).not.toMatch(/data-id="c2"[^>]*>\s*<rect class="shape"/);
  });

  it('commits as a valid document, so an edit saves and can be undone', () => {
    // Every edit runs the document through normalize; a milestone's box must pass its size rules.
    for (const name of ['bug-timeline', 'release-investigation']) {
      const doc = projectScene(checkSource(example(name)));
      expect(() => normalize(structuredClone(doc))).not.toThrow();
      expect(normalize(structuredClone(doc)).layout.timelines).toHaveLength(1);
    }
  });

  it('labels every axis, from centuries to early years and month rollovers', () => {
    const labels = (src: string) =>
      checkSource(src).timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    // Four centuries: a handful of year ticks, not a tick per day.
    const long = labels('layout root timeline\nnode a "A" from=1600-01-01 to=2025-01-01');
    expect(long.some(t => /^\d{4}$/.test(t))).toBe(true);
    expect(
      labels('layout root timeline width=240\nnode a "A" from=1800-01-01 to=2000-01-01').some(t =>
        /^\d{4}$/.test(t),
      ),
    ).toBe(true);
    expect(
      labels('layout root timeline width=240\nnode a "A" from=0050-01-01 to=0055-06-01').some(t =>
        /^\d+$/.test(t),
      ),
    ).toBe(true);
    expect(
      labels('layout root timeline width=240\nnode a "A" from=2025-11-20 to=2026-11-01').join(' '),
    ).not.toContain('undefined');
  });

  it('draws a dependency between panels on the chart, and a milestone-only timeline', async () => {
    const doc = projectScene(
      await compile(`layout root timeline zoom=2025-02-01..2025-02-03
group jan "Jan"
group feb "Feb"
node a "A" in=jan at=2025-01-05
node b "B" in=feb at=2025-02-02
edge e a -> b "then"`),
    );
    // The elbow runs from the January row's end in the overview to the February row's start in
    // the detail panel, so the line still reads in date order.
    expect(doc.layout.timelines![0].edges).toEqual(['e']);
    expect(renderSvg(doc)).toContain('then');
    const only = checkSource('layout root timeline\nmilestone m "v1" at=2025-01-01');
    const rule = only.timelines![0].under.find(m => m.k === 'line' && m.dash);
    expect(rule && rule.k === 'line' && rule.y2 > rule.y1).toBe(true);
  });

  it('states the magnification the two panels really have', () => {
    const plan = checkSource(`layout root timeline zoom=2025-02-01..2025-02-02
group jan "Jan"
group feb "Feb"
node a "A" in=jan at=2025-01-01
node b "B" in=feb at=2025-02-01`).timelines![0];
    const caption = plan.over.find(m => m.k === 'text' && m.text.endsWith('wider'));
    const times = Number(
      /([\d.]+)× wider/.exec(caption && caption.k === 'text' ? caption.text : '')?.[1],
    );
    // 31 days plus padding over 1 day plus padding: about 15, not 31.
    expect(times).toBeGreaterThan(12);
    expect(times).toBeLessThan(18);
  });

  it('keeps every box valid and every dated rule visible in narrow or zoomed timelines', () => {
    // A one-letter milestone on a narrow axis still commits.
    const narrow = projectScene(
      checkSource(
        'layout root timeline width=240\nnode a "A" at=2000-01-01\nmilestone m "I" at=2025-01-01',
      ),
    );
    expect(() => normalize(structuredClone(narrow))).not.toThrow();
    // Today before a zoom window keeps the overview, so its rule is drawn.
    const texts = checkSource(`layout root timeline today=2025-01-01 zoom=2025-02-01..2025-02-28
group feb "Feb"
node b "B" in=feb at=2025-02-10`).timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    expect(texts.filter(t => t.startsWith('Today')).length).toBeGreaterThanOrEqual(2);
    // An axis that has room for no tick label still names a date.
    const short = checkSource(
      'layout root timeline width=240 today=2025-01-06\nnode a "A" from=2025-01-01 to=2025-01-10',
    ).timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    expect(short.some(t => /Jan \d/.test(t))).toBe(true);
    expect(errorOf('layout root timeline\ngroup e "Empty"\nnode a "A" at=2025-01-01')).toMatch(
      /has no rows/,
    );
  });

  it('saves an arrangement without placing timeline rows', () => {
    const source = example('release-investigation'),
      scene = checkSource(source),
      after = structuredClone(projectScene(scene));
    after.layout.nodes.csv.y += 20;
    const doc = readSource(source);
    const placed = writeArrangement(doc, scene, after);
    expect(placed.some(id => ['b3', 'b6', 'c2', 'c4', 'v100'].includes(id))).toBe(false);
  });

  it('draws progress, periods, headers, order, durations and label tokens', () => {
    const plan = checkSource(`layout root timeline today=2025-03-01 headers="Work|Owner"
group b "Build"
group l "Launch"
order root l b
order b y x
milestone p "Freeze" from=2025-02-01 to=2025-02-10
node x "X" in=b from=2025-01-01 to=+1m progress=50 tag="Ana" end-label=date
node y "Y" in=b from=2025-01-31 to=+1m end-label=duration
node z "Z" in=l at=2025-02-20 end-label=date`);
    const scene = checkSource(`layout root timeline
node y "Y" from=2025-01-31 to=+1m`);
    const texts = plan.timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    // to=+1m from Jan 31 ends on the last day of February.
    expect(scene.model.objects[0].when!.to).toBe(Math.round(Date.UTC(2025, 1, 28) / 86_400_000));
    expect(texts).toEqual(expect.arrayContaining(['Work', 'Owner', 'Freeze', 'Feb 1', '4 weeks']));
    // order lines: Launch before Build, and y before x inside Build.
    const at = (id: string) => plan.byId.get(id)!.y;
    expect(at('z')).toBeLessThan(at('y'));
    expect(at('y')).toBeLessThan(at('x'));
    // Progress: a full-length track and a solid part half as long.
    const bars = plan.timelines![0].over.filter(
      m => m.k === 'line' && typeof m.ink === 'object' && m.w === 6 && m.y1 === m.y2,
    );
    expect(
      bars.some(m => m.k === 'line' && typeof m.ink === 'object' && m.ink.tone === 'track'),
    ).toBe(true);
    expect(plan.timelines![0].under.some(m => m.k === 'rect' && typeof m.ink === 'object')).toBe(
      true,
    );
  });

  it('gives every date one step on an ordinal axis and labels the gaps', () => {
    const plan = checkSource(`layout root timeline scale=ordinal
node a "A" at=1990-01-01
node b "B" at=1990-01-03
node c "C" at=2000-01-01`).timelines![0];
    const xs = plan.over.flatMap(m =>
      m.k === 'dot' && m.r === 6 && typeof m.ink === 'object' ? [m.x] : [],
    );
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
    const texts = plan.over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    expect(texts).toEqual(expect.arrayContaining(['2 days', '10 years']));
    expect(
      errorOf(
        'layout root timeline scale=ordinal zoom=2025-01-01..2025-01-02\nnode a "A" at=2025-01-01',
      ),
    ).toMatch(/ordinal/);
  });

  it('renames a row in a .draft file without writing a size', () => {
    const source = 'layout root timeline\nnode a "A" at=2025-01-01\nnode b "B" at=2025-01-05',
      scene = checkSource(source),
      before = projectScene(scene),
      after = structuredClone(before);
    after.graph.nodes.find(n => n.id === 'a')!.title = 'A much longer name';
    after.layout.nodes.a.h += 2;
    const out = printSource(
      translateEdit({
        source: readSource(source),
        scene,
        before,
        after,
        label: 'Rename',
        selection: ['a'],
      }).source,
    );
    expect(out).toContain('"A much longer name"');
    expect(out).not.toMatch(/^size /m);
    expect(() => checkSource(out)).not.toThrow();
  });

  it('builds its legend from the marks drawn, and labels a lone ordinal gap', () => {
    const texts = (src: string) =>
      checkSource(src).timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    // A one-day span draws as an event, so the legend says Event, not Start and Ended.
    const legend = texts('layout root timeline\nnode a "A" from=2025-01-01 to=2025-01-01');
    expect(legend).toContain('Event');
    expect(legend).not.toContain('Ended');
    expect(
      texts(
        'layout root timeline scale=ordinal\nnode a "A" at=1990-04-01\nnode b "B" at=2025-04-01',
      ),
    ).toContain('35 years');
    expect(
      errorOf(
        'layout root timeline\nnode a "A" at=2025-01-01\nnode b "B" at=2025-01-02\norder root a b a',
      ),
    ).toMatch(/Duplicate member in order/);
  });

  it('leaves a timeline out of a selection that does not hold it', async () => {
    const doc = projectScene(await compile(example('release-investigation')));
    const { vg, rects } = visibleRects(doc);
    // The editor passes every rectangle and filters only the graph, as its export does.
    const box = drawingBounds(
      doc,
      { ...vg, nodes: vg.nodes.filter(n => n.id === 'planner'), groups: [] },
      rects,
      [],
    );
    expect(box.w).toBe(rects.get('planner')!.w);
  });

  it('lets the Markdown build convert gantt and timeline fences', () => {
    expect(isMermaidCandidate('gantt\n  title Plan')).toBe(true);
    expect(isMermaidCandidate('timeline\n  2004 : Founded')).toBe(true);
    expect(isMermaidCandidate('pie\n  "A" : 1')).toBe(false);
  });

  it('reports on-chart lines in geometry and keeps them out of routing channels', async () => {
    const src = (edge: string) => `group t "T"
layout t timeline
node a "A" in=t at=2025-01-01
node b "B" in=t at=2025-01-05
node c "C" in=t at=2025-01-09
node x "Outside"
${edge}`;
    const doc = projectScene(await compile(src('edge dep a -> c "then"')));
    const { rects } = visibleRects(doc);
    const geo = placedItems(doc, rects, []);
    expect(geo.edges.dep?.source).toBe('a');
    expect(geo.edges.dep?.label).not.toBeNull();
    // The line adds no channel: the group and the box beside it stay where they were.
    const plain = await compile(src('')),
      lined = await compile(src('edge dep a -> c'));
    expect(lined.byId.get('t')!.w).toBe(plain.byId.get('t')!.w);
    expect(lined.byId.get('x')!.x).toBe(plain.byId.get('x')!.x);
  });

  it('keeps the first ordinal date in a wide-type theme', () => {
    const texts = checkSource(
      `theme signal\n${example('company-history')}`,
    ).timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    expect(texts).toContain("Mar 12 '89");
  });

  it('reports each date error on its own line', () => {
    expect(errorOf('layout root timeline\nnode a "A"')).toMatch(/needs at=DATE/);
    expect(errorOf('layout root timeline\nnode a "A" at=2025-02-30')).toMatch(/YYYY-MM-DD/);
    expect(errorOf('layout root timeline\nnode a "A" from=2025-03-01 to=2025-02-01')).toMatch(
      /ends before it starts/,
    );
    expect(errorOf('layout root timeline\nnode a "A" from=2025-03-01 to=open')).toMatch(/today=/);
    expect(
      errorOf(
        'layout root timeline today=2025-04-01\nnode a "A" from=2025-03-01 to=open steps=2025-02-01',
      ),
    ).toMatch(/inside the span/);
    expect(errorOf('node a "A" at=2025-01-01')).toMatch(/sits in no timeline/);
    expect(
      errorOf(`group t "T"
layout t timeline
milestone m "v1" at=2025-01-01 in=t
node a "A" in=t at=2025-01-02
edge e a -> m`),
    ).toMatch(/milestone/);
  });

  it('draws a line between two rows on the chart and routes only lines that leave it', async () => {
    const scene = await compile(`group t "T"
layout t timeline
node a "A" in=t at=2025-01-01
node b "B" in=t at=2025-01-05
node c "Code"
edge dep a -> b "then"
edge out b -> c "lives in"`);
    const doc = projectScene(scene);
    expect(doc.layout.timelines![0].edges).toEqual(['dep']);
    const texts = doc.layout.timelines![0].over.flatMap(m => (m.k === 'text' ? [m.text] : []));
    expect(texts).toContain('then');
    const svg = renderSvg(doc);
    expect(svg).toContain('lives in');
    expect(svg.match(/>then</g)).toHaveLength(1);
  });
});
