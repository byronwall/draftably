/**
 * Compile a `.draft` model into geometry. Adapted from Meld 0.1's layout and refinement pass.
 *
 * Geometry is a pure function of the source and one fixed render context: no DOM measurement,
 * randomness, clocks or previous output. The browser and the CLI therefore agree exactly.
 *
 * A scope whose `layout` names an engine is arranged by the editor's layout engine, run cold
 * (`rebuild` without a warm start). A cold rebuild depends only on structure and sizes, never on
 * starting positions, so it is as repeatable as the built-in recipes. Refinements then apply on
 * top of the engine's arrangement exactly as they do on top of `flow`.
 */
import { LayoutLab } from '../engines/layout-engine.js';
import { DEFAULT_THEME, resolveAppearance, type ResolvedAppearance } from '../model/appearance';
import { measureText, widestPiece } from '../model/fonts';
import { edgeLabelSize, titleArea, titleHeight, wrapTitle } from '../model/labels';
import { defaultShapeSize } from '../model/styles';
import type { Direction, Lane } from '../model/types';
import { RouteLab } from '../engines/routing-engine.js';
import { routeInput } from '../model/routes';
import { planChannels, trimChannels, usedChannels, type Channel } from './channels';
import { returnLanes, type FlowScope } from './lanes';
import { GROUP_HEADER, GROUP_INSET, GROUP_TITLE_CHROME, contentOrigin } from './frame';
import { projectScene, visibleRects } from './project';
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
export { GROUP_HEADER, GROUP_INSET, contentOrigin };
const MIN_GAP = 12;
/** Size of a group with nothing in it yet; groups with content fit it exactly. */
const EMPTY_GROUP = { w: 260, h: 110 };

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

/** A connection as the file declares it, plus the lane a fold's wrap edge returns along. */
export interface SceneEdge extends ModelEdge {
  lane?: Lane;
}

export interface Scene {
  model: Model;
  title: string;
  objects: SceneObject[];
  byId: Map<string, SceneObject>;
  edges: SceneEdge[];
  diagnostics: Diagnostic[];
  /** The file's resolved appearance: the spacing and type every size above was computed with. */
  look: ResolvedAppearance;
}

type Item = ModelObject & { w: number; h: number };
type Size = { w: number; h: number };

/** Space between two boxes: the larger of their gaps across either axis (negative if they overlap). */
const clearance = (a: Size & Pos, b: Size & Pos) =>
  Math.max(b.x - a.x - a.w, a.x - b.x - b.w, b.y - a.y - a.h, a.y - b.y - b.h);
type Pos = { x: number; y: number };

const round = (n: number) => Math.round(n);

export async function compile(source: string): Promise<Scene> {
  const m = parseModel(source);
  return layoutModel(m, await engineArrangement(m));
}

/**
 * Check source synchronously: every error `compile` can report, without running layout engines
 * (they never add errors). Engine-governed scopes keep their built-in recipe in the result.
 */
export function checkSource(source: string): Scene {
  return layoutModel(parseModel(source));
}

/** The reading direction a scope's layout asks for, resolved against the render context. */
function axisOf(layout: ModelLayout): 'right' | 'down' {
  if (layout.direction !== 'auto') return layout.direction;
  const { width, height } = RENDER_CONTEXT;
  return width >= 700 && width / height > 1.12 ? 'right' : 'down';
}

/** The explicit layout line that arranges a scope: its own, or the nearest engine above it. */
function governingLayout(m: Model, scope: string): ModelLayout | undefined {
  const parent = new Map(m.objects.map(o => [o.id, o.parent]));
  for (let s: string | undefined = scope; s; s = s === 'root' ? undefined : parent.get(s)) {
    const l = m.layouts.find(x => x.scope === s);
    if (l) return s === scope || l.engine ? l : undefined;
  }
  return undefined;
}

/**
 * World positions from the layout engines named in the file, outermost scope first. The engines
 * start from the built-in recipes with sizes but no position refinements.
 */
async function engineArrangement(m: Model): Promise<Map<string, Pos> | undefined> {
  const engines = m.layouts.filter(l => l.engine);
  if (!engines.length) return undefined;
  const depth = (scope: string) => {
    let d = 0;
    for (
      let o = m.objects.find(x => x.id === scope);
      o;
      o = m.objects.find(x => x.id === o!.parent)
    )
      d++;
    return d;
  };
  engines.sort((a, b) => depth(a.scope) - depth(b.scope));
  // The engines arrange slots (see `layoutModel`), so a theme switch hands them the same boxes.
  const plain = layoutModel(
    {
      ...m,
      hints: m.hints.filter(h => h.type === 'size' || h.type === 'order'),
    },
    undefined,
    true,
  );
  let doc = projectScene(plain);
  for (const l of engines) {
    const settings = LayoutLab.settings({
      ...doc.settings,
      algorithm: l.engine!.algorithm,
      direction: (axisOf(l) === 'right' ? 'RIGHT' : 'DOWN') as Direction,
      ...l.engine!.params,
      // The compiler sizes groups to their content afterwards, so frames never constrain it.
      growContainers: true,
    });
    const result = await LayoutLab.compute(doc, {
      ...settings,
      mode: 'rebuild',
      warmStart: false,
      settle: true,
      maxIterations: ENGINE_ITERATIONS,
      scope: l.scope === 'root' ? 'all' : 'container',
      ...(l.scope === 'root' ? {} : { containerId: l.scope }),
      viewport: { w: RENDER_CONTEXT.width, h: RENDER_CONTEXT.height },
    });
    doc = result.document;
  }
  return new Map(Object.entries(doc.layout.nodes).map(([id, r]) => [id, { x: r.x, y: r.y }]));
}

/** Solver budget for engine recipes; the same budget Compare and the timeline use. */
export const ENGINE_ITERATIONS = 640;

/** Line left showing on each side of an edge label, so the label reads as part of its edge. */
const LABEL_RUN = 14;

/** A labelled edge between two siblings, with the room its label needs across and down a gap. */
interface LabelRoom {
  a: string;
  b: string;
  w: number;
  h: number;
}

function labelRoom(a: string, b: string, label: string, look: ResolvedAppearance): LabelRoom {
  const size = edgeLabelSize(label, look);
  return { a, b, w: size.w + 2 * LABEL_RUN, h: size.h + 2 * LABEL_RUN };
}

/** Gap between two siblings: `gap`, or more when a labelled edge between them needs it. */
function roomBetween(rooms: LabelRoom[], a: string, b: string, gap: number, across: boolean) {
  let room = gap;
  for (const r of rooms)
    if ((r.a === a && r.b === b) || (r.a === b && r.b === a))
      room = Math.max(room, across ? r.w : r.h);
  return room;
}

export function layoutFor(m: Model, scope: string): ModelLayout {
  return (
    m.layouts.find(l => l.scope === scope) ?? {
      scope,
      algorithm: scope === 'root' ? 'flow' : 'column',
      direction: 'auto',
      fold: 'auto',
      gap: scope === 'root' ? 48 : 24,
      minWidth: 0,
      minHeight: 0,
      line: 0,
    }
  );
}

/** A default-sized node grows at most this much wider so its longest word piece fits whole. */
const MAX_GROW = 2;

/**
 * Width of a node with no requested size: the shape's default, or wider (in 4px steps, up to
 * `MAX_GROW` times) when a word piece of its title would otherwise break by character, as
 * `Maintenanceverificationreport` or `installed?` in a diamond would.
 */
