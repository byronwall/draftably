/**
 * Executable DOT-core importer using @ts-graphviz/ast 3.0.10.
 * Grammar gaps and unsupported semantics are fatal; appearance losses need review.
 * No Graphviz process, renderer, external resource loader, or foreign writer is used.
 */
import { parse, type AttributeASTNode, type ClusterStatementASTNode, type GraphASTNode,
  type LiteralASTNode, type NodeRefASTNode } from '@ts-graphviz/ast';
import { Ids, LIMITS, blankPlan, finish, inputLimit, applyColor, hex,
  type Diagnostic, type NativeObject, type NativeEdge, type ImportResult } from './import-core.js';

type Attrs = Map<string, LiteralASTNode>;
interface Scope {
  name?: string; cluster?: string; parentCluster?: string;
  graph: Attrs; node: Attrs; edge: Attrs;
}
interface DotNode { name: string; attrs: Attrs; clusters: Set<string>; }
interface DotEdge { a: NodeRefASTNode; b: NodeRefASTNode; attrs: Attrs; line?: number; }
const attributes = (children: Array<{ type: string }>): Attrs =>
  new Map(children.filter((x): x is AttributeASTNode => x.type === 'Attribute').map(x => [x.key.value, x.value]));
const merge = (base: Attrs, extra: Attrs) => new Map([...base, ...extra]);
const val = (a: Attrs, key: string) => a.get(key)?.value;
const keywords = new Set(['strict', 'graph', 'digraph', 'subgraph', 'node', 'edge']);

