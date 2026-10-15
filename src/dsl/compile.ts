/**
 * Compile a `.meld` model into geometry. Adapted from Meld 0.1's layout and refinement pass.
 *
 * Geometry is a pure function of the source and one fixed render context: no DOM measurement,
 * randomness, clocks or previous output. The browser and the CLI therefore agree exactly.
 */
import { defaultShapeSize } from '../model/styles';
import {
  DslError,
  parseModel,
  type Hint,
  type Model,
  type ModelEdge,
  type ModelLayout,
  type ModelObject,
} from './syntax';

/** The single render context. Browser window size changes the camera, never the layout. */
export const RENDER_CONTEXT = { width: 1100, height: 720 } as const;
/** Space between a group's frame and its content, on the sides and bottom. */
export const GROUP_INSET = 24;
/** Space between a group's top edge and its content; the title sits in it. */
export const GROUP_HEADER = 48;
const MIN_GAP = 12;
const MIN_GROUP = { w: 220, h: 110 };

export interface SceneObject extends ModelObject {
  /** World (diagram) coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Position relative to the parent's content origin; `pin` and `stay` use these. */
  localX: number;
  localY: number;
  /** Local position from the automatic recipe alone, before refinements; `nudge` offsets this. */
  baseX: number;
  baseY: number;
  depth: number;
}

export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  /** Source line of the rule involved, when there is one. */
  line?: number;
  ids: string[];
}

export interface Scene {
  model: Model;
  title: string;
  objects: SceneObject[];
  byId: Map<string, SceneObject>;
  edges: ModelEdge[];
  diagnostics: Diagnostic[];
}

type Item = ModelObject & { w: number; h: number };
type Pos = { x: number; y: number };

const round = (n: number) => Math.round(n);

/** Content origin of a group in world coordinates. */
export const contentOrigin = (group: { x: number; y: number }) => ({
  x: group.x + GROUP_INSET,
  y: group.y + GROUP_HEADER,
});

export function compile(source: string): Scene {
  return layoutModel(parseModel(source));
}

export function layoutFor(m: Model, scope: string): ModelLayout {
  return (
    m.layouts.find(l => l.scope === scope) ?? {
      scope,
      algorithm: scope === 'root' ? 'flow' : 'column',
      direction: 'auto',
      gap: scope === 'root' ? 48 : 24,
      minWidth: 0,
      minHeight: 0,
      line: 0,
    }
  );
}

/** Wrap by character count; deterministic everywhere, unlike measured text. */
function lineCount(text: string, limit: number) {
  let lines = 0;
  for (const part of text.split('\n')) {
    let line = 0;
    for (const w of part.split(/\s+/).filter(Boolean)) {
      const len = Math.min(w.length, limit);
      if (line && line + 1 + len > limit) {
        lines++;
        line = len;
      } else line += (line ? 1 : 0) + len;
      lines += Math.floor(w.length / (limit + 1));
    }
    lines++;
  }
  return Math.max(1, lines);
}

export function leafSize(o: ModelObject, size?: { width: number; height: number }) {
  const base = defaultShapeSize(o.shape);
  const w = size?.width ?? base.w;
  if (o.shape === 'circle' || o.shape === 'diamond') return { w, h: size?.height ?? base.h };
  const lines = lineCount(o.label, Math.max(4, Math.floor((w - 24) / 7.4)));
  return { w, h: Math.max(size?.height ?? base.h, base.h + 16 * (lines - 1)) };
}