function fitWidth(o: ModelObject, base: { w: number; h: number }, look: ResolvedAppearance) {
  const need = widestPiece(o.label, look.title);
  let w = base.w;
  while (titleArea(o.shape, w, base.h, look).width < need && w < base.w * MAX_GROW) w += 4;
  return Math.min(w, base.w * MAX_GROW);
}

/**
 * Size of a node: its requested size, or the default width with a height that fits the title in
 * the theme's type and padding. A requested size is kept exactly; `overflow` reports a title that
 * no longer fits in it.
 */
export function leafSize(
  o: ModelObject,
  size: { width: number; height: number } | undefined,
  look: ResolvedAppearance,
) {
  const base = defaultShapeSize(o.shape);
  const w = size?.width ?? fitWidth(o, base, look);
  const area = titleArea(o.shape, w, size?.height ?? base.h, look),
    lines = wrapTitle(o.label, area.width, look).length;
  if (size)
    return { w, h: size.height, overflow: lines * look.title.lineHeight > area.maxHeight + 0.5 };
  return {
    w,
    h: titleHeight(
      o.shape,
      lines,
      o.shape === 'circle' || o.shape === 'diamond' ? base.h : 0,
      look,
    ),
    overflow: false,
  };
}

/**
 * Longest-path ranks, in declaration order. Cycles are broken first: a depth-first walk from the
 * sources (then any node not yet reached), in declaration order, sets aside each edge that returns
 * to a node still on the walk. A loop therefore keeps its path along the reading direction and
 * only its return edge runs backwards.
 */
export function rankLayers(ids: string[], pairs: Array<[string, string]>): string[][] {
  const adj = new Map(ids.map(id => [id, [] as string[]]));
  for (const [a, b] of pairs)
    if (a !== b && adj.has(a) && adj.has(b) && !adj.get(a)!.includes(b)) adj.get(a)!.push(b);
  const targets = new Set([...adj.values()].flat()),
    state = new Map<string, 'open' | 'done'>(),
    back = new Set<string>();
  const visit = (v: string) => {
    state.set(v, 'open');
    for (const w of adj.get(v)!)
      if (state.get(w) === 'open') back.add(v + '\0' + w);
      else if (!state.has(w)) visit(w);
    state.set(v, 'done');
  };
  for (const id of [...ids.filter(id => !targets.has(id)), ...ids]) if (!state.has(id)) visit(id);
  const indegree = new Map(ids.map(id => [id, 0])),
    rank = new Map(ids.map(id => [id, 0]));
  const forward = (v: string) => adj.get(v)!.filter(w => !back.has(v + '\0' + w));
  for (const id of ids) for (const w of forward(id)) indegree.set(w, indegree.get(w)! + 1);
  const queue = ids.filter(id => !indegree.get(id));
  while (queue.length) {
    const a = queue.shift()!;
    for (const b of forward(a)) {
      rank.set(b, Math.max(rank.get(b)!, rank.get(a)! + 1));
      indegree.set(b, indegree.get(b)! - 1);
      if (!indegree.get(b)) queue.push(b);
    }
  }
  const layers: string[][] = [];
  for (const id of ids) (layers[rank.get(id)!] ||= []).push(id);
  return layers.filter(Boolean);
}

/** A long run folds once it is this many times longer than it is deep. */
const FOLD_ASPECT = 3;
/** How far past fitting a relabelled fold may grow before it takes another band. */
const HOLD_SLACK = 1.25;

/** Space between the lanes that a fold's wrap edges return along. */
const LANE_PITCH = 20;

/** What a cut costs, in crossing edges, for each decision or loop it splits. */
const SPLIT_DECISION = 3,
  SPLIT_LOOP = 2;

/** A folded run: each band's ids in reading order, and the axis the bands read along. */
export interface Fold {
  bands: string[][];
  axis: 'right' | 'down';
}

/** Sets of two or more ids that reach one another: the loops a fold should not split. */
function loops(ids: string[], pairs: Array<[string, string]>): string[][] {
  const adj = new Map(ids.map(id => [id, [] as string[]]));
  for (const [a, b] of pairs) adj.get(a)?.push(b);
  const reach = (from: string) => {
    const seen = new Set([from]),
      queue = [from];
    while (queue.length)
      for (const w of adj.get(queue.shift()!) ?? [])
        if (!seen.has(w)) {
          seen.add(w);
          queue.push(w);
        }
    return seen;
  };
  const reaches = new Map(ids.map(id => [id, reach(id)])),
    out: string[][] = [],
    taken = new Set<string>();
  for (const id of ids) {
    if (taken.has(id)) continue;
    const loop = ids.filter(o => reaches.get(id)!.has(o) && reaches.get(o)!.has(id));
    loop.forEach(o => taken.add(o));
    if (loop.length > 1) out.push(loop);
  }
  return out;
}

/**
 * Fold a long run of ranks into bands, like lines of text: each band starts again at the
 * beginning of the reading direction, and the bands stack across it. A run that is longer than
 * the render context and more than `FOLD_ASPECT` times its depth is cut only between ranks (where
 * no box spans the cut), into the fewest bands that bring it within both. Within a quarter of an
 * even share, a cut is chosen for the fewest edges across it, keeping each decision with its
 * branches and each loop whole, before an exact balance. Other runs are returned unchanged.
 *
 * `plan` is the same run laid out without its edge labels. Whether to fold, how many bands and
 * where to cut are decided on it, so relabelling an edge never adds a band or moves a cut: the
 * labels only widen the gaps they need inside their own band.
 */
