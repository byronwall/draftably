/**
 * The `.draft` diagram language: a line-based source format that keeps comments, plus a model
 * parser and a formatter. Adapted from the Meld 0.1 prototype in `reference/meld/original`.
 *
 * Source is kept as a list of lines so that edits can change single statements and formatting
 * keeps every comment and unrelated statement.
 */
import {
  BUILT_IN_FAMILIES,
  defaultAppearance,
  groupShadeFor,
  NODE_SHADE,
  HEX_COLOR,
  isBuiltInFamily,
  OVERRIDE_LIMITS,
  SHADES,
  THEME_IDS,
  type DiagramAppearance,
  type Shade,
  type ThemeId,
} from '../model/appearance';
import { FONT_ROLES, type FontRole } from '../model/fonts';
import type { Status } from '../model/status';
import type {
  ColorKey,
  LayoutAlgorithmId,
  LayoutSettings,
  PortSide,
  RoutingSettings,
  ShapeKind,
} from '../model/types';

export class DslError extends Error {
  constructor(
    message: string,
    readonly line = 0,
  ) {
    super((line ? `Line ${line}: ` : '') + message);
    this.name = 'DslError';
  }
}

/** Change marks before `node`, `group` and `edge`, read like a diff, and the status each sets. */
export const MARKS = { '+': 'added', '-': 'removed', '~': 'changed', '.': 'context' } as const;
export type Mark = keyof typeof MARKS;

/** A word in a statement. Quoted words are strings; bare words are identifiers and numbers. */
export interface Word {
  value: string;
  quoted: boolean;
}

export interface Statement {
  kind: 'statement';
  command: string;
  /** Change mark written before the command, as in a diff: `+`, `-`, `~` or `.`. */
  mark?: Mark;
  args: Word[];
  attrs: Array<[string, Word]>;
  /** Inline comment including its `#` or `//` marker. */
  comment?: string;
  /** 1-based line in the source this statement was parsed from; 0 when added by an edit. */
  line: number;
}

export type SourceLine = { kind: 'blank' } | { kind: 'comment'; text: string } | Statement;

export interface SourceDoc {
  lines: SourceLine[];
}

export const bare = (value: string | number): Word => ({ value: String(value), quoted: false });
export const quoted = (value: string): Word => ({ value, quoted: true });

// --- Tokens ------------------------------------------------------------------------------------

/** Split one line into raw tokens and a trailing comment. Quoted tokens keep their quotes. */
export function tokenize(text: string, line = 0): { tokens: string[]; comment?: string } {
  const tokens: string[] = [];
  let token = '',
    inQuote = false,
    escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      token += c;
      escaped = false;
      continue;
    }
    if (inQuote && c === '\\') {
      token += c;
      escaped = true;
      continue;
    }
    if (c === '"') {
      inQuote = !inQuote;
      token += c;
      continue;
    }
    if (!inQuote && (c === '#' || (c === '/' && text[i + 1] === '/'))) {
      if (token) tokens.push(token);
      return { tokens, comment: text.slice(i).trim() };
    }
    if (!inQuote && /\s/.test(c)) {
      if (token) tokens.push(token);
      token = '';
    } else token += c;
  }
  if (inQuote) throw new DslError('Unclosed quoted string.', line);
  if (token) tokens.push(token);
  return { tokens };
}

function word(raw: string, line: number): Word {
  if (!raw.startsWith('"')) return bare(raw);
  try {
    return quoted(JSON.parse(raw));
  } catch {
    throw new DslError('Invalid quoted string or escape.', line);
  }
}

