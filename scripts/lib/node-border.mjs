/** SVG coordinates are rounded by the renderer. Compare their serialized values exactly. */
const EPS = 1e-9;
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const point = (x, y) => ({ x: Number(x), y: Number(y) });

/** The actual straight parts of an SVG path, excluding its rounded quadratic corners. */
function lines(d) {
  const tokens = d.match(/[MLHQVZ]|-?(?:\d+\.?\d*|\.\d+)/gi) ?? [];
  const segments = [];
  let i = 0,
    current,
    start,
    index = 0;
  while (i < tokens.length) {
    const op = tokens[i++];
    if (op === 'M') current = start = point(tokens[i++], tokens[i++]);
    else if (op === 'L' || op === 'H' || op === 'V') {
      const next =
        op === 'L'
          ? point(tokens[i++], tokens[i++])
          : op === 'H'
            ? point(tokens[i++], current.y)
            : point(current.x, tokens[i++]);
      segments.push({ a: current, b: next, index: index++ });
      current = next;
    } else if (op === 'Q') {
      i += 2;
      current = point(tokens[i++], tokens[i++]);
      index++;
    } else if (op === 'Z' || op === 'z') {
      segments.push({ a: current, b: start, index: index++ });
      current = start;
    } else throw new Error(`Unsupported SVG path command ${op} in ${d}`);
  }
  return segments;
}

function nodeSides(tag) {
  if (tag.startsWith('<rect ')) {
    const x = +attr(tag, 'x'),
      y = +attr(tag, 'y'),
      w = +attr(tag, 'width'),
      h = +attr(tag, 'height');
    const rawRx = +(attr(tag, 'rx') ?? attr(tag, 'ry') ?? 0);
    const rawRy = +(attr(tag, 'ry') ?? attr(tag, 'rx') ?? 0);
    const rx = Math.min(rawRx, w / 2);
    const ry = Math.min(rawRy, h / 2);
    return [
      { side: 'top', a: point(x + rx, y), b: point(x + w - rx, y) },
      { side: 'right', a: point(x + w, y + ry), b: point(x + w, y + h - ry) },
      { side: 'bottom', a: point(x + rx, y + h), b: point(x + w - rx, y + h) },
      { side: 'left', a: point(x, y + ry), b: point(x, y + h - ry) },
    ];
  }
  // An ellipse has no positive-length straight boundary; isolated tangencies are not overlaps.
  if (tag.startsWith('<ellipse ')) return [];
  if (tag.startsWith('<path '))
    return lines(attr(tag, 'd')).map((s, i) => ({ ...s, side: `path-${i}` }));
  return [];
}