export function foldRanks(
  items: Array<{ id: string; w: number; h: number }>,
  positions: Map<string, Pos>,
  axis: 'right' | 'down',
  gap: number,
  pairs: Array<[string, string]>,
  rooms: LabelRoom[] = [],
  decisions: Set<string> = new Set(),
  plan: Map<string, Pos> = positions,
): { positions: Map<string, Pos>; fold?: Fold } {
  const byId = new Map(items.map(n => [n.id, n]));
  const along = axis === 'right' ? 'x' : 'y',
    across = axis === 'right' ? 'y' : 'x';
  const size = (n: { w: number; h: number }, a: 'x' | 'y') => (a === 'x' ? n.w : n.h);
  // Blocks of ranks that overlap along the reading direction; bands are cut only between blocks.
  const blocksOf = (at: Map<string, Pos>) => {
    const sorted = [...items].sort((a, b) => at.get(a.id)![along] - at.get(b.id)![along]);
    const out: Array<{ start: number; end: number; ids: string[] }> = [];
    for (const n of sorted) {
      const start = at.get(n.id)![along],
        end = start + size(n, along),
        last = out[out.length - 1];
      if (last && start < last.end) {
        last.end = Math.max(last.end, end);
        last.ids.push(n.id);
      } else out.push({ start, end, ids: [n.id] });
    }
    return out;
  };
  const blocks = blocksOf(positions);
  let planned = blocksOf(plan);
  // Label room only widens gaps between ranks, so both have the same blocks; if not, plan on the
  // labelled run.
  const key = (bs: typeof blocks) => bs.map(b => [...b.ids].sort().join(',')).join('|');
  if (key(planned) !== key(blocks)) {
    plan = positions;
    planned = blocks;
  }
  const span = (at: Map<string, Pos>, a: 'x' | 'y') => {
    const lo = Math.min(...items.map(n => at.get(n.id)![a])),
      hi = Math.max(...items.map(n => at.get(n.id)![a] + size(n, a)));
    return hi - lo;
  };
  const room = axis === 'right' ? RENDER_CONTEXT.width : RENDER_CONTEXT.height,
    fits = (length: number, depth: number, slack = 1) =>
      length <= room * slack || length <= FOLD_ASPECT * depth * slack;
  const unfolded = (at: Map<string, Pos>) => fits(span(at, along), span(at, across));
  if (items.length < 4 || (unfolded(plan) && unfolded(positions))) return { positions };
  const block = new Map(blocks.flatMap((b, i) => b.ids.map(id => [id, i] as const)));
  const splits = (cut: number, a: string, b: string) => {
    const [i, j] = [block.get(a), block.get(b)];
    return i !== undefined && j !== undefined && Math.min(i, j) < cut && Math.max(i, j) >= cut;
  };
  const crossing = (cut: number) => pairs.filter(([a, b]) => splits(cut, a, b)).length;
  const cycles = loops(
    items.map(n => n.id),
    pairs,
  );
  // A cut between a decision and any of its branches, or through a loop, reads as a broken line.
  const broken = (cut: number) =>
    SPLIT_DECISION *
      [...decisions].filter(d => pairs.some(p => p[0] === d && splits(cut, ...p))).length +
    SPLIT_LOOP * cycles.filter(l => l.some(id => splits(cut, l[0], id))).length;
  // Wrap edges return along lanes in the gap between bands, so it fits a lane for each edge
  // across the cut and the labels on them.
  const bandGap = (cut: number, labelled: boolean) => {
    const labels = (labelled ? rooms : [])
      .filter(r => splits(cut, r.a, r.b))
      .map(r => (axis === 'right' ? r.h : r.w) - 2 * LABEL_RUN);
    return Math.max(
      gap + 40,
      84,
      labels.length ? Math.max(...labels) + 2 * LABEL_RUN : 0,
      (crossing(cut) + 1) * LANE_PITCH + labels.reduce((sum, h) => sum + h, 0),
    );
  };
  // Cut near each equal share of the length; among nearby cuts, prefer one that fewer edges
  // cross and that splits no decision or loop.
  const chooseCuts = (count: number, bs: typeof blocks) => {
    const total = bs[bs.length - 1].end - bs[0].start;
    const cuts: number[] = [];
    for (let i = 1; i < count; i++) {
      const at = bs[0].start + (total * i) / count,
        cost = (b: number) =>
          crossing(b) + broken(b) + (Math.abs(bs[b].start - at) / (total / count)) * 2;
      // Keep each band within a quarter of an even share (and at least half of one), so a cheap
      // lopsided cut can't win; or up to half over, at any length, when that is the only way to
      // keep decisions and loops whole. A band's length is its boxes, not the gap after them.
      const from = bs[cuts.at(-1) ?? 0].start,
        share = total / count,
        even = (b: number, slack: number, floor: number) =>
          bs[b - 1].end - from >= share * floor &&
          bs[b - 1].end - from <= share * (1 + slack) &&
          bs[bs.length - 1].end - bs[b].start <= share * (count - i) * (1 + slack);
      const tier = (b: number) =>
        !broken(b) && even(b, 0.25, 0.5)
          ? 0
          : !broken(b) && even(b, 0.5, 0)
            ? 1
            : even(b, 0.25, 0.5)
              ? 2
              : 3;
      let best = 0;
      for (let b = (cuts.at(-1) ?? 0) + 1; b < bs.length; b++)
        if (!best || tier(b) < tier(best) || (tier(b) === tier(best) && cost(b) < cost(best)))
          best = b;
      if (best) cuts.push(best);
    }
    return cuts;
  };
  // A side leaf (a node with no way out that shares its rank with another) deepens its band
  // without lengthening the run. Bands are measured without them when deciding how many to cut,
  // so adding an error exit or a note beside a step keeps the fold's bands and cuts.
  const sideLeaves = new Set(
    blocks.flatMap(b =>
      b.ids.length > 1 ? b.ids.filter(id => !pairs.some(([a, z]) => a === id && z !== id)) : [],
    ),
  );
  const place = (cuts: number[], bs: typeof blocks, at: Map<string, Pos>, labelled: boolean) => {
    const bands: (typeof blocks)[] = [];
    bs.forEach((b, i) => (i === 0 || cuts.includes(i) ? bands.push([b]) : bands.at(-1)!.push(b)));
    const out = new Map<string, Pos>();
    let offset = 0,
      length = 0,
      typical = 0;
    for (const [k, band] of bands.entries()) {
      const ids = band.flatMap(b => b.ids),
        lo = Math.min(...ids.map(id => at.get(id)![across])),
        hi = Math.max(...ids.map(id => at.get(id)![across] + size(byId.get(id)!, across)));
      for (const id of ids) {
        const p = at.get(id)!,
          a = p[along] - band[0].start,
          c = p[across] - lo + offset;
        out.set(id, axis === 'right' ? { x: a, y: c } : { x: c, y: a });
      }
      const gapAfter = k < cuts.length ? bandGap(cuts[k], labelled) : 0,
        main = ids.filter(id => !sideLeaves.has(id)),
        kept = main.length ? main : ids;
      offset += hi - lo + gapAfter;
      typical +=
        Math.max(...kept.map(id => at.get(id)![across] + size(byId.get(id)!, across))) -
        Math.min(...kept.map(id => at.get(id)![across])) +
        gapAfter;
      length = Math.max(length, band.at(-1)!.end - band[0].start);
    }
    return {
      out,
      length,
      // The depth that decides the count leaves side leaves out.
      depth: typical,
      count: bands.length,
      bands: bands.map(band => band.flatMap(b => b.ids)),
    };
  };
  // The fewest bands that fit: wide layouts read best. The plan sets the least count; the
  // labelled run keeps it while it stays within `HOLD_SLACK` of fitting, and takes another band
  // only when its labels no longer fit at all.
  let least = 0;
  if (!unfolded(plan))
    for (let count = 2; count <= blocks.length && !least; count++) {
      const c = place(chooseCuts(count, planned), planned, plan, false);
      if (c.count === count && fits(c.length, c.depth)) least = count;
    }
  for (let count = Math.max(2, least); count <= blocks.length; count++) {
    const cuts = chooseCuts(count, planned),
      c = place(cuts, blocks, positions, true);
    if (c.count === count && fits(c.length, c.depth, count === least ? HOLD_SLACK : 1))
      return { positions: c.out, fold: { bands: c.bands, axis } };
  }
  return { positions };
}

/**
 * Lanes for a fold's wrap edges. Each edge from one band into the next returns along its own line
 * in the gap between them: out of the band's end, back along the gap, into the next band. The
 * lanes share the gap at an even pitch, in the order where the returns cross least. A source with
 * a box between it and the gap leaves past the band's end; a target with one, or inside a group
 * (whose title is in the way), is entered from before the band's start. Such side turns are made
 * only at the end or start of a row. Edges with sides set in the file, or that would need a side
 * turn past a neighbour, get no lane.
 */