export function importDot(source: string, title = 'Imported DOT'): ImportResult {
  const plan = blankPlan(title), ids = new Ids(), diagnostics = inputLimit(source);
  const note = (code: string, message: string, severity: Diagnostic['severity'] = 'warning',
    impact: Diagnostic['impact'] = 'semantics', line?: number, foreignIds?: string[]) =>
    diagnostics.push({ code, message, severity, impact, ...(line ? { line } : {}), ...(foreignIds ? { foreignIds } : {}) });
  const done = () => finish('dot', 'graph', plan, diagnostics, ids);
  if (diagnostics.length) return done();
  let root: GraphASTNode;
  try {
    const ast = parse(source, { maxInputSize: LIMITS.sourceBytes, maxASTNodes: 20_000,
      maxNestingDepth: 24, maxEdgeChainDepth: 1200, maxHtmlNestingDepth: 32 });
    const graphs = ast.children.filter((x): x is GraphASTNode => x.type === 'Graph');
    if (graphs.length !== 1 || ast.children.some(x => x.type !== 'Graph' && x.type !== 'Comment')) {
      note('DOT_ONE_GRAPH', 'Select exactly one graph; no statements may be outside it.', 'error');
      return done();
    }
    root = graphs[0];
  } catch (error) {
    const e = error as { message?: string; cause?: { location?: { start?: { line?: number; column?: number } } } };
    const position = e.cause?.location?.start;
    diagnostics.push({ code: 'DOT_PARSE_REJECTED', severity: 'error', impact: 'syntax',
      message: 'The supported DOT grammar rejected this input: ' + (e.message ?? String(error)) +
        ' Some valid DOT forms (string concatenation, repeated attribute lists, full subgraph endpoints) are outside this parser profile.',
      ...(position?.line ? { line: position.line } : {}), ...(position?.column ? { column: position.column } : {}) });
    return done();
  }
  // This parser can treat reserved DOT words as bare identifiers, including a full
  // subgraph operand as a node named "subgraph". Never accept that misparse.
  const checkKeywords = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(checkKeywords); return; }
    const object = value as Record<string, unknown>;
    if (object.type === 'Literal' && object.quoted === false &&
      typeof object.value === 'string' && keywords.has(object.value.toLowerCase())) {
      const literal = value as LiteralASTNode;
      note(literal.value.toLowerCase() === 'subgraph' ? 'DOT_PARSER_DIALECT' : 'DOT_RESERVED_ID',
        'An unquoted DOT keyword was parsed as an identifier: ' + literal.value +
        '. Quote actual identifiers; full subgraph edge operands are outside this parser profile.',
        'error', 'syntax', literal.location?.start.line);
    }
    for (const child of Object.values(object)) checkKeywords(child);
  };
  checkKeywords(root);
  if (diagnostics.some(d => d.severity === 'error')) return done();
  const boolean = (literal: LiteralASTNode | undefined, fallback: boolean): boolean => {
    if (!literal) return fallback;
    const value = literal.value.toLowerCase();
    if (value === 'false' || value === '0') return false;
    if (value === 'true' || value === '1') return true;
    note('DOT_BOOLEAN', 'Unsupported boolean spelling in this profile: ' + literal.value +
      '. Use true, false, 1 or 0.', 'error', 'semantics', literal.location?.start.line);
    return fallback;
  };
  const nodes = new Map<string, DotNode>(), edges: DotEdge[] = [], strict = new Map<string, DotEdge>();
  const named = new Map<string, Scope>(), clusters = new Map<string, Scope>();
  const rootScope: Scope = { graph: new Map(), node: new Map(), edge: new Map() };
  const scopes: Scope[] = [rootScope];
  const graphName = root.id?.value ?? 'G';
  let expansionCount = 0;
  const touch = (ref: NodeRefASTNode | { id: LiteralASTNode }, scope: Scope): DotNode => {
    const name = ref.id.value;
    let n = nodes.get(name);
    if (!n) { n = { name, attrs: new Map(scope.node), clusters: new Set() }; nodes.set(name, n); }
    if (scope.cluster) n.clusters.add(scope.cluster);
    return n;
  };
  const walk = (statements: ClusterStatementASTNode[], scope: Scope, depth = 1) => {
    if (depth > 24) { note('DOT_DEPTH', 'DOT scope nesting exceeds this profile.', 'error', 'limit'); return; }
    for (const s of statements) {
      if (diagnostics.some(d => d.severity === 'error')) return;
      switch (s.type) {
        case 'Comment': break;
        case 'Attribute': scope.graph.set(s.key.value, s.value); break;
        case 'AttributeList': {
          const target = s.kind === 'Node' ? scope.node : s.kind === 'Edge' ? scope.edge : scope.graph;
          for (const [k, v] of attributes(s.children)) target.set(k, v);
          break;
        }
        case 'Node': {
          const n = touch(s, scope);
          n.attrs = merge(n.attrs, attributes(s.children));
          break;
        }
        case 'Subgraph': {
          const name = s.id?.value;
          let child = name ? named.get(name) : undefined;
          if (!child) {
            child = { name, cluster: name?.startsWith('cluster') ? name : scope.cluster,
              parentCluster: scope.cluster, graph: new Map(scope.graph), node: new Map(scope.node), edge: new Map(scope.edge) };
            scopes.push(child);
            if (name) named.set(name, child);
            if (name?.startsWith('cluster')) clusters.set(name, child);
          } else if (child.parentCluster !== scope.cluster) {
            note('DOT_SUBGRAPH_REPARENT', 'A reopened subgraph has incompatible containing clusters.', 'error', 'semantics', s.location?.start.line);
            break;
          }
          walk(s.children, child, depth + 1);
          break;
        }
        case 'Edge': {
          // A brace operand is a subgraph's SET of nodes. Repeated declarations do
          // not make parallel edges, and ports on its node statements are ignored.
          const refs = s.targets.map(t => t.type === 'NodeRef' ? [t] :
            [...new Map(t.children.map(r => [r.id.value, { ...r, port: undefined, compass: undefined }])).values()]);
          const explicit = attributes(s.children);
          const ports = (a: NodeRefASTNode, b: NodeRefASTNode): Attrs => {
            const attrs: Attrs = new Map();
            for (const [key, ref] of [['tailport', a], ['headport', b]] as const) {
              const literal = ref.port ?? ref.compass;
              if (literal) attrs.set(key, { ...literal,
                value: ref.port && ref.compass ? ref.port.value + ':' + ref.compass.value : literal.value });
            }
            return attrs;
          };
          for (const set of refs) for (const r of set) touch(r, scope);
          for (let i = 0; i < refs.length - 1; i++) for (const a of refs[i]) for (const b of refs[i + 1]) {
            if (++expansionCount > LIMITS.edges) {
              note('DOT_EXPANSION_LIMIT', 'Edge-chain/set expansion exceeds 1,200 candidate edges.', 'error', 'limit', s.location?.start.line);
              return;
            }
            const pair = root.directed ? [a.id.value, b.id.value] : [a.id.value, b.id.value].sort();
            const key = JSON.stringify(pair), previous = root.strict ? strict.get(key) : undefined;
            if (previous) {
              // Endpoint syntax updates port attributes after previous values,
              // then the statement's explicit attributes win. Reverse undirected
              // references still attach to their original matching endpoint.
              const endpoints = previous.a.id.value === a.id.value ? ports(a, b) : ports(b, a);
              previous.attrs = merge(previous.attrs, merge(endpoints, explicit));
            } else {
              const e = { a, b, attrs: merge(scope.edge, merge(ports(a, b), explicit)), line: s.location?.start.line };
              edges.push(e);
              if (root.strict) strict.set(key, e);
            }
          }
          break;
        }
      }
      if (nodes.size + clusters.size > LIMITS.objects) {
        note('DOT_OBJECT_LIMIT', 'Expanded graph exceeds 500 native nodes plus groups.', 'error', 'limit');
        return;
      }
    }
  };
  walk(root.children, rootScope);
  for (const scope of scopes) {
    if (scope === rootScope || scope.name?.startsWith('cluster')) continue;
    if (boolean(scope.graph.get('cluster'), false))
      note('DOT_CLUSTER_ATTRIBUTE', 'cluster=true on a non-prefix or anonymous subgraph requires a separate cluster mapper; it is not flattened.',
        'error', 'semantics', scope.graph.get('cluster')?.location?.start.line);
  }
  if (diagnostics.some(d => d.severity === 'error')) return done();
  const clusterAncestors = (name: string) => {
    const seen = new Set<string>();
    let p = clusters.get(name)?.parentCluster;
    while (p) {
      if (seen.has(p)) { note('DOT_CLUSTER_CYCLE', 'Cluster membership is cyclic.', 'error'); break; }
      seen.add(p); p = clusters.get(p)?.parentCluster;
    }
    return seen;
  };
  const text = (literal: LiteralASTNode | undefined, fallback: string, context: { node?: string; a?: string; b?: string; graph?: string } = {}) => {
    const entity = (value: string) => {
      if (/&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/.test(value))
        note('DOT_LABEL_ENTITY', 'Graphviz character entities need a verified text decoder; entity text is not imported literally.',
          'error', 'semantics', literal?.location?.start.line);
    };
    const substitution = (value: string) => {
      if (value.includes('\\'))
        note('DOT_ESCAPED_ID_LABEL', 'An escaped identifier used as label text needs Graphviz label expansion; it is not imported as a literal default label.',
          'error', 'semantics', literal?.location?.start.line);
      return value;
    };
    if (!literal) {
      if (context.node !== undefined) substitution(fallback);
      entity(fallback);
      return fallback;
    }
    if (literal.quoted === 'html') {
      note('DOT_HTML_LABEL', 'HTML-like labels need a compartment/text mapper; they are not silently stripped.', 'error', 'semantics', literal.location?.start.line);
      return fallback;
    }
    const input = literal.value;
    let result = '';
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== '\\' || i === input.length - 1) { result += input[i]; continue; }
      const c = input[++i];
      if (c === '\\') result += '\\';
      else if (c === 'n' || c === 'l' || c === 'r') {
        result += '\n';
        if (c !== 'n') note('DOT_TEXT_ALIGNMENT', 'Left/right line alignment becomes a centered native line break.', 'warning', 'appearance', literal.location?.start.line);
      } else if (c === 'N' && context.node !== undefined) result += substitution(context.node);
      else if (c === 'G') {
        if (!context.graph && !root.id) note('DOT_ANONYMOUS_GRAPH_NAME',
          'The graph-name escape in an anonymous graph depends on Graphviz-generated naming; name the graph explicitly.',
          'error', 'semantics', literal.location?.start.line);
        result += substitution(context.graph ?? graphName);
      }
      else if (c === 'T' && context.a !== undefined) result += substitution(context.a);
      else if (c === 'H' && context.b !== undefined) result += substitution(context.b);
      else if (c === 'E' && context.a !== undefined) result += substitution(context.a) + (root.directed ? '->' : '--') + substitution(context.b!);
      else if (c === '\n') { /* DOT quoted-string continuation. */ }
      else {
        result += c;
        note('DOT_ESCAPE', 'A nonportable DOT escape was simplified: \\' + c, 'warning', 'appearance', literal.location?.start.line);
      }
    }
    entity(result);
    return result;
  };
  const ignored = (attrs: Attrs, used: string[], who: string) => {
    for (const [key, value] of attrs) {
      if (used.includes(key)) continue;
      const security = ['image', 'shapefile', 'imagepath', 'fontpath', 'stylesheet', 'href', 'URL', 'target'].includes(key);
      note(security ? 'DOT_RESOURCE_OMITTED' : 'DOT_ATTRIBUTE_OMITTED',
        who + ': ' + key + ' is not mapped' + (security ? '; no resource was loaded or link activated.' : '.'),
        'warning', security ? 'security' : 'appearance', value.location?.start.line, [who]);
    }
  };
  const objectStyle = (o: NativeObject, attrs: Attrs) => {
    const shape = val(attrs, 'shape') ?? 'ellipse', style = (val(attrs, 'style') ?? '').split(',').map(s => s.trim());
    if (o.kind === 'node') {
      const exact: Record<string, NativeObject['shape']> = { box: 'box', rect: 'box', rectangle: 'box', circle: 'circle', diamond: 'diamond', plaintext: 'text', plain: 'text', none: 'text' };
      if (shape === 'record' || shape === 'Mrecord') note('DOT_RECORD', 'Record fields/ports need a cells mapper.', 'error', 'semantics');
      else if (exact[shape]) o.shape = exact[shape];
      else { o.shape = ['ellipse', 'oval'].includes(shape) ? 'pill' : 'box'; note('DOT_SHAPE', 'Shape ' + shape + ' becomes ' + o.shape + '.', 'warning', 'appearance', attrs.get('shape')?.location?.start.line, [o.id]); }
      if (style.includes('rounded') && o.shape === 'box') {
        o.shape = 'pill'; note('DOT_ROUNDED', 'Rounded rectangle becomes the native pill.', 'warning', 'appearance');
      }
    }
    if (style.includes('invis')) note('DOT_INVISIBLE', 'Invisible objects need an explicit visibility policy; refusing a visible substitute.', 'error');
    for (const s of style.filter(s => s && s !== 'filled' && s !== 'rounded' && s !== 'invis'))
      note('DOT_OBJECT_STYLE', 'Object style ' + s + ' is omitted.', 'warning', 'appearance');
    const values = ['fillcolor', 'color', 'fontcolor'].map(k => val(attrs, k));
    for (let i = 0; i < values.length; i++) if (values[i] && !hex(values[i]))
      note('DOT_COLOR', 'Only explicit hex colors are mapped in this profile: ' + values[i], 'warning', 'appearance');
    const fill = style.includes('filled') ? hex(values[0]) : undefined;
    if (values[0] && !style.includes('filled')) note('DOT_INACTIVE_FILL', 'fillcolor without filled style is not applied.', 'info', 'appearance');
    applyColor(plan, o, fill, hex(values[1]), hex(values[2]));
  };
  plan.title = text(rootScope.graph.get('label'), root.id?.value ?? title);
  for (const [name, scope] of clusters) {
    const o: NativeObject = { kind: 'group', id: ids.get('group', name), label: text(scope.graph.get('label'), '', { graph: name }) };
    if (scope.parentCluster) o.parent = ids.get('group', scope.parentCluster);
    objectStyle(o, scope.graph);
    ignored(scope.graph, ['label', 'color', 'fillcolor', 'fontcolor', 'style', 'rankdir', 'compound', 'shape', 'cluster'], name);
    plan.objects.push(o);
  }
  for (const n of nodes.values()) {
    const memberships = [...n.clusters];
    const innermost = memberships.filter(c => !memberships.some(other => other !== c && clusterAncestors(other).has(c)));
    if (innermost.length > 1) note('DOT_OVERLAPPING_CLUSTERS', n.name + ' belongs to incompatible clusters; native objects have one parent.', 'error', 'semantics', undefined, [n.name]);
    const o: NativeObject = { kind: 'node', id: ids.get('node', n.name), label: text(n.attrs.get('label'), n.name, { node: n.name }) };
    if (innermost.length === 1) o.parent = ids.get('group', innermost[0]);
    objectStyle(o, n.attrs);
    ignored(n.attrs, ['label', 'shape', 'style', 'fillcolor', 'color', 'fontcolor'], n.name);
    plan.objects.push(o);
  }
  const side = (attrs: Attrs, attribute: string): NativeEdge['fromSide'] => {
    const port = val(attrs, attribute);
    if (!port) return undefined;
    const sides: Record<string, NativeEdge['fromSide']> = { n: 'top', s: 'bottom', e: 'right', w: 'left' };
    if (!['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'c', '_'].includes(port)) {
      note('DOT_NAMED_PORT', 'Named port ' + port + ' has no native field target.', 'error');
      return undefined;
    }
    if (!sides[port] && port !== '_')
      note('DOT_COMPASS', 'Compass port ' + port + ' becomes a native automatic boundary attachment.', 'warning', 'layout');
    return sides[port];
  };
  for (const [i, e] of edges.entries()) {
    const direction = val(e.attrs, 'dir') ?? (root.directed ? 'forward' : 'none');
    if (!['forward', 'none'].includes(direction))
      note('DOT_ARROW_ENDS', 'dir=' + direction + ' requires a native start/both-arrow model; endpoints are not reversed or duplicated.', 'error', 'semantics', e.line);
    const head = val(e.attrs, 'arrowhead');
    if (root.directed && (direction === 'none' || head === 'none'))
      note('DOT_HIDDEN_DIRECTION', 'DOT retains a directed relation when its arrow is hidden; native directed=false would change that meaning.', 'error', 'semantics', e.line);
    if (head && !['normal', 'none'].includes(head)) note('DOT_ARROW_SHAPE', 'Arrowhead ' + head + ' carries unsupported notation.', 'error', 'semantics', e.line);
    if (val(e.attrs, 'arrowtail') && val(e.attrs, 'arrowtail') !== 'none')
      note('DOT_ARROW_SHAPE', 'A custom tail arrow is unsupported.', 'error', 'semantics', e.line);
    const style = (val(e.attrs, 'style') ?? '').split(',').map(s => s.trim());
    if (style.includes('invis')) note('DOT_INVISIBLE', 'Invisible edges cannot become visible semantic edges.', 'error', 'semantics', e.line);
    for (const s of style.filter(s => s && s !== 'dashed' && s !== 'invis'))
      note('DOT_EDGE_STYLE', 'Edge style ' + s + ' becomes a regular native stroke.', 'warning', 'appearance', e.line);
    const edge: NativeEdge = { id: ids.get('edge', String(i + 1), 'edge_' + (i + 1)), from: ids.get('node', e.a.id.value),
      to: ids.get('node', e.b.id.value), label: text(e.attrs.get('label'), '', { a: e.a.id.value, b: e.b.id.value }),
      directed: direction === 'forward' && head !== 'none', ...(style.includes('dashed') ? { dashed: true } : {}),
      ...(!boolean(e.attrs.get('constraint'), true) ? { constraint: false as const } : {}) };
    if (!root.directed && direction === 'forward') note('DOT_GRAPH_ARROWS', 'Arrows on an undirected DOT graph conflate decoration and direction in the native model.', 'error', 'semantics', e.line);
    if (val(e.attrs, 'lhead') || val(e.attrs, 'ltail'))
      note('DOT_CLUSTER_ENDPOINT', 'lhead/ltail clipping is not a semantic group edge; this profile refuses to replace its actual endpoints.', 'error', 'semantics', e.line);
    if (val(e.attrs, 'headlabel') || val(e.attrs, 'taillabel'))
      note('DOT_ENDPOINT_LABEL', 'Endpoint labels or cardinality require a native endpoint-label mapping.', 'error', 'semantics', e.line);
    edge.fromSide = side(e.attrs, 'tailport');
    edge.toSide = side(e.attrs, 'headport');
    ignored(e.attrs, ['label', 'style', 'dir', 'arrowhead', 'arrowtail', 'constraint', 'tailport', 'headport', 'lhead', 'ltail', 'headlabel', 'taillabel'], 'edge_' + (i + 1));
    plan.edges.push(edge);
  }
  const direction = val(rootScope.graph, 'rankdir') ?? 'TB';
  if (!['LR', 'TB'].includes(direction))
    note('DOT_LAYOUT_DIRECTION', 'Native layout supports right/down; ' + direction + ' becomes ' + (direction === 'RL' ? 'right' : 'down') + ' without reversing edge meaning.', 'warning', 'layout');
  const nativeDirection = ['LR', 'RL'].includes(direction) ? 'right' : 'down';
  plan.layouts.push({ scope: 'root', kind: 'flow', direction: nativeDirection });
  // DOT's rankdir is global. Native groups otherwise default to column, which
  // would lose LR intent for the objects inside every imported cluster.
  for (const object of plan.objects.filter(o => o.kind === 'group'))
    plan.layouts.push({ scope: object.id, kind: 'flow', direction: nativeDirection });
  if (clusters.size)
    note('DOT_CLUSTER_LAYOUT', 'Each cluster uses native flow with the global rankdir intent; Graphviz ranking and cluster packing are recomputed.',
      'info', 'layout');
  ignored(rootScope.graph, ['label', 'rankdir', 'compound'], graphName);
  for (const scope of scopes) {
    if (scope === rootScope) continue;
    if (val(scope.graph, 'rank')) note('DOT_RANK_CONSTRAINT', 'A subgraph rank constraint is not reproduced by native layout.', 'warning', 'layout',
      scope.graph.get('rank')?.location?.start.line);
    // Ordinary subgraphs scope defaults and membership; they do not create visible containers.
  }
  diagnostics.push({ code: 'IMPORT_NATIVE_LAYOUT', severity: 'info', impact: 'layout',
    message: 'Native layout will compute all geometry; Graphviz positions and routing are not imported.' });
  return done();
}
