import {
  RouteLab,
  type PriorRoute,
  type Route,
  type RoutingResult,
} from '../engines/routing-engine.js';
import { clamp, manhattan, overlaps, rounded, roundedPath } from './geometry';
import { resolveAppearance, type ResolvedAppearance } from './appearance';
import { edgeLabelSize } from './labels';
import { isCollapsed, styleOf, type VisibleGraph } from './graph';
import type { Diagram, Point, Rect, ShapeKind, Side } from './types';

export const SIDE_VECTORS: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

/** Where a connection meets a shape's outline on the given side. */
export function portPoint(shape: ShapeKind, r: Rect, side: Side, offset = 0): Point {
  let x = r.x + r.w / 2,
    y = r.y + r.h / 2;
  const round = shape === 'circle' || shape === 'icon';
  if (side === 'left' || side === 'right') {
    y += clamp(offset, -r.h / 2 + 12, r.h / 2 - 12);
    let inset = 0;
    if (round)
      inset = (r.w / 2) * (1 - Math.sqrt(Math.max(0, 1 - ((y - r.y - r.h / 2) / (r.h / 2)) ** 2)));
    if (shape === 'diamond') inset = (Math.abs(y - r.y - r.h / 2) / (r.h / 2)) * (r.w / 2);
    x = side === 'left' ? r.x + inset : r.x + r.w - inset;
  } else {
    x += clamp(offset, -r.w / 2 + 12, r.w / 2 - 12);
    let inset = 0;
    if (round)
      inset = (r.h / 2) * (1 - Math.sqrt(Math.max(0, 1 - ((x - r.x - r.w / 2) / (r.w / 2)) ** 2)));
    if (shape === 'diamond') inset = (Math.abs(x - r.x - r.w / 2) / (r.w / 2)) * (r.h / 2);
    y = side === 'top' ? r.y + inset : r.y + r.h - inset;
  }
  return { x: rounded(x), y: rounded(y) };
}

/** Side of `r` facing `p`. */
export function sideToward(r: Rect, p: Point): Side {
  const cx = r.x + r.w / 2,
    cy = r.y + r.h / 2;
  if (Math.abs(p.x - cx) > Math.abs(p.y - cy)) return p.x > cx ? 'right' : 'left';
  return p.y > cy ? 'bottom' : 'top';
}

export interface EdgeLabelBox extends Point {
  w: number;
  h: number;
  score?: number;
}

/** Choose a label spot on the longest clear segment, avoiding shapes and earlier labels. */
export function placeEdgeLabel(
  label: string,
  points: Point[],
  obstacles: Rect[],
  existing: Rect[] = [],
  look: ResolvedAppearance = resolveAppearance(),
): EdgeLabelBox {
  const { w, h } = edgeLabelSize(label, look),
    candidates: EdgeLabelBox[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = manhattan(a, b);
    if (len < 20) continue;
    for (const t of [0.5, 0.35, 0.65]) {
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const r = { x: p.x - w / 2, y: p.y - h / 2, w, h };
      const blocked =
        obstacles.some(o => overlaps(r, o, 4)) || existing.some(o => overlaps(r, o, 6));
      candidates.push({ ...p, w, h, score: len + (a.y === b.y ? 50 : 0) - (blocked ? 10000 : 0) });
    }
  }
  candidates.sort((a, b) => b.score! - a.score!);
  return candidates[0] || { x: points[0]?.x || 0, y: points[0]?.y || 0, w, h };
}

export interface DrawnRoute extends Route {
  label: EdgeLabelBox | null;
  path: string;
}

export interface SceneRoutes {
  routes: DrawnRoute[];
  result: RoutingResult;
}

/** Engine input for the visible part of a diagram with the given rectangles. */
export function routeInput(doc: Diagram, vg: VisibleGraph, rects: Map<string, Rect>) {
  return {
    nodes: vg.nodes.map(n => ({ ...n, ...rects.get(n.id)!, shape: styleOf(doc, n.id).shape })),
    groups: vg.groups.map(g => ({ ...g, ...rects.get(g.id)!, collapsed: isCollapsed(doc, g.id) })),
    edges: vg.edges.map(e => ({ ...e, from: e.a, to: e.b, cfg: doc.layout.edges[e.id] || {} })),
  };
}

/** Add label positions and SVG paths to raw routes. */
export function drawRoutes(
  doc: Diagram,
  vg: VisibleGraph,
  rects: Map<string, Rect>,
  result: RoutingResult,
): DrawnRoute[] {
  const obstacles: Rect[] = vg.nodes.map(n => rects.get(n.id)!);
  for (const g of vg.groups) {
    const r = rects.get(g.id)!;
    obstacles.push(isCollapsed(doc, g.id) ? r : { x: r.x, y: r.y, w: r.w, h: 32 });
  }
  const look = resolveAppearance(doc.appearance),
    placed: Rect[] = [],
    byEdge = new Map(vg.edges.map(e => [e.id, e])),
    radius = doc.settings.routing?.cornerRadius ?? 6;
  return result.routes.map(route => {
    const edge = byEdge.get(route.id)!,
      cfg = doc.layout.edges[route.id] || {};
    let label: EdgeLabelBox | null = null;
    if (edge.label) {
      label = placeEdgeLabel(edge.label, route.points, obstacles, placed, look);
      label.x += cfg.labelDx || 0;
      label.y += cfg.labelDy || 0;
      placed.push({ x: label.x - label.w / 2, y: label.y - label.h / 2, w: label.w, h: label.h });
    }
    return { ...route, label, path: roundedPath(route.points, radius) };
  });
}

export function computeRoutes(
  doc: Diagram,
  vg: VisibleGraph,
  rects: Map<string, Rect>,
  options: { previous?: PriorRoute[]; quick?: boolean } = {},
): SceneRoutes {
  const result = RouteLab.compute(routeInput(doc, vg, rects), {
    ...doc.settings.routing,
    previous: options.previous ?? [],
    quick: !!options.quick,
  });
  return { result, routes: drawRoutes(doc, vg, rects, result) };
}
