/**
 * `@draftably/runtime/route`: the router alone, for browsers. It routes lines between boxes the
 * caller placed, synchronously, with no DOM and no worker, and brings neither the file language
 * nor a layout engine.
 *
 *   const { edges } = route({ nodes: placedBoxes, edges, routing: { avoidNodes: 'strict' } });
 */
export { AUTO_FULL_LIMIT, route } from './route';
export type {
  Box,
  EdgeIn,
  EdgeOut,
  PlacedGroupIn,
  PlacedNodeIn,
  Quality,
  RouteIn,
  Routed,
  RoutingOptions,
  Shape,
} from './core';
export type { Point, Side } from '../model/types';
