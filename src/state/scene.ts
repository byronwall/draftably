// Delegates to the default session until every caller reads a session of its own.
import { defaultSession } from './default-session';

export * from './session/scene';
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
  visibleScene,
  nodeIds,
  groupIds,
  edgeIds,
  sceneRects,
  routing,
  routesById,
  routeIds,
  routesPending,
  resetRoutes,
  routeInputFor,
  routes,
  routingReport,
  blockedRouteIds,
  sceneBounds,
  viewerFrame,
} = defaultSession;
