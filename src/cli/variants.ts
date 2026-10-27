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
import { ExplorerLab } from '../engines/explorer-engine.js';
import {
  bare,
  ENGINE_PARAMS,
  ENGINES,
  printStatement,
  readSource,
  ROUTING_PARAMS,
  type Statement,
  type Word,
} from '../dsl/syntax';
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
  /** The scope the variants arrange: `root`, or a group given with `--scope`. */
  scope: string;
  /** The scope's recipe, when it is one an engine cannot replace (lanes, sequence, cells). */
  fixed?: string;
  /** The scope's current engine, or its recipe name. */
  layout: string;
  /** The scope's engine, when it has one rather than a built-in recipe. */
  engine?: string;
  direction: 'auto' | 'right' | 'down';
}

/** Ids inside `scope`'s subtree, or every object for `root`. */
function within(scene: Scene, scope: string) {
  const inside = (id: string): boolean => {
    for (let p = scene.byId.get(id)?.parent; p; p = scene.byId.get(p)?.parent) {
      if (p === scope) return true;
      if (p === 'root') return false;
    }
    return false;
  };
  return new Set(scene.model.objects.filter(o => scope === 'root' || inside(o.id)).map(o => o.id));
}

/** The shape of `scope`'s subtree: the whole diagram for `root`. */
export function shapeOf(scene: Scene, scope = 'root'): Shape {
  const m = scene.model,
    members = within(scene, scope),
    nodes = m.objects.filter(o => o.type === 'node' && members.has(o.id)),
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
  const root = m.layouts.find(l => l.scope === scope);
  const labelled = edges.filter(e => e.label);
  return {
    nodes: nodes.length,
    groups: m.objects.filter(o => o.type === 'group' && !o.frame && members.has(o.id)).length,
    ranks,
    tree: !cyclic && starts === 1 && nodes.every(n => (incoming.get(n.id) ?? 0) <= 1),
    labels: labelled.length
      ? labelled.reduce((sum, e) => sum + e.label.length, 0) / labelled.length
      : 0,
    scope,
    ...(root && ['lanes', 'sequence', 'cells'].includes(root.algorithm) && !root.engine
      ? { fixed: root.algorithm }
      : {}),
    layout: root?.engine?.algorithm ?? root?.algorithm ?? (scope === 'root' ? 'flow' : 'column'),
    ...(root?.engine ? { engine: root.engine.algorithm } : {}),
    direction: root?.direction ?? 'auto',
  };
}

// --- Candidates --------------------------------------------------------------------------------

/** The engine a scope's sweeps use when they don't name one. */
const defaultEngine = (shape: Shape) =>
  shape.engine ?? (shape.groups ? 'compound-flow' : 'layered');

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
  // A stricter router only helps a drawing that has crossings; routing is the whole file's.
  const router =
    base.crossings && shape.scope === 'root'
      ? [
          {
            edits: [{ kind: 'routing', attrs: { 'crossing-penalty': '900' } } as Edit],
            why: `keep the layout, route around its ${base.crossings} crossing${base.crossings > 1 ? 's' : ''} harder`,
          },
        ]
      : [];
  if (shape.fixed) {
    if (shape.scope === 'root')
      out.push(...router, {
        edits: [{ kind: 'routing', attrs: { 'edge-gap': '28' } }],
        why: `a ${shape.fixed} root keeps its layout; more room between parallel lines`,
      });
    return out;
  }
  const layout = (attrs: Record<string, string | null>): Edit => ({
    kind: 'layout',
    scope: shape.scope,
    attrs,
  });
  const engine = defaultEngine(shape),
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

/** One `--try` axis: a source setting and the values to try. */
export interface Axis {
  key: string;
  values: string[];
}

const DIRECTIONS = ['right', 'down'];

/** The shared step values for a setting: the same ones the viewer's Compare sweeps. */
function steps(key: string): string[] | undefined {
  if (key === 'engine') return [...ENGINES];
  if (key === 'direction') return DIRECTIONS;
  const engine = ENGINE_PARAMS[key],
    route = ROUTING_PARAMS[key];
  const def = engine
    ? ExplorerLab.layoutParams[engine.key]
    : route && ExplorerLab.routeParams[route.key];
  if (def) return def.values.map(String);
  const p = engine ?? route;
  if (p && 'choices' in p && p.choices.length) return [...p.choices];
  return undefined;
}

/**
 * Read `--try key=a,b`, or `--try key` for the shared steps. Keys are source attribute names:
 * `engine`, `direction`, a `layout` engine setting or a `routing` setting.
 */
