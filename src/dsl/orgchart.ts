/**
 * Org charts: `layout <scope> orgchart root=<id>`. The file holds plain nodes and edges; this pass
 * reads the reporting tree out of them, places it top down, and plans each reporting line as part
 * of one bus per manager.
 *
 * - A reporting line is a plain edge (no label, `kind=`, ends or message) between two people in the
 *   scope, reached from the root by following edges forward. It draws with no head.
 * - Every other edge between two people (a dotted-line report, say) draws as written and places
 *   nothing. A person the tree misses sits in a row below the chart.
 * - `role=assistant` on a report with no reports of its own hangs it beside its manager's stem,
 *   above the other reports. `role=vacant` draws a person dashed and muted, in any layout.
 * - A manager whose reports are all leaves may stack them in a column right of the stem
 *   (`leaves=stack`), or in two columns either side of it (`leaves=split`). `leaves=auto` keeps
 *   rows until the drawing is wider than `fit=` asks for (2:1 without it), then stacks the widest
 *   rows first.
 */
import {
  FITS,
  layoutParent,
  type Fit,
  type Model,
  type ModelObject,
  type OrgLeaves,
} from './syntax';
import type { Planned } from './corridors';
import type { Diagram } from '../model/types';

/** Space between sibling blocks, between levels, between stacked leaves, and stem to column. */
const GAP = 24,
  RANK = 56,
  STACK = 12,
  INDENT = 20;

/** The detail line a vacant role draws when its label has none. */
const OPEN_ROLE = 'Open role';

/**
 * A copy of `m` with what its org charts draw: reporting lines with no head, dotted lines that
 * place nothing, and vacant roles as dashed cards. The parsed model stays as written, so compare,
 * edits and the Editor see only the source.
 */
export function withOrgcharts(m: Model): Model {
  const charts = m.layouts.filter(l => l.orgchart);
  if (!charts.length && !m.objects.some(o => o.role === 'vacant')) return m;
  const out = {
    ...m,
    objects: m.objects.map(o =>
      o.role === 'vacant'
        ? {
            ...o,
            card: true as const,
            label: o.label.includes('\n') ? o.label : `${o.label}\n${OPEN_ROLE}`,
          }
        : { ...o },
    ),
    edges: m.edges.map(e => ({ ...e })),
  };
  const by = new Map(out.objects.map(o => [o.id, o]));
  for (const l of charts) {
    const inside = (id: string) => layoutParent(by, id) === l.scope;
    const { tree } = reportingTree(out, inside, l.orgchart!.root);
    const pairs = new Set([...tree].map(e => `${e.source}\0${e.target}`));
    for (const e of out.edges) {
      // An edge that repeats a reporting line's two ends is one too, as when compare holds an
      // edge under its old and new ID.
      if (tree.has(e) || (plainEdge(e) && pairs.has(`${e.source}\0${e.target}`))) e.branch = true;
      else if (inside(e.source) && inside(e.target)) e.constraint = false;
    }
  }
  return out;
}

const plainEdge = (e: Model['edges'][number]) =>
  !e.label && !e.styled && !e.message && e.constraint !== false;

/** The reporting lines reached from `root`, breadth first, and each manager's reports in order. */
function reportingTree(m: Model, inside: (id: string) => boolean, root: string) {
  const out = new Map<string, Model['edges']>();
  for (const e of m.edges)
    if (plainEdge(e) && inside(e.source) && inside(e.target))
      out.set(e.source, [...(out.get(e.source) ?? []), e]);
  const kids = new Map<string, string[]>(),
    tree = new Set<Model['edges'][number]>(),
    seen = new Set([root]);
  for (const q = [root]; q.length;) {
    const id = q.shift()!;
    for (const e of out.get(id) ?? [])
      if (!seen.has(e.target)) {
        seen.add(e.target);
        tree.add(e);
        kids.set(id, [...(kids.get(id) ?? []), e.target]);
        q.push(e.target);
      }
  }
  return { kids, tree, seen };
}

