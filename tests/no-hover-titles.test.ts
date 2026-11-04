// @vitest-environment jsdom
import { render } from 'solid-js/web';
import { describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { EdgeView } from '../src/components/scene/EdgeView';
import { GroupView } from '../src/components/scene/GroupView';
import { NodeView } from '../src/components/scene/NodeView';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';

// The editor state the canvas parts import reads this at load; jsdom lacks it.
vi.hoisted(() => {
  globalThis.matchMedia = (() => ({ matches: false, addEventListener() {} })) as never;
});

const SOURCE = `diagram "Doc"
group g "G"
node a "A" in=g href="https://example.com"
node b "B"
edge e a -> b "label"
`;

// Nothing on the canvas or in an export shows a native tooltip on hover.
describe('no hover titles', () => {
  it('draws nodes, groups and edges with no <title> or title attribute', async () => {
    const doc = projectScene(await compile(SOURCE));
    const { vg, rects } = visibleRects(doc);
    const { routes } = computeRoutes(doc, vg, rects, { previous: [] });
    const scene = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const dispose = render(
      () => [
        GroupView({ doc, id: 'g', rect: rects.get('g')!, interactive: true, selected: true }),
        ...['a', 'b'].map(id =>
          NodeView({
            doc,
            id,
            rect: { ...rects.get(id)!, pinned: true },
            interactive: true,
            selected: true,
          }),
        ),
        ...routes.map(route => EdgeView({ doc, route, interactive: true, selected: true })),
      ],
      scene,
    );
    expect(scene.querySelector('[data-port]')).not.toBeNull();
    expect(scene.querySelectorAll('title, [title]')).toHaveLength(0);
    dispose();
    const svg = renderSvg(doc);
    expect(svg.match(/<title>/g)).toHaveLength(1);
    expect(svg).toContain('<title>Doc</title>');
  });
});
