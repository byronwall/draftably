/**
 * Tested against mermaid 12.2.0. Uses its internal DB behind a narrow, checked boundary.
 * This file parses only; it neither renders Mermaid nor attaches interaction callbacks.
 * Call in an isolated Node worker with a DOM, or in a dedicated browser Mermaid instance.
 */
export const MERMAID_VERSION = '12.2.0' as const;

export type ParserDiagnostic = {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  line?: number;
  column?: number;
  locationKind?: 'source' | 'parser-relative';
};

export type FlowVertex = {
  id: string;
  text: string;
  type?: string;
  labelType: string;
  classes: string[];
  styles: string[];
  link?: string;
  icon?: string;
  img?: string;
  props?: Record<string, unknown>;
};
export type FlowEdge = {
  start: string;
  end: string;
  text: string;
  type?: string;
  stroke?: string;
  id?: string;
  isUserDefinedId: boolean;
  labelType: string;
  classes: string[];
  style: string[];
  length?: number;
  interpolate?: string;
  animate?: boolean;
  animation?: string;
};
export type FlowGroup = {
  id: string;
  title: string;
  nodes: string[];
  dir?: string;
  labelType: string;
  classes: string[];
  metadata?: Record<string, unknown>;
};
export type FlowClass = { id: string; styles: string[]; textStyles: string[] };
export type FlowSnapshot = {
  format: 'mermaid';
  family: 'flowchart';
  parserVersion: typeof MERMAID_VERSION;
  direction: string;
  vertices: FlowVertex[];
  edges: FlowEdge[];
  groups: FlowGroup[];
  classes: FlowClass[];
  defaultEdgeStyle: string[];
  defaultEdgeInterpolate?: string;
};
export type ParseFlowResult =
  | { ok: true; snapshot: FlowSnapshot; diagnostics: ParserDiagnostic[] }
  | { ok: false; diagnostics: ParserDiagnostic[] };

type MermaidApi = Pick<typeof import('mermaid')['default'], 'initialize' | 'mermaidAPI'>;
const MAX_BYTES = 100_000;
const MAX_ENTITIES = 1000;
const MAX_EDGES = 3000;

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a Mermaid data object.');
  }
  return value as Record<string, unknown>;
};
const string = (value: unknown, fallback?: string): string => {
  if (typeof value === 'string') return value;
  if (value == null && fallback !== undefined) return fallback;
  throw new Error('Expected a Mermaid string.');
};
const strings = (value: unknown): string[] => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new Error('Expected a Mermaid string array.');
  }
  return [...value];
};
const optionalString = (value: unknown): string | undefined =>
  value == null ? undefined : string(value);
const array = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new Error('Expected a Mermaid array.');
  return value;
};
const mapValues = (value: unknown): unknown[] => {
  if (!(value instanceof Map)) throw new Error('Expected a Mermaid Map.');
  return [...value.values()];
};
const number = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Expected finite number.');
  return value;
};

/** DB strings contain Mermaid entity sentinels; preserve entity spelling for text decoding. */
export function restoreEntitySpelling(value: string): string {
  return value.replace(/ﬂ°°(\d+)¶ß/g, '&#$1;').replace(/ﬂ°([A-Za-z]\w*)¶ß/g, '&$1;');
}

/**
 * Use an unattached HTML template only. Its content is inert and is never adopted into the page.
 * Caller supplies the browser document or the dedicated worker's JSDOM document.
 * Markdown markers deliberately remain visible; native Markdown rendering is not assumed.
 */
export function makePlainLabel(document: Document): (value: string) => string {
  return (value) => {
    const template = document.createElement('template');
    template.innerHTML = restoreEntitySpelling(value).replace(/<br\s*\/?>/gi, '\n');
    return template.content.textContent ?? '';
  };
}

