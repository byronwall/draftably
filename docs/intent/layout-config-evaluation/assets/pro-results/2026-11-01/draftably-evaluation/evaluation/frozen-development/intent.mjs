/**
 * Source-intent correctness gates. No layouts, routes, or product modifications.
 *
 * Sources at f14d9b8:
 * - dsl/syntax.ts: layoutParent, nearAnchor, Model/Hint.
 * - dsl/compile.ts: refine (required near is a minimum gap, not exact placement),
 *   sequenced, swimLanes, leafSize/diamondSize, arrangeCells/arrangeUnits.
 * - dsl/cells.ts: layoutCells, layoutUnits; dsl/project.ts: projectScene.
 *
 * referenceDoc, when supplied, MUST be a successful compilation of this same
 * current source, not the previous edit's source. It calibrates source slot/drawn
 * offsets and verifies cells after a whole-group translation in warm engine runs.
 */
const EPS = 0.5;
const valid = r => r && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(r[k]));
const close = (a, b, eps = EPS) => Math.abs(a - b) <= eps;
const center = (r, axis) => r[axis] + r[axis === 'x' ? 'w' : 'h'] / 2;
const gap = (a, b, side) => side === 'right' ? a.x - b.x - b.w
  : side === 'left' ? b.x - a.x - a.w
    : side === 'below' ? a.y - b.y - b.h : b.y - a.y - a.h;

