import type { CompileResponse, Shape, Connection } from '@d2lang/d2';

/** Tested research companion for @d2lang/d2 0.1.34 / engine v0.9.0.
 * This produces graph facts, not native .draft text. It deliberately rejects
 * sequence, SQL/class compartments, multiple boards, and two-ended arrows.
 * The product's native emitter and import preview must consume the diagnostics.
 */
export interface D2Diagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  sourceId?: string;
}

export interface D2Item {
  sourceId: string;
  parentSourceId?: string;
  kind: 'node' | 'group';
  label: string;
  sourceShape: string;
  shape: 'box' | 'circle' | 'diamond' | 'text';
  direction?: 'right' | 'down';
}

export interface D2Link {
  sourceId: string;
  from: string;
  to: string;
  label: string;
  directed: boolean;
  dashed: boolean;
  emphasis: false;
}

export interface D2Facts {
  ok: boolean;
  title: string;
  items: D2Item[];
  edges: D2Link[];
  direction: 'right' | 'down';
  diagnostics: D2Diagnostic[];
}

type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
const value = (v: unknown): string => typeof record(v).value === 'string' ? record(v).value as string : '';

/** Inspect the official AST only to report source-program loss. This does not
 * parse D2, resolve variables, or implement glob semantics; the compiler does.
 * Shapes below still come exclusively from the compiler's resolved objects.
 */
export function d2SourceFeatures(ast: unknown): string[] {
  if (ast == null) return ['source rules (AST metadata unavailable)'];
  const features = new Set<string>();
  const stack: unknown[] = [ast];
  let inspected = 0;
  const segment = (box: unknown): string => {
    const b = record(box);
    for (const kind of ['unquoted_string', 'double_quoted_string']) {
      const parts = record(b[kind]).value;
      if (Array.isArray(parts) && parts.every(p => typeof record(p).string === 'string')) return parts.map(p => record(p).string).join('').toLowerCase();
    }
    return value(b.single_quoted_string).toLowerCase();
  };
  while (stack.length) {
    if (++inspected > 100_000) { features.add('other source rules (metadata scan limit)'); break; }
    const current = stack.pop();
    if (Array.isArray(current)) { for (const entry of current) stack.push(entry); continue; }
    const o = record(current);
    if (o.substitution) features.add('variables');
    if (o.import) features.add('imports');
    if (o.suspension) features.add('model selection');
    if (o.null) features.add('null overrides');
    if (Array.isArray(record(o.unquoted_string).pattern) || record(o.edge_index).glob === true) features.add('globs');
    const key = record(o.map_key);
    for (const path of [record(key.key).path, record(key.edge_key).path]) {
      if (!Array.isArray(path)) continue;
      for (const part of path.map(segment)) {
        if (part === 'vars') features.add('variables');
        if (part === 'classes' || part === 'class') features.add('classes');
        if (part === 'd2-config') features.add('configuration');
      }
    }
    for (const v of Object.values(o)) if (v !== null && typeof v === 'object') stack.push(v);
  }
  return [...features].sort();
}

const knownAttributes = new Set(['label', 'labelDimensions', 'style', 'icon', 'iconStyle', 'tooltip', 'link',
  'width', 'height', 'top', 'left', 'near_key', 'language', 'shape', 'direction', 'constraint',
  'gridRows', 'gridColumns', 'gridGap', 'verticalGap', 'horizontalGap',
  'labelPosition', 'iconPosition', 'tooltipPosition', 'classes']);
const placementAttributes = ['gridRows', 'gridColumns', 'gridGap', 'verticalGap', 'horizontalGap',
  'near_key', 'width', 'height', 'top', 'left', 'labelPosition', 'iconPosition', 'tooltipPosition'];

/**
 * Compare complete canonical IDs against actual objects; never split on '.'.
 * d2exporter.toShape uses Object.AbsID() and Object.Level(), so a direct parent
 * has exactly one less level and is a whole canonical prefix followed by '.'.
 * E.g. a and "a.b" stay distinct, including "a.b"."x.y" descendants.
 */
export function d2ParentId(shape: Pick<Shape, 'id' | 'level'>, shapes: ReadonlyArray<Pick<Shape, 'id' | 'level'>>, rootLevel = 0): string | undefined {
  if (shape.level === rootLevel + 1) return undefined;
  const parents = shapes.filter(candidate => candidate.level === shape.level - 1 && shape.id.startsWith(candidate.id + '.'));
  if (parents.length !== 1) throw new Error(`Cannot establish one parent for D2 object ${JSON.stringify(shape.id)}`);
  return parents[0].id;
}

