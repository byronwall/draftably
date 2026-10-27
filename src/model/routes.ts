import {
  RouteLab,
  type PriorRoute,
  type Route,
  type RoutingResult,
} from '../engines/routing-engine.js';
import { clamp, manhattan, overlaps, rounded, roundedPath } from './geometry';
import { resolveAppearance, type ResolvedAppearance } from './appearance';
import { truncateText, measureText } from './fonts';
import { edgeLabelSize } from './labels';
import {
  findNode,
  isCell,
  isCollapsed,
  styleOf,
  type VisibleEdge,
  type VisibleGraph,
} from './graph';
import type { Diagram, EdgeLayout, Lane, Point, Rect, ShapeKind, Side } from './types';

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
  // A marker's bar is too thin to spread ports along: lines meet it in the middle.
  if (shape === 'marker') offset = 0;
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

/** A spot for an edge's label, with what it crosses (`cost`) and how well it reads (`score`). */
interface LabelSpot extends EdgeLabelBox {
  cost: number;
  score: number;
}

/** Room a label wants between itself and another edge's line. */
const LINE_CLEARANCE = 8;

/**
 * Every spot on the edge's own route, or just beside it, that covers no shape or group title.
 * Another edge through the text misleads the reader (5) and one through its padding seems to stop
 * at it (3); a line touching it or a group border under it (2), or a line within
 * `LINE_CLEARANCE` or a shared trunk (1), only crowds it.
 */
/** Gap a label keeps from a box when its line offers a spot that far away. */
const BOX_CLEARANCE = 10;

