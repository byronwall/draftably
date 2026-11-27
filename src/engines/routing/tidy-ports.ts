import { conflicts } from './conflicts.ts';
import type { Context } from './context.ts';
import { center, clone, compress, EPS, round } from './geometry.ts';
import { offsetKey, port, sideKey } from './ports.ts';
import { LONE_GAIN, PORT_SLACK } from './tuning.ts';
import type { Box, End, Point, Route, Side } from './types.ts';

/** One end of a route, by the route's index. */
type PortEnd = { i: number; end: End };

/**
 * Tries a tidy move: new points for some routes, by index, with their new offsets. It stands
 * only when every moved route stays valid and nothing gets worse.
 */
export type Attempt = (
  changes: Map<number, Point[]>,
  extra?: Record<number, Partial<Route>>,
  throughWaypoints?: boolean,
  slack?: number,
) => boolean;

/** Whether a shape's sides are straight, so a port may slide along them. */
export const flat = (r: Box) => !['pill', 'circle', 'diamond', 'icon'].includes(r.shape!);
export const ends: End[] = ['from', 'to'];
/** An end at a code range: its port stays level with the range's line, so no pass moves it. */
export const held = (ctx: Context, r: Route, end: End) => {
  const cfg = ctx.edges.find(e => e.id === r.id)?.cfg;
  return (end === 'from' ? cfg?.fromAt : cfg?.toAt) !== undefined;
};
/** The point `k` steps in from one end of a path. */
export const tip = (ps: Point[], end: End, k = 0) =>
  end === 'from' ? ps[k] : ps[ps.length - 1 - k];