type Box = { id: string; x: number; y: number; w: number; h: number };
type Mode = 'row' | 'stack' | 'split';

/**
 * Place an org chart's people top down. `scope` and `root` are ids in `doc`; an unset scope is the
 * whole drawing. `assistants` are ids in `doc` with `role=assistant`. Reporting lines are the
 * edges marked `branch`.
 */
export function arrangeOrgchart(
  doc: Diagram,
  scope: string | undefined,
  root: string,
  leaves: OrgLeaves,
  fit: Fit | undefined,
  assistants: Set<string>,
): Diagram {
  const parent = new Map(
      [...doc.graph.nodes, ...doc.graph.groups].map(o => [o.id, o.parentId || undefined]),
    ),
    items: Box[] = [...parent.keys()]
      .filter(id => parent.get(id) === scope)
      .map(id => ({ id, ...doc.layout.nodes[id] })),
    by = new Map(items.map(p => [p.id, p]));
  if (!by.has(root)) return doc;
  const kids = new Map<string, string[]>(),
    seen = new Set([root]);
  // Breadth first, so a person hangs off the nearest route from the top.
  const out = new Map<string, string[]>();
  for (const e of doc.graph.edges)
    if (e.branch && by.has(e.from) && by.has(e.to))
      out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  for (const q = [root]; q.length;) {
    const id = q.shift()!;
    for (const k of out.get(id) ?? [])
      if (!seen.has(k)) {
        seen.add(k);
        kids.set(id, [...(kids.get(id) ?? []), k]);
        q.push(k);
      }
  }
  const reports = (id: string) => kids.get(id) ?? [],
    aside = (id: string) => assistants.has(id) && !reports(id).length,
    side = (id: string) => reports(id).filter(aside),
    below = (id: string) => reports(id).filter(k => !aside(k));
  // Managers whose reports are all leaves, with what each may become.
  const leafy = [...kids.keys()].filter(
    id => below(id).length >= 2 && below(id).every(k => !reports(k).length),
  );
  const compact = (id: string): Mode =>
    below(id).length >= 4 || (leaves === 'split' && below(id).length >= 3) ? 'split' : 'stack';
  const modes = new Map<string, Mode>();
  if (leaves === 'stack' || leaves === 'split')
    for (const id of leafy)
      modes.set(id, leaves === 'stack' ? 'stack' : below(id).length >= 3 ? 'split' : 'row');
  let at = place(root, by, below, side, modes);
  if (leaves === 'auto') {
    // Stack the widest rows of leaves first, while that brings the shape nearer the target.
    const target = fit ? FITS[fit] : FITS.wide,
      off = (a: Map<string, Box>) => Math.abs(Math.log(aspect([...a.values()]) / target)),
      width = (id: string) => below(id).reduce((n, k) => n + by.get(k)!.w + GAP, -GAP);
    for (const id of [...leafy].sort((a, b) => width(b) - width(a))) {
      if (aspect([...at.values()]) <= target) break;
      const next = place(root, by, below, side, new Map([...modes, [id, compact(id)]]));
      if (off(next) >= off(at)) continue;
      modes.set(id, compact(id));
      at = next;
    }
  }
  // A person the tree misses sits in a row below the chart.
  const rest = items.filter(p => !at.has(p.id));
  if (rest.length) {
    const placed = [...at.values()],
      top = Math.max(...placed.map(p => p.y + p.h)) + RANK;
    let x = Math.min(...placed.map(p => p.x));
    for (const p of rest) {
      at.set(p.id, { ...p, x, y: top });
      x += p.w + GAP;
    }
  }
  // Move each member, and everything inside a group member with it.
  const owner = (id: string | undefined): string | undefined =>
    id === undefined || by.has(id) ? id : owner(parent.get(id));
  const nodes = { ...doc.layout.nodes };
  for (const p of items) {
    const c = at.get(p.id)!,
      dx = c.x - p.x,
      dy = c.y - p.y;
    for (const id of parent.keys())
      if (owner(id) === p.id)
        nodes[id] = { ...nodes[id], x: nodes[id].x + dx, y: nodes[id].y + dy };
  }
  return { ...doc, layout: { ...doc.layout, nodes } };
}

