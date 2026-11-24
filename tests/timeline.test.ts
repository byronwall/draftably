import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { normalize } from '../src/model/document';
import { renderSvg } from '../src/runtime/svg-renderer';

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
    const end = plan.over.find(m => m.k === 'dot' && m.r === 5.2 && typeof m.ink === 'object');
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
    expect(texts.some(t => /enlarged \d+× per day/.test(t))).toBe(true);
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
