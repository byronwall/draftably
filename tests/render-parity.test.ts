// @vitest-environment jsdom
// One drawing, three ways out: the Solid scene the Editor and comparison draw, the SVG that
// export, the CLI, the viewer and the render service draw, and the geometry hosts read. For every
// example they must draw the same objects, each with the same link and text, and the geometry must
// place exactly the objects the drawing shows. With `compare` the export draws two panels: the
// Solid side draws each panel, as the comparison dialog does.
//
// KNOWN lists the gaps found when this test was written; each must keep failing until fixed.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { render } from 'solid-js/web';
import { expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { StaticScene } from '../src/components/scene/StaticScene';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';
import { buildStaticScene } from '../src/model/static-scene';
import { panelDoc } from '../src/model/panels';
import type { Diagram } from '../src/model/types';
import { placedItems } from '../src/runtime/geometry';

const dir = path.join(__dirname, '../examples');
const examples = readdirSync(dir)
  .filter(f => f.endsWith('.draft'))
  .sort();

const href = (a: Element | null) =>
  a?.getAttribute('href') ?? a?.getAttribute('xlink:href') ?? null;
const words = (el: Element) =>
  [...el.querySelectorAll('text')]
    .map(t => t.textContent?.replace(/\s+/g, ' ').trim())
    .filter((t): t is string => !!t);

/**
 * What a rendered SVG draws of each object, by `data-id`: its link and text. The Solid scene draws
 * objects only (the Editor draws heading, legend and footnotes apart), so the frame is not compared.
 */
function marks(root: ParentNode) {
  const objects: Record<string, { link: string | null; text: string[] }> = {};
  for (const el of root.querySelectorAll('[data-id]')) {
    const id = el.getAttribute('data-id')!,
      link = href(el.closest('a') ?? el.querySelector('a'));
    const o = (objects[id] ??= { link: null, text: [] });
    if (link) o.link = link;
    o.text.push(...words(el));
  }
  for (const o of Object.values(objects)) o.text = [...new Set(o.text)].sort();
  return { objects };
}

/** Gaps between the renderers today, by example, with what differs. Delete a line once fixed. */
const KNOWN: Record<string, string> = {};

/** The Solid scene's marks for one document. */
function solidMarks(doc: Diagram) {
  const { vg, rects } = visibleRects(doc);
  const scene = buildStaticScene(doc, computeRoutes(doc, vg, rects, { previous: [] }).result);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const dispose = render(() => StaticScene({ scene, idPrefix: '' }), svg);
  const out = marks(svg);
  dispose();
  return out;
}

/** Two drawings' marks as one, as a reader sees both panels of a change. */
function merge(a: ReturnType<typeof marks>, b: ReturnType<typeof marks>) {
  const objects = structuredClone(a.objects);
  for (const [id, o] of Object.entries(b.objects)) {
    const m = (objects[id] ??= { link: null, text: [] });
    m.link ??= o.link;
    m.text = [...new Set([...m.text, ...o.text])].sort();
  }
  return { objects };
}

async function differences(file: string) {
  const source = readFileSync(path.join(dir, file), 'utf8');
  const doc = projectScene(await compile(source));
  const panels = !!doc.appearance.compare;
  const solid = panels
    ? merge(solidMarks(panelDoc(doc, 'before')), solidMarks(panelDoc(doc, 'after')))
    : solidMarks(doc);
  const exported = marks(new DOMParser().parseFromString(renderSvg(doc), 'image/svg+xml'));
  const out: string[] = [];
  for (const id of new Set([...Object.keys(solid.objects), ...Object.keys(exported.objects)])) {
    const a = JSON.stringify(solid.objects[id] ?? null),
      b = JSON.stringify(exported.objects[id] ?? null);
    if (a !== b) out.push(`${id}: Solid ${a}, export ${b}`);
  }
  // The geometry hosts read places every node, group and link the export draws, and no other.
  if (!panels) {
    const { vg, rects } = visibleRects(doc);
    const geo = placedItems(doc, rects, computeRoutes(doc, vg, rects, { previous: [] }).routes);
    const placed = new Set([
      ...Object.keys(geo.nodes),
      ...Object.keys(geo.groups),
      ...Object.keys(geo.edges),
    ]);
    const objects = new Set([
      ...doc.graph.nodes.map(n => n.id),
      ...doc.graph.groups.map(g => g.id),
      ...doc.graph.edges.map(e => e.id),
    ]);
    const drawn = new Set(Object.keys(exported.objects).filter(id => objects.has(id)));
    for (const id of drawn) if (!placed.has(id)) out.push(`${id}: drawn, not in the geometry`);
    for (const id of placed) if (!drawn.has(id)) out.push(`${id}: in the geometry, not drawn`);
  }
  return out;
}

it('runs over the examples', () => expect(examples.length).toBeGreaterThan(20));

for (const file of examples)
  it(`draws ${file} alike in the Solid scene, the export and the geometry`, async () => {
    const found = await differences(file);
    if (file in KNOWN) expect(found, `fixed? take ${file} off KNOWN`).not.toEqual([]);
    else expect(found).toEqual([]);
  });

it.each(['e1', 'e2'])(
  'draws the same curved leaders in the Solid scene and SVG export: %s',
  async variant => {
    const source = readFileSync(
      `docs/intent/diagram-quality/corpus/visual-notes-mcp-call/${variant}.draft`,
      'utf8',
    );
    const doc = projectScene(await compile(source));
    const { vg, rects } = visibleRects(doc);
    const scene = buildStaticScene(doc, computeRoutes(doc, vg, rects, { previous: [] }).result);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const dispose = render(() => StaticScene({ scene, idPrefix: '' }), svg);
    const solid = [...svg.querySelectorAll('[data-edge-label-leader]')].map(el =>
      el.getAttribute('d'),
    );
    const exported = [
      ...new DOMParser()
        .parseFromString(renderSvg(doc), 'image/svg+xml')
        .querySelectorAll('[data-edge-label-leader]'),
    ].map(el => el.getAttribute('d'));
    dispose();
    expect(solid).toContain('M 439.5 107 Q 431.5 86.5 439.5 66');
    expect(solid.every(path => path?.includes(' Q '))).toBe(true);
    expect(exported).toEqual(solid);
  },
);
