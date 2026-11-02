import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource, compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { printSource, readSource } from '../src/dsl/syntax';
import { translateEdit } from '../src/dsl/translate';
import * as edits from '../src/model/edits';
import { clone } from '../src/model/geometry';
import { MARKERS, MARKER_SHAPES } from '../src/model/markers';
import { computeRoutes } from '../src/model/routes';
import type { Diagram } from '../src/model/types';

const nodes = 'node a "A"\nnode b "B"\n';
const drawn = async (source: string) => projectScene(await compile(source));

function routesOf(doc: Diagram) {
  const { vg, rects } = visibleRects(doc);
  return computeRoutes(doc, vg, rects, { previous: [] }).routes;
}

/** The same source-to-model-to-source seam as a committed viewer edit. */
function edit(text: string, change: (diagram: Diagram) => void) {
  const scene = checkSource(text),
    before = projectScene(scene),
    after = clone(before);
  change(after);
  const result = translateEdit({
    source: readSource(text),
    scene,
    before,
    after,
    label: 'Test edit',
    selection: ['a'],
  });
  return printSource(result.source);
}

describe('endpoint markers', () => {
  it('leaves a plain edge exactly as it was', async () => {
    const doc = await drawn(nodes + 'edge e a -> b "go"\n');
    expect(doc.graph.edges[0]).not.toHaveProperty('head');
    expect(doc.graph.edges[0]).not.toHaveProperty('tail');
    const svg = renderSvg(doc);
    expect(svg).toContain('marker-end="url(#arrow)"');
    expect(svg).not.toContain('marker-start');
    expect(svg.match(/<marker /g)).toHaveLength(1);
    expect(svg).toContain('M1 1L7 4L1 7');
    expect(svg).toContain('orient="auto"');
  });

  it('accepts every marker at both ends and refuses other words', () => {
    for (const m of MARKERS) checkSource(nodes + `edge e a -> b head=${m} tail=${m}\n`);
    expect(() => checkSource(nodes + 'edge e a -> b head=crow\n')).toThrow(
      `head=${MARKERS.join('|')}`,
    );
  });

  it('refuses marks on an undirected edge and says what to do', () => {
    for (const attr of ['head=diamond', 'tail=arrow', 'head=none'])
      expect(() => checkSource(nodes + `edge e a -> b directed=false ${attr}\n`)).toThrow(
        'Remove head= and tail=, or remove directed=false',
      );
  });

  it('keeps ranking with the head hidden, unlike directed=false', async () => {
    const places = async (attrs: string) => {
      const doc = await drawn('node b "B"\nnode a "A"\nedge e a -> b ' + attrs + '\n');
      return doc.layout.nodes.a.x < doc.layout.nodes.b.x;
    };
    expect(await places('head=none')).toBe(await places(''));
    expect(await places('head=none')).toBe(true);
  });

  it('survives a visual edit and its save and reopen', () => {
    const text = nodes + 'edge e a -> b "owns" head=open-diamond tail=circle\n';
    const moved = edit(text, d => edits.setEdgeLabel(d, 'e', 'holds'));
    expect(moved).toContain('edge e a -> b "holds" head=open-diamond tail=circle');
    expect(projectScene(checkSource(moved)).graph.edges[0]).toMatchObject({
      head: 'open-diamond',
      tail: 'circle',
    });
    const set = edit(nodes + 'edge e a -> b\n', d =>
      edits.setEdge(d, 'e', { head: 'cross', tail: 'arrow' }),
    );
    expect(set).toContain('head=cross tail=arrow');
    // Back to the defaults, and to an undirected edge, the attributes leave the file.
    const plain = edit(text, d => edits.setEdge(d, 'e', { head: 'arrow', tail: 'none' }));
    expect(plain).not.toMatch(/head=|tail=/);
    const undirected = edit(text, d => edits.setEdge(d, 'e', { directed: false }));
    expect(undirected).toContain('directed=false');
    expect(undirected).not.toMatch(/head=|tail=/);
    checkSource(undirected);
  });

  it('stops the line at an open mark and leaves the tip on the shape', async () => {
    const plain = routesOf(await drawn(nodes + 'edge e a -> b\n'))[0],
      route = routesOf(
        await drawn(nodes + 'edge e a -> b head=open-diamond tail=open-triangle\n'),
      )[0];
    const end = (path: string) => path.split(/[ML]/).filter(Boolean).at(-1)!.split(',').map(Number),
      start = (path: string) => path.split(/[ML]/).filter(Boolean)[0].split(',').map(Number);
    expect(route.points).toEqual(plain.points);
    expect(end(plain.path)[0] - end(route.path)[0]).toBe(MARKER_SHAPES['open-diamond'].stop);
    expect(start(route.path)[0] - start(plain.path)[0]).toBe(MARKER_SHAPES['open-triangle'].stop);
  });

  it('draws one marker per kind and ink, in the shared geometry', async () => {
    const svg = renderSvg(
      await drawn(
        nodes +
          'node c "C"\nedge e a -> b head=diamond tail=open-triangle\nedge f b -> c head=diamond\n',
      ),
    );
    expect(svg.match(/<marker id="diamond"/g)).toHaveLength(1);
    expect(svg).toContain('marker-start="url(#open-triangle-tail)"');
    expect(svg).toContain('orient="auto-start-reverse"');
    expect(svg).toContain(`d="${MARKER_SHAPES.diamond.d}"`);
  });

  it('keeps a label off the mark on a short line', async () => {
    const doc = await drawn(
      nodes +
        'pin a x=0 y=0\npin b x=260 y=0\nedge e a -> b "a label" head=open-diamond tail=diamond\n',
    );
    const route = routesOf(doc)[0],
      l = route.label!,
      p = route.points;
    expect(l.x - l.w / 2).toBeGreaterThanOrEqual(p[0].x + MARKER_SHAPES.diamond.stop);
    expect(l.x + l.w / 2).toBeLessThanOrEqual(p.at(-1)!.x - MARKER_SHAPES['open-diamond'].stop);
  });

  it('keeps the tail at the source and the head at the target when a step goes in', () => {
    const doc = projectScene(checkSource(nodes + 'edge e a -> b head=open-diamond tail=circle\n'));
    edits.insertStep(doc, 'e', undefined);
    const [first, second] = doc.graph.edges;
    expect(first).toMatchObject({ from: 'a', tail: 'circle' });
    expect(first).not.toHaveProperty('head');
    expect(second).toMatchObject({ to: 'b', head: 'open-diamond' });
    expect(second).not.toHaveProperty('tail');
  });
});