/** Read source text into lines. Only lexical errors are reported here. */
export function readSource(source: string): SourceDoc {
  if (typeof source !== 'string') throw new DslError('Source must be text.');
  if (source.length > 300_000) throw new DslError('Limit: 300,000 source characters.');
  const lines: SourceLine[] = source.split(/\r?\n/).map((text, i) => {
    const line = i + 1,
      { tokens, comment } = tokenize(text, line);
    if (!tokens.length) return comment ? { kind: 'comment', text: comment } : { kind: 'blank' };
    const [first, ...rest] = tokens,
      mark = MARKS[first[0] as Mark] && first.length > 1 ? (first[0] as Mark) : undefined,
      command = mark ? first.slice(1) : first,
      args: Word[] = [],
      attrs: Array<[string, Word]> = [];
    for (const raw of rest) {
      const eq = raw.indexOf('=');
      if (eq > 0 && !raw.startsWith('"')) {
        const key = raw.slice(0, eq);
        if (attrs.some(([k]) => k === key)) throw new DslError(`Duplicate attribute ${key}.`, line);
        attrs.push([key, word(raw.slice(eq + 1), line)]);
      } else args.push(word(raw, line));
    }
    return { kind: 'statement', command, ...(mark ? { mark } : {}), args, attrs, comment, line };
  });
  return { lines };
}

// --- Formatting --------------------------------------------------------------------------------

const BARE = /^[A-Za-z0-9_.+-]+$|^->$/;
const printWord = (w: Word) =>
  w.quoted || !BARE.test(w.value) ? JSON.stringify(w.value) : w.value;

export function printStatement(s: Statement): string {
  const parts = [
    (s.mark ?? '') + s.command,
    ...s.args.map(printWord),
    ...s.attrs.map(([k, v]) => k + '=' + printWord(v)),
  ];
  return parts.join(' ') + (s.comment ? ' ' + s.comment : '');
}

/**
 * Print source consistently: one space between words, no indentation, at most one blank line in a
 * row, and a final newline. Comments and statement order are kept.
 */
export function printSource(doc: SourceDoc): string {
  const out: string[] = [];
  for (const line of doc.lines) {
    if (line.kind === 'blank') {
      if (out.length && out.at(-1) !== '') out.push('');
    } else out.push(line.kind === 'comment' ? line.text : printStatement(line));
  }
  while (out.at(-1) === '') out.pop();
  return out.join('\n') + '\n';
}

/** Format source text. Throws `DslError` for lexical errors; semantics are not checked. */
export const formatSource = (source: string) => printSource(readSource(source));

// --- Model -------------------------------------------------------------------------------------

export type DslColor = ColorKey | 'auto';
export type DslShape = Exclude<ShapeKind, 'icon' | 'image'>;
export type Algorithm = 'flow' | 'row' | 'column';

export interface ModelObject {
  id: string;
  type: 'node' | 'group';
  label: string;
  parent: string;
  color: DslColor;
  /** Explicit shade; omitted means the default for the object type. */
  shade?: Shade;
  shape: DslShape;
  /** From a change mark; unchanged when omitted. */
  status?: Status;
  /** With `~`: the label before the change. */
  was?: string;
  /** A link to open from exported drawings, such as a source file or URL. */
  href?: string;
  /** Nodes only: how many things this one box stands for, drawn as a stack with a badge. */
  count?: number;
  line: number;
}

export interface ModelEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  dashed: boolean;
  from: PortSide;
  to: PortSide;
  /** From a change mark; unchanged when omitted. */
  status?: Status;
  /** With `~`: the label before the change. */
  was?: string;
  line: number;
}

/** A layout engine run cold over a scope's subtree; see `src/engines/layout-engine.js`. */
export interface EngineRecipe {
  algorithm: LayoutAlgorithmId;
  params: Partial<LayoutSettings>;
}

export interface ModelLayout {
  scope: string;
  algorithm: Algorithm;
  /** Set when the scope is arranged by a layout engine instead of a built-in recipe. */
  engine?: EngineRecipe;
  direction: 'auto' | 'right' | 'down';
  /** `flow` only: whether a long run of ranks folds into bands. Engines take `fold` as a param. */
  fold: 'auto' | 'never';
  gap: number;
  minWidth: number;
  minHeight: number;
  line: number;
}