/** Longest-path ranks over strongly connected components, in declaration order. */
function rankLayers(ids: string[], pairs: Array<[string, string]>): string[][] {
  const adj = new Map(ids.map(id => [id, [] as string[]]));
  for (const [a, b] of pairs)
    if (a !== b && adj.has(a) && adj.has(b) && !adj.get(a)!.includes(b)) adj.get(a)!.push(b);
  const index = new Map<string, number>(),
    low = new Map<string, number>(),
    stack: string[] = [],
    on = new Set<string>(),
    comps: string[][] = [];
  let k = 0;
  const visit = (v: string) => {
    index.set(v, k);
    low.set(v, k++);
    stack.push(v);
    on.add(v);
    for (const w of adj.get(v)!) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const c: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        c.push(w);
      } while (w !== v);
      comps.push(c);
    }
  };
  ids.forEach(id => index.has(id) || visit(id));
  const cid = new Map<string, number>();
  comps.forEach((c, i) => c.forEach(n => cid.set(n, i)));
  const next = comps.map(() => new Set<number>()),
    indegree = comps.map(() => 0),
    rank = comps.map(() => 0);
  for (const [a, b] of pairs) {
    const ca = cid.get(a),
      cb = cid.get(b);
    if (ca !== undefined && cb !== undefined && ca !== cb && !next[ca].has(cb)) {
      next[ca].add(cb);
      indegree[cb]++;
    }
  }
  const priority = (i: number) => Math.min(...comps[i].map(x => ids.indexOf(x)));
  const queue = comps.map((_, i) => i).filter(i => !indegree[i]);
  while (queue.length) {
    queue.sort((a, b) => priority(a) - priority(b));
    const a = queue.shift()!;
    for (const b of next[a]) {
      rank[b] = Math.max(rank[b], rank[a] + 1);
      if (--indegree[b] === 0) queue.push(b);
    }
  }
  const layers: string[][] = [];
  for (const id of ids) (layers[rank[cid.get(id)!]] ||= []).push(id);
  return layers.filter(Boolean);
}

function baseLayout(items: Item[], layout: ModelLayout, pairs: Array<[string, string]>) {
  const out = new Map<string, Pos>(),
    gap = layout.gap,
    { width, height } = RENDER_CONTEXT;
  const axis: 'right' | 'down' =
    layout.direction === 'auto'
      ? width >= 700 && width / height > 1.12
        ? 'right'
        : 'down'
      : layout.direction;
  const by = new Map(items.map(n => [n.id, n]));
  if (layout.algorithm === 'row' || layout.algorithm === 'column') {
    let cursor = 0;
    for (const n of items) {
      out.set(n.id, layout.algorithm === 'row' ? { x: cursor, y: 0 } : { x: 0, y: cursor });
      cursor += (layout.algorithm === 'row' ? n.w : n.h) + gap;
    }
  } else {
    const ids = items.map(n => n.id);
    const layers = pairs.length ? rankLayers(ids, pairs) : ids.map(id => [id]);
    const major = (id: string) => (axis === 'right' ? by.get(id)!.w : by.get(id)!.h);
    const minor = (id: string) => (axis === 'right' ? by.get(id)!.h : by.get(id)!.w);
    let at = 0;
    for (const layer of layers) {
      let across = 0;
      for (const id of layer) {
        out.set(id, axis === 'right' ? { x: at, y: across } : { x: across, y: at });
        across += minor(id) + gap;
      }
      at += Math.max(...layer.map(major)) + gap;
    }
  }
  return { positions: out, axis };
}

class Union {
  private parent: Map<string, string>;
  constructor(ids: string[]) {
    this.parent = new Map(ids.map(x => [x, x]));
  }
  find(x: string) {
    let r = x;
    while (this.parent.get(r) !== r) r = this.parent.get(r)!;
    return r;
  }
  join(a: string, b: string) {
    a = this.find(a);
    b = this.find(b);
    if (a !== b) this.parent.set(b, a);
  }
}

interface Variable {
  sum: number;
  weight: number;
  value: number;
  fixed: number | null;
  members: string[];
}

/**
 * Apply refinements to one scope: stays, nudges, near, preferred alignment and pins set starting
 * positions; required alignment and near become shared or ordered variables; then overlapping
 * siblings are separated, moving lighter objects more. Pins never move.
 */
