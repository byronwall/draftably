/**
 * Everything drawn on the canvas, derived from the committed document plus any temporary
 * geometry (layout animation, a held "before" preview, or a timeline/brush preview).
 */
import { createMemo, createRoot, createSignal } from 'solid-js';
import type { PriorRoute, RoutingResult } from '../engines/routing-engine.js';
import { routingFingerprint } from '../model/document';
import { drawingBounds } from '../model/bounds';
import { frameRect, makeGeometry, styleOf, visibleGraph, type VisibleGraph } from '../model/graph';
import { startEngineTask, type RunningTask } from '../lib/engine-tasks';
import {
  computeRoutes,
  drawRoutes,
  knownRoutes,
  rememberRoutes,
  routeInput,
  type DrawnRoute,
} from '../model/routes';
import type { NodeGeometry, NodeLayout, Rect } from '../model/types';
import { doc } from './document';
import { fileCompiling, fileMode, setRouteSink } from './file-session';

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

  /** Full routes being drawn in a worker for the document with this fingerprint. */
  let refining: { fingerprint: string; task: RunningTask<RoutingResult> } | null = null;
  const [routesPending, setRoutesPending] = createSignal(false);
  const stopRefining = () => {
    refining?.task.cancel();
    refining = null;
    setRoutesPending(false);
  };
  /**
   * Route the drawing in a worker, as the file would be routed, then show those routes. Not when
   * an edit is compiling: its compile routes the file in the worker already.
   */
  const refine = (fingerprint: string) =>
    queueMicrotask(() => {
      if (fileCompiling() || refining?.fingerprint === fingerprint) return;
      if (routingFingerprint(doc) === fingerprint) startRefining(fingerprint);
    });
  function startRefining(fingerprint: string) {
    stopRefining();
    const task = startEngineTask({
      kind: 'route',
      input: routeInput(doc, visible(), rects()),
      options: { ...doc.settings.routing, previous: [] },
    });
    refining = { fingerprint, task };
    setRoutesPending(true);
    const done = () => {
      if (refining?.task !== task) return false;
      refining = null;
      setRoutesPending(false);
      return true;
    };
    task.promise.then(
      result => {
        if (done() && routingFingerprint(doc) === fingerprint)
          setAdoptedRoutes({ fingerprint, result });
      },
      () => void done(),
    );
  }

  const routing = createMemo(() => {
    epoch();
    const vg = visible(),
      map = rects(),
      quick = quickRouting(),
      temporary = !!sculptGeometry() || !!animationGeometry();
    const adopted = adoptedRoutes(),
      fingerprint = routingFingerprint(doc),
      ready = !quick && !temporary && adopted?.fingerprint === fingerprint,
      // A file's full routes come from the engine worker, with each compiled revision or from
      // `refine`: routing a large file here would block the page for seconds.
      known = fileMode() && !quick && !temporary && !ready ? knownRoutes(doc, vg, map) : null,
      deferred = fileMode() && !quick && !temporary && !ready && !known;
    if (deferred && !fileCompiling()) refine(fingerprint);
    else if (!deferred && refining) queueMicrotask(stopRefining);
    const signature = JSON.stringify([
      vg.edges,
      [...map],
      doc.layout.edges,
      doc.settings.routing,
      vg.groups.map(g => [g.id, g.parentId, doc.collapsed.includes(g.id)]),
      vg.nodes.map(n => [n.id, n.parentId, styleOf(doc, n.id).shape]),
      quick,
      temporary,
      deferred,
      !!known,
    ]);
    if (cache?.signature === signature) return cache.value;
    let value;
    if (ready) {
      const result = structuredClone(adopted.result);
      rememberRoutes(doc, vg, map, result);
      value = { result, routes: drawRoutes(doc, vg, map, result) };
    } else if (known) value = { result: known, routes: drawRoutes(doc, vg, map, known) };
    else if (deferred) value = computeRoutes(doc, vg, map, { previous: lastRoutes, quick: true });
    else {
      value = computeRoutes(doc, vg, map, {
        // A diagram file must draw the same routes as `draftably inspect`, so no earlier routes,
        // except while dragging: quick routes keep each line's sides from the last frame, so a
        // drag doesn't search every line from scratch on every pointer move. The drop redraws
        // without them.
        previous: fileMode() && !quick ? [] : (routePrior() ?? lastRoutes),
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
    routesPending,
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
  routesPending,
  resetRoutes,
  routeInputFor,
} = state;

setRouteSink({ adopt: setAdoptedRoutes, quick: setQuickRouting });

export const routes = () => routing().routes;
export const routingReport = () => routing().result.report;
export const blockedRouteIds = () =>
  routes()
    .filter(r => r.blocked)
    .map(r => r.id);

/** Bounds of everything drawn: shapes with labels, containers, and connections. */
export function sceneBounds(): Rect {
  return drawingBounds(doc, visibleScene(), sceneRects(), routes());
}
