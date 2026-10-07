import { LayoutLab } from './engines/layout-engine.js';
import { RouteLab } from './engines/routing-engine.js';
import { ICONS, PALETTE, SHAPES, TYPE_STYLE } from './editor-static.js';
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);
const uid = (kind = 'n') =>
  kind +
  '-' +
  (
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
  ).slice(0, 18);
const DEFAULT_SETTINGS = {
  ...LayoutLab.defaults,
  snap: true,
  showManual: true,
  routing: { ...RouteLab.defaults },
};
function baseDoc(title = 'Untitled diagram') {
  return {
    schemaVersion: 2,
    id: uid('doc'),
    title,
    graph: { nodes: [], edges: [], groups: [] },
    layout: { nodes: {}, edges: {}, labels: {}, containers: {}, intent: {} },
    styles: {},
    collapsed: [],
    settings: { ...DEFAULT_SETTINGS },
    camera: { x: 0, y: 0, k: 1 },
    theme: 'light',
  };
}
// Import a v1 active diagram, not its obsolete view-management interface.
// The original file and the original localStorage key are never overwritten.
function migrateLegacy(input) {
  if (!Array.isArray(input.views)) return input;
  const v = input.views.find(v => v.id === input.activeViewId) || input.views[0];
  if (!v) throw Error('The old file has no usable diagram.');
  const g = clone(input.graph),
    hidden = new Set(v.filter?.hiddenIds || []),
    all = [...(g.nodes || []), ...(g.groups || [])];
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of all)
      if (n.parentId && hidden.has(n.parentId) && !hidden.has(n.id)) {
        hidden.add(n.id);
        changed = true;
      }
  }
  g.nodes = (g.nodes || []).filter(n => !hidden.has(n.id));
  g.groups = (g.groups || []).filter(n => !hidden.has(n.id));
  const kept = new Set(g.nodes.map(n => n.id));
  g.edges = (g.edges || []).filter(e => !hidden.has(e.id) && kept.has(e.from) && kept.has(e.to));
  const layout = clone(v.layout || { nodes: {}, edges: {}, labels: {}, containers: {} });
  layout.containers ||= {};
  for (const group of g.groups)
    layout.containers[group.id] = { ...layout.containers[group.id], manualSize: false };
  const styles = clone(v.styles || {});
  for (const n of all)
    styles[n.id] = {
      ...(TYPE_STYLE[n.type] || { shape: 'box', color: 'violet', icon: '' }),
      ...styles[n.id],
    };
  return {
    schemaVersion: 2,
    id: input.id,
    title: input.title,
    graph: g,
    layout,
    styles,
    collapsed: v.collapsed,
    settings: { ...DEFAULT_SETTINGS, direction: v.settings?.direction || 'RIGHT' },
    camera: v.camera,
    theme: input.theme,
  };
}
function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Expected a diagram object.');
  if (input.schemaVersion !== undefined && ![1, 2].includes(input.schemaVersion))
    throw Error('Unsupported diagram version.');
  const data = migrateLegacy(clone(input)),
    out = baseDoc(typeof data.title === 'string' ? data.title : 'Untitled diagram');
  if (!data.graph || !Array.isArray(data.graph.nodes) || !Array.isArray(data.graph.edges))
    throw Error('Expected graph.nodes and graph.edges arrays.');
  if (data.graph.groups !== undefined && !Array.isArray(data.graph.groups))
    throw Error('graph.groups must be an array.');
  if (data.graph.nodes.length > 500 || data.graph.edges.length > 1200)
    throw Error('Use a diagram with at most 500 shapes and 1,200 connections.');
  const ids = new Set(),
    validId = id =>
      typeof id === 'string' &&
      id.trim() &&
      !['__proto__', 'constructor', 'prototype'].includes(id);
  function check(n, kind) {
    if (!n || !validId(n.id)) throw Error(kind + ' requires a nonempty, safe ID.');
    if (ids.has(n.id)) throw Error('Duplicate ID: ' + n.id);
    ids.add(n.id);
    if (kind !== 'Connection' && typeof n.title !== 'string')
      throw Error(n.id + ' requires a title.');
  }
  out.id = validId(data.id) ? data.id : out.id;
  for (const n of data.graph.nodes) {
    check(n, 'Shape');
    if (n.image && !/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(n.image))
      throw Error(n.id + ': image must be embedded raster data.');
    out.graph.nodes.push({
      id: n.id,
      title: n.title,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.image ? { image: n.image } : {}),
    });
  }
  for (const n of data.graph.groups || []) {
    check(n, 'Container');
    out.graph.groups.push({
      id: n.id,
      title: n.title,
      ...(n.parentId ? { parentId: n.parentId } : {}),
    });
  }
  const groups = new Map(out.graph.groups.map(g => [g.id, g])),
    nodes = new Set(out.graph.nodes.map(n => n.id));
  for (const n of [...out.graph.nodes, ...out.graph.groups]) {
    if (n.parentId && !groups.has(n.parentId)) throw Error(n.id + ': container does not exist.');
    const seen = new Set([n.id]);
    let p = n.parentId;
    while (p) {
      if (seen.has(p)) throw Error('Containers cannot contain themselves.');
      seen.add(p);
      p = groups.get(p)?.parentId;
    }
  }
  for (const e of data.graph.edges) {
    check(e, 'Connection');
    if (!nodes.has(e.from) || !nodes.has(e.to)) throw Error(e.id + ': both endpoints must exist.');
    if (e.label !== undefined && typeof e.label !== 'string')
      throw Error(e.id + ': label must be text.');
    out.graph.edges.push({
      id: e.id,
      from: e.from,
      to: e.to,
      label: e.label || '',
      directed: e.directed !== false,
      emphasis: !!e.emphasis,
      dashed: !!e.dashed || ['dependency', 'annotation'].includes(e.type),
    });
  }
  for (const [i, n] of [...out.graph.nodes, ...out.graph.groups].entries()) {
    const p = data.layout?.nodes?.[n.id];
    if (p) {
      for (const key of ['x', 'y', 'w', 'h'])
        if (!finite(p[key]) || Math.abs(p[key]) > 1e6)
          throw Error(n.id + ': ' + key + ' must be a finite coordinate.');
      if (p.w < 24 || p.h < 20) throw Error(n.id + ': shape dimensions are too small.');
      out.layout.nodes[n.id] = {
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        manual: !!p.manual,
        pinned: !!p.pinned,
      };
    } else if (nodes.has(n.id))
      out.layout.nodes[n.id] = {
        x: (i % 4) * 212 + 60,
        y: Math.floor(i / 4) * 100 + 60,
        w: 164,
        h: 56,
      };
    const st = data.styles?.[n.id] || {};
    if (st.shape !== undefined && !SHAPES.includes(st.shape))
      throw Error(n.id + ': unknown shape.');
    if (st.color !== undefined && !PALETTE[st.color]) throw Error(n.id + ': unknown color.');
    out.styles[n.id] = {
      shape: st.shape || 'box',
      color: st.color || 'blue',
      icon: ICONS[st.icon] ? st.icon : '',
    };
    const lab = data.layout?.labels?.[n.id];
    if (lab) {
      if (lab.mode && !['center', 'top', 'bottom', 'left', 'right', 'detached'].includes(lab.mode))
        throw Error(n.id + ': invalid label position.');
      for (const k of ['dx', 'dy', 'width'])
        if (lab[k] !== undefined && !finite(lab[k]))
          throw Error(n.id + ': invalid label geometry.');
      out.layout.labels[n.id] = { ...lab };
    }
    if (groups.has(n.id)) {
      const cfg = data.layout?.containers?.[n.id] || {};
      if (cfg.direction && !['inherit', 'RIGHT', 'DOWN'].includes(cfg.direction))
        throw Error(n.id + ': invalid container direction.');
      out.layout.containers[n.id] = {
        direction: cfg.direction || 'inherit',
        padding: finite(cfg.padding) ? clamp(cfg.padding, 12, 80) : 24,
        manualSize: cfg.manualSize !== false,
      };
    }
  }
  // Old auto-sized containers have no rectangle. Materialize each once.
  const done = new Set();
  function frame(id) {
    if (done.has(id)) return out.layout.nodes[id];
    done.add(id);
    const cs = [...out.graph.nodes, ...out.graph.groups].filter(n => n.parentId === id);
    const rs = cs.map(n => (groups.has(n.id) ? frame(n.id) : out.layout.nodes[n.id]));
    if (!out.layout.nodes[id]) {
      if (rs.length) {
        const x = Math.min(...rs.map(r => r.x)) - 24,
          y = Math.min(...rs.map(r => r.y)) - 52;
        out.layout.nodes[id] = {
          x,
          y,
          w: Math.max(200, Math.max(...rs.map(r => r.x + r.w)) - x + 24),
          h: Math.max(130, Math.max(...rs.map(r => r.y + r.h)) - y + 24),
        };
      } else out.layout.nodes[id] = { x: 60, y: 60, w: 300, h: 220 };
    }
    return out.layout.nodes[id];
  }
  out.graph.groups.forEach(g => frame(g.id));
  for (const e of out.graph.edges) {
    const cfg = data.layout?.edges?.[e.id] || {},
      next = {};
    for (const key of ['fromSide', 'toSide'])
      if (cfg[key]) {
        if (!['auto', 'left', 'right', 'top', 'bottom'].includes(cfg[key]))
          throw Error(e.id + ': invalid connection side.');
        next[key] = cfg[key];
      }
    for (const key of ['labelDx', 'labelDy'])
      if (cfg[key] !== undefined) {
        if (!finite(cfg[key])) throw Error(e.id + ': invalid label offset.');
        next[key] = cfg[key];
      }
    if (cfg.waypoints) {
      if (
        !Array.isArray(cfg.waypoints) ||
        cfg.waypoints.length > 40 ||
        cfg.waypoints.some(p => !finite(p.x) || !finite(p.y))
      )
        throw Error(e.id + ': invalid connection bends.');
      next.waypoints = cfg.waypoints.map(p => ({ x: p.x, y: p.y }));
    }
    out.layout.edges[e.id] = next;
  }
  out.layout.intent = LayoutLab.normalizeIntent(data.layout?.intent || {}, nodes);
  out.collapsed = Array.isArray(data.collapsed) ? data.collapsed.filter(id => groups.has(id)) : [];
  const supplied = { ...(data.settings || {}) };
  if (supplied.algorithm === 'compact') supplied.algorithm = 'layered';
  out.settings = {
    ...DEFAULT_SETTINGS,
    ...LayoutLab.settings({ ...DEFAULT_SETTINGS, ...supplied }),
  };
  for (const key of ['respectManual', 'snap', 'showManual', 'growContainers'])
    if (typeof supplied[key] === 'boolean') out.settings[key] = supplied[key];
  out.settings.routing = RouteLab.settings(data.settings?.routing || {});
  out.settings.mode = 'pass';
  const c = data.camera;
  if (c) {
    if (!finite(c.x) || !finite(c.y) || !finite(c.k) || c.k <= 0) throw Error('Invalid camera.');
    out.camera = { x: c.x, y: c.y, k: clamp(c.k, 0.08, 4) };
  }
  out.theme = data.theme === 'dark' ? 'dark' : 'light';
  return out;
}

export { clone, clamp, finite, uid, DEFAULT_SETTINGS, baseDoc, migrateLegacy, normalize };
