/**
 * Layout variants for `draftably vary`: alternative `layout` and `routing` lines for a file,
 * each compiled, routed and measured as the CLI draws it, then ranked against the file as it is.
 *
 * A variant is a list of line edits, so applying one changes only the lines it names and keeps
 * comments, IDs and refinements. Everything here is deterministic: the same source gives the same
 * variants, in the same order, with the same numbers.
 */
import { computeRoutes } from '../model/routes';
import type { Rect } from '../model/types';
import { compile, type Scene } from '../dsl/compile';
import { findConflicts } from '../dsl/conflicts';
import { projectScene, visibleRects } from '../dsl/project';
import { layoutStatement, statements } from '../dsl/source-edits';
import { bare, printStatement, readSource, type Statement, type Word } from '../dsl/syntax';
import { renderSvg } from './svg';

/** One change to the source: attributes to set (a value) or remove (null) on one statement. */
export type Edit =
  | { kind: 'layout'; scope: string; attrs: Record<string, string | null> }
  | { kind: 'routing'; attrs: Record<string, string | null> };

/** A changed line: its number in the original file (0 for an added line), before and after. */
export interface LineChange {
  line: number;
  before?: string;
  after?: string;
}

export interface Metrics {
  width: number;
  height: number;
  crossings: number;
  bends: number;
  length: number;
  /** Warnings `check` would print: layout diagnostics and drawing conflicts. */
  warnings: number;
  /** Mean distance, in px, each box moved from where the current file draws it. */
  moved: number;
}

export interface Variant {
  id: string;
  /** Short name, such as `layered down`. */
  title: string;
  /** Why it was tried, from the diagram's shape. */
  why: string;
  edits: Edit[];
  lines: LineChange[];
  metrics?: Metrics;
  /** Set when the variant does not compile; it is listed but never ranked first. */
  error?: string;
  tags: string[];
}

export interface Measured {
  variant: Variant;
  source: string;
  svg: string;
}

export type Prefer = 'fewer-crossings' | 'compact' | 'stable';

// --- Edits -------------------------------------------------------------------------------------

/** Settings a built-in recipe keeps when an engine replaces it. */
const KEPT = ['direction', 'fold', 'min-width', 'min-height'];

function merged(s: Statement, attrs: Record<string, string | null>): Statement {
  const next: Statement = { ...s, args: [...s.args], attrs: [...s.attrs] };
  // An engine replaces a built-in recipe (`layout root flow gap=48`): drop the recipe and its gap.
  if ('engine' in attrs && s.command === 'layout' && s.args.length > 1) {
    next.args = next.args.slice(0, 1);
    next.attrs = next.attrs.filter(([k]) => KEPT.includes(k));
  }
  for (const [key, value] of Object.entries(attrs)) {
    const i = next.attrs.findIndex(([k]) => k === key);
    if (value === null) {
      if (i >= 0) next.attrs.splice(i, 1);
    } else if (i >= 0) next.attrs[i] = [key, bare(value)];
    else if (key === 'engine') next.attrs.unshift([key, bare(value)]);
    else next.attrs.push([key, bare(value)]);
  }
  return next;
}

const fresh = (command: string, args: Word[], attrs: Record<string, string | null>): Statement => ({
  kind: 'statement',
  command,
  args,
  attrs: Object.entries(attrs).flatMap(([k, v]) =>
    v === null ? [] : [[k, bare(v)] as [string, Word]],
  ),
  line: 0,
});

/**
 * Apply edits to `source` line by line. Untouched lines keep their exact text, so the result
 * differs from the file only where an edit names a statement. New statements go after the last
 * `layout` line, or at the end of the file.
 */
export function applyEdits(source: string, edits: Edit[]) {
  const doc = readSource(source),
    texts: Array<string | null> = source.split(/\r?\n/),
    added: string[] = [],
    changes: LineChange[] = [];
  const replace = (s: Statement, next: Statement) => {
    const after = printStatement(next);
    if (after === texts[s.line - 1]) return;
    changes.push({ line: s.line, before: texts[s.line - 1]!, after });
    texts[s.line - 1] = after;
  };
  for (const edit of edits) {
    const existing =
      edit.kind === 'layout'
        ? layoutStatement(doc, edit.scope)
        : statements(doc).find(s => s.command === 'routing');
    if (existing) replace(existing, merged(existing, edit.attrs));
    else {
      const next =
        edit.kind === 'layout'
          ? fresh('layout', [bare(edit.scope)], edit.attrs)
          : fresh('routing', [], edit.attrs);
      if (next.attrs.length) added.push(printStatement(next));
    }
  }
  if (added.length) {
    const layouts = statements(doc).filter(s => s.command === 'layout' || s.command === 'routing');
    const at = layouts.length ? layouts.at(-1)!.line : texts.length;
    // Without layout lines, keep a blank line between the declarations and the new ones.
    const block = layouts.length ? added : ['', ...added];
    if (!layouts.length && texts.at(-1) === '') texts.splice(texts.length - 1, 0, ...block);
    else texts.splice(at, 0, ...block);
    for (const after of added) changes.push({ line: 0, after });
  }
  return { source: texts.join('\n'), changes };
}

