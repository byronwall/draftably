import { Ids, blankPlan, finish, inputLimit, type Diagnostic, type Impact, type ImportResult } from './import-core.js';
import { compileD2Facts, type D2Diagnostic, type D2Facts } from './d2-normalize.js';

/** This adapter consumes pinned, checked compiler facts. It does not render SVG,
 * load source resources, write D2, or preserve a live connection to D2 source.
 * Stock D2 compilation is optional/experimental: see importD2Experimental below.
 */
function diagnostic(d: D2Diagnostic): Diagnostic {
  let impact: Impact = 'semantics';
  if (/LIMIT/.test(d.code)) impact = 'limit';
  else if (/PARSE/.test(d.code)) impact = 'syntax';
  else if (/RESOURCE/.test(d.code)) impact = 'security';
  else if (/LAYOUT|DIRECTION|PLACEMENT/.test(d.code)) impact = 'layout';
  else if (/STYLE|SHAPE|ASPECT|TOOLTIP|APPEARANCE|MARKUP|TRANSFORM/.test(d.code)) impact = 'appearance';
  return { code: d.code, severity: d.severity, impact, message: d.message,
    ...(d.sourceId ? { foreignIds: [d.sourceId] } : {}) };
}

/** Complete graph-facts -> native-source companion for the documented subset.
 * No partial native source is returned when the facts or native invariants fail.
 * The caller must display warnings before applying a needs-review result.
 */
export function d2FactsToNative(facts: D2Facts, title = facts.title || 'Imported D2 diagram'): ImportResult {
  const plan = blankPlan(title);
  const ids = new Ids();
  const diagnostics = facts.diagnostics.map(diagnostic);
  if (!facts.ok || diagnostics.some(d => d.severity === 'error')) {
    if (!diagnostics.some(d => d.severity === 'error')) diagnostics.push({
      code: 'D2_FACTS_INVALID', severity: 'error', impact: 'semantics',
      message: 'The D2 compiler facts are marked invalid.',
    });
    return finish('d2', 'general graph', plan, diagnostics, ids);
  }
  const nativeBySource = new Map<string, string>();
  const itemBySource = new Map(facts.items.map(item => [item.sourceId, item]));
  for (const item of facts.items) {
    if (nativeBySource.has(item.sourceId)) diagnostics.push({
      code: 'D2_DUPLICATE_SOURCE_ID', severity: 'error', impact: 'semantics',
      message: 'The normalized facts contain a repeated source object ID.', foreignIds: [item.sourceId],
    });
    nativeBySource.set(item.sourceId, ids.get(item.kind, item.sourceId));
  }
  for (const item of facts.items) {
    if (item.parentSourceId && !nativeBySource.has(item.parentSourceId)) diagnostics.push({
      code: 'D2_PARENT_MISSING', severity: 'error', impact: 'semantics',
      message: 'The normalized facts reference an absent parent.', foreignIds: [item.sourceId, item.parentSourceId],
    });
    plan.objects.push({ id: nativeBySource.get(item.sourceId)!, kind: item.kind,
      label: item.label, ...(item.parentSourceId ? { parent: nativeBySource.get(item.parentSourceId) ?? item.parentSourceId } : {}),
      ...(item.kind === 'node' ? { shape: item.shape } : {}),
    });
    if (item.kind === 'group' && item.shape !== 'box') diagnostics.push({
      code: 'D2_GROUP_SHAPE_APPROXIMATED', severity: 'warning', impact: 'appearance',
      message: 'Native groups use rectangular container geometry.', foreignIds: [item.sourceId],
    });
  }
  for (const [index, edge] of facts.edges.entries()) {
    if (!nativeBySource.has(edge.from) || !nativeBySource.has(edge.to)) diagnostics.push({
      code: 'D2_ENDPOINT_MISSING', severity: 'error', impact: 'semantics',
      message: 'The normalized facts reference an absent connection endpoint.', foreignIds: [edge.sourceId],
    });
    plan.edges.push({ id: ids.get('edge', edge.sourceId, 'd2_edge_' + (index + 1)),
      from: nativeBySource.get(edge.from) ?? edge.from,
      to: nativeBySource.get(edge.to) ?? edge.to,
      label: edge.label, directed: edge.directed, ...(edge.dashed ? { dashed: true } : {}),
    });
  }
  plan.layouts.push({ scope: 'root', kind: 'flow', direction: facts.direction });
  for (const item of facts.items.filter(item => item.kind === 'group')) {
    let scope = item;
    const seen = new Set<string>();
    while (!scope.direction && scope.parentSourceId && !seen.has(scope.sourceId)) {
      seen.add(scope.sourceId);
      const parent = itemBySource.get(scope.parentSourceId);
      if (!parent) break;
      scope = parent;
    }
    plan.layouts.push({ scope: nativeBySource.get(item.sourceId)!, kind: 'flow', direction: scope.direction ?? facts.direction });
  }
  return finish('d2', 'general graph', plan, diagnostics, ids);
}

/** Experimental package integration, NOT a production worker supervisor.
 * @d2lang/d2 0.1.34 creates its own worker; callers must add a killable outer
 * process/worker with a hard deadline and memory policy before exposing this to
 * arbitrary input. JS Promise.race alone does not stop the underlying compiler.
 * The one-file in-memory filesystem cannot resolve a host file or remote import.
 */
export async function importD2Experimental(source: string, title?: string): Promise<ImportResult> {
  const errors = inputLimit(source);
  if (errors.length) return finish('d2', 'general graph', blankPlan(title ?? 'Imported D2 diagram'), errors, new Ids());
  return d2FactsToNative(await compileD2Facts(source), title);
}
