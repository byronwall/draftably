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

/** Lines and borders a label may sit on only when nothing better is free. */
export interface LabelAvoid {
  /** Other edges' routes. Routes that leave from this edge's first point share its trunk. */
  routes?: Point[][];
  /** Thin strips along group borders. */
  borders?: Rect[];
}

/** Whether an orthogonal segment passes through a rectangle. */
const segmentHits = (a: Point, b: Point, r: Rect) =>
  Math.max(a.x, b.x) > r.x &&
  Math.min(a.x, b.x) < r.x + r.w &&
  Math.max(a.y, b.y) > r.y &&
  Math.min(a.y, b.y) < r.y + r.h;

/**
 * Choose a label spot on the edge's own route: on its longest clear segment, or just beside it.
 * A spot never covers a shape, a group title or an earlier label, and it avoids other edges and
 * group borders when it can. Only when every spot near the route is blocked does the label move
 * away from it, and then as little as possible.
 */
export function placeEdgeLabel(
  label: string,
  points: Point[],
  obstacles: Rect[],
  existing: Rect[] = [],
  look: ResolvedAppearance = resolveAppearance(),
  avoid: LabelAvoid = {},
): EdgeLabelBox {
  const { w, h } = edgeLabelSize(label, look),
    candidates: Array<EdgeLabelBox & { cost: number }> = [];
  const box = (p: Point) => ({ x: p.x - w / 2, y: p.y - h / 2, w, h });
  const blocked = (p: Point) => {
    const r = box(p);
    return obstacles.some(o => overlaps(r, o, 4)) || existing.some(o => overlaps(r, o, 6));
  };
  const start = points[0],
    lines = (avoid.routes ?? []).map(route => ({
      route,
      shared: !!start && !!route[0] && manhattan(route[0], start) < 1,
    }));
  // Another edge under the label misleads the reader; a shared trunk or a border only crowds it.
  const cost = (p: Point) => {
    const r = box(p),
      near = { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 };
    let c = 0;
    for (const { route, shared } of lines)
      if (route.some((q, i) => i && segmentHits(route[i - 1], q, near))) c += shared ? 1 : 3;
    for (const b of avoid.borders ?? []) if (overlaps(r, b, 2)) c += 1;
    return c;
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = manhattan(a, b);
    if (len < 8) continue;
    const flat = a.y === b.y,
      base = len + (flat ? 50 : 0),
      // Beside a level segment the label sits just above or below it; a vertical segment runs
      // through the label, which may shift a little to either side.
      offsets = flat ? [0, -(h / 2 + 4), h / 2 + 4] : [0, -(h - 4), h - 4],
      steps = Math.max(2, Math.ceil(len / 6));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps,
        along = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      for (const offset of offsets) {
        const p = flat ? { x: along.x, y: along.y + offset } : { x: along.x + offset, y: along.y };
        if (blocked(p)) continue;
        candidates.push({
          ...p,
          w,
          h,
          cost: cost(p),
          // Prefer long level segments, the middle of a segment, on the line, then above it.
          score: base - Math.abs(t - 0.5) * len * 0.5 - Math.abs(offset) * 3 + (offset < 0 ? 1 : 0),
        });
      }
    }
  }
  candidates.sort((a, b) => a.cost - b.cost || b.score! - a.score!);
  if (candidates[0]) {
    const { cost: _cost, ...best } = candidates[0];
    return best;
  }
  return shiftedLabel(points, w, h, obstacles, existing, blocked);
}

/** Last resort when every spot on or beside the route is covered: the nearest clear spot. */
function shiftedLabel(
  points: Point[],
  w: number,
  h: number,
  obstacles: Rect[],
  existing: Rect[],
  blocked: (p: Point) => boolean,
): EdgeLabelBox {
  const shifted: EdgeLabelBox[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = manhattan(a, b);
    if (!len) continue;
    const nx = a.y === b.y ? 0 : a.x === b.x ? 1 : -(b.y - a.y) / len,
      ny = a.y === b.y ? 1 : a.x === b.x ? 0 : (b.x - a.x) / len,
      radius = (w * Math.abs(nx) + h * Math.abs(ny)) / 2,
      pScore = len + (a.y === b.y ? 50 : 0);
    for (const t of [0.5, 0.35, 0.65]) {
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        along = p.x * nx + p.y * ny,
        offsets = new Set<number>();
      for (const [rects, pad] of [
        [obstacles, 5],
        [existing, 7],
      ] as const) {
        for (const o of rects) {
          const cx = o.x + o.w / 2,
            cy = o.y + o.h / 2,
            center = cx * nx + cy * ny,
            extent = (o.w * Math.abs(nx) + o.h * Math.abs(ny)) / 2 + radius + pad + 1;
          offsets.add(center - extent - along);
          offsets.add(center + extent - along);
        }
      }
      for (const offset of offsets) {
        if (!offset || blocked({ x: p.x + nx * offset, y: p.y + ny * offset })) continue;
        shifted.push({
          x: p.x + nx * offset,
          y: p.y + ny * offset,
          w,
          h,
          score: pScore - Math.abs(offset) * 2,
        });
      }
    }
  }
  shifted.sort((a, b) => b.score! - a.score!);
  const a = points[0] || { x: 0, y: 0 },
    b = points[1] || a;
  return shifted[0] || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w, h };
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
  const obstacles: Rect[] = vg.nodes.map(n => rects.get(n.id)!),
    borders: Rect[] = [];
  for (const g of vg.groups) {
    const r = rects.get(g.id)!;
    if (isCollapsed(doc, g.id)) {
      obstacles.push(r);
      continue;
    }
    obstacles.push({ x: r.x, y: r.y, w: r.w, h: 32 });
    borders.push(
      { x: r.x - 1, y: r.y, w: 2, h: r.h },
      { x: r.x + r.w - 1, y: r.y, w: 2, h: r.h },
      { x: r.x, y: r.y + r.h - 1, w: r.w, h: 2 },
    );
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
      label = placeEdgeLabel(edge.label, route.points, obstacles, placed, look, {
        routes: result.routes.filter(r => r !== route).map(r => r.points),
        borders,
      });
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
