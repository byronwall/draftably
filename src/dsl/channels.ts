/**
 * Routing channels inside groups.
 *
 * A group leaves `GROUP_INSET` between its members and its border. That is padding, not room for
 * a line: a line routed through it runs beside a member and along the border at once. When a
 * connection has to travel inside a group (a member boxed in by its neighbours, or a link between
 * two of the group's children that can't go straight across), the group grows a channel on one
 * side, wide enough for each such line to run a full standoff from the members,
 * the border and each other. A link between children takes the side of them both ends lean
 * toward, and a return (up or left) takes the left or top when they lean neither way, so a
 * forward line and its return don't cross. The compiler lays the scene out once, plans channels
 * from that geometry, and lays it out again with them.
 */
import type { ModelEdge } from './syntax';
import { GROUP_INSET } from './frame';

/**
 * Room a group leaves round its content: the inset on the left, right and bottom (at least
 * `GROUP_INSET`), and extra room under the title band on top (0 without a channel there).
 */
export interface Channel {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** How many lines each side's channel was planned for. */
  lines: Record<Side, number>;
}

/** Channels may grow the drawing's area by this much at most. */
export const CHANNEL_BUDGET = 1.1;

/**
 * Drop the channels that carry fewest lines until the drawing laid out with the rest (`measure`)
 * is within `CHANNEL_BUDGET` of its area without any (`plain`).
 */
export function trimChannels(
  plan: Map<string, Channel>,
  plain: number,
  measure: (channels: Map<string, Channel>) => number,
): Map<string, Channel> {
  const out = new Map(plan);
  const sides = [...out].flatMap(([id, c]) =>
    (Object.keys(c.lines) as Side[])
      .filter(s => c.lines[s])
      .map(side => ({ id, side, n: c.lines[side] })),
  );
  // Fewest lines first; among equals, the later group, so the result doesn't depend on Map order.
  sides.sort((a, b) => a.n - b.n || (a.id < b.id ? 1 : -1));
  for (const { id, side } of sides) {
    if (!out.size || measure(out) <= plain * CHANNEL_BUDGET) break;
    const c = { ...out.get(id)!, lines: { ...out.get(id)!.lines, [side]: 0 } };
    c[side] = side === 'top' ? 0 : GROUP_INSET;
    if (Object.values(c.lines).some(Boolean)) out.set(id, c);
    else out.delete(id);
  }
  return out;
}