// Ports: shift a side's ports so their mean sits on the side's centre.
// Jogs can slide a port off its side's centre, so this runs again after them.
// Whether a port at `offset` stays within 2px of the side's face at its middle. Always true
// for flat sides; on a round end it allows a small slide off the tip.
const nearTip = (r: Box, side: Side, offset: number) => {
  const across = side === 'left' || side === 'right' ? 'x' : 'y';
  return flat(r) || Math.abs(port(r, side, offset)[across] - port(r, side)[across]) <= 2;
};
export function centrePorts(ctx: Context, attempt: Attempt) {
  const { s, rects, state } = ctx;
  const sides = new Map<string, PortEnd[]>();
  state.routes.forEach((r, i) => {
    for (const end of ends) {
      if (held(ctx, r, end)) continue;
      const key = r[end] + '|' + r[sideKey(end)];
      if (!sides.has(key)) sides.set(key, []);
      sides.get(key)!.push({ i, end });
    }
  });
  for (const [key, list] of sides) {
    const [id, side] = key.split('|') as [string, Side],
      rect = rects.get(id)!,
      vertical = side === 'left' || side === 'right',
      axis = vertical ? 'y' : 'x',
      mid = center(rect)[axis],
      limit = (vertical ? rect.h : rect.w) / 2 - 10,
      at = [...new Set(list.map(({ i, end }) => round(tip(state.routes[i].points, end)[axis])))];
    // A lone bent line leaving off its side's middle (its siblings moved elsewhere) slides to the
    // middle when that takes it clear of a border or box it runs beside: it must lower the
    // standoff. An arrival keeps its port, which spaces it from the lines beside it.
    if (list.length === 1 && flat(rect)) {
      const { i, end } = list[0];
      if (end !== 'from') continue;
      const ps = clone(state.routes[i].points),
        d = round(mid - at[0]);
      if (ps.length < 3 || Math.abs(d) < 2) continue;
      const moved = port(rect, side, 0);
      Object.assign(tip(ps, end), moved);
      tip(ps, end, 1)[axis] = moved[axis];
      attempt(new Map([[i, ps]]), { [i]: { [offsetKey(end)]: 0 } }, false, -LONE_GAIN);
      continue;
    }
    if (at.length < 2) continue;
    const d = round(mid - at.reduce((n, v) => n + v, 0) / at.length);
    if (Math.abs(d) < 2 || at.some(v => Math.abs(v + d - mid) > limit + EPS)) continue;
    // Diamonds keep their ports on the tips; round ends allow a small slide.
    if (at.some(v => !nearTip(rect, side, v + d - mid))) continue;
    const changes = new Map<number, Point[]>(),
      extra: Record<number, Partial<Route>> = {},
      farSides = new Set<string>();
    for (const { i, end } of list) {
      const ps = clone(changes.get(i) ?? state.routes[i].points),
        offset = round(tip(ps, end)[axis] + d - mid),
        moved = port(rect, side, offset);
      Object.assign(tip(ps, end), moved);
      extra[i] = { ...extra[i], [offsetKey(end)]: offset };
      if (ps.length === 2) {
        // A straight route slides as a whole, moving its other port too.
        const other: End = end === 'from' ? 'to' : 'from',
          far = rects.get(state.routes[i][other])!,
          otherSide = state.routes[i][sideKey(other)],
          otherOffset = round(tip(ps, other)[axis] + d - center(far)[axis]);
        if (!nearTip(far, otherSide, otherOffset)) {
          changes.clear();
          break;
        }
        Object.assign(tip(ps, other), port(far, otherSide, otherOffset));
        extra[i][offsetKey(other)] = otherOffset;
        farSides.add(state.routes[i][other] + '|' + otherSide);
      } else tip(ps, end, 1)[axis] = moved[axis];
      changes.set(i, ps);
    }
    // This side alone, in case the far side's shift is rejected.
    const own = new Map(changes);
    // The far side of a slid straight line keeps its own ports centred: its bent lines
    // shift together so the side's mean stays on its middle.
    for (const fk of farSides) {
      const [fid, fside] = fk.split('|') as [string, Side],
        far = rects.get(fid)!,
        fmid = center(far)[axis],
        flimit = (vertical ? far.h : far.w) / 2 - 10,
        entries = sides.get(fk) ?? [],
        pos = ({ i, end }: PortEnd) => tip(changes.get(i) ?? state.routes[i].points, end)[axis],
        movable = entries.filter(({ i }) => !changes.has(i) && state.routes[i].points.length >= 4);
      if (!movable.length || !flat(far)) continue;
      const sum = entries.reduce((n, en) => n + pos(en), 0),
        delta = round((entries.length * fmid - sum) / movable.length);
      if (Math.abs(delta) < 2) continue;
      for (const en of movable) {
        const ps = clone(state.routes[en.i].points),
          offset = round(tip(ps, en.end)[axis] + delta - fmid);
        if (Math.abs(offset) > flimit + EPS) continue;
        Object.assign(tip(ps, en.end), port(far, fside, offset));
        tip(ps, en.end, 1)[axis] = tip(ps, en.end)[axis];
        extra[en.i] = { ...extra[en.i], [offsetKey(en.end)]: offset };
        changes.set(en.i, ps);
      }
    }
    if (!changes.size) continue;
    // A line that turns in beside the side runs alongside it a stub away; the shift can
    // lengthen that run into a hug. Turn a full standoff out instead, where the line allows.
    const across = vertical ? 'x' : 'y',
      face = { left: rect.x, right: rect.x + rect.w, top: rect.y, bottom: rect.y + rect.h }[side],
      out = side === 'left' || side === 'top' ? -1 : 1,
      widen = (moves: Map<number, Point[]>) =>
        new Map(
          [...moves].map(([i, ps]) => {
            const end = list.find(l => l.i === i)?.end,
              q = clone(ps);
            if (
              end &&
              q.length >= 4 &&
              Math.abs(tip(q, end, 1)[across] - tip(q, end, 2)[across]) < EPS &&
              Math.abs(tip(q, end, 1)[across] - face) < s.standoff
            ) {
              tip(q, end, 1)[across] = face + out * s.standoff;
              tip(q, end, 2)[across] = face + out * s.standoff;
            }
            return [i, q];
          }),
        );
    // Centring a side is worth a little standoff: a port gap's shift barely moves a line.
    for (const moves of changes.size > own.size ? [changes, own] : [own])
      if (
        attempt(widen(moves), extra, false, PORT_SLACK * moves.size) ||
        attempt(moves, extra, false, PORT_SLACK * moves.size)
      )
        break;
  }
}

/** All line ends compete for space on the physical side, in both directions. */
function sidePorts(ctx: Context) {
  const sides = new Map<string, PortEnd[]>();
  ctx.state.routes.forEach((r, i) => {
    for (const end of ends) {
      const key = r[end] + '|' + r[sideKey(end)];
      if (!sides.has(key)) sides.set(key, []);
      sides.get(key)!.push({ i, end });
    }
  });
  return sides;
}

function canMove(ctx: Context, r: Route, end: End) {
  if (r.blocked || r.from === r.to || ctx.state.fixedPlans.has(r.id)) return false;
  const cfg = ctx.edges.find(e => e.id === r.id)?.cfg;
  return end === 'from'
    ? cfg?.fromAt === undefined
    : cfg?.toAt === undefined && cfg?.toOffset === undefined;
}

function crowded(ctx: Context, slots: PortEnd[], i: number, offset: number) {
  const pitch = Math.max(ctx.s.portGap, ctx.s.edgeGap);
  return slots.some(
    p => p.i !== i && Math.abs(ctx.state.routes[p.i][offsetKey(p.end)] - offset) < pitch - EPS,
  );
}

