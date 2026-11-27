import { conflicts, flatten, parallelConflicts, unflatten } from './conflicts.ts';
import type { Context } from './context.ts';
import { crossingFloor, doglegs, laneLines } from './doglegs.ts';
import {
  bendsOf,
  blocked,
  center,
  cmp,
  compress,
  distance,
  EPS,
  lengthOf,
  pathLength,
  round,
  segments,
  SIDES,
  vector,
} from './geometry.ts';
import { Queue } from './heap.ts';

/** The sides a line to a code range may meet: the listing's left and right. */
const LEVEL_SIDES: Side[] = ['right', 'left'];
import { simplify } from './paths.ts';
import { port } from './ports.ts';
import { createScorer } from './score.ts';
import { search, WINDOWS, type Window } from './search.ts';
import { sidePairs } from './sidepairs.ts';
import { BACK_IN, BACK_OUT, BAND_COST, DETOUR_RATIO, DETOUR_SOFT } from './tuning.ts';
import type { Candidate, Obstacle, Point, PriorRoute, Route, RouteEdge, Side } from './types.ts';

/** The sides an edge had before, to keep them (`portStability`) or, with `quick`, to reuse them. */
type Prior = PriorRoute | null | undefined;
/** The best route so far: its candidate, points, score and place in the build order. */
type Best = Candidate & { points: Point[]; score: number; gen: number };
/** A path waiting in the queue: a straight line (`path`) or a dogleg before `compress` (`raw`). */
interface Trial {
  c: Candidate;
  o: Obstacle[];
  /** Under the score the path can get. */
  floor: number;
  /** Its side pair's place, then its own, in the build order. */
  idx: number;
  k: number;
  raw?: Point[];
  path?: Point[];
}
/** A side pair whose doglegs are not built yet. */
interface Stubbed {
  c: Candidate;
  o: Obstacle[];
  stubs: number;
  idx: number;
  min: number;
}

// A line may cross a title band straight into any member, not only a top one, when the
// way round the group is over `DETOUR_RATIO` times the length of the crossing route. A band is
// also a cost to weigh, not a wall (FEEL.md): a gated route that reads against the flow, or
// takes the long way round from a side the file set, tries the crossing too, and takes it when
// it scores better by more than `BAND_COST`.
export function retryLane(
  ctx: Context,
  e: RouteEdge,
  used: Route[],
  route: Route,
  old?: Prior,
  wall: Obstacle[] = [],
) {
  if (!route.blocked || !e.autoLane || !e.cfg.waypoints?.length) return route;
  // Let the line find its own approach to a blocked lane. Keep both ports and the
  // inner waypoints that carry the line along its track.
  const wp = e.cfg.waypoints;
  for (const waypoints of [wp.slice(1, -1), wp.slice(1), wp.slice(0, -1)]) {
    const free = find(ctx, { ...e, cfg: { ...e.cfg, waypoints } }, used, old, wall);
    if (free.blocked) continue;
    if (waypoints.length) free.retainedLane = true;
    return free;
  }
  return route;
}