const aspect = (bs: Box[]) =>
  (Math.max(...bs.map(b => b.x + b.w)) - Math.min(...bs.map(b => b.x))) /
  (Math.max(...bs.map(b => b.y + b.h)) - Math.min(...bs.map(b => b.y)));

/**
 * One placement of the tree with the given leaf modes. People in rows keep their level: every
 * row at one depth shares a top, below the tallest box and the deepest assistants above it.
 */
function place(
  root: string,
  by: Map<string, Box>,
  below: (id: string) => string[],
  side: (id: string) => string[],
  modes: Map<string, Mode>,
): Map<string, Box> {
  const mode = (id: string) => modes.get(id) ?? 'row';
  // Depth of each person placed in a row, and the room each depth needs.
  const depth = new Map<string, number>(),
    tall: number[] = [],
    aides: number[] = [];
  const walk = (id: string, d: number) => {
    depth.set(id, d);
    tall[d] = Math.max(tall[d] ?? 0, by.get(id)!.h);
    const a = side(id);
    if (a.length) aides[d] = Math.max(aides[d] ?? 0, columnHeight(pairs(a), by) + RANK / 2);
    if (mode(id) === 'row') for (const k of below(id)) walk(k, d + 1);
    // A column of leaves starts on the next level, even when no row sits there.
    else tall[d + 1] ??= 0;
  };
  walk(root, 0);
  const tops = [0];
  for (let d = 1; d < tall.length; d++)
    tops[d] = tops[d - 1] + tall[d - 1] + RANK + (aides[d - 1] ?? 0);
  // Centers across, relative to each manager's center, and each block's extent.
  const rel = new Map<string, { x: number; y: number }>();
  function block(id: string): { lo: number; hi: number } {
    const b = by.get(id)!,
      d = depth.get(id)!,
      floor = tops[d] + tall[d];
    let lo = -b.w / 2,
      hi = b.w / 2;
    // Assistants beside the stem: right, then left, a row at a time.
    let y = floor + RANK / 2;
    for (const row of pairs(side(id))) {
      row.forEach((k, i) => {
        const w = by.get(k)!.w,
          x = i ? -(INDENT + w / 2) : INDENT + w / 2;
        rel.set(k, { x, y });
        lo = Math.min(lo, x - w / 2);
        hi = Math.max(hi, x + w / 2);
      });
      y += Math.max(...row.map(k => by.get(k)!.h)) + STACK;
    }
    const ks = below(id),
      first = tops[d + 1];
    if (mode(id) !== 'row') {
      const rows = mode(id) === 'stack' ? ks.map(k => [k]) : pairs(ks);
      let y = first;
      for (const row of rows) {
        row.forEach((k, i) => {
          const w = by.get(k)!.w,
            x = i ? -(INDENT + w / 2) : INDENT + w / 2;
          rel.set(k, { x, y });
          lo = Math.min(lo, x - w / 2);
          hi = Math.max(hi, x + w / 2);
        });
        y += Math.max(...row.map(k => by.get(k)!.h)) + STACK;
      }
      return { lo, hi };
    }
    if (!ks.length) return { lo, hi };
    // Reports side by side, centered under the manager between the first and last.
    const spans = ks.map(block),
      xs: number[] = [];
    let x = 0;
    ks.forEach((_, i) => {
      if (i) x += spans[i - 1].hi + GAP - spans[i].lo;
      xs.push(x);
    });
    const shift = -(xs[0] + xs.at(-1)!) / 2;
    ks.forEach((k, i) => {
      rel.set(k, { x: xs[i] + shift, y: first });
      lo = Math.min(lo, xs[i] + shift + spans[i].lo);
      hi = Math.max(hi, xs[i] + shift + spans[i].hi);
    });
    return { lo, hi };
  }
  block(root);
  const at = new Map<string, Box>();
  const put = (id: string, cx: number) => {
    const b = by.get(id)!,
      y = id === root ? 0 : rel.get(id)!.y;
    at.set(id, { ...b, x: cx - b.w / 2, y });
    for (const k of [...side(id), ...below(id)]) put(k, cx + rel.get(k)!.x);
  };
  put(root, 0);
  return at;
}

