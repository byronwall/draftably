/**
 * Working partial Mermaid adapter: the official flowchart DB -> native .draft source.
 * Supported diagram family: flowchart only. Parser coverage is broader than native fidelity.
 * Native layout is regenerated. There is no Mermaid writer or synchronization layer.
 */
import { Ids, blankPlan, finish, applyColor, hex,
  type Diagnostic, type ImportResult, type NativeObject } from './import-core.js';
import { MERMAID_VERSION, type ParseFlowResult, type FlowClass } from './mermaid-facade.js';

export function importMermaidFlow(
  parsed: ParseFlowResult,
  plainText: (value: string) => string,
  title = 'Imported Mermaid',
): ImportResult {
  const plan = blankPlan(title), ids = new Ids();
  const diagnostics: Diagnostic[] = parsed.diagnostics.map((d) => ({
    code: d.code, severity: d.severity,
    impact: d.code.includes('LIMIT') || d.code.includes('TIMEOUT') ? 'limit'
      : d.code.includes('CONFIGURATION') || d.code.includes('INTERACTION') ? 'security' : 'syntax',
    message: d.message + (d.locationKind === 'parser-relative' && d.line != null
      ? ` (Parser-relative line ${d.line}, column ${d.column ?? 1}; original-source mapping is unavailable.)` : ''),
    ...(d.locationKind === 'source' && d.line != null ? { line: d.line, column: d.column } : {}),
  }));
  const note = (code: string, message: string, impact: Diagnostic['impact'] = 'appearance',
    severity: Diagnostic['severity'] = 'warning', foreignIds?: string[]) =>
    diagnostics.push({ code, message, impact, severity, ...(foreignIds ? { foreignIds } : {}) });
  const done = () => finish('mermaid', 'flowchart', plan, diagnostics, ids);
  if (!parsed.ok) return done();
  const snapshot = parsed.snapshot;
  if (snapshot.parserVersion !== MERMAID_VERSION) {
    note('MERMAID_VERSION_MISMATCH', 'This adapter is verified only against Mermaid ' + MERMAID_VERSION + '.', 'syntax', 'error');
    return done();
  }

  const label = (value: string, labelType: string, foreignId: string) => {
    if (/<\/?[a-z][\s\S]*?>/i.test(value)) {
      note('MERMAID_HTML_LABEL', 'HTML label formatting was reduced to plain text; line breaks are retained and no HTML is inserted into the diagram.', 'appearance', 'warning', [foreignId]);
    }
    if (labelType === 'markdown') {
      note('MERMAID_MARKDOWN_LABEL', 'Markdown label markers remain literal text in this profile.', 'appearance', 'warning', [foreignId]);
    }
    return plainText(value);
  };
  const direction = (value: string | undefined, scope: string) => {
    if (!value) return undefined;
    if (value === 'LR') return 'right' as const;
    if (value === 'TB' || value === 'TD') return 'down' as const;
    if (value === 'RL' || value === 'BT') {
      note('MERMAID_REVERSED_LAYOUT', `${value} layout is normalized to ${value === 'RL' ? 'right' : 'down'}; edge endpoints keep their semantic order.`, 'layout', 'warning', [scope]);
      return value === 'RL' ? 'right' as const : 'down' as const;
    }
    note('MERMAID_DIRECTION', 'Unsupported Mermaid layout direction: ' + value, 'layout', 'error', [scope]);
    return undefined;
  };
  const classes = new Map(snapshot.classes.map((c) => [c.id, c]));
  const declarations = (classIds: string[], inline: string[], includeDefault: boolean, foreignId: string) => {
    const selected: FlowClass[] = [];
    for (const id of [...(includeDefault ? ['default', 'node'] : []), ...classIds]) {
      const c = classes.get(id);
      if (c) selected.push(c);
      else if (!['default', 'node', 'clickable'].includes(id)) {
        note('MERMAID_CLASS_UNRESOLVED', 'CSS class has no in-diagram definition and was not imported: ' + id, 'appearance', 'warning', [foreignId]);
      }
    }
    return [...selected.flatMap((c) => [...c.styles, ...c.textStyles]), ...inline];
  };
  const style = (object: NativeObject, raw: string[], foreignId: string) => {
    const values = new Map<string, string>();
    for (const declaration of raw.flatMap((s) => s.split(';'))) {
      if (!declaration.trim()) continue;
      const match = /^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i.exec(declaration);
      const key = match?.[1]?.toLowerCase(), value = match?.[2];
      if (!key || !['fill', 'stroke', 'color'].includes(key)) {
        note('MERMAID_STYLE_PROPERTY', 'Unsupported style declaration was omitted: ' + declaration, /url\s*\(|javascript:|expression\s*\(/i.test(declaration) ? 'security' : 'appearance', 'warning', [foreignId]);
        continue;
      }
      const color = hex(value);
      if (!color) {
        note('MERMAID_COLOR_VALUE', 'Only #RGB or #RRGGBB colors are imported: ' + declaration, 'appearance', 'warning', [foreignId]);
        continue;
      }
      values.set(key, color);
    }
    applyColor(plan, object, values.get('fill'), values.get('stroke'), values.get('color'));
  };
  const knownShapes: Record<string, NonNullable<NativeObject['shape']>> = {
    square: 'box', rect: 'box', rectangle: 'box', box: 'box',
    stadium: 'pill', circle: 'circle', diamond: 'diamond', text: 'text',
  };
  const shape = (value: string | undefined, foreignId: string): NonNullable<NativeObject['shape']> => {
    if (!value) return 'box';
    if (Object.hasOwn(knownShapes, value)) return knownShapes[value];
    const fallback = value === 'doublecircle' || value === 'ellipse' ? 'circle' : value === 'round' ? 'pill' : 'box';
    note('MERMAID_SHAPE_APPROXIMATION', `Mermaid shape ${value} becomes native ${fallback}; the shape-specific visual meaning is not fully preserved.`, 'semantics', 'warning', [foreignId]);
    return fallback;
  };

  try {
    const groups = new Map(snapshot.groups.map((g) => [g.id, g]));
    const vertices = new Map(snapshot.vertices.map((v) => [v.id, v]));
    if (groups.size !== snapshot.groups.length || vertices.size !== snapshot.vertices.length) {
      note('MERMAID_DUPLICATE_DB_ID', 'The parser snapshot contains duplicate group or node identities.', 'semantics', 'error');
      return done();
    }
    const all = new Map<string, NativeObject>();
    // Define group identity before nodes: Mermaid can include shadow vertices for group endpoints/styles.
    for (const g of snapshot.groups) {
      all.set(g.id, { id: ids.get('group', g.id), kind: 'group', label: label(g.title, g.labelType, g.id) });
    }
    for (const v of snapshot.vertices) {
      if (groups.has(v.id)) continue;
      all.set(v.id, { id: ids.get('node', v.id), kind: 'node', label: label(v.text, v.labelType, v.id), shape: shape(v.type, v.id) });
    }
    const parents = new Map<string, string>();
    for (const g of snapshot.groups) {
      for (const member of g.nodes) {
        if (!all.has(member)) {
          note('MERMAID_UNKNOWN_MEMBER', 'Subgraph references an absent member: ' + member, 'semantics', 'error', [g.id, member]);
          continue;
        }
        const previous = parents.get(member);
        if (previous && previous !== g.id) {
          note('MERMAID_MULTIPLE_PARENTS', 'A member belongs to multiple native parents; containment was not guessed.', 'semantics', 'error', [member, previous, g.id]);
          continue;
        }
        parents.set(member, g.id);
        all.get(member)!.parent = all.get(g.id)!.id;
      }
    }
    const rootDirection = direction(snapshot.direction, 'root');
    if (rootDirection) plan.layouts.push({ scope: 'root', kind: 'flow', direction: rootDirection });
    const declaredDirections = new Map<string, 'right' | 'down'>();
    for (const g of snapshot.groups) {
      const dir = direction(g.dir, g.id);
      if (dir) declaredDirections.set(g.id, dir);
    }
    const normalizedGroupDirection = (id: string): 'right' | 'down' => {
      const seen = new Set<string>();
      let at: string | undefined = id;
      while (at && !seen.has(at)) {
        seen.add(at);
        const declared = declaredDirections.get(at);
        if (declared) return declared;
        at = parents.get(at);
      }
      // Cycles are diagnosed by finish(). This walk must remain bounded before that validation.
      return rootDirection ?? 'down';
    };
    for (const g of snapshot.groups) {
      const native = all.get(g.id)!;
      const shadow = vertices.get(g.id);
      style(native, declarations([...g.classes, ...(shadow?.classes ?? [])], shadow?.styles ?? [], false, g.id), g.id);
      // Native groups otherwise default to column. Use an explicit, reported normalization
      // rather than claiming to reproduce Mermaid's engine/external-connection-dependent rules.
      plan.layouts.push({ scope: native.id, kind: 'flow', direction: normalizedGroupDirection(g.id) });
      if (g.dir) {
        note('MERMAID_SUBGRAPH_LAYOUT', 'The native group retains its declared direction. Mermaid can ignore a subgraph direction when its members connect outside, so the resulting layout may differ.', 'layout', 'warning', [g.id]);
      } else {
        note('MERMAID_INHERITED_LAYOUT', 'This group has no declared direction. Native flow layout uses the nearest declared ancestor/root direction; Mermaid can use another direction depending on its layout engine and external connections.', 'layout', 'warning', [g.id]);
      }
      if (g.metadata && Object.keys(g.metadata).length) {
        note('MERMAID_GROUP_METADATA', 'Group metadata (including collapsed view and engine hints) is omitted: ' + Object.keys(g.metadata).join(', '), 'layout', 'warning', [g.id]);
      }
    }
    for (const v of snapshot.vertices) {
      const native = all.get(v.id)!;
      if (!groups.has(v.id)) style(native, declarations(v.classes, v.styles, true, v.id), v.id);
      if (v.link) note('MERMAID_LINK_OMITTED', 'External link was omitted; the native object has no active link.', 'security', 'warning', [v.id]);
      if (v.img || v.icon) note('MERMAID_ASSET_OMITTED', 'Image/icon references are not fetched or embedded; the object remains a labeled native shape.', 'security', 'warning', [v.id]);
      if (v.props && Object.keys(v.props).length) note('MERMAID_NODE_METADATA', 'Node properties are omitted: ' + Object.keys(v.props).join(', '), 'semantics', 'warning', [v.id]);
    }
    plan.objects.push(...all.values());
    for (const [index, e] of snapshot.edges.entries()) {
      if (e.type !== 'arrow_point' && e.type !== 'arrow_open') {
        note('MERMAID_ARROW_UNSUPPORTED', 'Edge terminal semantics are unsupported: ' + String(e.type) + '. The import is blocked rather than replacing them with ordinary arrows.', 'semantics', 'error', [e.id ?? String(index + 1)]);
        continue;
      }
      if (e.stroke === 'invisible') {
        note('MERMAID_INVISIBLE_EDGE', 'Invisible links express layout constraints, not visible relationships; this profile cannot preserve them.', 'layout', 'error', [e.id ?? String(index + 1)]);
        continue;
      }
      if (!['normal', 'thick', 'dotted'].includes(e.stroke ?? 'normal')) {
        note('MERMAID_EDGE_STROKE', 'Unsupported edge stroke: ' + String(e.stroke), 'appearance', 'error', [e.id ?? String(index + 1)]);
        continue;
      }
      const from = all.get(e.start), to = all.get(e.end);
      if (!from || !to) {
        note('MERMAID_ENDPOINT', 'A parsed edge has a missing endpoint.', 'semantics', 'error', [e.start, e.end]);
        continue;
      }
      const id = e.isUserDefinedId && e.id
        ? ids.get('edge-id', e.id, e.id)
        : ids.get('edge-occurrence', String(index + 1), 'edge_' + (index + 1));
      const foreignEdge = e.id ?? String(index + 1);
      plan.edges.push({ id, from: from.id, to: to.id, label: label(e.text, e.labelType, foreignEdge),
        directed: e.type === 'arrow_point', ...(e.stroke === 'dotted' ? { dashed: true } : {}) });
      if (e.stroke === 'dotted') {
        note('MERMAID_DASH_STYLE', 'Dotted Mermaid stroke uses native kind=async only for its dashed visual treatment; no asynchronous execution semantics are inferred.', 'appearance', 'info', [foreignEdge]);
      }
      if (e.stroke === 'thick') note('MERMAID_THICK_EDGE', 'Thick edge emphasis is omitted by this native-source profile.', 'appearance', 'warning', [foreignEdge]);
      if ((e.length ?? 1) > 1) note('MERMAID_MIN_RANK_LENGTH', 'Minimum rank-length hint is omitted; native layout chooses spacing.', 'layout', 'warning', [foreignEdge]);
      if (e.animate || e.animation) note('MERMAID_EDGE_ANIMATION', 'Edge animation is omitted.', 'appearance', 'warning', [foreignEdge]);
      if (e.interpolate || snapshot.defaultEdgeInterpolate) note('MERMAID_EDGE_CURVE', 'Mermaid curve hints are omitted; native routing is used.', 'layout', 'warning', [foreignEdge]);
      const edgeStyles = declarations(e.classes, [...snapshot.defaultEdgeStyle, ...e.style], false, foreignEdge);
      if (edgeStyles.length) note('MERMAID_EDGE_STYLE', 'Per-edge CSS is omitted because native edge appearance is not a general CSS style map: ' + edgeStyles.join('; '), 'appearance', 'warning', [foreignEdge]);
    }
    return done();
  } catch (error) {
    note('MERMAID_MAPPING_ERROR', 'Could not map the parser snapshot: ' + (error instanceof Error ? error.message : String(error)), 'semantics', 'error');
    return done();
  }
}