interface Box {
  id: string;
  type: string;
  parent: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = 'left' | 'right' | 'top' | 'bottom';

/** The router's defaults, which a file's `routing` line may change. */
const STANDOFF = 20,
  EDGE_GAP = 16;
/** A blocker closer than this to a line's path, across it, still leaves the line no room. */
const CLEAR = 10;

/**
 * Channels for the scene laid out as `objects`. A group is keyed by id; groups with no traffic
 * are left out.
 */
export function planChannels(
  objects: Box[],
  edges: ModelEdge[],
  routing: { edgeGap?: number; portGap?: number; standoff?: number } = {},
): Map<string, Channel> {
  const byId = new Map(objects.map(o => [o.id, o])),
    ancestors = (id: string) => {
      const out: string[] = [];
      for (let o = byId.get(id); o && o.parent !== 'root'; o = byId.get(o.parent))
        out.push(o.parent);
      return out;
    },
    inside = (id: string, group: string) => id === group || ancestors(id).includes(group);
  const counts = new Map<string, Record<Side, number>>(),
    add = (group: string, side: Side) => {
      const c = counts.get(group) ?? { left: 0, right: 0, top: 0, bottom: 0 };
      c[side]++;
      counts.set(group, c);
    };
  const centre = (o: Box) => ({ x: o.x + o.w / 2, y: o.y + o.h / 2 });

  /**
   * Is `n` boxed in inside `g` on `side`: does another of g's descendants (not holding n, and
   * not `other`) sit between n and that border, across n's span?
   */
  const boxedIn = (n: Box, g: Box, side: Side, other: string) =>
    objects.some(o => {
      if (o.id === n.id || o.id === other || !inside(o.id, g.id) || o.id === g.id) return false;
      if (inside(n.id, o.id) || inside(other, o.id)) return false;
      const level = side === 'left' || side === 'right';
      const across = level
        ? o.y < n.y + n.h + CLEAR && o.y + o.h > n.y - CLEAR
        : o.x < n.x + n.w + CLEAR && o.x + o.w > n.x - CLEAR;
      if (!across) return false;
      if (side === 'right') return o.x >= n.x + n.w;
      if (side === 'left') return o.x + o.w <= n.x;
      if (side === 'bottom') return o.y >= n.y + n.h;
      return o.y + o.h <= n.y;
    });
  /** Sides of `g` the point lies beyond. */
  const beyond = (g: Box, p: { x: number; y: number }): Side[] => [
    ...(p.x > g.x + g.w ? (['right'] as const) : []),
    ...(p.x < g.x ? (['left'] as const) : []),
    ...(p.y > g.y + g.h ? (['bottom'] as const) : []),
    // A line leaves through the top only past the title band, which it may not cross.
    ...(p.y < g.y ? (['top'] as const) : []),
  ];

  for (const e of edges) {
    const a = byId.get(e.source),
      b = byId.get(e.target);
    if (!a || !b || a === b || e.from !== 'auto' || e.to !== 'auto') continue;
    const up = [a.id, ...ancestors(a.id)],
      common = [b.id, ...ancestors(b.id)].find(id => up.includes(id) && id !== a.id && id !== b.id);
    const lca = common && byId.get(common)?.type === 'group' ? byId.get(common)! : undefined;
    // The children of the common group that hold each end.
    const childOf = (n: Box) => {
      let o = n;
      while (o.parent !== (lca?.id ?? 'root')) o = byId.get(o.parent)!;
      return o;
    };
    const [ca, cb] = [childOf(a), childOf(b)];
    // Between two of a group's children: straight across when they face each other and neither
    // end is boxed in inside its child; otherwise along a channel of the common group.
    if (lca && ca !== cb) {
      const facing = (n: Box, c: Box, o: Box) =>
        n === c || beyond(c, centre(o)).some(side => !boxedIn(n, c, side, ''));
      const adjacent = !objects.some(
        o => o.parent === lca.id && o !== ca && o !== cb && between(ca, cb, o),
      );
      if (adjacent && facing(a, ca, b) && facing(b, cb, a)) continue;
      const stacked = Math.abs(centre(ca).y - centre(cb).y) > Math.abs(centre(ca).x - centre(cb).x);
      // The channel on the side of the children both ends lean toward; a tie puts lines that
      // read forward (down or right) on the right or bottom and returns on the left or top.
      const lean = (n: Box, c: Box, axis: 'x' | 'y') =>
        (centre(n)[axis] - centre(c)[axis]) / Math.max(1, axis === 'x' ? c.w : c.h);
      const axis = stacked ? 'x' : 'y',
        bias = lean(a, ca, axis) + lean(b, cb, axis),
        forward = centre(cb)[stacked ? 'y' : 'x'] > centre(ca)[stacked ? 'y' : 'x'],
        late = Math.abs(bias) > 0.1 ? bias > 0 : forward;
      add(lca.id, stacked ? (late ? 'right' : 'left') : late ? 'bottom' : 'top');
      continue;
    }
    // Out of each group that holds one end only: a channel where the end is boxed in.
    for (const [n, other] of [
      [a, b],
      [b, a],
    ] as const) {
      // Only the end's own group: once out of it, a line is in its parent's open interior.
      const g = n.parent === 'root' ? undefined : byId.get(n.parent);
      if (!g || (lca && g.id === lca.id) || inside(other.id, g.id)) continue;
      const sides = beyond(g, centre(other));
      if (!sides.length || sides.some(side => !boxedIn(n, g, side, other.id))) continue;
      // Boxed in across: run along the top or bottom, whichever the end is nearer; boxed in
      // along: down the side the other end is on.
      if (sides.some(s => s === 'left' || s === 'right'))
        add(g.id, centre(n).y < centre(g).y + 24 ? 'top' : 'bottom');
      else add(g.id, centre(other).x < centre(n).x ? 'left' : 'right');
    }
  }

  const standoff = routing.standoff ?? STANDOFF,
    gap = Math.max(routing.edgeGap ?? EDGE_GAP, routing.portGap ?? EDGE_GAP);
  // A side channel runs a standoff from the members and from the border; a top channel runs
  // under the title band, which already clears the border, so it needs the standoff below only.
  const width = (k: number) => (k ? 2 * standoff + (k - 1) * gap : GROUP_INSET);
  return new Map(
    [...counts].map(([id, c]) => [
      id,
      {
        left: width(c.left),
        right: width(c.right),
        top: c.top ? standoff + (c.top - 1) * gap : 0,
        bottom: width(c.bottom),
        lines: c,
      },
    ]),
  );
}

/** Does `o` sit between `a` and `b` (overlapping the box spanned by their facing sides)? */
function between(a: Box, b: Box, o: Box) {
  const x0 = Math.min(a.x + a.w, b.x + b.w),
    x1 = Math.max(a.x, b.x),
    y0 = Math.min(a.y + a.h, b.y + b.h),
    y1 = Math.max(a.y, b.y);
  const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) },
    hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) };
  return o.x < hi.x && o.x + o.w > lo.x && o.y < hi.y && o.y + o.h > lo.y;
}
