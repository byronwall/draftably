/**
 * Everything drawn on the canvas, derived from the committed document plus any temporary
 * geometry (layout animation, a held "before" preview, or a timeline/brush preview).
 */
import { createMemo, createRoot, createSignal } from 'solid-js';
import type { PriorRoute, RoutingResult } from '../engines/routing-engine.js';
import { routingFingerprint } from '../model/document';
import { rectUnion } from '../model/geometry';
import { frameRect, makeGeometry, styleOf, visibleGraph, type VisibleGraph } from '../model/graph';
import { visualBounds } from '../model/labels';
import { computeRoutes, drawRoutes, routeInput, type DrawnRoute } from '../model/routes';
import type { NodeGeometry, NodeLayout, Rect } from '../model/types';
import { doc } from './document';
import { fileMode } from './file-session';

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

const state = createRoot(() => {
  /** Timeline scrubbing and brush strokes; takes priority over everything else. */
  const [sculptGeometry, setSculptGeometry] = createSignal<NodeGeometry | null>(null);
  /** Layout animation and "hold to see before". */
  const [animationGeometry, setAnimationGeometry] = createSignal<NodeGeometry | null>(null);
  /** Use the fast, single-pass router while something is being dragged. */
  const [quickRouting, setQuickRouting] = createSignal(false);
  /** Earlier routes that a timeline should keep stable while it scrubs. */
  const [routePrior, setRoutePrior] = createSignal<PriorRoute[] | null>(null);
  /** Routes already computed for a document (e.g. by a comparison candidate) to show as-is. */
  const [adoptedRoutes, setAdoptedRoutes] = createSignal<{
    fingerprint: string;
    result: RoutingResult;
  } | null>(null);

  const geometry = (id: string): NodeLayout =>
    sculptGeometry()?.[id] ?? animationGeometry()?.[id] ?? makeGeometry(doc)(id);

  const visible = createMemo<VisibleGraph>(() => visibleGraph(doc));
  const nodeIds = createMemo(() => visible().nodes.map(n => n.id), [], { equals: sameIds });
  const groupIds = createMemo(() => visible().groups.map(g => g.id), [], { equals: sameIds });
  const edgeIds = createMemo(() => visible().edges.map(e => e.id), [], { equals: sameIds });

  const rects = createMemo(() => {
    const vg = visible(),
      map = new Map<string, Rect>();
    for (const n of vg.nodes) map.set(n.id, { ...geometry(n.id) });
    for (const g of vg.groups) map.set(g.id, frameRect(doc, geometry, g.id));
    return map;
  });

  let lastRoutes: DrawnRoute[] = [];
  let cache: { signature: string; value: { routes: DrawnRoute[]; result: RoutingResult } } | null =
    null;

  /** Bumped to force routes to be recomputed from scratch. */
  const [epoch, setEpoch] = createSignal(0);

  const routing = createMemo(() => {
    epoch();
    const vg = visible(),
      map = rects(),
      quick = quickRouting(),
      temporary = !!sculptGeometry() || !!animationGeometry();
    const signature = JSON.stringify([
      vg.edges,
      [...map],
      doc.layout.edges,
      doc.settings.routing,
      vg.groups.map(g => [g.id, g.parentId, doc.collapsed.includes(g.id)]),
      vg.nodes.map(n => [n.id, n.parentId, styleOf(doc, n.id).shape]),
      quick,
      temporary,
    ]);
    if (cache?.signature === signature) return cache.value;
    const adopted = adoptedRoutes();
    let value;
    if (!quick && !temporary && adopted?.fingerprint === routingFingerprint(doc)) {
      const result = structuredClone(adopted.result);
      value = { result, routes: drawRoutes(doc, vg, map, result) };
    } else {
      value = computeRoutes(doc, vg, map, {
        // A diagram file must draw the same routes as `draftably inspect`, so no earlier routes.
        previous: fileMode() ? [] : (routePrior() ?? lastRoutes),
        quick: quick || !!animationGeometry(),
      });
    }
    lastRoutes = value.routes;
    cache = { signature, value };
    return value;
  });

  const routesById = createMemo(() => new Map(routing().routes.map(r => [r.id, r])));

  return {
    sculptGeometry,
    setSculptGeometry,
    animationGeometry,
    setAnimationGeometry,
    quickRouting,
    setQuickRouting,
    routePrior,
    setRoutePrior,
    setAdoptedRoutes,
    geometry,
    visible,
    nodeIds,
    groupIds,
    edgeIds,
    rects,
    routing,
    routesById,
    resetRoutes() {
      cache = null;
      lastRoutes = [];
      setEpoch(n => n + 1);
    },
    routeInputFor: () => routeInput(doc, visible(), rects()),
  };
});

export const {
  sculptGeometry,
  setSculptGeometry,
  animationGeometry,
  setAnimationGeometry,
  setQuickRouting,
  routePrior,
  setRoutePrior,
  setAdoptedRoutes,
  geometry,
  visible: visibleScene,
  nodeIds,
  groupIds,
  edgeIds,
  rects: sceneRects,
  routing,
  routesById,
  resetRoutes,
} = state;

export const routes = () => routing().routes;
export const routingReport = () => routing().result.report;
export const blockedRouteIds = () =>
  routes()
    .filter(r => r.blocked)
    .map(r => r.id);

/** Bounds of everything drawn: shapes with labels, containers, and connections. */
export function sceneBounds(): Rect {
  const vg = visibleScene(),
    rects: Rect[] = vg.nodes.map(n => visualBounds(doc, n.id, n.title, geometry(n.id)));
  for (const g of vg.groups) rects.push(sceneRects().get(g.id)!);
  for (const route of routes()) {
    for (const p of route.points) rects.push({ x: p.x, y: p.y, w: 0, h: 0 });
    if (route.label)
      rects.push({
        x: route.label.x - route.label.w / 2,
        y: route.label.y - 12,
        w: route.label.w,
        h: 24,
      });
  }
  return rectUnion(rects);
}