export function preflightMermaidFlow(source: string): ParserDiagnostic[] {
  if (new TextEncoder().encode(source).length > MAX_BYTES) {
    return [{ code: 'IMPORT_INPUT_LIMIT', severity: 'error', message: `Mermaid input exceeds ${MAX_BYTES} UTF-8 bytes.` }];
  }
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (/^\s*---(?:\n|$)/.test(normalized) || /%%\s*\{/.test(normalized)) {
    return [{ code: 'MERMAID_CONFIGURATION_UNSUPPORTED', severity: 'error', message: 'This importer does not apply Mermaid frontmatter or directives. Remove the configuration block and import the diagram text.' }];
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) {
    return [{ code: 'IMPORT_CONTROL_CHARACTER', severity: 'error', message: 'Input contains unsupported control characters.' }];
  }
  // A conservative family check, not a Mermaid grammar replacement.
  const firstCodeLine = normalized.split('\n').find((line) => line.trim() && !line.trimStart().startsWith('%%')) ?? '';
  if (!/^\s*(?:flowchart|graph)\b/.test(firstCodeLine)) {
    return [{ code: 'MERMAID_FAMILY_UNSUPPORTED', severity: 'error', message: 'This adapter supports Mermaid flowcharts only. Sequence, class, ER, state, chart and other families require separate semantic adapters.' }];
  }
  const diagnostics: ParserDiagnostic[] = [];
  for (const [index, line] of normalized.split('\n').entries()) {
    if (/(?:^|;)\s*click\s/.test(line)) {
      diagnostics.push({ code: 'MERMAID_INTERACTION_IGNORED', severity: 'warning', message: 'Mermaid click links and callbacks are data only; no interactions are installed.', line: index + 1, locationKind: 'source' });
    }
  }
  return diagnostics;
}

/** Each factory owns a serialized queue because Mermaid maintains parser/configuration state. */
export function createMermaidFlowParser(load: () => Promise<MermaidApi>) {
  let queue: Promise<unknown> = Promise.resolve();
  return (source: string): Promise<ParseFlowResult> => {
    const job = queue.then(async (): Promise<ParseFlowResult> => {
      const diagnostics = preflightMermaidFlow(source);
      if (diagnostics.some((d) => d.severity === 'error')) return { ok: false, diagnostics };
      let phase: 'load' | 'parse' | 'snapshot' = 'load';
      try {
        const mermaid = await load();
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', htmlLabels: false,
          maxTextSize: MAX_BYTES, maxEdges: MAX_EDGES, suppressErrorRendering: true });
        phase = 'parse';
        const diagram = await mermaid.mermaidAPI.getDiagramFromText(source.replace(/^\uFEFF/, ''));
        if (!['flowchart', 'flowchart-v2'].includes(diagram.type)) {
          return { ok: false, diagnostics: [...diagnostics, { code: 'MERMAID_FAMILY_UNSUPPORTED', severity: 'error', message: `Parser selected unsupported diagram family ${diagram.type}.` }] };
        }
        phase = 'snapshot';
        const db = object(diagram.db);
        const call = (name: string): unknown => {
          if (typeof db[name] !== 'function') throw new Error(`Mermaid ${MERMAID_VERSION} boundary missing ${name}().`);
          return (db[name] as () => unknown).call(db);
        };
        const rawEdges = call('getEdges');
        const vertices = mapValues(call('getVertices')).map((value): FlowVertex => {
          const n = object(value);
          return { id: string(n.id), text: string(n.text, string(n.id)), type: optionalString(n.type),
            labelType: string(n.labelType, 'text'), classes: strings(n.classes), styles: strings(n.styles),
            link: optionalString(n.link), icon: optionalString(n.icon), img: optionalString(n.img),
            props: n.props == null ? undefined : structuredClone(object(n.props)) };
        });
        const edges = array(rawEdges).map((value): FlowEdge => {
          const e = object(value);
          return { start: string(e.start), end: string(e.end), text: string(e.text, ''), type: optionalString(e.type),
            stroke: optionalString(e.stroke), id: optionalString(e.id), isUserDefinedId: e.isUserDefinedId === true,
            labelType: string(e.labelType, 'text'), classes: strings(e.classes), style: strings(e.style),
            length: number(e.length), interpolate: optionalString(e.interpolate), animate: e.animate === true,
            animation: optionalString(e.animation) };
        });
        const groups = array(call('getSubGraphs')).map((value): FlowGroup => {
          const g = object(value);
          return { id: string(g.id), title: string(g.title, ''), nodes: strings(g.nodes), dir: optionalString(g.dir),
            labelType: string(g.labelType, 'text'), classes: strings(g.classes),
            metadata: g.metadata == null ? undefined : structuredClone(object(g.metadata)) };
        });
        const classes = mapValues(call('getClasses')).map((value): FlowClass => {
          const c = object(value);
          return { id: string(c.id), styles: strings(c.styles), textStyles: strings(c.textStyles) };
        });
        if (vertices.length + groups.length > MAX_ENTITIES || edges.length > MAX_EDGES) {
          return { ok: false, diagnostics: [...diagnostics, { code: 'IMPORT_GRAPH_LIMIT', severity: 'error', message: 'Parsed graph exceeds the import entity or edge limit.' }] };
        }
        const extra = rawEdges as unknown as Record<string, unknown>;
        return { ok: true, diagnostics, snapshot: { format: 'mermaid', family: 'flowchart', parserVersion: MERMAID_VERSION,
          direction: string(call('getDirection'), 'TB'), vertices, edges, groups, classes,
          defaultEdgeStyle: strings(extra.defaultStyle), defaultEdgeInterpolate: optionalString(extra.defaultInterpolate) } };
      } catch (error) {
        const e = error as { message?: string; hash?: { loc?: { first_line?: number; first_column?: number } } };
        const loc = e.hash?.loc;
        return { ok: false, diagnostics: [...diagnostics, {
          code: phase === 'parse' ? 'MERMAID_PARSE_ERROR' : 'MERMAID_ADAPTER_MISMATCH', severity: 'error',
          message: e.message ?? String(error), line: loc?.first_line,
          column: loc?.first_column == null ? undefined : loc.first_column + 1,
          locationKind: loc ? 'parser-relative' : undefined,
        }] };
      }
    });
    queue = job.catch(() => undefined);
    return job;
  };
}