function labelSpots(
  label: string,
  points: Point[],
  obstacles: Rect[],
  look: ResolvedAppearance,
  avoid: LabelAvoid,
) {
  const { w, h } = edgeLabelSize(label, look),
    spots: LabelSpot[] = [];
  const box = (p: Point) => ({ x: p.x - w / 2, y: p.y - h / 2, w, h });
  const start = points[0],
    lines = (avoid.routes ?? []).map(route => ({
      route,
      shared: !!start && !!route[0] && manhattan(route[0], start) < 1,
    }));
  const grown = (r: Rect, d: number) => ({
    x: r.x - d,
    y: r.y - d,
    w: r.w + 2 * d,
    h: r.h + 2 * d,
  });
  // The text itself, inside the label's padding (8px each side, one line of the annotation type).
  const size = look.annotation.size;
  const cost = (p: Point) => {
    const r = box(p),
      ink = { x: r.x + 8, y: p.y - size / 2, w: Math.max(1, w - 16), h: size },
      through = grown(r, -1),
      touch = grown(r, 3),
      near = grown(r, LINE_CLEARANCE);
    let c = 0;
    for (const { route, shared } of lines) {
      const hits = (q: Rect) => route.some((s, i) => i && segmentHits(route[i - 1], s, q));
      if (hits(ink)) c += shared ? 1 : 5;
      else if (hits(through)) c += shared ? 1 : 3;
      else if (!shared && hits(touch)) c += 2;
      else if (!shared && hits(near)) c += 1;
    }
    for (const b of avoid.borders ?? []) if (overlaps(r, b, 2)) c += 2;
    // A label pressed against a box reads as part of it; a spot a little further along is clearer.
    if (obstacles.some(o => overlaps(r, o, BOX_CLEARANCE))) c += 1;
    return c;
  };
  // Shifts across an upright segment that put the label's edge just past a parallel line beside
  // it, keeping the segment at least 6px inside the label.
  const beside = (a: Point, b: Point) => {
    const lo = Math.min(a.y, b.y) - h,
      hi = Math.max(a.y, b.y) + h,
      out: number[] = [];
    for (const { route } of lines)
      for (let i = 1; i < route.length; i++) {
        const p = route[i - 1],
          q = route[i];
        if (p.x !== q.x || Math.max(p.y, q.y) < lo || Math.min(p.y, q.y) > hi) continue;
        const d = p.x - a.x;
        if (!d || Math.abs(d) > w) continue;
        const offset = d < 0 ? d + 4 + w / 2 : d - 4 - w / 2;
        if (Math.abs(offset) <= w / 2 - 6 && Math.abs(offset) > h - 4) out.push(offset);
      }
    return out;
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = manhattan(a, b);
    if (len < 8) continue;
    const flat = a.y === b.y,
      base = len + (flat ? 50 : 0),
      // Beside a level segment the label sits just above or below it; a vertical segment runs
      // through the label, which may shift a little to either side, or far enough to clear a
      // line running alongside while its own line still crosses it.
      offsets = flat ? [0, -(h / 2 + 4), h / 2 + 4] : [0, -(h - 4), h - 4, ...beside(a, b)],
      steps = Math.max(2, Math.ceil(len / 6));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps,
        along = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      for (const offset of offsets) {
        const p = flat ? { x: along.x, y: along.y + offset } : { x: along.x + offset, y: along.y };
        if (obstacles.some(o => overlaps(box(p), o, 4))) continue;
        spots.push({
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
  return { w, h, spots, cost };
}

/** One edge label for `placeEdgeLabels`: its text, its route, and what it should keep clear of. */
export interface LabelJob {
  label: string;
  points: Point[];
  avoid?: LabelAvoid;
  /** The user's nudge, added to the chosen spot. */
  dx?: number;
  dy?: number;
}

/**
 * Place every edge label at once, after all routes exist. Each label takes a spot on its own
 * route that covers no shape, group title or other label, and crosses as few other lines as it
 * can; a label closer to another than its own height costs as much as a line beside it. Labels
 * with a clean spot go first, then one repair sweep moves each label to its best spot given all
 * the others. Only a label with every spot near its route blocked moves away from it, and then as
 * little as possible.
 */
export function placeEdgeLabels(
  jobs: LabelJob[],
  obstacles: Rect[],
  look: ResolvedAppearance = resolveAppearance(),
  fixed: Rect[] = [],
): EdgeLabelBox[] {
  const prepared = jobs.map(j => labelSpots(j.label, j.points, obstacles, look, j.avoid ?? {})),
    chosen: Array<EdgeLabelBox | null> = jobs.map(() => null);
  const rectOf = (i: number, s: EdgeLabelBox) => ({
    x: s.x + (jobs[i].dx ?? 0) - s.w / 2,
    y: s.y + (jobs[i].dy ?? 0) - s.h / 2,
    w: s.w,
    h: s.h,
  });
  const pick = (i: number): EdgeLabelBox => {
    const others = [...fixed, ...chosen.flatMap((c, k) => (k !== i && c ? [rectOf(k, c)] : []))],
      { w, h, spots, cost } = prepared[i];
    let best: LabelSpot | null = null,
      bestCost = Infinity;
    for (const s of spots) {
      const r = rectOf(i, s);
      if (others.some(o => overlaps(r, o, 6))) continue;
      const c = s.cost + others.filter(o => overlaps(r, o, h)).length;
      if (c < bestCost || (c === bestCost && s.score > best!.score)) [best, bestCost] = [s, c];
    }
    if (best) {
      const { cost: _cost, ...spot } = best;
      return spot;
    }
    const box = (p: Point) => ({ x: p.x - w / 2, y: p.y - h / 2, w, h });
    return shiftedLabel(
      jobs[i].points,
      w,
      h,
      obstacles,
      others,
      p => obstacles.some(o => overlaps(box(p), o, 4)) || others.some(o => overlaps(box(p), o, 6)),
      cost,
    );
  };
  // Labels with a clean spot go first, so one that crosses lines wherever it goes never takes it.
  const least = prepared.map(p => Math.min(Infinity, ...p.spots.map(s => s.cost))),
    order = jobs.map((_, i) => i).sort((a, b) => least[a] - least[b] || a - b);
  for (const i of order) chosen[i] = pick(i);
  for (const i of order) chosen[i] = pick(i);
  return chosen.map((c, i) => ({
    ...c!,
    x: c!.x + (jobs[i].dx ?? 0),
    y: c!.y + (jobs[i].dy ?? 0),
  }));
}

/**
 * Choose a label spot on the edge's own route, clear of the labels already placed: see
 * `placeEdgeLabels`.
 */
export function placeEdgeLabel(
  label: string,
  points: Point[],
  obstacles: Rect[],
  existing: Rect[] = [],
  look: ResolvedAppearance = resolveAppearance(),
  avoid: LabelAvoid = {},
): EdgeLabelBox {
  return placeEdgeLabels([{ label, points, avoid }], obstacles, look, existing)[0];
}

/** Last resort when every spot on or beside the route is covered: the nearest clear spot. */
function shiftedLabel(
  points: Point[],
  w: number,
  h: number,
  obstacles: Rect[],
  existing: Rect[],
  blocked: (p: Point) => boolean,
  cost: (p: Point) => number = () => 0,
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
  // The nearest spot, where a line through the text (cost 5) counts as 40px further: the label
  // may step past a line or two, but never flees far from its edge to avoid one.
  const rank = new Map(shifted.map(s => [s, s.score! - cost(s) * 16]));
  shifted.sort((a, b) => rank.get(b)! - rank.get(a)!);
  const a = points[0] || { x: 0, y: 0 },
    b = points[1] || a;
  return shifted[0] || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w, h };
}

export interface DrawnRoute extends Route {
  label: EdgeLabelBox | null;
  path: string;
  /**
   * For a line to or from a cell with no side on its group's outline: the stretch from the outline
   * across other cells to that cell's edge. It is drawn over the cells, with a dot at the edge.
   */
  cross?: [Point, Point];
}

export interface SceneRoutes {
  routes: DrawnRoute[];
  result: RoutingResult;
}

/** Room a group's header icon and title take from its left edge, as GroupView draws them. */
function titleWidth(title: string, w: number, look: ResolvedAppearance) {
  const text = truncateText(title, Math.max(40, w - 33 - 64), look.groupTitle);
  return 33 + measureText(text, look.groupTitle) + 8;
}

/** How far inside a box's corner a lane turns. */
const LANE_INSET = 12;
/** How far off a side's middle a return or skip lane arrives: one port gap. */
const LANE_PORT = 16;

/**
 * An edge's routing settings, with its lane turned into bends and sides: out of the source to
 * the lane, along it, and into the target. A lane with `leave` or `enter` turns at that coordinate beside
 * the source or target, to meet it side on. A lane that no longer lies between the two ends (a
 * node was dragged across it) is ignored, as is any lane on an edge with its own bends.
 */
export function laneBends(cfg: EdgeLayout, a: Rect, b: Rect): EdgeLayout {
  const { lane, ...rest } = cfg;
  if (!lane || cfg.waypoints?.length) return rest;
  const level = 'y' in lane,
    at = 'y' in lane ? lane.y : lane.x,
    [u, v] = level ? (['x', 'y'] as const) : (['y', 'x'] as const),
    depth = (r: Rect) => (level ? r.h : r.w),
    length = (r: Rect) => (level ? r.w : r.h);
  if (lane.out) return outLane(rest, lane, a, b);
  if (!(a[v] + depth(a) < at && at < b[v])) return rest;
  const point = (along: number, across: number) =>
    level ? { x: rounded(along), y: rounded(across) } : { x: rounded(across), y: rounded(along) };
  // Every turn sits at a box's corner, inset like a port: on the side nearest the lane, at the
  // end the line runs toward. A port anywhere on that side then runs on without doubling back.
  const back = b[u] + length(b) / 2 < a[u] + length(a) / 2,
    waypoints =
      lane.leave !== undefined
        ? [point(lane.leave, a[v] + depth(a) - LANE_INSET), point(lane.leave, at)]
        : [point(back ? a[u] + LANE_INSET : a[u] + length(a) - LANE_INSET, at)];
  if (lane.enter !== undefined)
    waypoints.push(point(lane.enter, at), point(lane.enter, b[v] + LANE_INSET));
  else waypoints.push(point(back ? b[u] + length(b) - LANE_INSET : b[u] + LANE_INSET, at));
  // The lane decides which way the edge leaves and arrives, so the router needn't try the rest.
  return {
    fromSide: lane.leave !== undefined ? (level ? 'right' : 'bottom') : level ? 'bottom' : 'right',
    toSide: lane.enter !== undefined ? (level ? 'left' : 'top') : level ? 'top' : 'left',
    ...rest,
    waypoints: waypoints.filter((p, i) => !i || manhattan(p, waypoints[i - 1]) >= 1),
  };
}

/**
 * A return or skip lane beyond both ends (`Lane.out`): out of the source's side facing the lane,
 * from its corner toward the target, along the lane, and at `enter` into the target's side facing
 * back toward the source. Ignored once an end has moved past the lane or the turn.
 */
function outLane(rest: EdgeLayout, lane: Lane, a: Rect, b: Rect): EdgeLayout {
  const level = 'y' in lane,
    at = 'y' in lane ? lane.y : lane.x,
    [u, v] = level ? (['x', 'y'] as const) : (['y', 'x'] as const),
    depth = (r: Rect) => (level ? r.h : r.w),
    length = (r: Rect) => (level ? r.w : r.h),
    before = at < a[v],
    back = b[u] + length(b) / 2 < a[u] + length(a) / 2,
    enter = lane.enter;
  const beyond = (r: Rect) => (before ? at < r[v] : at > r[v] + depth(r));
  if (enter === undefined || !beyond(a) || !beyond(b)) return rest;
  const point = (along: number, across: number) =>
    level ? { x: rounded(along), y: rounded(across) } : { x: rounded(across), y: rounded(along) };
  if (lane.face) {
    // Square into the target's face toward the lane: the gap beside it holds another label.
    if (enter < b[u] || enter > b[u] + length(b)) return rest;
    const toward = level ? (before ? 'top' : 'bottom') : before ? 'left' : 'right';
    return {
      fromSide: toward,
      toSide: toward,
      ...rest,
      waypoints: [
        point(back ? a[u] + LANE_INSET : a[u] + length(a) - LANE_INSET, at),
        point(enter, at),
      ],
    };
  }
  if (back ? enter <= b[u] + length(b) : enter >= b[u]) return rest;
  const offset = (before ? -1 : 1) * Math.min(LANE_PORT, depth(b) / 2 - LANE_INSET);
  return {
    fromSide: level ? (before ? 'top' : 'bottom') : before ? 'left' : 'right',
    toSide: level ? (back ? 'right' : 'left') : back ? 'bottom' : 'top',
    ...rest,
    waypoints: [
      point(back ? a[u] + LANE_INSET : a[u] + length(a) - LANE_INSET, at),
      point(enter, at),
      // Into the target one port gap off its middle, on the lane's side: clear of the flow's
      // own line through the middle of that side.
      point(enter, b[v] + depth(b) / 2 + offset),
    ],
    toOffset: offset,
  };
}

/** Engine input for the visible part of a diagram with the given rectangles. */
const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** The side among `sides` that faces `toward` most. */
function facing(r: Rect, sides: Side[], toward: Point) {
  const c = centre(r),
    d = { x: toward.x - c.x, y: toward.y - c.y };
  const score = (s: Side) => SIDE_VECTORS[s].x * d.x + SIDE_VECTORS[s].y * d.y;
  return sides.reduce((a, b) => (score(b) > score(a) ? b : a));
}

/** How far outside the outline a line to a cell with no free side ends its routed part. */
const STUB_GAP = 14;

/** A line's end at a cell whose sides are all inside its group. */
interface CrossEnd {
  /** The outline side it enters by, and a thin stub just outside it that the router aims for. */
  side: Side;
  stub: Rect;
  /** From just outside the outline to the cell's edge. */
  cross: [Point, Point];
}

/**
 * Where lines meet cells. A cell can be reached only through the sides it has on its group's
 * outline (its top faces the title band), so a line ends on the free side facing its other end.
 * A cell with no free side is reached across the cells in the way, from the outline side facing
 * the other end: the router aims for a stub outside the outline, and the line runs on from there.
 */
function cellEnds(doc: Diagram, vg: VisibleGraph, rects: Map<string, Rect>) {
  const sides = new Map<string, { from?: Side; to?: Side }>(),
    crosses = new Map<string, { from?: CrossEnd; to?: CrossEnd }>();
  for (const e of vg.edges) {
    const cfg = doc.layout.edges[e.id] || {};
    for (const [end, id, other, set] of [
      ['from', e.a, e.b, cfg.fromSide],
      ['to', e.b, e.a, cfg.toSide],
    ] as const) {
      const r = rects.get(id),
        g = rects.get(findNode(doc, id)?.parentId ?? ''),
        o = rects.get(other);
      if (set || !r || !g || !o || !isCell(doc, id)) continue;
      const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
      const free: Side[] = [
        ...(near(r.x, g.x) ? (['left'] as const) : []),
        ...(near(r.x + r.w, g.x + g.w) ? (['right'] as const) : []),
        ...(r.y + r.h > g.y + g.h - 0.5 ? (['bottom'] as const) : []),
      ];
      if (free.length) {
        sides.set(e.id, { ...sides.get(e.id), [end]: facing(r, free, centre(o)) });
        continue;
      }
      const side = facing(g, ['left', 'right', 'top', 'bottom'], centre(o)),
        c = centre(r),
        out = SIDE_VECTORS[side],
        // The stub sits clear of the outline, so the router keeps its distance from the cells.
        at = {
          x: (side === 'left' ? g.x : side === 'right' ? g.x + g.w : c.x) + out.x * STUB_GAP,
          y: (side === 'top' ? g.y : side === 'bottom' ? g.y + g.h : c.y) + out.y * STUB_GAP,
        },
        edge = {
          x: side === 'left' ? r.x : side === 'right' ? r.x + r.w : c.x,
          y: side === 'top' ? r.y : side === 'bottom' ? r.y + r.h : c.y,
        },
        stub = out.y
          ? { x: at.x - 16, y: out.y < 0 ? at.y - 2 : at.y, w: 32, h: 2 }
          : { x: out.x < 0 ? at.x - 2 : at.x, y: at.y - 16, w: 2, h: 32 };
      crosses.set(e.id, {
        ...crosses.get(e.id),
        [end]: { side, stub, cross: [at, edge] },
      });
      sides.set(e.id, { ...sides.get(e.id), [end]: side });
    }
  }
  return { sides, crosses };
}

export function routeInput(doc: Diagram, vg: VisibleGraph, all: Map<string, Rect>) {
  const look = resolveAppearance(doc.appearance),
    { sides, crosses } = cellEnds(doc, vg, all);
  // A line to a cell with no free side is routed to its stub outside the outline.
  const stubs = new Map<string, Rect>();
  for (const e of vg.edges) {
    const c = crosses.get(e.id);
    if (c?.from) stubs.set(`${e.id}:from`, c.from.stub);
    if (c?.to) stubs.set(`${e.id}:to`, c.to.stub);
  }
  const rects = all;
  return {
    nodes: [
      ...vg.nodes.map(n => {
        const r = rects.get(n.id)!,
          shape = styleOf(doc, n.id).shape;
        // The router keeps ports 12px in from a corner; a marker's thin bar gets room to meet
        // lines at its middle.
        return shape === 'marker' && r.w < 32
          ? { ...n, ...r, x: r.x + r.w / 2 - 16, w: 32, shape }
          : { ...n, ...r, shape };
      }),
      ...[...stubs].map(([id, r]) => ({ id, title: '', ...r, shape: 'box' as ShapeKind })),
    ],
    // A soft or frameless group has no border for a line to cross or run along.
    groups: vg.groups
      .filter(g => !g.frame)
      .map(g => {
        const r = rects.get(g.id)!;
        return {
          ...g,
          ...r,
          collapsed: isCollapsed(doc, g.id),
          titleWidth: titleWidth(g.title, r.w, look),
        };
      }),
    // Sequence messages are drawn straight on their rows (`messageRoute`), not routed.
    edges: vg.edges
      .filter(e => doc.layout.edges[e.id]?.row === undefined)
      .map(e => {
        const c = crosses.get(e.id),
          from = c?.from ? `${e.id}:from` : e.a,
          to = c?.to ? `${e.id}:to` : e.b,
          side = sides.get(e.id);
        return {
          ...e,
          from,
          to,
          cfg: laneBends(
            {
              ...doc.layout.edges[e.id],
              ...(side?.from ? { fromSide: side.from } : {}),
              ...(side?.to ? { toSide: side.to } : {}),
            },
            stubs.get(from) ?? rects.get(e.a)!,
            stubs.get(to) ?? rects.get(e.b)!,
          ),
        };
      }),
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
    if (g.frame) continue;
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
    byEdge = new Map(vg.edges.map(e => [e.id, e])),
    radius = doc.settings.routing?.cornerRadius ?? 6,
    { crosses } = cellEnds(doc, vg, rects);
  // A line to a cell with no free side runs on from its stub across the cells to that cell.
  result = {
    ...result,
    routes: [
      ...result.routes
        .filter(r => doc.layout.edges[r.id]?.row === undefined)
        .map(route => {
          const c = crosses.get(route.id);
          if (!c) return route;
          return {
            ...route,
            points: [
              ...(c.from ? [c.from.cross[1], c.from.cross[0]] : []),
              ...route.points,
              ...(c.to ? [c.to.cross[0], c.to.cross[1]] : []),
            ],
          };
        }),
      ...vg.edges.flatMap(e => {
        const row = doc.layout.edges[e.id]?.row;
        return row === undefined ? [] : [messageRoute(e, row, rects.get(e.a)!, rects.get(e.b)!)];
      }),
    ],
  };
  // Labels are placed together once every route exists, so none sits on a line drawn after it.
  const labelled = result.routes.filter(route => byEdge.get(route.id)!.label),
    boxes = placeEdgeLabels(
      labelled.map(route => {
        const cfg = doc.layout.edges[route.id] || {};
        return {
          label: byEdge.get(route.id)!.label!,
          points: route.points,
          avoid: { routes: result.routes.filter(r => r !== route).map(r => r.points), borders },
          dx: cfg.labelDx || 0,
          dy: cfg.labelDy || 0,
        };
      }),
      obstacles,
      look,
    ),
    labels = new Map(labelled.map((route, i) => [route, boxes[i]]));
  return result.routes.map(route => {
    const c = crosses.get(route.id);
    return {
      ...route,
      label: labels.get(route) ?? null,
      path: roundedPath(route.points, radius),
      ...(c?.to ? { cross: c.to.cross } : c?.from ? { cross: c.from.cross } : {}),
    };
  });
}

/** Run of a self-message's loop out to the right of its lifeline, and its drop. */
const SELF_LOOP = { out: 36, down: 22 };

/**
 * A sequence message: a straight line at its row from the source's lifeline (the middle of the
 * box) to the target's, or, sent to itself, a short loop out to the right and back.
 */
function messageRoute(e: VisibleEdge, row: number, a: Rect, b: Rect): Route {
  const from = a.x + a.w / 2,
    to = b.x + b.w / 2,
    right = to >= from;
  const points =
    e.a === e.b
      ? [
          { x: from, y: row },
          { x: from + SELF_LOOP.out, y: row },
          { x: from + SELF_LOOP.out, y: row + SELF_LOOP.down },
          { x: from, y: row + SELF_LOOP.down },
        ]
      : [
          { x: from, y: row },
          { x: to, y: row },
        ];
  return {
    id: e.id,
    from: e.a,
    to: e.b,
    fromSide: right ? 'right' : 'left',
    toSide: right ? 'left' : 'right',
    fromOffset: 0,
    toOffset: 0,
    points,
    blocked: false,
  };
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
