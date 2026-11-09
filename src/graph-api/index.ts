/**
 * Draftably's layout and router for graphs from any tool: `@draftably/runtime/graph`.
 *
 *   const placed = await layout({ nodes, edges });   // positions, lines and labels
 *   const lines = route({ nodes: placedBoxes, edges }); // lines only, between your boxes
 */
export { layout, route, AUTO_FULL_LIMIT } from './core';
export type * from './core';