function refine(
  items: Item[],
  base: Map<string, Pos>,
  hints: Hint[],
  scope: string,
  diagnostics: Diagnostic[],
  axis: 'right' | 'down',
): Map<string, Pos> {
  const ids = items.map(n => n.id),
    by = new Map(items.map(n => [n.id, n])),
    pos = new Map(items.map(n => [n.id, { ...base.get(n.id)! }])),
    weight = new Map(ids.map(id => [id, 1]));
  const local = hints.filter(h =>
    'ids' in h ? h.type === 'align' && h.ids.every(id => by.has(id)) : 'id' in h && by.has(h.id),
  );
  const intended = new Map<string, { pos: Pos; hint: Hint }>();
  for (const h of local)
    if (h.type === 'stay') {
      pos.set(h.id, { x: h.x, y: h.y });
      weight.set(h.id, h.weight);
      intended.set(h.id, { pos: { x: h.x, y: h.y }, hint: h });
    }
  for (const h of local)
    if (h.type === 'nudge') {
      const p = base.get(h.id)!,
        next = { x: p.x + h.dx, y: p.y + h.dy };
      pos.set(h.id, next);
      weight.set(h.id, 4);
      intended.set(h.id, { pos: next, hint: h });
    }
  const near = new Map(
    local.flatMap(h => (h.type === 'near' && by.has(h.ref) ? [[h.id, h] as const] : [])),
  );
  const done = new Set<string>(),
    visiting = new Set<string>();
  const place = (id: string) => {
    const h = near.get(id);
    if (done.has(id) || !h) return;
    if (visiting.has(id))
      throw new DslError(
        `Relative placement cycle in ${scope}. Replace one near with nudge.`,
        h.line,
      );
    visiting.add(id);
    place(h.ref);
    const a = by.get(id)!,
      b = by.get(h.ref)!,
      p = pos.get(h.ref)!;
    let x = p.x + (b.w - a.w) / 2,
      y = p.y + (b.h - a.h) / 2;
    if (h.side === 'right' || h.side === 'left') {
      x = h.side === 'right' ? p.x + b.w + h.gap : p.x - a.w - h.gap;
      y += h.offset;
    } else {
      y = h.side === 'below' ? p.y + b.h + h.gap : p.y - a.h - h.gap;
      x += h.offset;
    }
    pos.set(id, { x, y });
    weight.set(id, 5);
    intended.set(id, { pos: { x, y }, hint: h });
    visiting.delete(id);
    done.add(id);
  };
  ids.forEach(place);

  for (const h of local)
    if (h.type === 'align' && h.strength === 'prefer') {
      const ref = by.get(h.ids[0])!,
        p = pos.get(ref.id)!,
        size = (n: Item) => (h.axis === 'x' ? n.w : n.h),
        center = p[h.axis] + size(ref) / 2;
      for (const id of h.ids.slice(1)) pos.get(id)![h.axis] = center - size(by.get(id)!) / 2;
    }
  const pins = new Map(local.flatMap(h => (h.type === 'pin' ? [[h.id, h] as const] : [])));
  for (const [id, h] of pins) pos.set(id, { x: h.x, y: h.y });

  const half = (a: 'x' | 'y', id: string) => (a === 'x' ? by.get(id)!.w : by.get(id)!.h) / 2;
  const uf = { x: new Union(ids), y: new Union(ids) };
  for (const h of local)
    if (h.type === 'align' && h.strength === 'required')
      for (const id of h.ids.slice(1)) {
        const roots = new Set([uf[h.axis].find(h.ids[0]), uf[h.axis].find(id)]);
        const fixed = ids
          .filter(k => pins.has(k) && roots.has(uf[h.axis].find(k)))
          .map(k => pos.get(k)![h.axis] + half(h.axis, k));
        if (fixed.length > 1 && Math.max(...fixed) - Math.min(...fixed) > 0.01)
          diagnostics.push({
            level: 'error',
            code: 'pin-align-conflict',
            message: `Pins conflict with required ${h.axis} alignment in ${scope}. The pins were kept.`,
            line: h.line,
            ids: h.ids,
          });
        else uf[h.axis].join(h.ids[0], id);
      }

  const vars = { x: new Map<string, Variable>(), y: new Map<string, Variable>() };
  for (const a of ['x', 'y'] as const)
    for (const id of ids) {
      const root = uf[a].find(id),
        center = pos.get(id)![a] + half(a, id);
      if (!vars[a].has(root))
        vars[a].set(root, { sum: 0, weight: 0, value: 0, fixed: null, members: [] });
      const v = vars[a].get(root)!;
      v.sum += center * weight.get(id)!;
      v.weight += weight.get(id)!;
      v.members.push(id);
      if (pins.has(id)) v.fixed = center;
    }
  for (const a of ['x', 'y'] as const)
    for (const v of vars[a].values()) v.value = v.fixed ?? v.sum / v.weight;
  const variable = (a: 'x' | 'y', id: string) => vars[a].get(uf[a].find(id))!;
  const center = (a: 'x' | 'y', id: string) => variable(a, id).value;
  /** Push `first` to be at least `gap` after `second` on axis `a`. */
  const separate = (a: 'x' | 'y', first: string, second: string, gap: number) => {
    const u = variable(a, first),
      w = variable(a, second),
      delta = gap - (u.value - w.value);
    if (delta <= 0.005 || u === w || (u.fixed !== null && w.fixed !== null)) return 0;
    if (u.fixed !== null) w.value -= delta;
    else if (w.fixed !== null) u.value += delta;
    else {
      const total = u.weight + w.weight;
      u.value += (delta * w.weight) / total;
      w.value -= (delta * u.weight) / total;
    }
    return delta;
  };

  const required = local.flatMap(h =>
    h.type === 'near' && h.strength === 'required' && by.has(h.ref) ? [h] : [],
  );
  const primary = axis === 'right' ? 'x' : 'y';
  for (let pass = 0; pass < 48; pass++) {
    let movement = 0;
    for (const h of required) {
      const a = h.side === 'right' || h.side === 'left' ? 'x' : 'y',
        plus = h.side === 'right' || h.side === 'below';
      movement += separate(
        a,
        plus ? h.id : h.ref,
        plus ? h.ref : h.id,
        half(a, h.id) + half(a, h.ref) + h.gap,
      );
    }
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i],
          b = items[j],
          dx = center('x', b.id) - center('x', a.id),
          dy = center('y', b.id) - center('y', a.id),
          ox = (a.w + b.w) / 2 + MIN_GAP - Math.abs(dx),
          oy = (a.h + b.h) / 2 + MIN_GAP - Math.abs(dy);
        if (ox <= 0.005 || oy <= 0.005) continue;
        const choices = (['x', 'y'] as const).filter(
          ax =>
            variable(ax, a.id) !== variable(ax, b.id) &&
            !(variable(ax, a.id).fixed !== null && variable(ax, b.id).fixed !== null),
        );
        if (!choices.length) continue;
        const cost = (ax: 'x' | 'y') => (ax === 'x' ? ox : oy) + (ax === primary ? 0 : 3);
        const ax = [...choices].sort((p, q) => cost(p) - cost(q))[0],
          d = ax === 'x' ? dx : dy;
        movement += separate(
          ax,
          d >= 0 ? b.id : a.id,
          d >= 0 ? a.id : b.id,
          (ax === 'x' ? a.w + b.w : a.h + b.h) / 2 + MIN_GAP,
        );
      }
    // Content stays at nonnegative local coordinates; pins are never adjusted.
    for (const a of ['x', 'y'] as const)
      for (const v of vars[a].values()) {
        const min = Math.max(...v.members.map(id => half(a, id)));
        if (v.value < min && v.fixed === null) {
          movement += min - v.value;
          v.value = min;
        }
      }
    if (movement < 0.01) break;
  }

  for (const n of items)
    pos.set(n.id, {
      x: round(center('x', n.id) - n.w / 2),
      y: round(center('y', n.id) - n.h / 2),
    });

  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i],
        b = items[j],
        pa = pos.get(a.id)!,
        pb = pos.get(b.id)!;
      if (
        pa.x + a.w > pb.x + 0.1 &&
        pb.x + b.w > pa.x + 0.1 &&
        pa.y + a.h > pb.y + 0.1 &&
        pb.y + b.h > pa.y + 0.1
      )
        diagnostics.push({
          level: 'error',
          code: 'overlap',
          message: `${a.id} overlaps ${b.id}. Release a pin or give ${scope} more room.`,
          ids: [a.id, b.id],
        });
    }
  for (const h of required) {
    const a = by.get(h.id)!,
      b = by.get(h.ref)!,
      p = pos.get(a.id)!,
      q = pos.get(b.id)!;
    const distance =
      h.side === 'right'
        ? p.x - q.x - b.w
        : h.side === 'left'
          ? q.x - p.x - a.w
          : h.side === 'below'
            ? p.y - q.y - b.h
            : q.y - p.y - a.h;
    if (distance < h.gap - 0.5)
      diagnostics.push({
        level: 'error',
        code: 'unsatisfied-near',
        message: `Required: ${h.id} ${h.side} of ${h.ref} is not satisfied.`,
        line: h.line,
        ids: [h.id, h.ref],
      });
  }
  // Soft preferences may give way; say which ones did and by how much.
  for (const [id, { pos: want, hint }] of intended) {
    if (pins.has(id) || (hint.type === 'near' && hint.strength === 'required')) continue;
    const got = pos.get(id)!,
      moved = Math.round(Math.hypot(got.x - want.x, got.y - want.y));
    if (moved >= 2)
      diagnostics.push({
        level: 'info',
        code: 'relaxed',
        message: `${hint.type} ${id} gave way by ${moved} px to keep ${scope} clear.`,
        line: hint.line,
        ids: [id],
      });
  }
  return pos;
}