export function normalizeD2(result: CompileResponse): D2Facts {
  const diagnostics: D2Diagnostic[] = [];
  const add = (severity: D2Diagnostic['severity'], code: string, message: string, sourceId?: string) => diagnostics.push({ severity, code, message, ...(sourceId ? {sourceId} : {}) });
  const fail = (): D2Facts => ({ ok: false, title: '', items: [], edges: [], direction: 'down', diagnostics });
  const diagram = result.diagram;
  const graph = result.graph;
  // Go's nil slices serialize as null for an edgeless/empty graph, despite the
  // package's non-nullable TypeScript array declarations.
  const graphObjects = graph?.objects === null ? [] : graph?.objects;
  const graphEdges = graph?.edges === null ? [] : graph?.edges;
  if (!diagram || !graph || !Array.isArray(diagram.shapes) || !Array.isArray(diagram.connections) || !Array.isArray(graphObjects) || !Array.isArray(graphEdges)) {
    add('error', 'D2_API_SHAPE', 'The compiler result does not match the pinned D2 API.');
    return fail();
  }
  if (diagram.shapes.length > 500 || diagram.connections.length > 1200) {
    add('error', 'D2_OUTPUT_LIMIT', 'The compiled result exceeds 500 objects or 1,200 connections.');
    return fail();
  }
  if ([diagram.layers, diagram.scenarios, diagram.steps, graph.layers, graph.scenarios, graph.steps].some(boards => (boards?.length ?? 0) > 0)) {
    add('error', 'D2_BOARD_SELECTION_REQUIRED', 'This file has layers, scenarios, or steps. Select one board explicitly; this companion does not merge or discard boards.');
    return fail();
  }
  const objects = graphObjects.map(o => record(o));
  const attrs = [record(record(graph.root).attributes), ...objects.map(o => record(o.attributes))];
  if (attrs.some(a => value(a.shape) === 'sequence_diagram')) {
    add('error', 'D2_SEQUENCE_UNSUPPORTED', 'Sequence compilation introduces lifeline geometry; use a dedicated semantic sequence adapter.');
    return fail();
  }
  if (diagram.shapes.some(s => s.type === 'sql_table' || s.type === 'class')) {
    add('error', 'D2_COMPARTMENTS_UNSUPPORTED', 'SQL-table and class compartments require field/member mapping; this companion does not flatten them.');
    return fail();
  }
  if (diagram.shapes.length !== objects.length || diagram.connections.length !== graphEdges.length) {
    add('error', 'D2_API_SHAPE', 'Shape/object alignment changed in the compiler; refusing a positional join.');
    return fail();
  }
  const sourceFeatures = d2SourceFeatures(graph.ast);
  if (sourceFeatures.length) add('warning', 'D2_PROGRAM_SNAPSHOT', `D2 ${sourceFeatures.join(', ')} become a concrete graph snapshot. Their rules, class tags, and future edit behavior are not retained in native source.`);
  if (sourceFeatures.includes('configuration')) add('warning', 'D2_CONFIG_IGNORED', 'Import uses fixed compiler options and native layout/styling; D2 source configuration is not retained.');
  if (Object.keys(record(graph.data)).length) add('warning', 'D2_CONFIG_DATA_DROPPED', 'Custom D2 configuration data has no native model field and is omitted.');
  const inspectAttributes = (a: RecordValue, sourceId?: string) => {
    const unknown = Object.keys(a).filter(key => !knownAttributes.has(key) && a[key] != null);
    if (unknown.length) add('error', 'D2_ATTRIBUTE_UNSUPPORTED', `Unrecognized compiler attributes require a mapping review: ${unknown.join(', ')}.`, sourceId);
    if (Array.isArray(a.constraint) && a.constraint.length) add('error', 'D2_CONSTRAINT_UNSUPPORTED', 'Typed D2 constraints have no mapping in the ordinary-graph importer.', sourceId);
    if (placementAttributes.some(key => a[key] != null)) add('warning', 'D2_PLACEMENT_DROPPED', 'Explicit size, placement, grid, gap, or label/icon/tooltip positioning is omitted.', sourceId);
    if (value(record(a.style).textTransform)) add('warning', 'D2_LABEL_TRANSFORM_BAKED', 'The compiler-transformed label is retained as text; its case-transform rule is not retained.', sourceId);
  };
  inspectAttributes(attrs[0]);
  const shapeById = new Map<string, Shape>();
  for (const s of diagram.shapes) {
    if (!s.id || shapeById.has(s.id) || !Number.isSafeInteger(s.level)) {
      add('error', 'D2_ID_INVALID', 'The compiler returned duplicate/empty IDs or invalid levels.', s.id);
      return fail();
    }
    shapeById.set(s.id, s);
  }
  const parentById = new Map<string, string | undefined>();
  for (const s of diagram.shapes) {
    try {
      parentById.set(s.id, d2ParentId(s, diagram.shapes, graph.rootLevel ?? 0));
    } catch (error) {
      add('error', 'D2_HIERARCHY_UNSUPPORTED', String(error), s.id);
    }
  }
  if (diagnostics.some(d => d.severity === 'error')) return fail();
  const groups = new Set([...parentById.values()].filter((id): id is string => id !== undefined));
  const directionFor = (input: string, sourceId?: string): 'right' | 'down' | undefined => {
    if (!input) return undefined;
    if (input === 'right' || input === 'down') return input;
    add('warning', 'D2_DIRECTION_APPROXIMATED', `Native layout uses ${input === 'left' ? 'right' : 'down'} for D2 direction ${JSON.stringify(input)}; connection direction stays unchanged.`, sourceId);
    return input === 'left' ? 'right' : 'down';
  };
  const direction = directionFor(value(attrs[0].direction)) ?? 'down';
  const rootStyleKeys = Object.keys(record(attrs[0].style));
  if (rootStyleKeys.length) add('warning', 'D2_STYLE_DROPPED', `Explicit root styles omitted: ${rootStyleKeys.join(', ')}.`);
  if (attrs[0].icon || attrs[0].link) add('warning', 'D2_ACTIVE_RESOURCE_DROPPED', 'Root icon/link references are omitted.');
  if (attrs[0].tooltip) add('warning', 'D2_TOOLTIP_DROPPED', 'The native model has no root tooltip field.');
  if (attrs[0].language) add('warning', 'D2_LABEL_MARKUP_LITERAL', 'The root markup label is retained as literal text.');
  const items: D2Item[] = diagram.shapes.map((s, index) => {
    const object = objects[index];
    const expectedLocalId = parentById.get(s.id) ? s.id.slice(parentById.get(s.id)!.length + 1) : s.id;
    if (object.id !== expectedLocalId) add('error', 'D2_API_SHAPE', 'Shape/object positional IDs do not agree.', s.id);
    const a = record(object.attributes);
    inspectAttributes(a, s.id);
    const sourceType = value(a.shape) || s.type || 'rectangle';
    let shape: D2Item['shape'];
    if (sourceType === 'rectangle' || sourceType === 'square') {
      shape = 'box';
      if (sourceType === 'square') add('warning', 'D2_ASPECT_APPROXIMATED', 'Square aspect is replaced by the native box layout.', s.id);
    }
    else if (sourceType === 'circle') shape = 'circle';
    else if (sourceType === 'diamond') shape = 'diamond';
    else if (sourceType === 'text') shape = 'text';
    else {
      shape = 'box';
      add('warning', 'D2_SHAPE_APPROXIMATED', `D2 shape ${JSON.stringify(sourceType)} becomes a native box.`, s.id);
    }
    if (s.icon || s.link) add('warning', 'D2_ACTIVE_RESOURCE_DROPPED', 'Image/icon and link references are omitted; no input resource is opened.', s.id);
    const language = record(s).language;
    if (typeof language === 'string' && language) add('warning', 'D2_LABEL_MARKUP_LITERAL', `The ${JSON.stringify(language)} label is retained as literal text.`, s.id);
    const label = record(s).label;
    if (typeof label !== 'string') add('error', 'D2_API_SHAPE', 'Shape label is not a string in the pinned API.', s.id);
    const styleKeys = Object.keys(record(a.style));
    if (styleKeys.length > 0) add('warning', 'D2_STYLE_DROPPED', `Explicit D2 styles omitted by this companion: ${styleKeys.join(', ')}.`, s.id);
    if (s.tooltip) add('warning', 'D2_TOOLTIP_DROPPED', 'The native model has no tooltip field.', s.id);
    const dir = directionFor(value(a.direction), s.id);
    const parentSourceId = parentById.get(s.id);
    return { sourceId: s.id, ...(parentSourceId ? {parentSourceId} : {}), kind: groups.has(s.id) ? 'group' : 'node', label: typeof label === 'string' ? label : '', sourceShape: sourceType, shape, ...(dir ? {direction:dir} : {}) };
  });
  const edges: D2Link[] = [];
  for (let index = 0; index < diagram.connections.length; index++) {
    const e: Connection = diagram.connections[index];
    if (typeof e.id !== 'string' || !e.id || typeof e.label !== 'string' || typeof e.src !== 'string' || typeof e.dst !== 'string' || !Number.isFinite(e.strokeDash)) {
      add('error', 'D2_API_SHAPE', 'Connection IDs, labels, endpoints, or dash values changed in the pinned API.');
      continue;
    }
    if (!shapeById.has(e.src) || !shapeById.has(e.dst)) {
      add('error', 'D2_ENDPOINT_UNSUPPORTED', 'A connection points to a non-object endpoint.', e.id);
      continue;
    }
    if (!['none', 'arrow', 'triangle'].includes(e.srcArrow) || !['none', 'arrow', 'triangle'].includes(e.dstArrow)) {
      add('error', 'D2_ARROW_SEMANTICS_UNSUPPORTED', 'A specialized arrowhead would lose meaning in the native model.', e.id);
      continue;
    }
    const semanticEdge = graphEdges[index];
    if (!semanticEdge || typeof semanticEdge.src_arrow !== 'boolean' || typeof semanticEdge.dst_arrow !== 'boolean') {
      add('error', 'D2_API_SHAPE', 'The compiler did not provide semantic arrow flags.', e.id);
      continue;
    }
    const edgeAttrs = record(semanticEdge.attributes);
    inspectAttributes(edgeAttrs, e.id);
    if (edgeAttrs.language) add('warning', 'D2_LABEL_MARKUP_LITERAL', 'The connection markup label is retained as literal text.', e.id);
    // The operator flags preserve meaning even if an arrowhead is styled "none".
    const srcArrow = semanticEdge.src_arrow;
    const dstArrow = semanticEdge.dst_arrow;
    if (srcArrow !== (e.srcArrow !== 'none') || dstArrow !== (e.dstArrow !== 'none')) add('warning', 'D2_ARROW_APPEARANCE_CHANGED', 'Native arrowheads show the declared connection direction; foreign arrowhead suppression is not preserved.', e.id);
    if (srcArrow && dstArrow) {
      add('error', 'D2_TWO_ENDED_ARROW_UNSUPPORTED', 'A two-ended relationship cannot become two native relationships without changing edge multiplicity.', e.id);
      continue;
    }
    if (e.srcLabel?.label || e.dstLabel?.label) add('error', 'D2_ENDPOINT_LABEL_UNSUPPORTED', 'Endpoint labels need a dedicated mapping; they are not silently removed.', e.id);
    if (e.icon || e.link) add('warning', 'D2_ACTIVE_RESOURCE_DROPPED', 'Connection icon/link references are omitted.', e.id);
    if (e.tooltip) add('warning', 'D2_TOOLTIP_DROPPED', 'The native model has no connection tooltip field.', e.id);
    const styleKeys = Object.keys(record(edgeAttrs.style)).filter(k => k !== 'strokeDash');
    if (styleKeys.length) add('warning', 'D2_STYLE_DROPPED', `Explicit connection styles omitted: ${styleKeys.join(', ')}.`, e.id);
    edges.push({ sourceId: e.id, from: srcArrow ? e.dst : e.src, to: srcArrow ? e.src : e.dst, label: e.label, directed: srcArrow || dstArrow, dashed: e.strokeDash > 0, emphasis: false });
  }
  if (diagram.legend) add('warning', 'D2_LEGEND_DROPPED', 'This companion does not import the D2 legend.');
  add('info', 'D2_SNAPSHOT_MODE', 'The native document contains computed graph values; D2 source, comments, and source-program editing are not retained.');
  add('info', 'D2_LAYOUT_RECOMPUTED', 'Foreign coordinates and routes are omitted; native layout must run after emission.');
  if (diagnostics.some(d => d.severity === 'error')) return fail();
  return { ok: true, title: typeof record(diagram.root).label === 'string' ? record(diagram.root).label as string : '', items, edges, direction, diagnostics };
}

/** Trusted application calls this only after confirming import intent.
 * The fixed virtual filename prevents accidental host-filesystem inclusion.
 * Production must supply a worker deadline/resource policy around the compiler.
 */
export async function compileD2Facts(source: string): Promise<D2Facts> {
  if (new TextEncoder().encode(source).byteLength > 262_144 || source.includes('\0')) return { ok:false, title:'', items:[],edges:[],direction:'down', diagnostics:[{severity:'error',code:'D2_INPUT_LIMIT',message:'D2 input exceeds 256 KiB or contains NUL.'}] };
  let compiler: InstanceType<typeof import('@d2lang/d2').D2> | undefined;
  try {
    const { D2 } = await import('@d2lang/d2');
    compiler = new D2();
    const result = await compiler.compile({ fs: { 'input.d2': source }, inputPath: 'input.d2', options: { layout: 'dagre', themeID: 0, sketch: false } });
    return normalizeD2(result);
  } catch (error) {
    return { ok:false, title:'', items:[],edges:[],direction:'down', diagnostics:[{severity:'error',code:'D2_PARSE_OR_COMPILE_ERROR',message: error instanceof Error ? error.message : String(error)}] };
  } finally {
    if (compiler) await compiler.dispose();
  }
}