function movePort(ctx: Context, sides: Map<string, PortEnd[]>, p: PortEnd, offset: number) {
  const r = ctx.state.routes[p.i],
    side = r[sideKey(p.end)],
    rect = ctx.rects.get(r[p.end])!;
  if (ctx.facingFans && rect.shape === 'diamond' && offset !== 0) return;
  const axis = side === 'left' || side === 'right' ? 'y' : 'x';
  const points = clone(r.points),
    moved = port(rect, side, offset);
  const extra: Partial<Route> = { [offsetKey(p.end)]: offset };
  Object.assign(tip(points, p.end), moved);
  if (points.length === 2) {
    // A straight line slides as one piece. Both ports must fit without displacing a neighbour.
    const far = p.end === 'from' ? 'to' : 'from',
      farSide = r[sideKey(far)],
      box = ctx.rects.get(r[far])!;
    const farOffset = round(moved[axis] - center(box)[axis]);
    if (
      !canMove(ctx, r, far) ||
      (ctx.facingFans && box.shape === 'diamond' && farOffset !== 0) ||
      Math.abs(farOffset) > (axis === 'y' ? box.h : box.w) / 2 - 10 ||
      crowded(ctx, sides.get(r[far] + '|' + farSide)!, p.i, farOffset)
    )
      return;
    Object.assign(tip(points, far), port(box, farSide, farOffset));
    extra[offsetKey(far)] = farOffset;
  } else tip(points, p.end, 1)[axis] = moved[axis];
  return { points, extra };
}

/** Exchange two occupied slots. Keep each edge's track beyond its first bend. */
export function swapPorts(ctx: Context, attempt: Attempt, bentOnly = false) {
  const { state } = ctx,
    sides = sidePorts(ctx);
  for (const ports of sides.values()) {
    const offset = (p: PortEnd) => state.routes[p.i][offsetKey(p.end)];
    const sorted = ports
      .filter(
        p =>
          (!bentOnly || state.routes[p.i].points.length >= 3) &&
          canMove(ctx, state.routes[p.i], p.end),
      )
      .sort((a, b) => offset(a) - offset(b));
    for (let k = 1; k < sorted.length; k++) {
      const p = sorted[k - 1],
        q = sorted[k],
        a = state.routes[p.i],
        b = state.routes[q.i];
      if (!conflicts(a.points, [b]).crossings) continue;
      const left = movePort(ctx, sides, p, offset(q)),
        right = movePort(ctx, sides, q, offset(p));
      if (!left || !right) continue;
      const changes = new Map([
        [p.i, left.points],
        [q.i, right.points],
      ]);
      const next = state.routes.map((r, i) =>
        changes.has(i) ? { ...r, points: compress(changes.get(i)!) } : r,
      );
      if (conflicts(next[p.i].points, [next[q.i]]).crossings >= conflicts(a.points, [b]).crossings)
        continue;
      if (
        [p.i, q.i].some(i =>
          state.routes.some(
            (r, j) =>
              j !== p.i &&
              j !== q.i &&
              conflicts(next[i].points, [r]).crossings >
                conflicts(state.routes[i].points, [r]).crossings,
          ),
        )
      )
        continue;
      if (attempt(changes, { [p.i]: left.extra, [q.i]: right.extra }, true))
        sorted.splice(k - 1, 2, q, p);
    }
  }
}

/** A bent line may instead take an empty slot beyond the port it crosses. */
export function clearPortCrossings(ctx: Context, attempt: Attempt) {
  const { state, rects, s } = ctx,
    sides = sidePorts(ctx),
    pitch = Math.max(s.portGap, s.edgeGap);
  for (const list of sides.values()) {
    if (list.length < 2) continue;
    for (const p of list) {
      const r = state.routes[p.i],
        side = r[sideKey(p.end)],
        rect = rects.get(r[p.end])!;
      if (r.points.length < 3 || !canMove(ctx, r, p.end)) continue;
      const limit = (side === 'left' || side === 'right' ? rect.h : rect.w) / 2 - 10;
      for (const q of list) {
        const other = state.routes[q.i];
        if (p.i === q.i || !conflicts(r.points, [other]).crossings) continue;
        const at = other[offsetKey(q.end)],
          next = at + Math.sign(at - r[offsetKey(p.end)]) * pitch;
        if (Math.abs(next) > limit || crowded(ctx, list, p.i, next)) continue;
        // A free slot should still leave the fan spanning the centre of the face.
        if (
          !list.some(
            slot => slot.i !== p.i && next * state.routes[slot.i][offsetKey(slot.end)] <= 0,
          )
        )
          continue;
        const move = movePort(ctx, sides, p, next);
        if (!move || conflicts(compress(move.points), [other]).crossings) continue;
        if (
          state.routes.some(
            (line, j) =>
              j !== p.i &&
              j !== q.i &&
              conflicts(move.points, [line]).crossings > conflicts(r.points, [line]).crossings,
          )
        )
          continue;
        if (attempt(new Map([[p.i, move.points]]), { [p.i]: move.extra }, true)) break;
      }
    }
  }
}