export function checkIntent(model, doc, { referenceDoc, scene } = {}) {
  const failures = [], details = [], skipped = [];
  const checked = { objects: 0, memberships: 0, edges: 0, authoredSideConfigs: 0,
    requiredNear: 0, requiredAlign: 0, explicitSizes: 0, sequenceParticipants: 0,
    sequenceRows: 0, sequencePhases: 0, cellsScopes: 0, cells: 0, lanes: 0,
    pins: 'Checked separately by localPinFailures and warm fixed-ID gates.' };
  const fail = (kind, message, ids = []) => {
    const text = `${kind}: ${message}`; failures.push(text); details.push({ kind, message, ids });
  };
  if (!model || !doc?.graph || !doc?.layout) {
    fail('intent-input', 'Missing parsed source model or native document.');
    return { failures, checked, details, skipped };
  }
  const mb = new Map(model.objects.map(o => [o.id, o]));
  const ns = doc.graph.nodes ?? [], gs = doc.graph.groups ?? [], es = doc.graph.edges ?? [];
  const db = new Map([...ns.map(o => ({ ...o, type: 'node' })), ...gs.map(o => ({ ...o, type: 'group' }))].map(o => [o.id, o]));
  const eb = new Map(es.map(e => [e.id, e]));
  const pos = doc.layout.nodes ?? {}, refPos = referenceDoc?.layout?.nodes ?? {};
  const root = model.layouts.find(l => l.scope === 'root');
  const sequence = root?.algorithm === 'sequence' && !root.engine;
  const lanes = root?.algorithm === 'lanes' && !root.engine;
  const cellsLayouts = model.layouts.filter(l => l.algorithm === 'cells' && !l.engine);
  const cellsScopes = new Set(cellsLayouts.map(l => l.scope));
  const layoutParent = id => {
    let p = mb.get(id)?.parent ?? 'root';
    const seen = new Set();
    while (p !== 'root' && mb.get(p)?.frame && !seen.has(p)) { seen.add(p); p = mb.get(p).parent; }
    return p;
  };
  const nearAnchor = (id, ref) => {
    const scope = layoutParent(id), seen = new Set();
    for (let at = ref; at && at !== 'root' && !seen.has(at); at = layoutParent(at)) {
      seen.add(at);
      if (layoutParent(at) === scope) return at === id ? undefined : at;
    }
  };
  const orderedChildren = scope => {
    const members = model.objects.filter(o => o.parent === scope);
    const order = model.hints.find(h => h.type === 'order' && h.scope === scope)?.ids ?? [];
    return [...order.flatMap(id => members.filter(o => o.id === id)), ...members.filter(o => !order.includes(o.id))];
  };
  const ignoredPosition = id => sequence || cellsScopes.has(layoutParent(id)) || (lanes && layoutParent(id) !== 'root');

  // Compare against the source, never against the engine's own output IDs.
  for (const o of model.objects) {
    checked.objects++; const actual = db.get(o.id);
    if (!actual) { fail('missing-source-object', o.id, [o.id]); continue; }
    if (actual.type !== o.type) fail('object-kind', `${o.id} expected ${o.type}, got ${actual.type}`, [o.id]);
    if (actual.title !== o.label) fail('object-label', `${o.id} no longer has its authored label`, [o.id]);
    checked.memberships++;
    if ((actual.parentId ?? 'root') !== o.parent) fail('membership', `${o.id} expected parent ${o.parent}, got ${actual.parentId ?? 'root'}`, [o.id]);
  }
  for (const o of db.values()) if (!mb.has(o.id)) fail('unexpected-source-object', o.id, [o.id]);
  if (db.size !== ns.length + gs.length) fail('duplicate-source-object', 'Duplicate node/group IDs.');
  const sourceEdges = new Set(model.edges.map(e => e.id));
  for (const e of model.edges) {
    checked.edges++; const actual = eb.get(e.id);
    if (!actual) { fail('missing-source-edge', e.id, [e.id]); continue; }
    if (actual.from !== e.source || actual.to !== e.target) fail('edge-endpoints', `${e.id}: expected ${e.source} -> ${e.target}, got ${actual.from} -> ${actual.to}`, [e.id]);
    if ((actual.directed !== false) !== (e.directed !== false)) fail('edge-direction', `${e.id} lost directed/undirected meaning`, [e.id]);
    if ((actual.label ?? '') !== (e.label ?? '')) fail('edge-label', `${e.id} lost its authored label`, [e.id]);
    for (const end of ['from', 'to']) if (e[end] && e[end] !== 'auto') {
      checked.authoredSideConfigs++;
      if (doc.layout.edges[e.id]?.[end + 'Side'] !== e[end]) fail('authored-side-config', `${e.id}:${end} expected ${e[end]}`, [e.id]);
    }
  }
  for (const e of es) if (!sourceEdges.has(e.id)) fail('unexpected-source-edge', e.id, [e.id]);
  if (eb.size !== es.length) fail('duplicate-source-edge', 'Duplicate edge IDs.');

  for (const h of model.hints) {
    if (h.type === 'near' && h.strength === 'required') {
      if (ignoredPosition(h.id)) { skipped.push({ kind: 'required-near', id: h.id, reason: 'This specialist recipe ignores positional refinements in the shipped compiler.' }); continue; }
      const anchor = nearAnchor(h.id, h.ref);
      if (!anchor || !valid(pos[h.id]) || !valid(pos[anchor])) { fail('required-near-unmeasurable', `${h.id} relative to ${h.ref}`, [h.id, h.ref]); continue; }
      checked.requiredNear++;
      const actual = gap(pos[h.id], pos[anchor], h.side);
      // A theme may draw a box slightly outside its layout slot. Do not invent a
      // stricter warm requirement than the successful same-source compilation.
      const refGap = valid(refPos[h.id]) && valid(refPos[anchor]) ? gap(refPos[h.id], refPos[anchor], h.side) : null;
      const limit = refGap === null ? h.gap : Math.min(h.gap, refGap);
      if (actual < limit - EPS) {
        // With a current source Scene, the compiler's slot constraint diagnostic
        // is authoritative. A rendered-box discrepancy is recorded separately.
        const compilerFailure = scene?.diagnostics?.some(d => d.level === 'error' && d.code === 'unsatisfied-near' && d.ids.includes(h.id));
        if (scene && !compilerFailure) skipped.push({ kind: 'required-near-drawn-slot', id: h.id, actualGap: actual, authoredMinimum: h.gap, reason: 'Compiler accepted the slot constraint; rendered sizes differ. Not promoted to a new hard gate.' });
        else fail('required-near', `${h.id} ${h.side} of ${anchor}: gap ${actual}, minimum ${limit}`, [h.id, anchor]);
      }
      // h.offset and exact equality are deliberately not required: refine() only
      // constrains the minimum separation on the named axis.
    }
    if (h.type === 'align' && h.strength === 'required') {
      if (h.ids.some(ignoredPosition)) { skipped.push({ kind: 'required-align', ids: h.ids, reason: 'Specialist positional refinement is unsupported.' }); continue; }
      checked.requiredAlign++;
      if (h.ids.some(id => !valid(pos[id]))) { fail('required-align-unmeasurable', h.ids.join(', '), h.ids); continue; }
      const values = h.ids.map(id => center(pos[id], h.axis));
      const spread = Math.max(...values) - Math.min(...values);
      const refs = h.ids.map(id => refPos[id]);
      const refSpread = refs.every(valid) ? Math.max(...refs.map(r => center(r, h.axis))) - Math.min(...refs.map(r => center(r, h.axis))) : 0;
      if (spread > Math.max(EPS, refSpread + EPS)) {
        if (scene && !scene.diagnostics?.some(d => d.level === 'error' && d.code === 'pin-align-conflict')) skipped.push({ kind: 'required-align-drawn-slot', ids: h.ids, spread, reason: 'Compiler accepted slot-center alignment; rendered offsets differ.' });
        else fail('required-align', `${h.axis} centers spread ${spread}px`, h.ids);
      }
    }
    if (h.type === 'size') {
      const o = mb.get(h.id), r = pos[h.id];
      if (!o || !valid(r)) continue;
      if (cellsScopes.has(o.parent)) { skipped.push({ kind: 'cell-size', id: h.id, reason: 'Cells stretch columns/rows; unit cells encode span instead.' }); continue; }
      checked.explicitSizes++;
      const w = o.shape === 'diamond' ? Math.max(h.width, h.height ?? 0) : h.width;
      const height = o.shape === 'diamond' ? w : h.height;
      if (!close(r.w, w) || (height !== undefined && !close(r.h, height))) fail('explicit-size', `${h.id}: expected ${w} × ${height ?? 'auto'}, got ${r.w} × ${r.h}`, [h.id]);
    }
  }

  if (sequence) {
    if (!doc.layout.sequence) fail('sequence-panel', 'Sequence metadata missing.');
    const nodes = model.objects.filter(o => o.type === 'node');
    const listed = model.hints.find(h => h.type === 'order' && h.scope === 'root')?.ids ?? [];
    const byFirst = [...listed.flatMap(id => nodes.filter(o => o.id === id)), ...nodes.filter(o => !listed.includes(o.id))];
    const ordered = [];
    for (const o of byFirst) if (!ordered.includes(o)) ordered.push(...(o.parent === 'root' ? [o] : byFirst.filter(x => x.parent === o.parent)));
    const present = ordered.filter(o => valid(pos[o.id]));
    checked.sequenceParticipants = present.length;
    if (present.length) {
      const ys = present.map(o => pos[o.id].y);
      if (Math.max(...ys) - Math.min(...ys) > EPS) fail('sequence-header-row', 'Participants no longer share one header row.', present.map(o => o.id));
      for (let i = 1; i < present.length; i++) if (pos[present[i].id].x <= pos[present[i - 1].id].x + EPS) fail('sequence-participant-order', `${present[i - 1].id} must precede ${present[i].id}`, [present[i - 1].id, present[i].id]);
    }
    let previous = -Infinity;
    for (const e of model.edges) {
      checked.sequenceRows++; const row = doc.layout.edges[e.id]?.row;
      if (!Number.isFinite(row) || row <= previous + EPS) fail('sequence-message-order', `${e.id} must occupy a later finite message row`, [e.id]);
      if (Number.isFinite(row)) previous = row;
    }
    const phases = new Map((doc.layout.sequence?.phases ?? []).map(p => [p.id, p]));
    for (const p of model.phases ?? []) {
      if (!p.ids.length) continue;
      checked.sequencePhases++; const actual = phases.get(p.id);
      if (!actual) { fail('sequence-phase', `${p.id} missing`, [p.id]); continue; }
      for (const id of p.ids) { const row = doc.layout.edges[id]?.row; if (Number.isFinite(row) && (row < actual.y - EPS || row > actual.y + actual.h + EPS)) fail('sequence-phase-membership', `${id} lies outside ${p.id}`, [id, p.id]); }
    }
  }

  for (const layout of cellsLayouts) {
    checked.cellsScopes++; const scope = layout.scope, group = pos[scope], container = doc.layout.containers?.[scope];
    if (!valid(group) || !Number.isFinite(container?.cellsBand) || container.cellsBand <= 0) { fail('cells-scope', `${scope} lost its group geometry or cells-band metadata`, [scope]); continue; }
    const members = orderedChildren(scope).filter(o => o.type === 'node');
    checked.cells += members.length;
    const refGroup = refPos[scope];
    if (valid(refGroup) && members.every(o => valid(refPos[o.id]))) {
      for (const o of members) {
        const a = pos[o.id], b = refPos[o.id]; if (!valid(a)) continue;
        if (!close(a.x - group.x, b.x - refGroup.x) || !close(a.y - group.y, b.y - refGroup.y) || !close(a.w, b.w) || !close(a.h, b.h)) fail('cells-relative-geometry', `${o.id} no longer retains its same-source cell placement within ${scope}`, [o.id, scope]);
      }
      continue;
    }
    const parts = members.filter(o => o.shape !== 'marker');
    if (layout.unit) {
      const cols = layout.columns ?? (layout.unit === 'bit' ? 32 : 16), unit = layout.unitWidth ?? (layout.unit === 'bit' ? 24 : 48);
      let row = 0, col = 0;
      const rowHeight = parts.map(o => pos[o.id]).find(valid)?.h ?? 0;
      const ruler = container.cellsChrome?.ruler?.h ?? 0;
      for (const o of parts) {
        const runs = [];
        if (o.span === 'var') { runs.push({ row, col, span: cols - col }); row++; col = 0; }
        else for (let left = o.span ?? 1; left > 0;) {
          const take = Math.min(left, cols - col); runs.push({ row, col, span: take }); left -= take; col += take;
          if (col === cols) { row++; col = 0; }
        }
        const main = runs.reduce((a, b) => b.span > a.span ? b : a), r = pos[o.id];
        if (!valid(r)) continue;
        if (!close(r.w, main.span * unit) || !close(r.x - group.x, main.col * unit) || !close(r.y - group.y, container.cellsBand + ruler + main.row * rowHeight)) fail('unit-cells', `${o.id} lost its ${layout.unit} span/order`, [o.id, scope]);
      }
      continue;
    }
    const cols = Math.max(1, layout.columns ?? (layout.direction === 'down' ? 1 : parts.reduce((n, o) => n + (o.span ?? 1), 0)));
    const rows = []; let row = 0, col = 0;
    for (const o of parts) {
      const span = Math.min(o.span ?? 1, cols);
      if (col + span > cols) { row++; col = 0; }
      (rows[row] ??= []).push(o); col += span;
    }
    let prior;
    for (const members of rows) {
      const first = pos[members[0].id]; if (!valid(first)) continue;
      if (!close(first.x, group.x)) fail('cells-row-start', `${members[0].id} does not start at its group's left edge`, [members[0].id, scope]);
      if (prior && !close(first.y, prior.y + prior.h)) fail('cells-row-gap', `${members[0].id} no longer touches the preceding row`, [members[0].id, scope]);
      if (!prior && !close(first.y, group.y + container.cellsBand)) fail('cells-title-adjacency', `${members[0].id} is detached from the cell title band`, [members[0].id, scope]);
      for (let i = 0; i < members.length; i++) {
        const r = pos[members[i].id]; if (!valid(r)) continue;
        if (!close(r.y, first.y) || !close(r.h, first.h)) fail('cells-row-shape', `${members[i].id} does not share its row`, [members[i].id, scope]);
        if (i && valid(pos[members[i - 1].id]) && !close(r.x, pos[members[i - 1].id].x + pos[members[i - 1].id].w)) fail('cells-adjacency', `${members[i - 1].id} and ${members[i].id} no longer touch`, [members[i - 1].id, members[i].id]);
      }
      prior = first;
    }
    if (members.some(o => o.shape === 'marker')) skipped.push({ kind: 'marker-seam', scope, reason: 'Without a same-source reference, marker semantics are checked only by identity and cell-band presence.' });
  }

  if (lanes) {
    const right = root.direction !== 'down';
    const groups = orderedChildren('root').filter(o => o.type === 'group' && valid(pos[o.id]));
    checked.lanes = groups.length;
    const along = right ? 'x' : 'y', across = right ? 'y' : 'x', length = right ? 'w' : 'h', depth = right ? 'h' : 'w';
    const first = groups[0] && pos[groups[0].id];
    for (let i = 0; i < groups.length; i++) {
      const r = pos[groups[i].id];
      if (first && (!close(r[along], first[along]) || !close(r[length], first[length]))) fail('lane-span', `${groups[i].id} no longer shares the lanes' full span`, [groups[i].id]);
      if (i && !close(r[across], pos[groups[i - 1].id][across] + pos[groups[i - 1].id][depth])) fail('lane-order', `${groups[i].id} no longer follows the prior lane`, [groups[i - 1].id, groups[i].id]);
    }
  }
  return { failures, checked, details, skipped };
}