export function layoutModel(m: Model): Scene {
  const diagnostics: Diagnostic[] = [],
    children = new Map<string, ModelObject[]>([['root', []]]);
  for (const o of m.objects) {
    if (!children.has(o.parent)) children.set(o.parent, []);
    children.get(o.parent)!.push(o);
  }
  const items = new Map<string, Item>(),
    local = new Map<string, Pos>(),
    bases = new Map<string, Pos>();
  const byId = new Map(m.objects.map(o => [o.id, o]));
  const immediate = (id: string, scope: string) => {
    let o = byId.get(id);
    while (o && o.parent !== scope) o = byId.get(o.parent);
    return o?.id;
  };

  function arrange(scope: string): { w: number; h: number } {
    const layout = layoutFor(m, scope),
      order = m.hints.find(h => h.type === 'order' && h.scope === scope);
    let kids = children.get(scope) ?? [];
    if (order?.type === 'order') {
      const listed = order.ids.flatMap(id => kids.filter(k => k.id === id));
      kids = [...listed, ...kids.filter(k => !order.ids.includes(k.id))];
    }
    const list: Item[] = kids.map(o => {
      let size: { w: number; h: number };
      if (o.type === 'group') {
        const sub = arrange(o.id),
          own = layoutFor(m, o.id);
        size = {
          w: Math.max(MIN_GROUP.w, sub.w + 2 * GROUP_INSET, own.minWidth),
          h: Math.max(MIN_GROUP.h, sub.h + GROUP_HEADER + GROUP_INSET, own.minHeight),
        };
      } else {
        const hint = m.hints.find(h => h.type === 'size' && h.id === o.id);
        size = leafSize(o, hint?.type === 'size' ? hint : undefined);
      }
      const item = { ...o, w: round(size.w), h: round(size.h) };
      items.set(o.id, item);
      return item;
    });
    const pairs = m.edges
      .map(e => [immediate(e.source, scope), immediate(e.target, scope)] as const)
      .filter((p): p is [string, string] => !!p[0] && !!p[1] && p[0] !== p[1]);
    const base = baseLayout(list, layout, pairs),
      pos = refine(list, base.positions, m.hints, scope, diagnostics, base.axis);
    for (const n of list) {
      local.set(n.id, pos.get(n.id)!);
      bases.set(n.id, base.positions.get(n.id)!);
    }
    return {
      w: list.length ? Math.max(...list.map(n => pos.get(n.id)!.x + n.w)) : 0,
      h: list.length ? Math.max(...list.map(n => pos.get(n.id)!.y + n.h)) : 0,
    };
  }
  arrange('root');

  const objects: SceneObject[] = [];
  const place = (scope: string, origin: Pos, depth: number) => {
    for (const o of children.get(scope) ?? []) {
      const item = items.get(o.id)!,
        l = local.get(o.id)!,
        b = bases.get(o.id)!;
      const box: SceneObject = {
        ...o,
        x: origin.x + l.x,
        y: origin.y + l.y,
        w: item.w,
        h: item.h,
        localX: l.x,
        localY: l.y,
        baseX: round(b.x),
        baseY: round(b.y),
        depth,
      };
      objects.push(box);
      if (o.type === 'group') place(o.id, contentOrigin(box), depth + 1);
    }
  };
  place('root', { x: 0, y: 0 }, 0);
  // Report groups that are larger than their requested size because of their content.
  for (const l of m.layouts) {
    const g = objects.find(o => o.id === l.scope);
    if (!g || (!l.minWidth && !l.minHeight)) continue;
    if ((l.minWidth && g.w > l.minWidth + 0.5) || (l.minHeight && g.h > l.minHeight + 0.5))
      diagnostics.push({
        level: 'info',
        code: 'group-grew',
        message: `${g.id} needs at least ${g.w}×${g.h} for its contents.`,
        line: l.line,
        ids: [g.id],
      });
  }
  // Keep declaration order so output is stable regardless of the arrangement order.
  const index = new Map(m.objects.map((o, i) => [o.id, i]));
  objects.sort((a, b) => index.get(a.id)! - index.get(b.id)!);
  return {
    model: m,
    title: m.title,
    objects,
    byId: new Map(objects.map(o => [o.id, o])),
    edges: m.edges,
    diagnostics,
  };
}