export type Hint =
  | { type: 'order'; scope: string; ids: string[]; line: number }
  | { type: 'align'; axis: 'x' | 'y'; ids: string[]; strength: Strength; line: number }
  | {
      type: 'near';
      id: string;
      ref: string;
      side: NearSide;
      gap: number;
      offset: number;
      strength: Strength;
      line: number;
    }
  | { type: 'nudge'; id: string; dx: number; dy: number; line: number }
  | { type: 'stay'; id: string; x: number; y: number; weight: number; line: number }
  | { type: 'pin'; id: string; x: number; y: number; line: number }
  | { type: 'size'; id: string; width: number; height: number; line: number };

export type Strength = 'prefer' | 'required';
export type NearSide = 'right' | 'left' | 'above' | 'below';
export type HintType = Hint['type'];
export const POSITION_HINTS: HintType[] = ['near', 'nudge', 'stay', 'pin'];

export interface Model {
  title: string;
  objects: ModelObject[];
  edges: ModelEdge[];
  layouts: ModelLayout[];
  hints: Hint[];
  /** Router settings from a `routing` statement. */
  routing: Partial<RoutingSettings>;
  /** Theme, overrides and color definitions from `theme` and `theme-color` statements. */
  appearance: DiagramAppearance;
  /** Source line of the `theme` statement, and of each `theme-color` by `family:shade`. */
  themeLine: number;
  colorLines: Map<string, number>;
  /** Source line of each `legend` entry, in order. */
  legendLines: number[];
}

/** Theme attributes in the file and the override each sets. */
export const THEME_ATTRS = {
  'padding-x': 'paddingX',
  'padding-y': 'paddingY',
  radius: 'radius',
  'title-font': 'titleFont',
  'annotation-font': 'annotationFont',
  canvas: 'canvas',
  text: 'text',
  connection: 'connection',
} as const;

// --- Engine and routing parameters ------------------------------------------------------------

type Param<K extends string> =
  { key: K; min: number; max: number } | { key: K; choices: readonly string[] };

/**
 * Layout engines a file can name. `separate` is left out: it only repairs overlaps in the current
 * drawing, so it cannot be recomputed from the source.
 */
export const ENGINES: readonly LayoutAlgorithmId[] = [
  'compound-flow',
  'boundary-align',
  'compound-spring',
  'tidy',
  'stress',
  'force',
  'flow',
  'layered',
  'tree',
  'grid',
];

/** Engine settings by source attribute. Ranges match the engine's own limits. */
export const ENGINE_PARAMS: Record<string, Param<keyof LayoutSettings>> = {
  'rank-gap': { key: 'rankGap', min: 12, max: 220 },
  'group-gap': { key: 'groupGap', min: 12, max: 180 },
  'node-gap': { key: 'nodeGap', min: 4, max: 160 },
  'boundary-pull': { key: 'boundaryPull', min: 0, max: 100 },
  'hierarchy-sweeps': { key: 'hierarchySweeps', min: 1, max: 4 },
  'edge-length': { key: 'edgeLength', min: 20, max: 260 },
  repulsion: { key: 'repulsion', min: 0, max: 100 },
  'flow-strength': { key: 'flowStrength', min: 0, max: 100 },
  alignment: { key: 'alignment', min: 0, max: 100 },
  compactness: { key: 'compactness', min: 0, max: 100 },
  'grid-strength': { key: 'gridStrength', min: 0, max: 100 },
  ordering: { key: 'ordering', choices: ['stable', 'crossings'] },
  fold: { key: 'fold', choices: ['auto', 'never'] },
  aspect: { key: 'aspect', choices: ['1', '1.333', '1.6', '2', '0.75'] },
  root: { key: 'rootId', choices: [] },
};

