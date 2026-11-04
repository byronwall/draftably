// @vitest-environment jsdom
import { render } from 'solid-js/web';
import { createStore, reconcile } from 'solid-js/store';
import { describe, expect, it, vi } from 'vitest';
import { EdgeView } from '../src/components/scene/EdgeView';
import { checkSource } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { resolveAppearance } from '../src/model/appearance';
import { drawnSwatch } from '../src/model/colors';
import type { DrawnRoute } from '../src/model/routes';
import type { Diagram } from '../src/model/types';

// The editor state the canvas parts import reads this at load; jsdom lacks it.
vi.hoisted(() => {
  globalThis.matchMedia = (() => ({ matches: false, addEventListener() {} })) as never;
});

describe('edge label surface', () => {
  it('follows a doc the editor store changes in place', () => {
    const source = 'group g "G" color=slate\nnode a "A" in=g\nnode b "B"\nedge e a -> b "x"\n';
    const [doc, setDoc] = createStore<Diagram>(projectScene(checkSource(source)));
    const look = resolveAppearance(doc.appearance),
      r = visibleRects(doc).rects.get('g')!,
      label = { x: r.x + r.w / 2, y: r.y + r.h / 2, w: 20, h: 14 },
      route = { id: 'e', points: [], path: '', label } as unknown as DrawnRoute;
    const scene = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const dispose = render(() => EdgeView({ doc, route }), scene);
    const fill = () => scene.querySelector('.edge-label-bg')!.getAttribute('fill');
    expect(scene.querySelectorAll('.edge-label-bg')).toHaveLength(1);
    expect(fill()).toBe(drawnSwatch(doc, look, 'g', 'group').fill);
    const moved = JSON.parse(JSON.stringify(doc)) as Diagram;
    moved.layout.nodes.g.x += 5000;
    setDoc(reconcile(moved));
    expect(fill()).toBe(look.canvas);
    dispose();
  });
});
