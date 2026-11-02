// @vitest-environment jsdom
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { EdgeView } from '../src/components/scene/EdgeView';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { MARKERS } from '../src/model/markers';
import { computeRoutes } from '../src/model/routes';

const ATTRS = ['markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits'];

/** What an edge's line and its marks draw, read from a rendered `<g>` for that edge. */
function drawing(root: ParentNode, id: string) {
  const line = root.querySelector(`[data-id="${id}"] > path:last-of-type`)!;
  const mark = (attr: string) => {
    const ref = line.getAttribute(attr)?.match(/#([^)]+)/)?.[1];
    if (!ref) return null;
    const marker = root.querySelector(`marker[id="${ref}"]`)!,
      path = marker.querySelector('path')!;
    return {
      ...Object.fromEntries(ATTRS.map(a => [a, marker.getAttribute(a)])),
      ...Object.fromEntries(
        ['d', 'fill', 'stroke', 'stroke-width'].map(a => [a, path.getAttribute(a)]),
      ),
    };
  };
  return { d: line.getAttribute('d'), head: mark('marker-end'), tail: mark('marker-start') };
}

describe('marker parity', () => {
  it('draws every marker alike on the canvas and in the CLI', async () => {
    const pairs = MARKERS.map((_, i) => `node a${i} "A"\nnode b${i} "B"\n`).join('');
    const edges = MARKERS.map((m, i) => `edge e${i} a${i} -> b${i} head=${m} tail=${m}\n`).join('');
    const doc = projectScene(await compile(pairs + edges));
    const { vg, rects } = visibleRects(doc);
    const { routes } = computeRoutes(doc, vg, rects, { previous: [] });
    const scene = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const dispose = render(() => routes.map(route => EdgeView({ doc, route })), scene);
    const cli = new DOMParser().parseFromString(renderSvg(doc), 'image/svg+xml');
    for (const route of routes)
      expect(drawing(scene, route.id), route.id).toEqual(drawing(cli, route.id));
    dispose();
  });
});