/** Router settings by source attribute. Ranges match the router's own limits. */
export const ROUTING_PARAMS: Record<string, Param<keyof RoutingSettings>> = {
  clearance: { key: 'clearance', min: 4, max: 30 },
  'port-gap': { key: 'portGap', min: 6, max: 28 },
  'edge-gap': { key: 'edgeGap', min: 4, max: 48 },
  'bend-penalty': { key: 'bendPenalty', min: 0, max: 100 },
  'crossing-penalty': { key: 'crossingPenalty', min: 0, max: 1200 },
  'shared-penalty': { key: 'sharedPenalty', min: 0, max: 20 },
  'parallel-penalty': { key: 'parallelPenalty', min: 0, max: 60 },
  'port-stability': { key: 'portStability', min: 0, max: 150 },
  'fanout-penalty': { key: 'fanoutPenalty', min: 0, max: 160 },
  passes: { key: 'passes', min: 1, max: 5 },
  'corner-radius': { key: 'cornerRadius', min: 0, max: 16 },
  standoff: { key: 'standoff', min: 0, max: 40 },
};

/** Source attribute for an engine or router setting. */
export const paramAttr = (table: Record<string, Param<string>>, key: string) =>
  Object.keys(table).find(attr => table[attr].key === key);

const ID = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
export const isIdentifier = (s: string) => ID.test(s);

export const COLORS: DslColor[] = ['auto', ...BUILT_IN_FAMILIES];
const FAMILY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
export const DSL_SHAPES: DslShape[] = ['box', 'pill', 'circle', 'diamond', 'text'];
const KINDS = ['group', 'service', 'app', 'database', 'queue', 'person', 'document'];
const SIDES: PortSide[] = ['auto', 'left', 'right', 'top', 'bottom'];