function wrapLanes(
  folds: Array<{ scope: string; fold: Fold }>,
  edges: ModelEdge[],
  byId: Map<string, SceneObject>,
  immediate: (id: string, scope: string) => string | undefined,
  portPitch: number,
): Map<string, Lane> {
  const out = new Map<string, Lane>();
  for (const { scope, fold } of folds) {
    // Bands read right and stack down, so their lanes are level; or read down and stack right.
    // Below, `u` runs along the bands and `v` across them.
    const level = fold.axis === 'right',
      lo = (o: SceneObject) => (level ? o.y : o.x),
      hi = (o: SceneObject) => (level ? o.y + o.h : o.x + o.w),
      start = (o: SceneObject) => (level ? o.x : o.y),
      end = (o: SceneObject) => (level ? o.x + o.w : o.y + o.h),
      mid = (o: SceneObject) => (start(o) + end(o)) / 2,
      middle = (o: SceneObject) => (lo(o) + hi(o)) / 2,
      overlap = (o: SceneObject, n: SceneObject) => start(o) < end(n) && end(o) > start(n);
    const band = new Map(fold.bands.flatMap((ids, k) => ids.map(id => [id, k] as const))),
      bandOf = (o: SceneObject) => band.get(immediate(o.id, scope) ?? '');
    const leaves = (k: number) =>
      [...byId.values()].filter(o => o.type !== 'group' && bandOf(o) === k);
    for (let k = 0; k + 1 < fold.bands.length; k++) {
      const here = fold.bands[k].map(id => byId.get(id)!),
        next = fold.bands[k + 1].map(id => byId.get(id)!),
        top = Math.max(...here.map(hi)),
        bottom = Math.min(...next.map(lo)),
        exit = Math.max(...here.map(end)) + LANE_PITCH,
        entry = Math.min(...next.map(start)) - LANE_PITCH;
      const [above, below] = [leaves(k), leaves(k + 1)];
      const wraps = edges.flatMap(e => {
        const source = byId.get(e.source)!,
          target = byId.get(e.target)!;
        if (bandOf(source) !== k || bandOf(target) !== k + 1) return [];
        if (e.from !== 'auto' || e.to !== 'auto') return [];
        const leave = above.some(o => lo(o) > lo(source) && overlap(o, source)),
          enter =
            immediate(e.target, scope) !== e.target ||
            below.some(o => lo(o) < lo(target) && overlap(o, target));
        // A side turn reads only from the end of a row or into its start; otherwise the line
        // would run past a neighbour, so the router draws the edge as it would any other.
        const row = (o: SceneObject, n: SceneObject) => lo(o) < hi(n) && hi(o) > lo(n);
        if (leave && above.some(o => row(o, source) && start(o) >= end(source))) return [];
        if (enter && below.some(o => row(o, target) && end(o) <= start(target))) return [];
        return [{ id: e.id, source, target, leave, enter }];
      });
      // Several wraps from one side of a source leave from ports the router spreads from the
      // middle outwards, nearest target first, leaning toward the targets. Their drops cross
      // the lanes unless the lanes follow the same order.
      const drop = new Map<string, number>();
      const bySource = new Map<string, typeof wraps>();
      for (const w of wraps)
        if (!w.leave) bySource.set(w.source.id, [...(bySource.get(w.source.id) ?? []), w]);
      for (const fan of bySource.values()) {
        const near = (w: (typeof wraps)[number]) =>
          Math.abs(mid(w.target) - mid(w.source)) + Math.abs(middle(w.target) - middle(w.source));
        fan.sort((a, b) => near(a) - near(b) || (a.id < b.id ? -1 : 1));
        fan.forEach((w, k) => {
          const lean = mid(w.target) < mid(w.source) ? -1 : 1,
            step = Math.ceil(k / 2) * portPitch * (k % 2 ? lean : -lean);
          drop.set(w.id, mid(w.source) + step);
        });
      }
      // A hint can pull the bands together; then there is no clear gap to share.
      if (!wraps.length || bottom - top < (wraps.length + 1) * LANE_PITCH) continue;
      // Turns outside the bands nest: the lane nearest the earlier band leaves closest to its
      // end and enters furthest before the next band's start.
      const assign = (order: typeof wraps) => {
        const leaving = order.filter(w => w.leave),
          entering = order.filter(w => w.enter);
        return order.map((w, i) => ({
          w,
          at: round(top + ((bottom - top) * (i + 1)) / (order.length + 1)),
          leave: w.leave ? round(exit + LANE_PITCH * leaving.indexOf(w)) : undefined,
          enter: w.enter
            ? round(entry - LANE_PITCH * (entering.length - 1 - entering.indexOf(w)))
            : undefined,
        }));
      };
      const paths = (order: typeof wraps) =>
        assign(order).map(({ w, at, leave, enter }) => [
          ...(leave !== undefined
            ? [
                { u: end(w.source), v: middle(w.source) },
                { u: leave, v: middle(w.source) },
                { u: leave, v: at },
              ]
            : [
                { u: drop.get(w.id)!, v: top },
                { u: drop.get(w.id)!, v: at },
              ]),
          ...(enter !== undefined
            ? [
                { u: enter, v: at },
                { u: enter, v: middle(w.target) },
                { u: start(w.target), v: middle(w.target) },
              ]
            : [
                { u: mid(w.target), v: at },
                { u: mid(w.target), v: bottom },
              ]),
        ]);
      const order = fewestCrossings(
        [...wraps].sort((a, b) => mid(b.source) - mid(a.source)),
        o => crossings(paths(o)),
      );
      for (const { w, at, leave, enter } of assign(order))
        out.set(w.id, {
          ...(level ? { y: at } : { x: at }),
          ...(leave !== undefined ? { leave } : {}),
          ...(enter !== undefined ? { enter } : {}),
        });
    }
  }
  return out;
}

/** How many times orthogonal paths, given as points along and across, cross one another. */
export function crossings(paths: Array<Array<{ u: number; v: number }>>) {
  const segments = paths.map(p => p.slice(1).map((q, i) => [p[i], q] as const));
  let n = 0;
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++)
      for (const [a, b] of segments[i])
        for (const [c, d] of segments[j]) {
          // One run along, the other across, each passing strictly through the other.
          const [h, x] =
            a.v === b.v && c.u === d.u
              ? [
                  [a, b],
                  [c, d],
                ]
              : c.v === d.v && a.u === b.u
                ? [
                    [c, d],
                    [a, b],
                  ]
                : [];
          if (!h || !x) continue;
          const u = x[0].u,
            v = h[0].v;
          if (
            u > Math.min(h[0].u, h[1].u) &&
            u < Math.max(h[0].u, h[1].u) &&
            v > Math.min(x[0].v, x[1].v) &&
            v < Math.max(x[0].v, x[1].v)
          )
            n++;
        }
  return n;
}