// --- Shape -------------------------------------------------------------------------------------

/** What the diagram looks like, for choosing variants worth trying. */
export interface Shape {
  nodes: number;
  /** Framed groups: the ones that arrange their own members. */
  groups: number;
  /** Rank count along the longest chain of connections, ignoring returns. */
  ranks: number;
  /** Every node has at most one incoming connection and there is one start. */
  tree: boolean;
  /** Mean edge label length, in characters. */
  labels: number;
  /** The root's recipe, when it is one an engine cannot replace (lanes, sequence, cells). */
  fixedRoot?: string;
  /** The root's current engine, or its recipe name. */
  rootLayout: string;
  rootDirection: 'auto' | 'right' | 'down';
}

export function shapeOf(scene: Scene): Shape {
  const m = scene.model,
    nodes = m.objects.filter(o => o.type === 'node'),
    ids = new Set(nodes.map(n => n.id)),
    edges = m.edges.filter(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);
  const out = new Map<string, string[]>(),
    incoming = new Map<string, number>();
  for (const e of edges) {
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }
  // Longest path by depth-first search; an edge back into the current path is a return.
  const depth = new Map<string, number>(),
    open = new Set<string>();
  let cyclic = false;
  const visit = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    open.add(id);
    let best = 1;
    for (const next of out.get(id) ?? []) {
      if (open.has(next)) {
        cyclic = true;
        continue;
      }
      best = Math.max(best, 1 + visit(next));
    }
    open.delete(id);
    depth.set(id, best);
    return best;
  };
  const ranks = Math.max(0, ...nodes.map(n => visit(n.id)));
  const starts = nodes.filter(n => !incoming.get(n.id)).length;
  const root = m.layouts.find(l => l.scope === 'root');
  const labelled = edges.filter(e => e.label);
  return {
    nodes: nodes.length,
    groups: m.objects.filter(o => o.type === 'group' && !o.frame).length,
    ranks,
    tree: !cyclic && starts === 1 && nodes.every(n => (incoming.get(n.id) ?? 0) <= 1),
    labels: labelled.length
      ? labelled.reduce((sum, e) => sum + e.label.length, 0) / labelled.length
      : 0,
    ...(root && ['lanes', 'sequence', 'cells'].includes(root.algorithm) && !root.engine
      ? { fixedRoot: root.algorithm }
      : {}),
    rootLayout: root?.engine?.algorithm ?? root?.algorithm ?? 'flow',
    rootDirection: root?.direction ?? 'auto',
  };
}

// --- Candidates --------------------------------------------------------------------------------

const layout = (attrs: Record<string, string | null>, scope = 'root'): Edit => ({
  kind: 'layout',
  scope,
  attrs,
});

/** Name a variant by the settings it sets. */
export const titleOf = (edits: Edit[]) =>
  edits
    .map(e =>
      Object.entries(e.attrs)
        .map(([k, v]) =>
          v === null ? `no ${k}` : k === 'engine' || k === 'direction' ? v : `${k}=${v}`,
        )
        .join(' '),
    )
    .join(', ');

/**
 * Variants likely to suit this shape: an engine for its structure in both reading directions,
 * plus a few settings aimed at what the shape suggests. More are tried than shown; ranking keeps
 * the best ones that differ.
 */