export function parseTry(text: string): Axis {
  const [key, list] = text.split('=', 2);
  const engine = ENGINE_PARAMS[key],
    route = ROUTING_PARAMS[key];
  if (key !== 'engine' && key !== 'direction' && (!engine || key === 'root') && !route)
    throw Error(
      `--try ${key}: not a setting. Use engine, direction, ${Object.keys(ENGINE_PARAMS)
        .filter(k => k !== 'root')
        .join(', ')}, or a routing setting (${Object.keys(ROUTING_PARAMS).join(', ')}).`,
    );
  const values =
    list === undefined
      ? steps(key)
      : list
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);
  if (!values?.length) throw Error(`--try ${key} needs values: --try ${key}=a,b.`);
  const p = engine ?? route;
  for (const v of values) {
    const ok =
      key === 'engine'
        ? ENGINES.includes(v as never)
        : key === 'direction'
          ? [...DIRECTIONS, 'auto'].includes(v)
          : 'choices' in p!
            ? p.choices.includes(v)
            : Number.isFinite(Number(v)) && +v >= p!.min && +v <= p!.max;
    if (!ok)
      throw Error(
        `--try ${key}=${v}: ${
          key === 'engine'
            ? `use ${ENGINES.join(', ')}`
            : key === 'direction'
              ? 'use right, down or auto'
              : 'choices' in p!
                ? `use ${p.choices.join(', ')}`
                : `use ${p!.min} to ${p!.max}`
        }.`,
      );
  }
  return { key, values: [...new Set(values)] };
}

/**
 * Every combination of one or two axes, in order: the first axis varies fastest. A layout
 * setting on a scope without an engine also sets the scope's engine, since built-in recipes
 * take no engine settings.
 */
export function sweep(shape: Shape, axes: Axis[]): Array<Pick<Variant, 'edits' | 'why'>> {
  if (axes.length > 2) throw Error('Use at most two --try axes.');
  if (axes.length === 2 && axes[0].key === axes[1].key)
    throw Error('Use two different --try settings.');
  const count = axes.reduce((n, a) => n * a.values.length, 1);
  if (count > 12) throw Error(`That sweep has ${count} variants. Keep it to 12 or fewer.`);
  const layoutKeys = axes.filter(a => !ROUTING_PARAMS[a.key]);
  if (layoutKeys.length && shape.fixed)
    throw Error(`The ${shape.scope} scope uses ${shape.fixed}; only routing settings vary there.`);
  const needsEngine =
    layoutKeys.some(a => a.key !== 'direction') &&
    !layoutKeys.some(a => a.key === 'engine') &&
    !shape.engine;
  const [a, b] = axes;
  const out: Array<Pick<Variant, 'edits' | 'why'>> = [];
  for (const bv of b ? b.values : [undefined])
    for (const av of a.values) {
      const set: Array<[string, string]> = [
        [a.key, av],
        ...(b ? [[b.key, bv!] as [string, string]] : []),
      ];
      const layoutAttrs: Record<string, string> = needsEngine
          ? { engine: defaultEngine(shape) }
          : {},
        routingAttrs: Record<string, string> = {};
      for (const [k, v] of set) (ROUTING_PARAMS[k] ? routingAttrs : layoutAttrs)[k] = v;
      const edits: Edit[] = [
        ...(Object.keys(layoutAttrs).length
          ? [{ kind: 'layout', scope: shape.scope, attrs: layoutAttrs } as Edit]
          : []),
        ...(Object.keys(routingAttrs).length
          ? [{ kind: 'routing', attrs: routingAttrs } as Edit]
          : []),
      ];
      out.push({
        edits,
        why: `--try ${set.map(([k, v]) => `${k}=${v}`).join(' ')}${needsEngine ? ` (with engine=${defaultEngine(shape)})` : ''}`,
      });
    }
  return out;
}

/**
 * The documented broad sweep: `layered`, `compound-flow` and `flow`, plus `tree` for a tree with
 * one start, each reading right and then down. Always the same list for the same shape.
 */
