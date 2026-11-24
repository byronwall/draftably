/**
 * The area a drawing covers, shared by everything that frames one: the CLI SVG, workspace
 * thumbnails, SVG/PNG exports, comparison scenes and the viewer's fit-to-content.
 */
import { timelineOrigin } from './timeline';
import { rectUnion } from './geometry';
import { shownTimelines, type VisibleGraph } from './graph';
import { visualBounds } from './labels';
import type { Diagram, Point, Rect } from './types';

/** How far a connection's ink reaches past its points: half the stroke plus the arrowhead's wings. */
export const ROUTE_INK = 4;

export interface BoundedRoute {
  id?: string;
  points: readonly Point[];
  label: { x: number; y: number; w: number; h: number } | null;
}

/**
 * Bounds of everything drawn: shapes with their labels, containers, every route point with its
 * stroke and arrowhead, and every connection label box. `pad` adds a margin on each side.
 */
export function drawingBounds(
  doc: Diagram,
  vg: VisibleGraph,
  rects: ReadonlyMap<string, Rect>,
  routes: readonly BoundedRoute[],
  pad = 0,
): Rect {
  const boxes: Rect[] = [];
  for (const n of vg.nodes) {
    const r = rects.get(n.id);
    if (r) boxes.push(visualBounds(doc, n.id, n.title, r));
    if (r && n.lifeline) boxes.push({ x: r.x + r.w / 2, y: r.y + r.h, w: 1, h: n.lifeline });
  }
  for (const g of vg.groups) {
    const r = rects.get(g.id);
    if (r) boxes.push(r);
  }
  if (doc.layout.sequence) boxes.push(doc.layout.sequence.panel);
  for (const t of shownTimelines(doc)) {
    // Only a timeline that is part of what is drawn: its group, or any of its rows.
    if (!(vg.groups.some(g => g.id === t.scope) || vg.nodes.some(n => t.ids.includes(n.id))))
      continue;
    const o = timelineOrigin(t, rects.get(t.scope));
    boxes.push({ ...t.bounds, x: o.x + t.bounds.x, y: o.y + t.bounds.y });
  }
  for (const route of routes) {
    for (const p of route.points)
      boxes.push({ x: p.x - ROUTE_INK, y: p.y - ROUTE_INK, w: ROUTE_INK * 2, h: ROUTE_INK * 2 });
    const l = route.label;
    if (l) boxes.push({ x: l.x - l.w / 2, y: l.y - l.h / 2, w: l.w, h: l.h });
  }
  return rectUnion(boxes, pad);
}