/** Parse and validate source. Throws `DslError` with a line number for the first problem. */
export function parseModel(source: string | SourceDoc): Model {
  const doc = typeof source === 'string' ? readSource(source) : source;
  const m: Model = {
    title: 'Untitled diagram',
    objects: [],
    edges: [],
    layouts: [],
    hints: [],
    routing: {},
    appearance: defaultAppearance(),
    themeLine: 0,
    colorLines: new Map(),
    legendLines: [],
  };
  const objectIds = new Set<string>(),
    edgeIds = new Set<string>(),
    unique = new Set<string>();
  let diagramLine = 0;

  for (const s of doc.lines) {
    if (s.kind !== 'statement') continue;
    const line = s.line,
      { command, args } = s,
      attrs = new Map(s.attrs);
    const fail = (message: string): never => {
      throw new DslError(message, line);
    };
    const assert = (ok: unknown, message: string) => {
      if (!ok) fail(message);
    };
    const allow = (allowed: string[]) => {
      for (const key of attrs.keys())
        assert(allowed.includes(key), `Unknown ${command} attribute: ${key}.`);
    };
    const count = (lo: number, hi = lo) =>
      assert(args.length >= lo && args.length <= hi, `Wrong number of arguments for ${command}.`);
    const id = (w: Word | undefined) => {
      assert(
        w && !w.quoted && ID.test(w.value),
        'Expected a stable identifier (letters, digits, _, . or -).',
      );
      return w!.value;
    };
    const text = (w: Word | undefined) => w?.value ?? '';
    const num = (key: string, fallback: number, min = -100_000, max = 100_000) => {
      const w = attrs.get(key);
      if (w === undefined) return fallback;
      const n = Number(w.value);
      assert(
        !w.quoted && Number.isFinite(n) && n >= min && n <= max,
        `Expected ${key} from ${min} to ${max}; got ${w.value}.`,
      );
      return n;
    };
    const choice = <T extends string>(key: string, fallback: T, choices: readonly T[]): T => {
      const value = (attrs.get(key)?.value ?? fallback) as T;
      assert(choices.includes(value), `Expected ${key}=${choices.join('|')}; got ${value}.`);
      return value;
    };
    const shadeOf = (w: Word) => {
      const n = Number(w.value);
      assert(
        !w.quoted && SHADES.includes(n as Shade),
        `Expected shade=${SHADES.join('|')}; got ${w.value}.`,
      );
      return n as Shade;
    };
    const hex = (key: string) => {
      const w = attrs.get(key)!;
      assert(
        w.quoted && HEX_COLOR.test(w.value),
        `Expected ${key}="#rrggbb" in double quotes; got ${w.value || 'nothing'}.`,
      );
      return w.value.toUpperCase();
    };
    const once = (key: string) => {
      assert(!unique.has(key), `Duplicate declaration: ${key}. Edit the existing line instead.`);
      unique.add(key);
    };
    const status: Status | undefined = s.mark && MARKS[s.mark];
    assert(
      !s.mark || ['node', 'group', 'edge'].includes(command),
      `Only node, group and edge lines take a ${s.mark} mark.`,
    );
    const was = () => {
      const w = attrs.get('was');
      if (!w) return {};
      assert(s.mark === '~', 'was= belongs on a changed (~) line.');
      return { was: w.value };
    };
    const readParams = <K extends string>(table: Record<string, Param<K>>) => {
      const out: Record<string, string | number> = {};
      for (const [attr, p] of Object.entries(table)) {
        if (!attrs.has(attr)) continue;
        if ('min' in p) out[p.key] = num(attr, 0, p.min, p.max);
        else if (p.choices.length) out[p.key] = choice(attr, p.choices[0], p.choices);
        else out[p.key] = id(attrs.get(attr));
      }
      return out as never;
    };

    switch (command) {
      case 'diagram':
        count(1);
        allow(['version']);
        assert(!diagramLine, 'Only one diagram declaration is allowed.');
        diagramLine = line;
        m.title = text(args[0]);
        num('version', 1, 1, 1);
        if (m.title) (m.appearance.heading ??= {}).title = m.title;
        break;
      case 'compare':
        count(0, 2);
        allow([]);
        once('compare');
        m.appearance.compare = {
          before: text(args[0]) || 'Before',
          after: text(args[1]) || 'After',
        };
        break;
      case 'subtitle':
        count(1);
        allow([]);
        once('subtitle');
        assert(text(args[0]).trim(), 'A subtitle needs its text in quotes.');
        (m.appearance.heading ??= {}).subtitle = text(args[0]);
        break;
      case 'node':
      case 'group': {
        count(2);
        allow(
          command === 'node'
            ? [
                'in',
                'color',
                'shade',
                'shape',
                'was',
                'href',
                'count',
                'kind',
                'detail',
                'priority',
              ]
            : ['in', 'color', 'shade', 'was', 'href', 'kind', 'detail', 'priority'],
        );
        const oid = id(args[0]);
        assert(oid !== 'root', 'root is reserved for the outer layout scope.');
        assert(!objectIds.has(oid), `Duplicate node/group id ${oid}.`);
        objectIds.add(oid);
        const color = attrs.get('color')?.value ?? 'auto';
        assert(
          !attrs.get('color')?.quoted && FAMILY.test(color),
          `Expected color=auto, a built-in color (${BUILT_IN_FAMILIES.join(', ')}) or a theme-color name; got ${color}.`,
        );
        const shade = attrs.has('shade') ? shadeOf(attrs.get('shade')!) : undefined;
        if (attrs.has('kind')) choice('kind', 'service', KINDS);
        num('priority', 5, 1, 10);
        m.objects.push({
          id: oid,
          type: command,
          label: text(args[1]),
          parent: attrs.has('in') ? id(attrs.get('in')) : 'root',
          color,
          ...(shade !== undefined ? { shade } : {}),
          shape: command === 'node' ? choice('shape', 'box', DSL_SHAPES) : 'box',
          ...(s.mark ? { status } : {}),
          ...was(),
          ...(attrs.has('href') ? { href: text(attrs.get('href')) } : {}),
          ...(attrs.has('count') ? { count: num('count', 2, 2, 1_000_000) } : {}),
          line,
        });
        break;
      }
      case 'edge': {
        count(4, 5);
        allow(['kind', 'from', 'to', 'was', 'importance']);
        assert(
          args[2]?.value === '->' && !args[2].quoted,
          'Edges use: edge id source -> target "label".',
        );
        const eid = id(args[0]);
        assert(!edgeIds.has(eid), `Duplicate edge id ${eid}.`);
        edgeIds.add(eid);
        num('importance', 7, 1, 10);
        m.edges.push({
          id: eid,
          source: id(args[1]),
          target: id(args[3]),
          label: text(args[4]),
          dashed: choice('kind', 'sync', ['sync', 'async', 'data']) === 'async',
          from: choice('from', 'auto', SIDES),
          to: choice('to', 'auto', SIDES),
          ...(s.mark ? { status } : {}),
          ...was(),
          line,
        });
        break;
      }
      case 'layout': {
        const scope = id(args[0]);
        once('layout:' + scope);
        const named = attrs.get('engine')?.value as LayoutAlgorithmId | undefined;
        const common = ['direction', 'min-width', 'min-height'];
        let engine: EngineRecipe | undefined;
        if (named !== undefined) {
          count(1);
          assert(
            ENGINES.includes(named),
            `Unknown layout engine ${named}; use ${ENGINES.join(', ')}.`,
          );
          allow(['engine', ...common, ...Object.keys(ENGINE_PARAMS)]);
          engine = { algorithm: named, params: readParams(ENGINE_PARAMS) };
        } else {
          count(2);
          allow(['gap', ...(args[1]?.value === 'flow' ? ['fold'] : []), ...common]);
        }
        const algorithm = (named ? 'flow' : args[1]?.value) as Algorithm;
        assert(
          ['flow', 'row', 'column'].includes(algorithm),
          `The ${algorithm} recipe is not supported; use flow, row or column, or engine=.`,
        );
        m.layouts.push({
          scope,
          algorithm,
          ...(engine ? { engine } : {}),
          direction: choice('direction', 'auto', ['auto', 'right', 'down'] as const),
          fold: named ? 'auto' : choice('fold', 'auto', ['auto', 'never'] as const),
          gap: num('gap', 28, 8, 300),
          minWidth: num('min-width', 0, 0, 10_000),
          minHeight: num('min-height', 0, 0, 10_000),
          line,
        });
        break;
      }
      case 'theme': {
        count(1);
        allow(Object.keys(THEME_ATTRS));
        once('theme');
        const name = args[0].value as ThemeId;
        assert(THEME_IDS.includes(name), `Unknown theme ${name}; use ${THEME_IDS.join(', ')}.`);
        m.appearance.theme = name;
        m.themeLine = line;
        const o = m.appearance.overrides;
        for (const [attr, key] of Object.entries(THEME_ATTRS)) {
          if (!attrs.has(attr)) continue;
          if (key === 'paddingX' || key === 'paddingY' || key === 'radius')
            o[key] = num(attr, 0, OVERRIDE_LIMITS[key].min, OVERRIDE_LIMITS[key].max);
          else if (key === 'titleFont' || key === 'annotationFont')
            o[key] = choice<FontRole>(attr, 'sans', FONT_ROLES);
          else o[key] = hex(attr);
        }
        break;
      }
      case 'theme-color': {
        count(1);
        allow(['shade', 'fill', 'stroke', 'ink']);
        const family = args[0].value;
        assert(
          !args[0].quoted && FAMILY.test(family) && family !== 'auto',
          'Expected a color family name (letters, digits, _ or -).',
        );
        const shade = attrs.has('shade') ? shadeOf(attrs.get('shade')!) : 500;
        once(`theme-color:${family}:${shade}`);
        const def = { family, shade } as DiagramAppearance['colors'][number];
        for (const key of ['fill', 'stroke', 'ink'] as const)
          if (attrs.has(key)) def[key] = hex(key);
        assert(
          isBuiltInFamily(family) || (def.fill && def.stroke && def.ink),
          `${family} is not a built-in color, so shade ${shade} needs fill, stroke and ink.`,
        );
        assert(def.fill || def.stroke || def.ink, 'Set at least one of fill, stroke and ink.');
        m.appearance.colors.push(def);
        m.colorLines.set(`${family}:${shade}`, line);
        break;
      }
      case 'legend': {
        count(2);
        allow(['shade']);
        const family = args[0].value;
        assert(
          !args[0].quoted && FAMILY.test(family) && family !== 'auto',
          `Expected legend family "meaning", with a built-in color (${BUILT_IN_FAMILIES.join(', ')}) or a theme-color name.`,
        );
        once(`legend:${family}:${attrs.get('shade')?.value ?? ''}`);
        const shade = attrs.has('shade') ? shadeOf(attrs.get('shade')!) : undefined;
        assert(text(args[1]).trim(), 'A legend entry needs its meaning in quotes.');
        (m.appearance.legend ??= []).push({
          family,
          label: text(args[1]),
          ...(shade !== undefined ? { shade } : {}),
        });
        m.legendLines.push(line);
        break;
      }
      case 'routing':
        count(0);
        allow(Object.keys(ROUTING_PARAMS));
        once('routing');
        m.routing = readParams(ROUTING_PARAMS);
        break;
      case 'order':
        count(2, 300);
        allow([]);
        m.hints.push({ type: 'order', scope: id(args[0]), ids: args.slice(1).map(id), line });
        once('order:' + args[0].value);
        break;
      case 'align': {
        count(3, 300);
        allow(['strength']);
        const axis = args[0]?.value;
        assert(axis === 'x' || axis === 'y', 'Expected align x or align y.');
        const ids = args.slice(1).map(id);
        once(`align:${axis}:${ids.join(',')}`);
        m.hints.push({
          type: 'align',
          axis: axis as 'x' | 'y',
          ids,
          strength: choice('strength', 'prefer', ['prefer', 'required'] as const),
          line,
        });
        break;
      }
      case 'near':
      case 'nudge':
      case 'stay':
      case 'pin':
      case 'size': {
        count(command === 'near' ? 2 : 1);
        const hid = id(args[0]);
        once(`${command}:${hid}`);
        if (command === 'near') {
          allow(['side', 'gap', 'offset', 'strength']);
          const ref = id(args[1]);
          assert(ref !== hid, 'An object cannot be placed relative to itself.');
          m.hints.push({
            type: 'near',
            id: hid,
            ref,
            side: choice('side', 'right', ['right', 'left', 'above', 'below'] as const),
            gap: num('gap', 28, 0, 2000),
            offset: num('offset', 0),
            strength: choice('strength', 'prefer', ['prefer', 'required'] as const),
            line,
          });
        } else if (command === 'nudge') {
          allow(['dx', 'dy']);
          m.hints.push({ type: 'nudge', id: hid, dx: num('dx', 0), dy: num('dy', 0), line });
        } else if (command === 'stay') {
          allow(['x', 'y', 'weight']);
          m.hints.push({
            type: 'stay',
            id: hid,
            // The root has no frame, so an arrangement can place objects left of or above 0,0.
            x: num('x', 0),
            y: num('y', 0),
            weight: num('weight', 8, 1, 100),
            line,
          });
        } else if (command === 'pin') {
          allow(['x', 'y']);
          m.hints.push({ type: 'pin', id: hid, x: num('x', 0, 0), y: num('y', 0, 0), line });
        } else {
          allow(['width', 'height']);
          m.hints.push({
            type: 'size',
            id: hid,
            width: num('width', 164, 40, 1200),
            height: num('height', 56, 24, 1200),
            line,
          });
        }
        break;
      }
      case 'view':
      case 'snapshot':
      case 'box':
        fail(`${command} statements are not supported yet. Remove them to open this file.`);
        break;
      default:
        fail(`Unknown statement ${command}.`);
    }
  }

  if (m.objects.length > 500) throw new DslError('Limit: 500 nodes and groups.');
  if (m.edges.length > 1200) throw new DslError('Limit: 1,200 edges.');
  validateReferences(m);
  return m;
}