/** Actual node-outline runs and nearby parallel runs, not group outlines or point contacts. */
export function scanNodeBorders(svg) {
  if (!/<svg\b/.test(svg) || !/<\/svg>/.test(svg)) throw new Error('Not an SVG');
  const source = svg.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/)?.[1];
  const nodeIds = new Set([...(source ?? '').matchAll(/^[+~.-]?node\s+(\S+)/gm)].map(m => m[1]));
  const markerIds = new Set(
    [
      ...(source ?? '').matchAll(
        /^[+~.-]?node\s+(\S+)(?:\s|$)[^\n]*\bshape=(?:marker|"marker"|&quot;marker&quot;)(?=\s|$)/gm,
      ),
    ].map(m => m[1]),
  );
  const semantic = /class="edge-stroke"/.test(
    svg.replace(/<metadata[^>]*>[\s\S]*?<\/metadata>/, ''),
  );
  const groups = [],
    timelines = [],
    expectedPanels = [],
    expectedNodePanels = [],
    stack = [];
  for (const match of svg.matchAll(/<\/?(?:g|svg)\b[^>]*>/g)) {
    const tag = match[0];
    if (tag.startsWith('</')) {
      const open = stack.pop();
      if (!open) throw new Error('Unbalanced SVG groups');
      if (open.timeline)
        timelines.push({
          body: svg.slice(open.start, match.index),
          scope: open.scope,
          x: open.x,
          y: open.y,
        });
      if (open.id) {
        const body = svg.slice(open.start, match.index).replace(/<svg\b[\s\S]*?<\/svg>/g, '');
        const shapes = [
          ...body.matchAll(/<(?:rect|path|ellipse)\b[^>]*\bclass="(?:shape|node-marker)"[^>]*>/g),
        ].map(x => x[0]);
        if (!shapes.length && markerIds.has(open.id)) {
          const leading = body.match(/^\s*(?:<rect\b[^>]*>\s*)+/)?.[0] ?? '';
          shapes.push(...[...leading.matchAll(/<rect\b[^>]*>/g)].map(m => m[0]));
        }
        const paths = [...body.matchAll(/<path\b[^>]*>/g)].map(m => m[0]);
        const route =
          paths.find(tag => attr(tag, 'class') === 'edge-stroke') ??
          (!semantic
            ? paths.find(
                tag =>
                  !attr(tag, 'class') &&
                  !attr(tag, 'transform') &&
                  /stroke-linecap="round"/.test(tag) &&
                  /stroke-linejoin="round"/.test(tag),
              )
            : undefined);
        groups.push({
          id: open.id,
          scope: open.scope,
          x: open.x,
          y: open.y,
          at: open.start,
          shapes,
          path: route,
          line: [...body.matchAll(/<line\b[^>]*>/g)]
            .map(m => m[0])
            .find(tag => !semantic || attr(tag, 'class') === 'edge-stroke'),
        });
      }
    } else if (!tag.endsWith('/>')) {
      const id = attr(tag, 'data-id');
      const parentScope = stack.at(-1)?.scope ?? '';
      const scope = attr(tag, 'transform') ? `${parentScope}/${match.index}` : parentScope;
      const tr = attr(tag, 'transform'),
        parent = stack.at(-1);
      const move = tr?.match(/^translate\(\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?\s*\)$/);
      for (const [name, target] of [
        ['data-panel-edges', expectedPanels],
        ['data-panel-nodes', expectedNodePanels],
      ]) {
        const expected = attr(tag, name);
        if (expected === undefined) continue;
        const decoded = expected
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        const ids = JSON.parse(decoded);
        if (!Array.isArray(ids) || ids.some(value => typeof value !== 'string'))
          throw new Error('Invalid panel edge metadata');
        target.push({ scope, ids });
      }
      if (id && (parent?.unsupported || (tr && !move)))
        throw new Error(`Unsupported transform ${tr ?? parent.unsupported}`);
      stack.push({
        id,
        scope,
        unsupported: parent?.unsupported ?? (tr && !move && !parent?.id ? tr : undefined),
        timeline: attr(tag, 'class') === 'timeline',
        x: (parent?.x ?? 0) + (move ? +move[1] : 0),
        y: (parent?.y ?? 0) + (move ? +(move[2] ?? 0) : 0),
        start: match.index + tag.length,
      });
    }
  }
  groups.sort((a, b) => a.at - b.at);
  const edgeIds = new Set([...(source ?? '').matchAll(/^[+~.-]?edge\s+(\S+)/gm)].map(m => m[1]));
  const groupIds = new Set([...(source ?? '').matchAll(/^[+~.-]?group\s+(\S+)/gm)].map(m => m[1]));
  const milestoneIds = new Set([...(source ?? '').matchAll(/^milestone\s+(\S+)/gm)].map(m => m[1]));
  const firstRoutes = new Map();
  for (const group of groups)
    if (group.path && !group.shapes.length && !firstRoutes.has(group.scope))
      firstRoutes.set(group.scope, group.at);
  if (!firstRoutes.size && source === undefined)
    throw new Error('SVG has no recognizable routes or metadata');
  const nodes = [],
    routes = [];
  for (const group of groups) {
    if ((group.path || (group.line && edgeIds.has(group.id))) && !group.shapes.length) {
      const tag = group.path ?? group.line;
      const segs = group.path
        ? lines(attr(tag, 'd'))
        : [
            {
              a: point(attr(tag, 'x1'), attr(tag, 'y1')),
              b: point(attr(tag, 'x2'), attr(tag, 'y2')),
              index: 0,
            },
          ];
      routes.push({
        id: group.id,
        scope: group.scope,
        segments: segs.map(seg => ({
          ...seg,
          a: point(seg.a.x + group.x, seg.a.y + group.y),
          b: point(seg.b.x + group.x, seg.b.y + group.y),
        })),
        strokeWidth: +(attr(tag, 'stroke-width') ?? 1),
      });
    } else if (
      group.shapes.length &&
      (firstRoutes.has(group.scope)
        ? group.at > firstRoutes.get(group.scope)
        : !groupIds.has(group.id))
    ) {
      for (const [shapeIndex, shape] of group.shapes.entries())
        nodes.push({
          id: group.id,
          shapeIndex,
          sides: nodeSides(shape).map(side => ({
            ...side,
            a: point(side.a.x + group.x, side.a.y + group.y),
            b: point(side.b.x + group.x, side.b.y + group.y),
          })),
          strokeWidth: +(
            attr(shape, 'stroke-width') ??
            (attr(shape, 'class') === 'node-marker' || markerIds.has(group.id) ? 0 : 1)
          ),
        });
    }
  }
  const expectedNodeIds = expectedNodePanels.length
    ? [...new Set(expectedNodePanels.flatMap(p => p.ids))]
    : null;
  const expectedNodeSet = new Set(expectedNodeIds ?? []);
  const observed = new Set([
    ...nodes.map(n => n.id),
    ...groups.filter(g => nodeIds.has(g.id) || expectedNodeSet.has(g.id)).map(g => g.id),
  ]);
  const timelineRows = [];
  for (const timeline of timelines) {
    const rows = [
      ...timeline.body.matchAll(/<rect\b[^>]*data-id="([^"]+)"[^>]*fill="transparent"[^>]*>/g),
    ].map(m => ({ id: m[1], tag: m[0] }));
    const bars = [...timeline.body.matchAll(/<line\b[^>]*stroke-width="6"[^>]*>/g)].map(m => m[0]);
    // Milestones count in canonical geometry but are axis marks, not node bars.
    for (const row of rows)
      if (!groupIds.has(row.id)) {
        observed.add(row.id);
        timelineRows.push({ id: row.id, scope: timeline.scope });
      }
    for (const row of rows.filter(r => !groupIds.has(r.id) && !milestoneIds.has(r.id))) {
      const mid = +attr(row.tag, 'y') + +attr(row.tag, 'height') / 2;
      const candidates = bars
        .filter(b => Math.abs(+attr(b, 'y1') - mid) < EPS && Math.abs(+attr(b, 'y2') - mid) < EPS)
        .sort(
          (a, b) =>
            Math.abs(+attr(b, 'x2') - +attr(b, 'x1')) - Math.abs(+attr(a, 'x2') - +attr(a, 'x1')),
        );
      if (!candidates.length) continue;
      const bar = candidates[0],
        x1 = +attr(bar, 'x1') + timeline.x,
        x2 = +attr(bar, 'x2') + timeline.x,
        y = mid + timeline.y;
      nodes.push({
        id: row.id,
        shapeIndex: 0,
        strokeWidth: 0,
        sides: [
          { side: 'top', a: point(x1, y - 3), b: point(x2, y - 3) },
          { side: 'bottom', a: point(x1, y + 3), b: point(x2, y + 3) },
        ],
      });
    }
  }
  const findings = [];
  for (const route of routes)
    for (const seg of route.segments)
      for (const node of nodes)
        for (const side of node.sides) {
          const h = Math.abs(seg.a.y - seg.b.y) < EPS && Math.abs(side.a.y - side.b.y) < EPS;
          const v = Math.abs(seg.a.x - seg.b.x) < EPS && Math.abs(side.a.x - side.b.x) < EPS;
          if (!h && !v) continue;
          const axis = h ? 'x' : 'y',
            across = h ? 'y' : 'x';
          const from = Math.max(
            Math.min(seg.a[axis], seg.b[axis]),
            Math.min(side.a[axis], side.b[axis]),
          );
          const to = Math.min(
            Math.max(seg.a[axis], seg.b[axis]),
            Math.max(side.a[axis], side.b[axis]),
          );
          if (to <= from) continue;
          const gap = Math.abs(seg.a[across] - side.a[across]);
          if (gap >= 15) continue;
          const on = gap < EPS;
          const painted = gap <= (route.strokeWidth + node.strokeWidth) / 2 + EPS;
          findings.push({
            kind: on ? 'overlap' : painted ? 'paint-overlap' : 'near',
            edge: route.id,
            node: node.id,
            shape: node.shapeIndex,
            side: side.side,
            segment: seg.index,
            start: seg.a,
            end: seg.b,
            length: to - from,
            overlapFrom: h ? point(from, side.a.y) : point(side.a.x, from),
            overlapTo: h ? point(to, side.a.y) : point(side.a.x, to),
            gap,
            edgeStrokeWidth: route.strokeWidth,
            nodeStrokeWidth: node.strokeWidth,
            blocked: null,
          });
        }
  const outlineIds = [...new Set(nodes.map(n => n.id))];
  const panels = new Map();
  for (const r of routes) {
    const panel = r.scope.split('/')[1] ?? '';
    if (!panels.has(panel)) panels.set(panel, new Set());
    panels.get(panel).add(r.id);
  }
  const validationErrors = [];
  for (const [i, panel] of expectedNodePanels.entries()) {
    const panelId = panel.scope.split('/')[1];
    for (const id of panel.ids) {
      const found =
        groups.some(g => g.id === id && g.scope.split('/')[1] === panelId) ||
        timelineRows.some(r => r.id === id && r.scope.split('/')[1] === panelId);
      if (!found) validationErrors.push(`panel ${i + 1} missing node ${id}`);
    }
  }
  const shapePanels = new Map();
  for (const group of groups.filter(g => g.shapes.length)) {
    const panel = group.scope.split('/')[1] ?? '';
    if (!panel) continue;
    if (!shapePanels.has(panel)) shapePanels.set(panel, new Set());
    shapePanels.get(panel).add(group.id);
  }
  const scopes = [...new Set([...panels.keys(), ...shapePanels.keys()])]
    .filter(Boolean)
    .sort((a, b) => +a - +b);
  const shared = scopes.some((scope, i) =>
    scopes
      .slice(i + 1)
      .some(other =>
        [...(shapePanels.get(scope) ?? [])].some(id => shapePanels.get(other)?.has(id)),
      ),
  );
  if (expectedPanels.length) {
    for (const [i, panel] of expectedPanels.entries())
      for (const id of panel.ids)
        if (!panels.get(panel.scope.split('/')[1])?.has(id))
          validationErrors.push(`panel ${i + 1} missing edge ${id}`);
  } else if (shared && scopes.length === 2 && source !== undefined) {
    const declared = [
      ...source.matchAll(/^([+~.-]?)edge\s+(\S+)\s+(\S+)\s*(?:-&gt;|->)\s*(\S+)/gm),
    ];
    const statuses = new Map(
      [...(source ?? '').matchAll(/^([+~.-]?)node\s+(\S+)/gm)].map(m => [m[2], m[1]]),
    );
    for (const [i, scope] of scopes.entries())
      for (const edge of declared) {
        const hidden = i === 0 ? '+' : '-';
        if (
          edge[1] === hidden ||
          statuses.get(edge[3]) === hidden ||
          statuses.get(edge[4]) === hidden ||
          groupIds.has(edge[3]) ||
          groupIds.has(edge[4])
        )
          continue;
        if (!panels.get(scope)?.has(edge[2]))
          validationErrors.push(`panel ${i + 1} missing edge ${edge[2]}`);
      }
  } else if (shared && scopes.length !== 2)
    validationErrors.push('Cannot validate nested comparison panels');
  return {
    findings,
    nodes: observed.size,
    nodeIds: [...observed],
    expectedNodeIds,
    outlines: outlineIds.length,
    outlineIds,
    routes: new Set(routes.map(r => r.id)).size,
    routeIds: [...new Set(routes.map(r => r.id))],
    expectedRouteIds: expectedPanels.length
      ? [...new Set(expectedPanels.flatMap(p => p.ids))]
      : null,
    validationErrors,
  };
}

export const nodeBorderRuns = svg => scanNodeBorders(svg).findings;