export function find(
  ctx: Context,
  e: RouteEdge,
  used: Route[],
  old?: Prior,
  wall: Obstacle[] = [],
): Route {
  const { rects, titleBands, obsFor, scores, opened } = ctx;
  const gated = findIn(ctx, e, used, old, false, wall);
  if (!titleBands || !obsFor(e, false).some(r => r.gates)) return gated;
  const a = rects.get(e.from)!,
    b = rects.get(e.to)!,
    ca = center(a),
    cb = center(b),
    // No route between the boxes is shorter than the gap between them.
    floor =
      Math.max(0, Math.abs(ca.x - cb.x) - (a.w + b.w) / 2) +
      Math.max(0, Math.abs(ca.y - cb.y) - (a.h + b.h) / 2),
    gatedLength = gated.blocked ? Infinity : pathLength(gated.points),
    long = gatedLength > DETOUR_RATIO * floor,
    pinned = [e.cfg.fromSide, e.cfg.toSide].some(x => x && x !== 'auto'),
    weigh =
      !gated.blocked &&
      (against(ctx, e, gated) || (pinned && gatedLength > DETOUR_SOFT * floor + 40));
  if (!long && !weigh) return gated;
  const open = findIn(ctx, e, used, old, true, wall);
  if (open.blocked) return gated;
  const shorter = long && gatedLength > DETOUR_RATIO * pathLength(open.points),
    better = weigh && scores.get(open)! + BAND_COST < scores.get(gated)!;
  if (!shorter && !better) return gated;
  opened.add(open);
  return open;
}
// Whether route `r` of forward edge `e` reads against its layout's direction: out of or into
// a backward side (`BACK_OUT`, `BACK_IN`).
function against(ctx: Context, e: RouteEdge, r: Route) {
  const { rects, flowOf } = ctx;
  const ca = center(rects.get(e.from)!),
    cb = center(rects.get(e.to)!),
    flow = flowOf(e);
  return (
    !!flow &&
    e.from !== e.to &&
    (flow === 'down' ? cb.y - ca.y : cb.x - ca.x) > 20 &&
    (BACK_OUT[flow].includes(r.fromSide) || BACK_IN[flow].includes(r.toSide))
  );
}
// `used` stays the same through a `findIn`, which checks many candidates against it.
function findIn(
  ctx: Context,
  e: RouteEdge,
  used: Route[],
  old: Prior,
  open: boolean,
  wall: Obstacle[] = [],
) {
  const flattened = flatten(used);
  try {
    return findAmong(ctx, e, used, old, open, wall);
  } finally {
    if (flattened) unflatten(used);
  }
}
function findAmong(
  ctx: Context,
  e: RouteEdge,
  used: Route[],
  old: Prior,
  open: boolean,
  wall: Obstacle[] = [],
  loose = false,
): Route {
  const { rects, groups, s, near, rawOptions, obsFor, scores } = ctx;
  const a = rects.get(e.from)!,
    b = rects.get(e.to)!,
    cfg = e.cfg,
    all = wall.length ? [...obsFor(e, open), ...wall] : obsFor(e, open),
    // `loose`: the groups that hold neither end stop being walls, only boxes block. A line still
    // crosses a group's title band only upright, never along it.
    edgeObs = loose
      ? all.flatMap((r): Obstacle[] => {
          const g = groups.get(r.id ?? '');
          if (!g) return [r];
          const lip = Math.max(s.clearance, s.standoff);
          return [
            {
              id: g.id + ':header-band',
              x: g.x - s.clearance,
              w: g.w + 2 * s.clearance,
              y: g.y - lip,
              h: (g.titleHeight ?? 28) + s.clearance + lip,
              across: true,
            },
          ];
        })
      : all;
  // `e.pin`: the repair pass's port order for a fan, a side and offset at either end.
  const pin = e.pin || {};
  // An end at a code range (`fromAt`, `toAt`) meets its node's left or right side.
  const from: Side[] = pin.from
      ? [pin.from.side]
      : cfg.fromSide && cfg.fromSide !== 'auto'
        ? [cfg.fromSide]
        : cfg.fromAt !== undefined
          ? LEVEL_SIDES
          : rawOptions.quick && old
            ? [old.fromSide]
            : SIDES,
    to: Side[] = pin.to
      ? [pin.to.side]
      : cfg.toSide && cfg.toSide !== 'auto'
        ? [cfg.toSide]
        : cfg.toAt !== undefined
          ? LEVEL_SIDES
          : rawOptions.quick && old
            ? [old.toSide]
            : SIDES;
  const { axis, score, sideFloor } = createScorer(ctx, e, used, old, from, to);
  const candidates: Candidate[] = [];
  let best = null as Best | null;
  // Paths are tried best first, not in the order the side pairs build them. A path built earlier
  // (`gen`, lower) still wins a tie within 0.01, as it did when it was tried first; a later one
  // must beat the best by 0.01.
  const boundFor = (gen: number) =>
    !best ? Infinity : gen < best.gen ? best.score + 0.01 : best.score - 0.01;
  const remember = (points: Point[] | null, c: Candidate, o = c.obs, gen = Infinity) => {
    if (!points) return;
    const bound = boundFor(gen);
    const full = compress([c.start, ...points, c.end]);
    for (let i = 2; i < full.length; i++) {
      const a = full[i - 2],
        b = full[i - 1],
        d = full[i];
      if (
        ((Math.abs(a.x - b.x) < EPS && Math.abs(b.x - d.x) < EPS) ||
          (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - d.y) < EPS)) &&
        (b.x - a.x) * (d.x - b.x) + (b.y - a.y) * (d.y - b.y) < -0.001
      )
        return;
    }
    // A path whose cheap terms cannot beat the best needs no obstacle checks.
    if (best && score(full, c, bound, true) === Infinity) return;
    // No doubled-back first/last segments after attaching shape stubs.
    if (
      full.length < 2 ||
      segments(full).some(([u, v], i) => i > 0 && i < full.length - 2 && blocked(u, v, o))
    )
      return;
    const scoreValue = score(full, c, bound);
    if (!best || scoreValue < bound) best = { ...c, points: full, score: scoreValue, gen };
  };
  const lanes = laneLines(used, s);
  // Every straight line and dogleg of every side pair, tried best first below. `floor` is under
  // the score `remember` gives the path: its length with its stubs (`compress` keeps length) and
  // the side terms, less `score`'s slack and a unit for the coordinates `compress` rounds.
  // Ties go to the side pair, then the path, built first.
  const pool = new Queue<Trial>(
    (p, q) =>
      p.floor < q.floor ||
      (p.floor === q.floor && (p.idx < q.idx || (p.idx === q.idx && p.k < q.k))),
  );
  // The terms of `score` that depend on the side pair alone: far sides, conventions, port
  // stability, fan-out and axis.
  // Side pairs whose doglegs are built only when the best path so far leaves them room: `min`
  // is under the floor of each of their doglegs.
  const pairs: Stubbed[] = [];
  const addDoglegs = (c: Candidate, o: Obstacle[]) => {
    const stubs = sideFloor(c) + distance(c.start, c.as) + distance(c.bs, c.end);
    pairs.push({ c, o, stubs, idx: pairs.length, min: stubs + distance(c.as, c.bs) });
  };
  // A path at or above this can win nothing: not even a tie.
  const cutoff = () => (best ? best.score + 0.01 : Infinity);
  // A path's place in the order the side pairs build them.
  const genOf = (p: Trial) => p.idx * 1e6 + p.k + 1;
  // Crossings no dogleg can avoid also go in its floor.
  const crossed = crossingFloor(used);
  const expand = ({ c, o, stubs, idx }: Stubbed) => {
    const crossings = crossed(c.as, c.bs);
    doglegs(c.as, c.bs, o, s, lanes, near, cutoff() - stubs, (raw, k, horizontal) => {
      let floor = stubs + lengthOf(raw) + bendsOf(c.start, raw, c.end) * s.bendPenalty;
      if (floor >= cutoff()) return;
      floor += crossings(raw, horizontal) * s.crossingPenalty;
      if (floor < cutoff()) pool.push({ c, o, raw, floor, idx, k });
    });
  };
  for (const pair of sidePairs(ctx, e, used, edgeObs, from, to, axis, old)) {
    const { c } = pair;
    if (!pair.tight) candidates.push(c);
    if (!pair.paths) continue;
    // Preserve genuinely straight facing connections even when two 13px
    // stubs would overlap inside a narrow but valid inter-node gap.
    if (pair.straight)
      pool.push({
        c,
        o: c.obs,
        path: [c.start, c.end],
        floor: sideFloor(c) + distance(c.start, c.end),
        idx: pairs.length,
        k: -1,
      });
    addDoglegs(c, pair.walls);
  }
  // Best first, so the best route is found early and the floor stops the rest. A side pair's
  // doglegs join the queue before any path whose floor is at or above the pair's `min`.
  pairs.sort((p, q) => p.min - q.min || p.idx - q.idx);
  for (let next = 0; ;) {
    const head = pool.items[0];
    if (next < pairs.length && (!head || pairs[next].min <= head.floor)) {
      if (pairs[next].min >= cutoff()) next = pairs.length;
      else expand(pairs[next++]);
      continue;
    }
    if (!head || head.floor >= cutoff()) break;
    const p = pool.pop();
    if (p.path) {
      remember(p.path, p.c, p.c.obs, genOf(p));
      continue;
    }
    const ps = compress(p.raw!);
    if (!segments(ps).some(([u, v]) => blocked(u, v, p.o))) remember(ps, p.c, p.o, genOf(p));
  }
  candidates.sort((a, b) => a.lower - b.lower || cmp(a.fs + ':' + a.ts, b.fs + ':' + b.ts));
  // Search is reserved for candidates whose lower bound can beat the best.
  // Dragging keeps this bounded; settled diagrams receive refinement passes.
  let searches = 0;
  for (const c of candidates) {
    if (best && c.lower > best.score) continue;
    if (searches++ >= (rawOptions.quick ? 1 : 3)) break;
    // A clean route out of or into a far side still loops round the outside: a forward route
    // with one bend more is found only by the search, so the search goes on.
    if (
      best &&
      !(ctx.facingFans && ctx.far({ ...e, fromSide: best.fs, toSide: best.ts })) &&
      !conflicts(best.points, used).crossings &&
      !parallelConflicts(best.points, used, s.edgeGap).lanePairs &&
      !cfg.waypoints?.length &&
      best.points.length <= 6
    )
      break;
    // No grid search can reach a waypoint inside a solid obstacle.
    if (
      cfg.waypoints?.some(point => {
        const grid = { x: round(point.x), y: round(point.y) };
        return blocked(grid, grid, c.obs);
      })
    )
      continue;
    const points = [c.as, ...(cfg.waypoints || []), c.bs],
      path: Point[] = [];
    let ok = true;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1],
        q = points[i];
      // Crossing and standoff costs dwarf the distance heuristic, so an open search floods most
      // of the grid. It searches the two boxes' span plus a margin first, and widens only when
      // that fails.
      const span = {
          x0: Math.min(a.x, b.x, p.x, q.x),
          y0: Math.min(a.y, b.y, p.y, q.y),
          x1: Math.max(a.x + a.w, b.x + b.w, p.x, q.x),
          y1: Math.max(a.y + a.h, b.y + b.h, p.y, q.y),
        },
        grow = (r: Window, m: number): Window => ({
          x0: r.x0 - m,
          y0: r.y0 - m,
          x1: r.x1 + m,
          y1: r.y1 + m,
        });
      let part: Point[] | null = null;
      for (const m of rawOptions.window === false ? [null] : WINDOWS) {
        const win = m === null ? null : grow(span, m);
        // The standoff makes some searches wander; it gets a larger budget.
        part = search(p, q, c.obs, used, s, near, near.length ? 64000 : 16000, win);
        if (part) break;
      }
      if (!part) {
        ok = false;
        break;
      }
      path.push(...part);
    }
    if (ok) remember(path, c);
  }
  if (!best && rawOptions.quick && old) return findAmong(ctx, e, used, null, open, wall, loose);
  // Groups stacked edge to edge (rows of a lane layout) can leave no way round one that holds
  // neither end: the line crosses it, square through its borders, rather than give up.
  if (!best && !loose && ctx.facingFans && edgeObs.some(r => groups.has(r.id ?? '')))
    return findAmong(ctx, e, used, old, open, wall, true);
  if (!best) {
    // No clear route: draw one anyway, through what is in the way. It still leaves and enters
    // square to its sides, a stub out, and turns in the gap between them, never along a box.
    const ca = center(a),
      cb = center(b),
      toward = (sides: Side[], p: Point, q: Point) =>
        ctx.facingFans
          ? sides.reduce((x, y) =>
              vector[y].x * (q.x - p.x) + vector[y].y * (q.y - p.y) >
              vector[x].x * (q.x - p.x) + vector[x].y * (q.y - p.y) + EPS
                ? y
                : x,
            )
          : sides[0],
      fs = toward(from, ca, cb),
      ts = toward(to, cb, ca),
      start = port(a, fs),
      end = port(b, ts),
      n = s.clearance + 3,
      as = { x: start.x + vector[fs].x * n, y: start.y + vector[fs].y * n },
      bs = { x: end.x + vector[ts].x * n, y: end.y + vector[ts].y * n },
      upright = (x: Side) => x === 'top' || x === 'bottom',
      bridge = !upright(fs)
        ? upright(ts)
          ? [{ x: bs.x, y: as.y }]
          : [
              { x: (as.x + bs.x) / 2, y: as.y },
              { x: (as.x + bs.x) / 2, y: bs.y },
            ]
        : upright(ts)
          ? [
              { x: as.x, y: (as.y + bs.y) / 2 },
              { x: bs.x, y: (as.y + bs.y) / 2 },
            ]
          : [{ x: as.x, y: bs.y }];
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      fromSide: fs,
      toSide: ts,
      fromOffset: 0,
      toOffset: 0,
      // A lane's waypoints can double back on a stand-in: it keeps the plain corner.
      points:
        ctx.facingFans && !cfg.waypoints?.length
          ? compress([start, as, ...bridge, bs, end])
          : compress([start, { x: end.x, y: start.y }, end]),
      blocked: true,
      reason: 'No clear route within the search budget and current side / waypoint constraints.',
    };
  }
  best.points = simplify(ctx, best.points, e, best.fs, best.ts, edgeObs, used);
  const found: Route = {
    id: e.id,
    from: e.from,
    to: e.to,
    fromSide: best.fs,
    toSide: best.ts,
    fromOffset: best.fo,
    toOffset: best.toff,
    points: best.points,
    blocked: false,
  };
  scores.set(found, best.score);
  return found;
}