export function suggestions(
  shape: Shape,
  base: Pick<Metrics, 'crossings'>,
): Array<Pick<Variant, 'edits' | 'why'>> {
  const out: Array<Pick<Variant, 'edits' | 'why'>> = [];
  // A stricter router only helps a drawing that has crossings.
  const router = base.crossings
    ? [
        {
          edits: [{ kind: 'routing', attrs: { 'crossing-penalty': '900' } } as Edit],
          why: `keep the layout, route around its ${base.crossings} crossing${base.crossings > 1 ? 's' : ''} harder`,
        },
      ]
    : [];
  if (shape.fixedRoot) {
    out.push(...router, {
      edits: [{ kind: 'routing', attrs: { 'edge-gap': '28' } }],
      why: `a ${shape.fixedRoot} root keeps its layout; more room between parallel lines`,
    });
    return out;
  }
  const engine = shape.groups ? 'compound-flow' : 'layered',
    because = shape.groups ? `${shape.groups} group${shape.groups > 1 ? 's' : ''}` : 'no groups';
  for (const direction of ['right', 'down'])
    out.push({ edits: [layout({ engine, direction })], why: `${because}, reading ${direction}` });
  out.push({
    edits: [layout({ engine, direction: 'right', ordering: 'crossings' })],
    why: 'order each rank to cut crossings',
  });
  if (shape.groups)
    out.push({
      edits: [layout({ engine: 'layered', direction: 'right' })],
      why: 'ignore group packing, rank by connections',
    });
  if (shape.ranks >= 5 && shape.ranks >= shape.nodes * 0.6) {
    out.push({
      edits: [layout({ engine: 'flow', direction: 'right' })],
      why: `a chain of ${shape.ranks} steps`,
    });
    out.push({
      edits: [layout({ engine: 'flow', direction: 'right', fold: 'never' })],
      why: `a chain of ${shape.ranks} steps, kept on one line`,
    });
  }
  if (shape.tree && shape.nodes >= 4)
    out.push({
      edits: [layout({ engine: 'tree', direction: 'down' })],
      why: 'a tree with one start',
    });
  if (shape.labels > 14)
    out.push({
      edits: [layout({ engine, direction: 'right', 'rank-gap': '88' })],
      why: `long connection labels (${Math.round(shape.labels)} characters on average)`,
    });
  out.push(...router);
  return out;
}

// --- Measuring ---------------------------------------------------------------------------------

const centers = (rects: Map<string, Rect>) => {
  const all = [...rects.values()],
    x0 = Math.min(...all.map(r => r.x)),
    y0 = Math.min(...all.map(r => r.y));
  return new Map(
    [...rects].map(([id, r]) => [id, { x: r.x + r.w / 2 - x0, y: r.y + r.h / 2 - y0 }]),
  );
};

interface Drawn {
  metrics: Omit<Metrics, 'moved'>;
  centers: Map<string, { x: number; y: number }>;
  /** Rounded geometry, to spot variants that draw the same picture. */
  key: string;
  svg: string;
}

/** Compile, route and draw `source` as the CLI does, and measure the drawing. */
export async function draw(source: string): Promise<Drawn> {
  const scene = await compile(source);
  const errors = scene.diagnostics.filter(d => d.level === 'error');
  if (errors.length) throw Error(errors.map(d => d.message).join(' '));
  const doc = projectScene(scene),
    { vg, rects } = visibleRects(doc),
    { routes, result } = computeRoutes(doc, vg, rects, { previous: [] });
  const warnings =
    scene.diagnostics.filter(d => d.level === 'warning').length +
    findConflicts(scene, doc, rects, routes).length;
  const svg = renderSvg(doc);
  const size = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg)!;
  const c = centers(rects);
  return {
    metrics: {
      width: Math.round(Number(size[1])),
      height: Math.round(Number(size[2])),
      crossings: result.report.crossings,
      bends: result.report.bends,
      length: Math.round(result.report.length),
      warnings,
    },
    centers: c,
    key: [...c]
      .map(([id, p]) => `${id}:${Math.round(p.x / 4)},${Math.round(p.y / 4)}`)
      .concat(
        routes.map(r =>
          r.points.map(p => `${Math.round(p.x / 4)},${Math.round(p.y / 4)}`).join(' '),
        ),
      )
      .join('|'),
    svg,
  };
}

const movedFrom = (base: Drawn['centers'], next: Drawn['centers']) => {
  const ds = [...next].flatMap(([id, p]) => {
    const q = base.get(id);
    return q ? [Math.hypot(p.x - q.x, p.y - q.y)] : [];
  });
  return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
};

// --- Ranking -----------------------------------------------------------------------------------

const area = (m: Metrics) => m.width * m.height;

/** Sort keys for a preference, most important first. Warnings always come first. */
function keys(m: Metrics, prefer: Prefer): number[] {
  if (prefer === 'compact') return [m.warnings, area(m), m.crossings, m.bends];
  if (prefer === 'stable') return [m.warnings, m.moved, m.crossings, area(m)];
  return [m.warnings, m.crossings, area(m), m.bends];
}

