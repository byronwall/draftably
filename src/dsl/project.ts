/**
 * Turn a compiled scene into an editor document, and measure the canonical geometry that the
 * CLI and the browser compare. Routes come from the editor's own router, with no prior routes,
 * so a given source always draws the same connections.
 */
import { DEFAULT_SETTINGS, emptyDiagram } from '../model/document';
import { clone } from '../model/geometry';
import { frameRect, makeGeometry, visibleGraph } from '../model/graph';
import { computeRoutes } from '../model/routes';
import type { ColorKey, Diagram, Rect } from '../model/types';
import type { Scene, SceneObject } from './compile';
import { GROUP_INSET } from './frame';

/** Editor state that is not part of the source and survives a reprojection. */
export type ViewState = Partial<Pick<Diagram, 'settings' | 'camera' | 'theme' | 'collapsed'>>;

/** An object's color family: its own, or the nearest colored group's; `auto` when none is. */
function resolveColor(scene: Scene, o: SceneObject): ColorKey {
  for (let x: SceneObject | undefined = o; x; x = scene.byId.get(x.parent))
    if (x.color !== 'auto') return x.color;
  return 'auto';
}

export function projectScene(scene: Scene, view: ViewState = {}): Diagram {
  const doc = emptyDiagram(scene.title);
  doc.id = 'draft-file';
  doc.appearance = clone(scene.model.appearance);
  const hinted = (type: string, id: string) =>
    scene.model.hints.some(h => h.type === type && 'id' in h && h.id === id);
  for (const o of scene.objects) {
    const entry = {
      id: o.id,
      title: o.label,
      ...(o.parent !== 'root' ? { parentId: o.parent } : {}),
    };
    if (o.type === 'group') {
      doc.graph.groups.push(entry);
      doc.layout.containers[o.id] = {
        direction: 'inherit',
        padding: GROUP_INSET,
        manualSize: true,
      };
    } else doc.graph.nodes.push(entry);
    doc.layout.nodes[o.id] = {
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      manual: hinted('near', o.id) || hinted('nudge', o.id),
      pinned: hinted('pin', o.id),
    };
    doc.styles[o.id] = {
      shape: o.shape,
      color: resolveColor(scene, o),
      ...(o.shade !== undefined ? { shade: o.shade } : {}),
      icon: '',
    };
  }
  for (const e of scene.edges) {
    doc.graph.edges.push({
      id: e.id,
      from: e.source,
      to: e.target,
      label: e.label,
      directed: true,
      emphasis: false,
      dashed: e.dashed,
    });
    doc.layout.edges[e.id] = {
      ...(e.from !== 'auto' ? { fromSide: e.from } : {}),
      ...(e.to !== 'auto' ? { toSide: e.to } : {}),
    };
  }
  const groups = new Set(doc.graph.groups.map(g => g.id));
  doc.collapsed = (view.collapsed ?? []).filter(id => groups.has(id));
  doc.settings = clone(view.settings ?? DEFAULT_SETTINGS);
  // The file decides routing, and its root engine recipe is what layout tools start from.
  doc.settings.routing = { ...DEFAULT_SETTINGS.routing, ...scene.model.routing };
  const root = scene.model.layouts.find(l => l.scope === 'root');
  if (root?.engine)
    Object.assign(
      doc.settings,
      // `auto` reads left to right in the compiler's landscape render context.
      { algorithm: root.engine.algorithm, direction: root.direction === 'down' ? 'DOWN' : 'RIGHT' },
      root.engine.params,
    );
  if (view.camera) doc.camera = { ...view.camera };
  if (view.theme) doc.theme = view.theme;
  return doc;
}

export interface CanonicalGeometry {
  nodes: Array<{ id: string; parent: string; x: number; y: number; w: number; h: number }>;
  routes: Array<{ id: string; points: Array<{ x: number; y: number }> }>;
}

/** Rectangles for everything visible, as the canvas draws them. */
export function visibleRects(doc: Diagram) {
  const vg = visibleGraph(doc),
    geometry = makeGeometry(doc),
    rects = new Map<string, Rect>();
  for (const n of vg.nodes) rects.set(n.id, { ...geometry(n.id) });
  for (const g of vg.groups) rects.set(g.id, frameRect(doc, geometry, g.id));
  return { vg, rects };
}

/**
 * Node rectangles and route points for a projected document. Edge label positions are left out:
 * the browser measures label text with real fonts, which Node cannot reproduce.
 */
export function canonicalGeometry(doc: Diagram): CanonicalGeometry {
  const { vg, rects } = visibleRects(doc);
  const { routes } = computeRoutes(doc, vg, rects, { previous: [] });
  return measured(doc, rects, routes);
}

export function measured(
  doc: Diagram,
  rects: Map<string, Rect>,
  routes: Array<{ id: string; points: Array<{ x: number; y: number }> }>,
): CanonicalGeometry {
  const parent = new Map(
    [...doc.graph.nodes, ...doc.graph.groups].map(o => [o.id, o.parentId ?? 'root']),
  );
  return {
    nodes: [...rects]
      .map(([id, r]) => ({ id, parent: parent.get(id)!, x: r.x, y: r.y, w: r.w, h: r.h }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    routes: routes
      .map(r => ({ id: r.id, points: r.points.map(p => ({ x: p.x, y: p.y })) }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}