/** The order of up to six items that scores fewest crossings; the first such, from `items`. */
export function fewestCrossings<T>(items: T[], score: (order: T[]) => number): T[] {
  if (items.length > 6) return items;
  let best = items,
    fewest = score(items);
  const permute = (done: T[], left: T[]) => {
    if (!fewest) return;
    if (!left.length) {
      const n = score(done);
      if (n < fewest) [best, fewest] = [done, n];
      return;
    }
    left.forEach((w, i) => permute([...done, w], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  permute([], items);
  return best;
}

/** Siblings placed as the engine arranged them, shifted so the scope's content starts at 0,0. */
function fromEngine(
  items: Item[],
  arranged: Map<string, Pos>,
  axis: 'right' | 'down',
  rooms: LabelRoom[] = [],
) {
  const x0 = Math.min(...items.map(n => arranged.get(n.id)!.x)),
    y0 = Math.min(...items.map(n => arranged.get(n.id)!.y));
  const positions = new Map(
    items.map(n => {
      const p = arranged.get(n.id)!;
      return [n.id, { x: round(p.x - x0), y: round(p.y - y0) }] as const;
    }),
  );
  return { positions: withLabelRoom(items, positions, axis, rooms), axis };
}

/** Clearance kept between a label in a pocket and the boxes and other labels around it. */
const POCKET_PAD = 4;

/**
 * Labelled edges whose label fits in a pocket, so their gap need not widen. An edge between two
 * ranks that are offset across the reading direction turns in the gap between them, and its run
 * across that gap can carry the label wherever the rows leave a hole beside it: the space between
 * two rows, clear of every box on either side of the gap. Each pocket taken stays clear for the
 * next label. `boxes` are the drawn boxes laid out without label room; widening other gaps only
 * moves whole ranks along, so a pocket found there stays open.
 */
function pocketed(
  boxes: Map<string, Size & Pos>,
  axis: 'right' | 'down',
  rooms: LabelRoom[],
): Set<LabelRoom> {
  const along = axis === 'right' ? 'x' : 'y',
    across = axis === 'right' ? 'y' : 'x',
    size = (n: Size, a: 'x' | 'y') => (a === 'x' ? n.w : n.h);
  const taken: Array<{ lo: number; hi: number; from: number; to: number }> = [],
    out = new Set<LabelRoom>();
  for (const r of rooms) {
    let [a, b] = [boxes.get(r.a), boxes.get(r.b)];
    if (!a || !b) continue;
    if (b[along] < a[along]) [a, b] = [b, a];
    const gapFrom = a[along] + size(a, along),
      gapTo = b[along];
    // Boxes side by side share no gap; their label room is set across.
    if (gapTo <= gapFrom) continue;
    const w = (axis === 'right' ? r.w : r.h) - 2 * LABEL_RUN,
      h = (axis === 'right' ? r.h : r.w) - 2 * LABEL_RUN;
    // The router may run the turn anywhere in the gap, so the label may sit anywhere across it.
    const from = gapFrom - w / 2 - POCKET_PAD,
      to = gapTo + w / 2 + POCKET_PAD;
    const ca = a[across] + size(a, across) / 2,
      cb = b[across] + size(b, across) / 2,
      runLo = Math.min(ca, cb) + POCKET_PAD,
      runHi = Math.max(ca, cb) - POCKET_PAD;
    if (runHi - runLo < h) continue;
    const blocks = [
      ...[...boxes.values()]
        .filter(o => o[along] < to && o[along] + size(o, along) > from)
        .map(o => ({
          lo: o[across] - POCKET_PAD,
          hi: o[across] + size(o, across) + POCKET_PAD,
        })),
      ...taken.filter(t => t.from < to && t.to > from),
    ];
    const free = (t: number) => blocks.every(k => t + h <= k.lo || t >= k.hi);
    const mid = (runLo + runHi - h) / 2;
    const spot = [runLo, mid, ...blocks.map(k => k.hi)]
      .filter(t => t >= runLo && t + h <= runHi && free(t))
      .sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid))[0];
    if (spot === undefined) continue;
    out.add(r);
    taken.push({ lo: spot - POCKET_PAD, hi: spot + h + POCKET_PAD, from, to });
  }
  return out;
}

/** Engines whose scopes holding groups are packed tight instead of kept on global rank columns. */
const PACKED_ENGINES = new Set(['compound-flow', 'layered']);

/** The most a group gap grows to leave room for the lines that pass between groups. */
const MAX_GROUP_GAP = 96;

/** Gaps a packed scope uses: between boxes across a rank, between ranks, and next to a group. */
interface PackGaps {
  node: number;
  rank: number;
  group: number;
}

/**
 * Pack an engine-arranged scope tight. Members take local ranks from the edges between them, so a
 * chain reads as a straight row or column in the reading direction instead of stepping across the
 * engine's global rank columns. Each rank keeps the engine's order across it, and every rank is
 * centred on one line. A gap next to a group is the drawing's one group gap.
 */
function packed(
  items: Item[],
  arranged: Map<string, Pos>,
  axis: 'right' | 'down',
  pairs: Array<[string, string]>,
  rooms: LabelRoom[],
  gaps: PackGaps,
) {
  const by = new Map(items.map(n => [n.id, n])),
    ids = items.map(n => n.id),
    right = axis === 'right';
  const major = (id: string) => (right ? by.get(id)!.w : by.get(id)!.h),
    minor = (id: string) => (right ? by.get(id)!.h : by.get(id)!.w),
    group = (id: string) => by.get(id)!.type === 'group';
  const across = (id: string) => {
    const p = arranged.get(id)!;
    return right ? p.y + by.get(id)!.h / 2 : p.x + by.get(id)!.w / 2;
  };
  const layers = rankLayers(ids, pairs).map(layer =>
    [...layer].sort((a, b) => across(a) - across(b) || ids.indexOf(a) - ids.indexOf(b)),
  );
  const rank = new Map(layers.flatMap((layer, i) => layer.map(id => [id, i] as const)));
  const between = (a: string, b: string) =>
    roomBetween(rooms, a, b, group(a) || group(b) ? gaps.group : gaps.node, !right);
  const extents = layers.map(layer =>
    layer.reduce((s, id, j) => s + minor(id) + (j ? between(layer[j - 1], id) : 0), 0),
  );
  const widest = Math.max(...extents);
  // A chain link, a member with one way on into a member with one way in, shares its
  // predecessor's centre line so the chain reads straight. Other members stay centred on the
  // ranks' common line; members are pushed along only to keep their order and gaps.
  const outs = new Map(ids.map(id => [id, new Set<string>()])),
    ins = new Map(ids.map(id => [id, new Set<string>()]));
  for (const [a, b] of pairs)
    if (rank.get(b)! > rank.get(a)!) {
      outs.get(a)!.add(b);
      ins.get(b)!.add(a);
    }
  const cross = new Map<string, number>(),
    mid = new Map<string, number>();
  for (const [i, layer] of layers.entries()) {
    let slot = (widest - extents[i]) / 2,
      end = -Infinity;
    for (const [j, id] of layer.entries()) {
      const [pred] = ins.get(id)!,
        link = ins.get(id)!.size === 1 && outs.get(pred)!.size === 1,
        want = link ? mid.get(pred)! - minor(id) / 2 : slot,
        start = j ? Math.max(want, end + between(layer[j - 1], id)) : want;
      cross.set(id, start);
      mid.set(id, start + minor(id) / 2);
      end = start + minor(id);
      slot = Math.max(slot + minor(id), end) + (layer[j + 1] ? between(id, layer[j + 1]) : 0);
    }
  }
  const low = Math.min(...cross.values());
  const out = new Map<string, Pos>();
  let at = 0;
  for (const [i, layer] of layers.entries()) {
    for (const id of layer) {
      const c = round(cross.get(id)! - low);
      out.set(id, right ? { x: at, y: c } : { x: c, y: at });
    }
    const next = layers[i + 1];
    if (!next) break;
    let after = layer.some(group) || next.some(group) ? gaps.group : gaps.rank;
    for (const r of rooms)
      if (
        Math.min(rank.get(r.a)!, rank.get(r.b)!) === i &&
        Math.abs(rank.get(r.a)! - rank.get(r.b)!) === 1
      )
        after = Math.max(after, right ? r.w : r.h);
    at += Math.max(...layer.map(major)) + after;
  }
  return { positions: out, axis };
}

/**
 * Engines space every rank alike. Where a labelled edge between two ranks has less room than its
 * label needs, push everything past the first rank's end along the reading axis.
 */
function withLabelRoom(
  items: Item[],
  positions: Map<string, Pos>,
  axis: 'right' | 'down',
  rooms: LabelRoom[],
) {
  const by = new Map(items.map(n => [n.id, n])),
    start = (id: string) => (axis === 'right' ? positions.get(id)!.x : positions.get(id)!.y),
    end = (id: string) => start(id) + (axis === 'right' ? by.get(id)!.w : by.get(id)!.h);
  const cuts = new Map<number, number>();
  for (const r of rooms) {
    const [a, b] = start(r.a) <= start(r.b) ? [r.a, r.b] : [r.b, r.a],
      free = start(b) - end(a),
      need = axis === 'right' ? r.w : r.h;
    // Siblings that overlap on the axis sit side by side; their edge doesn't cross a rank gap.
    if (free >= 0 && free < need) cuts.set(end(a), Math.max(cuts.get(end(a)) ?? 0, need - free));
  }
  if (!cuts.size) return positions;
  const out = new Map<string, Pos>();
  for (const n of items) {
    let shift = 0;
    for (const [at, amount] of cuts) if (start(n.id) >= at) shift += amount;
    const p = positions.get(n.id)!;
    out.set(
      n.id,
      axis === 'right' ? { x: round(p.x + shift), y: p.y } : { x: p.x, y: round(p.y + shift) },
    );
  }
  return out;
}

function baseLayout(
  items: Item[],
  layout: ModelLayout,
  pairs: Array<[string, string]>,
  rooms: LabelRoom[] = [],
) {
  const out = new Map<string, Pos>(),
    gap = layout.gap,
    axis = axisOf(layout);
  const by = new Map(items.map(n => [n.id, n]));
  if (layout.algorithm === 'row' || layout.algorithm === 'column') {
    let cursor = 0;
    for (const [i, n] of items.entries()) {
      const next = items[i + 1]?.id ?? '';
      out.set(n.id, layout.algorithm === 'row' ? { x: cursor, y: 0 } : { x: 0, y: cursor });
      cursor +=
        (layout.algorithm === 'row' ? n.w : n.h) +
        roomBetween(rooms, n.id, next, gap, layout.algorithm === 'row');
    }
  } else {
    const ids = items.map(n => n.id);
    const layers = pairs.length ? rankLayers(ids, pairs) : ids.map(id => [id]);
    const major = (id: string) => (axis === 'right' ? by.get(id)!.w : by.get(id)!.h);
    const minor = (id: string) => (axis === 'right' ? by.get(id)!.h : by.get(id)!.w);
    // A gap between ranks grows to fit the labels on edges that cross it.
    const rank = new Map(layers.flatMap((layer, i) => layer.map(id => [id, i] as const)));
    let at = 0;
    for (const [i, layer] of layers.entries()) {
      let across = 0,
        after = gap;
      for (const [j, id] of layer.entries()) {
        out.set(id, axis === 'right' ? { x: at, y: across } : { x: across, y: at });
        across += minor(id) + roomBetween(rooms, id, layer[j + 1] ?? '', gap, axis !== 'right');
      }
      for (const r of rooms)
        if (
          Math.min(rank.get(r.a)!, rank.get(r.b)!) === i &&
          Math.abs(rank.get(r.a)! - rank.get(r.b)!) === 1
        )
          after = Math.max(after, axis === 'right' ? r.w : r.h);
      at += Math.max(...layer.map(major)) + after;
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
    // Group content stays at nonnegative local coordinates so it fits inside the frame; the root
    // has no frame, and clamping there would push anchored objects aside. Pins never move.
    if (scope !== 'root')
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

/**
 * A node drawn larger than its slot may spill past it by this share of its scope's gap, in total
 * along each axis, before the slot grows: two facing neighbours still keep half the gap, and
 * never less than `SLOT_KEEP`, the room a line between them needs.
 */
const SLOT_SPILL = 0.5,
  SLOT_KEEP = 16;
const spillOf = (gap: number) => Math.min(gap * SLOT_SPILL, Math.max(0, gap - SLOT_KEEP));

/**
 * Lay out a model. `arranged` holds world positions from layout engines; scopes that an engine
 * governs take their children's relative placement from it instead of their built-in recipe.
 *
 * Nodes are laid out on slots: their size in the reference appearance (the default theme, with
 * the file's own overrides), so a theme switch keeps rows, order and positions. Each node is drawn
 * at its theme's size in its slot. A slot grows only where the theme's size is larger
 * than the scope's gap can absorb (`SLOT_SPILL`), or where spilling would bring two boxes closer
 * than `MIN_GAP`. With `slots`, objects come out at their slot size (the engines' input).
 */
export function layoutModel(m: Model, arranged?: Map<string, Pos>, slots = false): Scene {
  // The engines' input (`slots`) has no channels: they are planned on the final arrangement.
  if (slots) return layoutPass(m, arranged, true);
  // Plan routing channels on the arrangement before refinements, so a pin, drag or nudge never
  // changes the room left for lines elsewhere; then lay out with them.
  const unrefined = { ...m, hints: m.hints.filter(h => h.type === 'size' || h.type === 'order') },
    plain = layoutPass(unrefined, arranged),
    area = (objects: SceneObject[]) =>
      (Math.max(...objects.map(o => o.x + o.w)) - Math.min(...objects.map(o => o.x))) *
      (Math.max(...objects.map(o => o.y + o.h)) - Math.min(...objects.map(o => o.y))),
    channels = trimChannels(
      planChannels(plain.objects, m.edges, m.routing),
      area(plain.objects),
      c => area(layoutPass(unrefined, arranged, false, c).objects),
    );
  if (!channels.size) return layoutPass(m, arranged);
  // The router may take another way than a channel was planned for. Route the same unrefined
  // arrangement once, drop the channels no line runs along, and lay out again: one more pass,
  // channels only shrink, no loop.
  const refined = m.hints.length !== unrefined.hints.length,
    probe = layoutPass(unrefined, arranged, false, channels),
    routed = route(probe),
    used = usedChannels(
      channels,
      probe.objects.filter(o => o.type === 'group'),
      routed.routes.map(r => r.points),
      probe.look.groupHeader,
    );
  if (used === channels) return refined ? layoutPass(m, arranged, false, channels) : probe;
  // A dropped channel can still have been the room a line needed to clear a member or a title:
  // keep the re-pack only when its lines are no worse.
  const tight = layoutPass(unrefined, arranged, false, used.size ? used : undefined),
    before = routed.report,
    after = route(tight).report,
    keep =
      after.blocked <= before.blocked &&
      after.crossings <= before.crossings &&
      after.bends <= before.bends &&
      after.length <= before.length * ROUTE_SLACK;
  if (!keep) return refined ? layoutPass(m, arranged, false, channels) : probe;
  return refined ? layoutPass(m, arranged, false, used.size ? used : undefined) : tight;
}

/**
 * A re-pack without unused channels may lengthen the lines by this share at most: the drawing is
 * tighter, so a line or two may run a little further round, but not take a new detour.
 */
const ROUTE_SLACK = 1.05;

/** Route a scene with the editor's router, as `projectScene` and the canvas do. */
function route(scene: Scene) {
  const doc = projectScene(scene),
    { vg, rects } = visibleRects(doc);
  return RouteLab.compute(routeInput(doc, vg, rects), {
    ...doc.settings.routing,
    previous: [],
    quick: true,
  });
}

function layoutPass(
  m: Model,
  arranged?: Map<string, Pos>,
  slots = false,
  channels?: Map<string, Channel>,
): Scene {
  const diagnostics: Diagnostic[] = [],
    children = new Map<string, ModelObject[]>([['root', []]]);
  for (const o of m.objects) {
    if (!children.has(o.parent)) children.set(o.parent, []);
    children.get(o.parent)!.push(o);
  }
  const look = resolveAppearance(m.appearance),
    header = look.groupHeader,
    ref =
      look.theme === DEFAULT_THEME
        ? look
        : resolveAppearance({ ...m.appearance, theme: DEFAULT_THEME });
  /** The size each node is drawn at, where it differs from its slot. */
  const drawn = new Map<string, { w: number; h: number }>();
  const items = new Map<string, Item>(),
    local = new Map<string, Pos>(),
    bases = new Map<string, Pos>();
  const byId = new Map(m.objects.map(o => [o.id, o]));
  const immediate = (id: string, scope: string) => {
    let o = byId.get(id);
    while (o && o.parent !== scope) o = byId.get(o.parent);
    return o?.id;
  };

  const folds: Array<{ scope: string; fold: Fold }> = [],
    flows: FlowScope[] = [];
  // A decision: a diamond, or any node whose branches are labelled, with two or more ways out.
  const decisionsIn = (scope: string) => {
    const outs = new Map<string, ModelEdge[]>();
    for (const e of m.edges) {
      const a = immediate(e.source, scope);
      if (a && immediate(e.target, scope) !== a) outs.set(a, [...(outs.get(a) ?? []), e]);
    }
    return new Set(
      [...outs]
        .filter(
          ([id, out]) =>
            out.length > 1 &&
            (byId.get(id)!.shape === 'diamond' || out.filter(e => e.label).length > 1),
        )
        .map(([id]) => id),
    );
  };

  // Scopes an engine arranges that hold groups, and every group inside one, are packed tight.
  const pairsIn = (scope: string) =>
    m.edges
      .map(e => [immediate(e.source, scope), immediate(e.target, scope)] as const)
      .filter((p): p is [string, string] => !!p[0] && !!p[1] && p[0] !== p[1]);
  const packEngine = (scope: string) => {
    const governing = arranged && governingLayout(m, scope),
      kids = children.get(scope) ?? [];
    if (!governing?.engine || !PACKED_ENGINES.has(governing.engine.algorithm)) return undefined;
    if (scope === 'root' && !kids.some(k => k.type === 'group')) return undefined;
    if (!kids.every(k => arranged!.has(k.id))) return undefined;
    return LayoutLab.settings({
      algorithm: governing.engine.algorithm,
      ...governing.engine.params,
    });
  };
  // One group gap for the whole drawing: the engines' group gap, or wider for the most lines that
  // cross one rank gap of a packed scope, so lines passing between groups keep their pitch.
  let groupGap = 0,
    lines = 0;
  for (const scope of children.keys()) {
    const s = packEngine(scope);
    if (!s) continue;
    groupGap = Math.max(groupGap, s.groupGap);
    const pairs = pairsIn(scope),
      rank = new Map(
        rankLayers(
          (children.get(scope) ?? []).map(k => k.id),
          pairs,
        ).flatMap((layer, i) => layer.map(id => [id, i] as const)),
      ),
      ranks = Math.max(0, ...rank.values());
    for (let i = 0; i < ranks; i++)
      lines = Math.max(
        lines,
        pairs.filter(
          ([a, b]) =>
            Math.min(rank.get(a)!, rank.get(b)!) <= i && Math.max(rank.get(a)!, rank.get(b)!) > i,
        ).length,
      );
  }
  groupGap = Math.min(MAX_GROUP_GAP, Math.max(groupGap, (lines + 1) * (m.routing.edgeGap ?? 16)));

  function arrange(scope: string): { w: number; h: number } {
    const layout = layoutFor(m, scope),
      order = m.hints.find(h => h.type === 'order' && h.scope === scope);
    let kids = children.get(scope) ?? [];
    if (order?.type === 'order') {
      const listed = order.ids.flatMap(id => kids.filter(k => k.id === id));
      kids = [...listed, ...kids.filter(k => !order.ids.includes(k.id))];
    }
    // Theme size and reference size of each leaf; the slot is chosen below.
    const leaves = new Map<string, { look: Size; ref: Size }>();
    const list: Item[] = kids.map(o => {
      let size: { w: number; h: number };
      if (o.type === 'group') {
        // Bottom-up: the group's content is already placed in its own coordinates, so the frame
        // is that box plus the same inset on every side, and never feeds back into the content.
        // Only the title or an explicit minimum can make it larger.
        const sub = arrange(o.id),
          own = layoutFor(m, o.id),
          empty = !children.get(o.id)?.length;
        size = {
          w: Math.max(
            empty ? EMPTY_GROUP.w : 0,
            sub.w + GROUP_INSET + (channels?.get(o.id)?.right ?? GROUP_INSET),
            Math.ceil(measureText(o.label, look.groupTitle)) + GROUP_TITLE_CHROME,
            own.minWidth,
          ),
          h: Math.max(
            empty ? EMPTY_GROUP.h : 0,
            sub.h + header + (channels?.get(o.id)?.bottom ?? GROUP_INSET),
            own.minHeight,
          ),
        };
      } else {
        const hint = m.hints.find(h => h.type === 'size' && h.id === o.id);
        const leaf = leafSize(o, hint?.type === 'size' ? hint : undefined, look);
        size = leaf;
        if (ref !== look) {
          const r = leafSize(o, hint?.type === 'size' ? hint : undefined, ref);
          leaves.set(o.id, {
            look: { w: round(leaf.w), h: round(leaf.h) },
            ref: { w: round(r.w), h: round(r.h) },
          });
        }
        if (leaf.overflow)
          diagnostics.push({
            level: 'warning',
            code: 'text-overflow',
            message: `${o.id}'s title does not fit in its requested size. Make it larger or remove the size line.`,
            line: hint?.line,
            ids: [o.id],
          });
      }
      const item = { ...o, w: round(size.w), h: round(size.h) };
      items.set(o.id, item);
      return item;
    });
    const pairs = pairsIn(scope);
    // Label rooms are measured on the reference appearance too; a theme's label may use up to
    // one `LABEL_RUN` of the line beside it before the room grows.
    const rooms = m.edges.flatMap(e => {
      const a = immediate(e.source, scope),
        b = immediate(e.target, scope);
      if (!e.label || !a || !b || a === b) return [];
      const own = labelRoom(a, b, e.label, look);
      if (ref === look) return [own];
      const r = labelRoom(a, b, e.label, ref);
      return [{ a, b, w: Math.max(r.w, own.w - LABEL_RUN), h: Math.max(r.h, own.h - LABEL_RUN) }];
    });
    const governing = arranged && governingLayout(m, scope),
      pack = packEngine(scope),
      packGaps = pack ? { node: pack.nodeGap, rank: pack.rankGap, group: groupGap } : undefined,
      engine = governing?.engine && governing.scope === scope ? governing.engine : undefined;
    /**
     * Where each drawn box sits in its slot, and its size. Engines place centres, so it is
     * centred. The built-in recipes line a rank's boxes up by their start across the reading
     * direction (a row of a fold shares its top), so there the drawn box keeps the slot's start
     * across and is centred along. Pins and stays hold the drawn box.
     */
    const offsets = (axis: 'right' | 'down') => {
      const reads =
        layout.algorithm === 'row' ? 'right' : layout.algorithm === 'column' ? 'down' : axis;
      const centre = {
        x: !!governing?.engine || reads === 'right',
        y: !!governing?.engine || reads === 'down',
      };
      return new Map(
        list.map(n => {
          const l = slots ? n : (leaves.get(n.id)?.look ?? n);
          return [
            n.id,
            {
              x: centre.x ? (n.w - l.w) / 2 : 0,
              y: centre.y ? (n.h - l.h) / 2 : 0,
              w: l.w,
              h: l.h,
            },
          ] as const;
        }),
      );
    };
    /** Lay the scope out on slots that let each drawn node spill `spill` past them. */
    const lay = (spill: Size) => {
      for (const n of list) {
        const l = leaves.get(n.id);
        if (!l) continue;
        n.w = Math.max(l.ref.w, l.look.w - spill.w);
        n.h = Math.max(l.ref.h, l.look.h - spill.h);
      }
      const laidOut = (with_: LabelRoom[]) =>
        packGaps
          ? packed(list, arranged!, axisOf(governing!), pairs, with_, packGaps)
          : governing?.engine && list.every(n => arranged!.has(n.id))
            ? fromEngine(list, arranged!, axisOf(governing), with_)
            : baseLayout(list, layout, pairs, with_);
      // Labels that fit in a pocket on their own edge leave their gap as it is; only the gaps
      // whose labels have nowhere else to go widen.
      const plain = rooms.length ? laidOut([]) : undefined;
      const pockets = plain
        ? pocketed(
            new Map(
              list.map(n => {
                const p = plain.positions.get(n.id)!,
                  o = offsets(plain.axis).get(n.id)!;
                return [n.id, { x: p.x + o.x, y: p.y + o.y, w: o.w, h: o.h }];
              }),
            ),
            plain.axis,
            rooms,
          )
        : new Set<LabelRoom>();
      const base = laidOut(rooms.filter(r => !pockets.has(r)));
      let fold: Fold | undefined;
      if (
        engine
          ? engine.algorithm === 'layered' && engine.params.fold !== 'never'
          : !governing?.engine && layout.algorithm === 'flow' && layout.fold === 'auto'
      ) {
        // The fold is planned without edge labels, so a relabel keeps the bands and cuts.
        const folded = foldRanks(
          list,
          base.positions,
          base.axis,
          layout.gap,
          pairs,
          rooms,
          decisionsIn(scope),
          (plain ?? base).positions,
        );
        base.positions = folded.positions;
        fold = folded.fold;
      }
      // A routing channel on the left or under the title moves the content over to make room.
      const room = channels?.get(scope);
      if (room && (room.left > GROUP_INSET || room.top))
        for (const [id, p] of base.positions)
          base.positions.set(id, { x: p.x + room.left - GROUP_INSET, y: p.y + room.top });
      const off = offsets(base.axis);
      const hints = !leaves.size
        ? m.hints
        : m.hints.map(h =>
            (h.type === 'stay' || h.type === 'pin') && off.has(h.id)
              ? { ...h, x: h.x - off.get(h.id)!.x, y: h.y - off.get(h.id)!.y }
              : h,
          );
      const pos = refine(list, base.positions, hints, scope, diagnostics, base.axis);
      return { base, fold, pos, off };
    };
    const drawnBox = (n: Item, at: ReturnType<typeof lay>) => {
      const p = at.pos.get(n.id)!,
        o = at.off.get(n.id)!;
      return { x: p.x + o.x, y: p.y + o.y, w: o.w, h: o.h };
    };
    const slotBox = (n: Item, at: ReturnType<typeof lay>) => ({
      ...at.pos.get(n.id)!,
      w: n.w,
      h: n.h,
    });
    // Spill into the gaps first; if that brings two drawn boxes closer than `MIN_GAP` where their
    // slots were not, lay the scope out again on slots that hold the whole drawn size.
    // An engine spaces ranks by its rank gap and neighbours by its node gap.
    const spill = !leaves.size
        ? { w: 0, h: 0 }
        : governing?.engine
          ? (() => {
              const along = spillOf(governing.engine.params.rankGap ?? 52),
                across = spillOf(governing.engine.params.nodeGap ?? 24);
              return axisOf(governing) === 'right'
                ? { w: along, h: across }
                : { w: across, h: along };
            })()
          : { w: spillOf(layout.gap), h: spillOf(layout.gap) },
      diagnosed = diagnostics.length;
    let laid = lay(spill);
    if (
      !slots &&
      (spill.w || spill.h) &&
      list.some((a, i) =>
        list
          .slice(i + 1)
          .some(
            b =>
              clearance(slotBox(a, laid), slotBox(b, laid)) >= MIN_GAP - 0.5 &&
              clearance(drawnBox(a, laid), drawnBox(b, laid)) < MIN_GAP - 0.5,
          ),
      )
    ) {
      diagnostics.length = diagnosed;
      laid = lay({ w: 0, h: 0 });
    }
    if (laid.fold) folds.push({ scope, fold: laid.fold });
    if (engine ? engine.algorithm === 'layered' : !governing?.engine && layout.algorithm === 'flow')
      flows.push({ scope, axis: laid.base.axis });
    // Drawn boxes, in this scope's coordinates. Group content starts at 0,0, so a box that spills
    // past its slot at the top or left moves the content over by that much.
    const boxes = list.map(n => drawnBox(n, laid));
    const shift =
      scope === 'root' || !list.length
        ? { x: 0, y: 0 }
        : {
            x: Math.max(0, -Math.min(...boxes.map(b => b.x))),
            y: Math.max(0, -Math.min(...boxes.map(b => b.y))),
          };
    for (const [i, n] of list.entries()) {
      const b = boxes[i],
        o = laid.off.get(n.id)!,
        p = laid.base.positions.get(n.id)!;
      local.set(n.id, { x: round(b.x + shift.x), y: round(b.y + shift.y) });
      bases.set(n.id, { x: p.x + o.x + shift.x, y: p.y + o.y + shift.y });
      if (leaves.has(n.id)) drawn.set(n.id, { w: round(b.w), h: round(b.h) });
    }
    const extent = (a: 'x' | 'y', size: 'w' | 'h') =>
      list.length
        ? Math.max(
            ...list.map((n, i) =>
              Math.max(laid.pos.get(n.id)![a] + n[size], boxes[i][a] + boxes[i][size]),
            ),
          ) + shift[a]
        : 0;
    return { w: extent('x', 'w'), h: extent('y', 'h') };
  }
  arrange('root');

  const objects: SceneObject[] = [];
  const place = (scope: string, origin: Pos, depth: number) => {
    for (const o of children.get(scope) ?? []) {
      const item = drawn.get(o.id) ?? items.get(o.id)!,
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
      if (o.type === 'group') place(o.id, contentOrigin(box, header), depth + 1);
    }
  };
  place('root', { x: 0, y: 0 }, 0);
  const lanes = wrapLanes(
    folds,
    m.edges,
    new Map(objects.map(o => [o.id, o])),
    immediate,
    Math.max(m.routing.portGap ?? 16, m.routing.edgeGap ?? 16),
  );
  // Returns and skips within a band take lanes outside it; fold wraps keep theirs.
  for (const [id, lane] of returnLanes(
    flows.map(f => ({ ...f, bands: folds.find(x => x.scope === f.scope)?.fold.bands })),
    m.edges,
    new Map(objects.map(o => [o.id, o])),
    new Set(lanes.keys()),
  ))
    lanes.set(id, lane);
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
    edges: m.edges.map(e => (lanes.has(e.id) ? { ...e, lane: lanes.get(e.id) } : e)),
    diagnostics,
    look,
  };
}