function validateReferences(m: Model) {
  const by = new Map(m.objects.map(o => [o.id, o]));
  const assert = (ok: unknown, message: string, line: number) => {
    if (!ok) throw new DslError(message, line);
  };
  const exists = (id: string, line: number) =>
    assert(by.has(id), `Unknown node/group ${id}.`, line);
  const scope = (id: string, line: number) =>
    assert(id === 'root' || by.get(id)?.type === 'group', `Unknown container ${id}.`, line);
  const defined = new Map<string, Set<number>>();
  for (const c of m.appearance.colors) {
    if (!defined.has(c.family)) defined.set(c.family, new Set());
    defined.get(c.family)!.add(c.shade);
  }
  (m.appearance.legend ?? []).forEach((e, i) => {
    if (isBuiltInFamily(e.family)) return;
    const shades = defined.get(e.family),
      shade = e.shade ?? NODE_SHADE;
    assert(
      shades?.has(shade),
      shades
        ? `${e.family} has no shade ${shade}; it defines ${[...shades].sort((a, b) => a - b).join(', ')}.`
        : `Unknown color ${e.family}. Define it with theme-color ${e.family} shade=… fill= stroke= ink=.`,
      m.legendLines[i],
    );
  });
  for (const o of m.objects) {
    if (o.color !== 'auto' && !isBuiltInFamily(o.color)) {
      const shades = defined.get(o.color),
        shade = o.shade ?? (o.type === 'group' ? groupShadeFor(m.appearance.theme) : NODE_SHADE);
      assert(
        shades,
        `Unknown color ${o.color}. Define it with theme-color ${o.color} shade=… fill= stroke= ink=.`,
        o.line,
      );
      assert(
        shades!.has(shade),
        `${o.color} has no shade ${shade}${o.shade === undefined ? ' (the default)' : ''}; it defines ${[...shades!].sort((a, b) => a - b).join(', ')}.`,
        o.line,
      );
    }
    scope(o.parent, o.line);
    const seen = new Set<string>();
    for (let x: ModelObject | undefined = o; x; x = by.get(x.parent)) {
      assert(!seen.has(x.id), `Containment cycle at ${x.id}.`, o.line);
      seen.add(x.id);
      assert(seen.size <= 12, 'Limit: 12 nesting levels.', o.line);
    }
  }
  for (const e of m.edges)
    for (const end of [e.source, e.target]) {
      exists(end, e.line);
      assert(by.get(end)!.type === 'node', `Connections join nodes; ${end} is a group.`, e.line);
    }
  for (const l of m.layouts) {
    scope(l.scope, l.line);
    const root = l.engine?.params.rootId;
    if (root) {
      exists(root, l.line);
      assert(by.get(root)!.type === 'node', `The tree root ${root} must be a node.`, l.line);
    }
  }
  for (const h of m.hints) {
    if (h.type === 'order') {
      scope(h.scope, h.line);
      for (const id of h.ids) {
        exists(id, h.line);
        assert(
          by.get(id)!.parent === h.scope,
          `${id} is not a direct child of ${h.scope}.`,
          h.line,
        );
      }
    } else if (h.type === 'align') {
      h.ids.forEach(id => exists(id, h.line));
      assert(new Set(h.ids).size === h.ids.length, 'Duplicate member in align.', h.line);
      const parent = by.get(h.ids[0])!.parent;
      assert(
        h.ids.every(id => by.get(id)!.parent === parent),
        'Members of align must be direct siblings.',
        h.line,
      );
    } else {
      exists(h.id, h.line);
      if (h.type === 'near') {
        exists(h.ref, h.line);
        assert(
          by.get(h.ref)!.parent === by.get(h.id)!.parent,
          'Relative placement is between siblings. Place the containing groups relative to one another instead.',
          h.line,
        );
      }
      if (h.type === 'size')
        assert(
          by.get(h.id)!.type === 'node',
          'Use layout min-width/min-height to reserve room in a group.',
          h.line,
        );
    }
  }
}