export function grid(shape: Shape): Array<Pick<Variant, 'edits' | 'why'>> {
  if (shape.fixed)
    throw Error(`The ${shape.scope} scope uses ${shape.fixed}; --grid varies engines.`);
  const engines = ['layered', 'compound-flow', 'flow', ...(shape.tree ? ['tree'] : [])];
  return engines.flatMap(engine =>
    DIRECTIONS.map(direction => ({
      edits: [{ kind: 'layout', scope: shape.scope, attrs: { engine, direction } } as Edit],
      why: `--grid: ${engine} reading ${direction}`,
    })),
  );
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
  /** How many variants to keep besides the current file (suggestions only). */
  limit?: number;
  prefer?: Prefer;
  /** `--try` axes: try exactly these settings, in order, instead of suggesting. */
  axes?: Axis[];
  /** `--grid`: the documented engine and direction sweep. */
  grid?: boolean;
  /** The scope whose `layout` line varies: `root` (default) or a framed group. */
  scope?: string;
}

export interface VaryResult {
  shape: Shape;
  mode: 'suggest' | 'try' | 'grid';
  /** `v0` (the file as it is) first, then the kept variants: ranked, or in sweep order. */
  variants: Variant[];
  /** The variant to apply, or `v0` when none improves on the file. */
  recommended: string;
  tried: number;
  /** Variants that did not compile, with the reason. */
  failed: Array<{ title: string; error: string }>;
  /** Source and SVG for each listed variant, by id. */
  drawn: Map<string, Measured>;
}

/** Refuse a `--scope` that is not the root or a framed group. */
function checkScope(scene: Scene, scope: string) {
  if (scope === 'root') return;
  const o = scene.byId.get(scope) ?? scene.model.objects.find(x => x.id === scope);
  if (!o || o.type !== 'group')
    throw Error(
      `--scope ${scope}: not a group. Groups: ${scene.model.objects
        .filter(x => x.type === 'group')
        .map(x => x.id)
        .join(', ')}.`,
    );
  if (o.frame) throw Error(`--scope ${scope}: a ${o.frame} group has no layout of its own.`);
}

/**
 * Try variants of `source` and measure each one. Suggestions drop duplicates of earlier drawings
 * and are ranked against the file as it is; `--try` and `--grid` keep every variant in sweep
 * order and tag repeats.
 */
export async function vary(source: string, opts: VaryOptions = {}): Promise<VaryResult> {
  const prefer = opts.prefer ?? 'fewer-crossings',
    scope = opts.scope ?? 'root',
    mode = opts.axes?.length ? 'try' : opts.grid ? 'grid' : 'suggest',
    limit = mode === 'suggest' ? (opts.limit ?? 4) : 12;
  const scene = await compile(source);
  checkScope(scene, scope);
  const shape = shapeOf(scene, scope),
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
  // The first variant to draw each picture; ids are given after ranking, so keep the objects.
  const seen = new Map<string, Variant>([[base.key, v0]]),
    drawn = new Map<string, Measured>([['v0', { variant: v0, source, svg: base.svg }]]),
    found: Array<{ variant: Variant; measured: Measured; same?: Variant }> = [],
    failed: VaryResult['failed'] = [];
  const candidates =
    mode === 'try'
      ? sweep(shape, opts.axes!)
      : mode === 'grid'
        ? grid(shape)
        : suggestions(shape, base.metrics);
  for (const c of candidates) {
    const { source: next, changes } = applyEdits(source, c.edits);
    const variant: Variant = {
      id: '',
      title: titleOf(c.edits),
      why: c.why,
      edits: c.edits,
      lines: changes,
      tags: [],
    };
    if (!changes.length && mode === 'suggest') continue;
    try {
      const d = await draw(next);
      const same = seen.get(d.key);
      if (same && mode === 'suggest') continue;
      variant.metrics = { ...d.metrics, moved: movedFrom(base.centers, d.centers) };
      found.push({ variant, measured: { variant, source: next, svg: d.svg }, same });
      if (!same) seen.set(d.key, variant);
    } catch (error) {
      failed.push({
        title: variant.title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const better = (v: Variant) => improves(v.metrics!, v0.metrics!);
  if (mode === 'suggest')
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
  // Sweeps keep repeats in place so the order stays the documented one; say which they repeat.
  for (const f of kept) if (f.same) f.variant.tags.push(`same as ${f.same.id}`);
  const variants = [v0, ...kept.map(f => f.variant)];
  tag(variants.filter(v => !v.tags.some(t => t.startsWith('same as'))));
  const pick = kept
    .map(f => f.variant)
    .filter(v => better(v) && !v.tags.some(t => t.startsWith('same as')))
    .sort((a, b) => compareKeys(keys(a.metrics!, prefer), keys(b.metrics!, prefer)))[0];
  const recommended = pick?.id ?? 'v0';
  variants.find(v => v.id === recommended)!.tags.unshift('recommended');
  return { shape, mode, variants, recommended, tried: candidates.length, failed, drawn };
}