const compareKeys = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/**
 * Whether `m` is at least as good as the current file on warnings, crossings and size, and
 * better on one of them. Only such a variant is recommended over keeping the file as it is.
 */
export const improves = (m: Metrics, base: Metrics) =>
  m.warnings <= base.warnings &&
  m.crossings <= base.crossings &&
  area(m) <= area(base) &&
  (m.warnings < base.warnings || m.crossings < base.crossings || area(m) < area(base));

/** Label what stands out in each variant: the fewest crossings, the smallest, the least moved. */
function tag(list: Variant[]) {
  const ok = list.filter(v => v.metrics && !v.error);
  const best = (label: string, score: (m: Metrics) => number) => {
    if (ok.length < 2) return;
    const low = Math.min(...ok.map(v => score(v.metrics!)));
    const winners = ok.filter(v => score(v.metrics!) === low);
    // A tag most variants share tells the reader nothing.
    if (winners.length <= Math.max(1, Math.floor(ok.length / 2)))
      for (const v of winners) v.tags.push(label);
  };
  best('fewest crossings', m => m.crossings);
  best('smallest', area);
  best('fewest bends', m => m.bends);
  const others = ok.filter(v => v.id !== 'v0');
  if (others.length > 1) {
    const low = Math.min(...others.map(v => v.metrics!.moved));
    others.filter(v => v.metrics!.moved === low).forEach(v => v.tags.push('least moved'));
  }
}

export interface VaryOptions {
  /** How many variants to keep besides the current file. */
  limit?: number;
  prefer?: Prefer;
}

export interface VaryResult {
  shape: Shape;
  /** `v0` (the file as it is) first, then the kept variants in ranked order. */
  variants: Variant[];
  /** The variant to apply, or `v0` when none improves on the file. */
  recommended: string;
  tried: number;
  /** Source and SVG for each listed variant, by id. */
  drawn: Map<string, Measured>;
}

/**
 * Try variants of `source`, measure each one, drop failures and duplicates of earlier ones, and
 * rank the rest against the file as it is.
 */
export async function vary(source: string, opts: VaryOptions = {}): Promise<VaryResult> {
  const prefer = opts.prefer ?? 'fewer-crossings',
    limit = opts.limit ?? 4;
  const scene = await compile(source),
    shape = shapeOf(scene),
    base = await draw(source);
  const v0: Variant = {
    id: 'v0',
    title: 'current',
    why: 'the file as it is',
    edits: [],
    lines: [],
    metrics: { ...base.metrics, moved: 0 },
    tags: [],
  };
  const seen = new Set([base.key]),
    drawn = new Map<string, Measured>([['v0', { variant: v0, source, svg: base.svg }]]),
    found: Array<{ variant: Variant; measured: Measured }> = [];
  const candidates = suggestions(shape, base.metrics);
  for (const c of candidates) {
    const { source: next, changes } = applyEdits(source, c.edits);
    if (!changes.length) continue;
    const variant: Variant = {
      id: '',
      title: titleOf(c.edits),
      why: c.why,
      edits: c.edits,
      lines: changes,
      tags: [],
    };
    try {
      const d = await draw(next);
      if (seen.has(d.key)) continue;
      seen.add(d.key);
      variant.metrics = { ...d.metrics, moved: movedFrom(base.centers, d.centers) };
      found.push({ variant, measured: { variant, source: next, svg: d.svg } });
    } catch (error) {
      variant.error = error instanceof Error ? error.message : String(error);
    }
  }
  const better = (v: Variant) => improves(v.metrics!, v0.metrics!);
  found.sort(
    (a, b) =>
      Number(better(b.variant)) - Number(better(a.variant)) ||
      compareKeys(keys(a.variant.metrics!, prefer), keys(b.variant.metrics!, prefer)),
  );
  const kept = found.slice(0, limit);
  kept.forEach((f, i) => {
    f.variant.id = `v${i + 1}`;
    drawn.set(f.variant.id, f.measured);
  });
  const variants = [v0, ...kept.map(f => f.variant)];
  tag(variants);
  const recommended = kept.length && better(kept[0].variant) ? kept[0].variant.id : 'v0';
  variants.find(v => v.id === recommended)!.tags.unshift('recommended');
  return { shape, variants, recommended, tried: candidates.length, drawn };
}