/** People two to a row, right of the stem then left, in order. */
function pairs(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += 2) out.push(ids.slice(i, i + 2));
  return out;
}

/** The height of rows of people, `STACK` apart. */
const columnHeight = (rows: string[][], by: Map<string, Box>) =>
  rows.reduce((n, row) => n + Math.max(...row.map(k => by.get(k)!.h)) + STACK, -STACK);

/**
 * Reporting lines as planned routes on the final boxes: a stem down from each manager's middle,
 * one bar for a row of reports and a drop to each, or a short run off the stem into the near side
 * of an assistant or a stacked leaf. The router keeps a plan that clears every box.
 */
export function orgPlans(m: Model, boxes: Array<Box & Pick<ModelObject, 'role'>>) {
  const plans = new Map<string, Planned>(),
    at = new Map(boxes.map(b => [b.id, b])),
    by = new Map(m.objects.map(o => [o.id, o]));
  for (const l of m.layouts) {
    if (!l.orgchart) continue;
    const inside = (id: string) => layoutParent(by, id) === l.scope,
      lines = m.edges.filter(e => e.branch && inside(e.source) && inside(e.target)),
      reports = new Map<string, typeof lines>();
    for (const e of lines) reports.set(e.source, [...(reports.get(e.source) ?? []), e]);
    for (const [boss, es] of reports) {
      const b = at.get(boss);
      if (!b) continue;
      const stem = b.x + b.w / 2,
        foot = b.y + b.h,
        kids = es.filter(e => at.has(e.target)),
        box = (e: (typeof lines)[number]) => at.get(e.target)!;
      // An assistant with no reports of its own hangs off the stem; the rest share one bar,
      // unless they are leaves stacked a row at a time, each fed from the stem's side.
      const aides = kids.filter(
          e => by.get(e.target)?.role === 'assistant' && !reports.has(e.target),
        ),
        rows = kids.filter(e => !aides.includes(e)),
        stacked = new Set(rows.map(e => Math.round(box(e).y))).size > 1,
        over = Math.max(foot, ...aides.map(e => box(e).y + box(e).h)),
        bar = (over + Math.min(...rows.map(e => box(e).y))) / 2;
      for (const e of kids) {
        const r = at.get(e.target)!,
          mid = r.x + r.w / 2;
        let points;
        if (aides.includes(e) || stacked) {
          const y = r.y + r.h / 2,
            x = mid > stem ? r.x : r.x + r.w;
          points = [
            { x: stem, y: foot },
            { x: stem, y },
            { x, y },
          ];
        } else if (Math.abs(mid - stem) < 0.5)
          points = [
            { x: stem, y: foot },
            { x: stem, y: r.y },
          ];
        else
          points = [
            { x: stem, y: foot },
            { x: stem, y: bar },
            { x: mid, y: bar },
            { x: mid, y: r.y },
          ];
        plans.set(e.id, {
          points: points.map(p => ({ x: hundredths(p.x), y: hundredths(p.y) })),
          fromOffset: 0,
          toOffset: 0,
        });
      }
    }
  }
  return plans;
}

const hundredths = (n: number) => Math.round(n * 100) / 100;
