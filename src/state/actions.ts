/**
 * Editor operations behind the toolbar, menus, inspector and keyboard shortcuts.
 * Each one is a single undoable step.
 */
import { batch, createRoot, createSignal } from 'solid-js';
import {
  groupShadeFor,
  isBuiltInFamily,
  NODE_SHADE,
  resolveAppearance,
  shadesOf,
  type AppearanceOverrides,
  type Shade,
  type ThemeId,
} from '../model/appearance';
import { normalize } from '../model/document';
import * as edits from '../model/edits';
import {
  descendants,
  findEdge,
  findGroup,
  findNode,
  frameRect,
  isCollapsed,
  isEdge,
  isGroup,
  selectionRoots,
} from '../model/graph';
import { loadSample } from '../model/samples';
import type { Diagram, IntentPlacement, IntentRole, Point, Rect, Side } from '../model/types';
import {
  clearSelection,
  doc,
  editsGoToFile,
  mutate,
  isSelected,
  onBeforeEdit,
  onSourceIdMap,
  selectedIds,
  selection,
  setSelection,
  singleSelection,
  transact,
  prepareForEdit,
} from './document';
import {
  canvasCenter,
  canvasElement,
  connectFrom,
  fitView,
  focusCanvas,
  inlineEditId,
  reducedMotion,
  revealObject,
  setConnectFrom,
  setInlineEditId,
  setToolSignal,
  stageSize,
  type Tool,
} from './editor';
import { discardPreview, setDocumentOpener } from './layout';
import { geometry, resetRoutes, routesById, routingReport, setAdoptedRoutes } from './scene';
import { toast } from './toast';
import { confirmAction } from './ui';

// --- Tools -----------------------------------------------------------------------------------

/** Lets the brush and timeline intercept tool changes. Returns true when handled. */
let toolInterceptor: (tool: Tool) => boolean = () => false;
export const setToolInterceptor = (fn: (tool: Tool) => boolean) => (toolInterceptor = fn);

export function setTool(next: Tool) {
  if (toolInterceptor(next)) return;
  finishInlineEdit(true);
  batch(() => {
    setToolSignal(next);
    const only = singleSelection();
    setConnectFrom(
      next === 'connect' && only && findNode(doc, only) ? { id: only, side: 'auto' } : null,
    );
  });
  focusCanvas();
}

// --- Inline label editing --------------------------------------------------------------------

const [inlineDraft, setInlineDraft] = createRoot(() => createSignal(''));
export { inlineDraft, setInlineDraft };

onSourceIdMap(mapId => {
  const id = inlineEditId();
  if (id) setInlineEditId(mapId(id));
});

/** Inline-edit ids of the frame's title and subtitle; never valid object ids. */
export const HEADING_EDIT = { title: '@title', subtitle: '@subtitle' } as const;
const headingKey = (id: string) =>
  id === HEADING_EDIT.title ? 'title' : id === HEADING_EDIT.subtitle ? 'subtitle' : undefined;

export function startInlineEdit(id: string) {
  const key = headingKey(id);
  if (key) {
    finishInlineEdit(true);
    batch(() => {
      setConnectFrom(null);
      setInlineDraft(doc.appearance.heading?.[key] ?? '');
      setInlineEditId(id);
    });
    return;
  }
  const entity = findNode(doc, id) ?? findGroup(doc, id) ?? findEdge(doc, id);
  if (!entity) return;
  finishInlineEdit(true);
  batch(() => {
    setConnectFrom(null);
    setInlineDraft('label' in entity ? entity.label : entity.title);
    setInlineEditId(id);
  });
}

export function finishInlineEdit(save = true) {
  const id = inlineEditId();
  if (!id) return;
  setInlineEditId(null);
  if (!save) return;
  const value = inlineDraft().trim(),
    key = headingKey(id);
  if (key) {
    if ((doc.appearance.heading?.[key] ?? '') !== value)
      transact(key === 'title' ? 'Edit title' : 'Edit subtitle', d => {
        const heading = (d.appearance.heading ??= {});
        if (value) heading[key] = value;
        else delete heading[key];
        if (key === 'title') d.title = value;
      });
    return;
  }
  const edge = findEdge(doc, id);
  if (edge) {
    if (edge.label !== value) transact('Edit label', d => edits.setEdgeLabel(d, id, value));
    return;
  }
  const object = findNode(doc, id) ?? findGroup(doc, id);
  if (object && object.title !== (value || 'Untitled'))
    transact('Edit label', d => edits.setTitle(d, id, value));
}

onBeforeEdit(() => {
  // Commit a pending label before any other edit so it lands in its own undo step.
  if (inlineEditId()) finishInlineEdit(true);
});

// --- Creating objects ------------------------------------------------------------------------

export function addNode(partial: edits.NewNode = {}, at: Point = canvasCenter(), edit = false) {
  let id = '';
  transact('Add shape', d => {
    id = edits.addNode(d, partial, at);
  });
  setSelection([id]);
  if (edit) startInlineEdit(id);
  return id;
}

export function addEdge(partial: edits.NewEdge) {
  let id = '';
  transact('Add connection', d => {
    id = edits.addEdge(d, partial);
  });
  setSelection([id]);
  return id;
}

/** Finish a connection started with the Connect tool or a port drag. */
export function completeConnection(targetId: string, side: Side | 'auto' = 'auto') {
  const from = connectFrom();
  if (!from || !findNode(doc, targetId)) return;
  setConnectFrom(null);
  addEdge({ from: from.id, to: targetId, fromSide: from.side, toSide: side });
  // Connect stays active; the inspector shows the target.
  setSelection([targetId]);
  focusCanvas();
}

/**
 * Add a connected shape next to the selection (Tab, Alt+arrow, quick-add buttons).
 * With a connection selected, split it instead.
 */
export function quickExtend({
  side = null,
  sibling = false,
  at = null,
  from = null,
}: { side?: Side | null; sibling?: boolean; at?: Point | null; from?: string | null } = {}) {
  prepareForEdit();
  const ids = selectedIds();
  if (ids[0] && isEdge(doc, ids[0]) && !from && !sibling && !at) return insertStep(ids[0]);
  const source = from || ids.find(id => findNode(doc, id)) || null,
    container = ids.find(id => findGroup(doc, id));
  let parentId: string | null | undefined;
  let target = at;
  if (target) {
    parentId =
      edits.dropTarget(doc, '', { x: target.x - 82, y: target.y - 28, w: 164, h: 56 })?.id || null;
  } else if (!source && container) {
    parentId = container;
    const p = doc.layout.nodes[container],
      pad = edits.containerPadding(doc, container);
    target = { x: p.x + pad + 82, y: p.y + pad + 56 };
  }
  let id = '';
  transact(sibling ? 'Add sibling branch' : 'Add connected shape', d => {
    id = edits.addConnectedNode(
      d,
      {
        from: sibling ? null : source,
        siblingOf: sibling ? source : null,
        side,
        at: target,
        parentId,
        title: sibling ? 'Another branch' : 'Next step',
      },
      canvasCenter(),
    );
  });
  batch(() => {
    setSelection([id]);
    setConnectFrom(null);
  });
  revealObject(id);
  startInlineEdit(id);
  return id;
}

/** Insert a new shape in the middle of a connection. */
export function insertStep(edgeId: string, at: Point | null = null) {
  if (!findEdge(doc, edgeId)) return;
  let id: string | undefined;
  transact('Insert connected step', d => {
    id = edits.insertStep(d, edgeId, routesById().get(edgeId)?.points, at);
  });
  if (!id) return;
  setSelection([id]);
  revealObject(id);
  startInlineEdit(id);
  return id;
}

export function buildFromList(
  lines: string[],
  options: {
    mode?: edits.BuildMode;
    title?: string;
    source?: string | null;
    parentId?: string | null;
  } = {},
) {
  let ids: string[] = [];
  const columns = Math.max(2, Math.min(5, Math.floor((stageSize().width - 100) / 212)));
  transact('Build ' + lines.length + ' shapes', d => {
    ids = edits.buildFromList(d, lines, { ...options, origin: canvasCenter(), columns });
  });
  setSelection(ids);
  fitView();
  const mode = options.mode ?? 'chain';
  toast(
    `${lines.length} shapes created · ${mode === 'none' ? 'no connections' : mode === 'chain' ? 'connected flow' : 'branches'} · one undo`,
  );
  return ids;
}

export function wrapSelection() {
  let id = '';
  transact('Create container', d => {
    id = edits.wrapInContainer(d, selectionRoots(d, selection()), canvasCenter());
  });
  setSelection([id]);
  startInlineEdit(id);
  return id;
}

export function drawContainer(rect: { x: number; y: number; w: number; h: number }) {
  let id = '';
  transact('Create container', d => {
    id = edits.drawContainer(d, rect);
  });
  setSelection([id]);
  startInlineEdit(id);
}

// --- Changing the selection ------------------------------------------------------------------

export function deleteSelection(deep = false) {
  if (!selection().size) return;
  const ids = selectedIds();
  transact(deep ? 'Delete with contents' : 'Delete selection', d =>
    edits.deleteObjects(d, ids, deep),
  );
  batch(() => {
    clearSelection();
    setConnectFrom(null);
  });
}

export function ungroupSelection() {
  const ids = selectedIds().filter(id => isGroup(doc, id));
  if (!ids.length) return;
  transact('Ungroup', d => edits.ungroup(d, ids));
  clearSelection();
}

export function togglePin() {
  const roots = selectionRoots(doc, selection());
  if (!roots.length) return;
  const value = !roots.every(id => doc.layout.nodes[id].pinned);
  transact(value ? 'Pin objects' : 'Unpin objects', d => {
    for (const id of roots) d.layout.nodes[id].pinned = value;
  });
}

export function clearManualMarkers() {
  const roots = selectionRoots(doc, selection());
  transact('Clear manual markers', d => {
    for (const id of roots) d.layout.nodes[id].manual = false;
  });
}

export function alignSelection(kind: edits.AlignKind) {
  const roots = selectionRoots(doc, selection());
  if (roots.length < 2) {
    toast('Select two or more objects.');
    return;
  }
  transact('Align objects', d => edits.alignObjects(d, roots, kind));
}

export function nudgeSelection(dx: number, dy: number) {
  const roots = selectionRoots(doc, selection());
  if (roots.length) transact('Nudge', d => edits.nudge(d, roots, dx, dy));
  return roots.length > 0;
}

export function setColor(color: Diagram['styles'][string]['color']) {
  const ids = selectedIds().filter(id => findNode(doc, id) || findGroup(doc, id));
  const look = resolveAppearance(doc.appearance);
  transact('Change color', d => {
    for (const id of ids) {
      edits.setStyle(d, id, { color });
      // A file-defined family may not have the current shade; use its closest one.
      const style = d.styles[id],
        shade = style.shade ?? (findGroup(d, id) ? groupShadeFor(look.theme) : NODE_SHADE),
        available = color === 'auto' ? [] : shadesOf(look, color);
      if (available.length && !available.includes(shade))
        style.shade = available.reduce((a, b) =>
          Math.abs(b - shade) < Math.abs(a - shade) ? b : a,
        );
    }
  });
}

/**
 * Switch the diagram to a preset theme in one undoable step. Overrides of the old preset are
 * cleared; the file's own color families stay, so objects that use them keep their colors.
 */
export function chooseTheme(theme: ThemeId) {
  transact('Change theme', d => {
    d.appearance = {
      theme,
      overrides: {},
      colors: d.appearance.colors.filter(c => !isBuiltInFamily(c.family)),
    };
  });
}

/** Change diagram-wide appearance values; `undefined` returns a value to the theme's default. */
export function setAppearanceOverrides(
  patch: Partial<AppearanceOverrides>,
  label = 'Change padding',
) {
  transact(label, d => {
    const next = { ...d.appearance.overrides, ...patch };
    for (const key of Object.keys(next) as Array<keyof AppearanceOverrides>)
      if (next[key] === undefined) delete next[key];
    d.appearance.overrides = next;
  });
}

/** Set the shade of the selection; `undefined` returns to the default shade. */
export function setShade(shade: Shade | undefined) {
  const ids = selectedIds().filter(id => findNode(doc, id) || findGroup(doc, id));
  transact('Change shade', d => {
    for (const id of ids) {
      const style = (d.styles[id] ||= { shape: 'box', color: 'auto', icon: '' });
      if (shade === undefined) delete style.shade;
      else style.shade = shade;
    }
  });
}

export function fitSelectedContainer() {
  const id = selectionRoots(doc, selection()).find(id => isGroup(doc, id));
  if (id)
    transact('Fit container', d => {
      edits.fitContainer(d, id);
      d.layout.containers[id].manualSize = true;
    });
}

export function toggleCollapse(id = selectionRoots(doc, selection()).find(id => isGroup(doc, id))) {
  if (!id || !isGroup(doc, id)) return;
  const before = frameRect(doc, geometry, id);
  // A file never stores which containers are collapsed: there it is a view, like the camera,
  // and needs no translation, recompile or save.
  // The scene draws quick routes and has the worker route it in full.
  if (editsGoToFile()) mutate(d => edits.toggleCollapsed(d, id));
  else transact('Toggle container', d => edits.toggleCollapsed(d, id));
  animateToggle(id, before);
}

/** Grow or shrink the frame from its old size, and fade in what an expand reveals. */
function animateToggle(id: string, before: Rect) {
  const svg = canvasElement();
  if (!svg || reducedMotion()) return;
  const after = frameRect(doc, geometry, id),
    expanded = !isCollapsed(doc, id),
    inside = new Set(descendants(doc, id));
  requestAnimationFrame(() => {
    const timing = { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' };
    svg.querySelector(`g.group[data-id="${CSS.escape(id)}"] > .group-bg`)?.animate(
      [
        { width: `${before.w}px`, height: `${before.h}px` },
        { width: `${after.w}px`, height: `${after.h}px` },
      ],
      timing,
    );
    if (!expanded) return;
    for (const el of svg.querySelectorAll<SVGGElement>('g[data-kind][data-id]')) {
      const edge = findEdge(doc, el.dataset.id!);
      const revealed = edge
        ? inside.has(edge.from) || inside.has(edge.to)
        : inside.has(el.dataset.id!);
      if (revealed) el.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, delay: 60 });
    }
  });
}

export function reverseSelectedEdge() {
  const id = selectedIds().find(id => isEdge(doc, id));
  if (id) transact('Reverse connection', d => edits.reverseEdge(d, id));
}

export function resetSelectedBends() {
  const id = selectedIds().find(id => isEdge(doc, id));
  if (id)
    transact('Reset connection bends', d => edits.setEdgeLayout(d, id, { waypoints: undefined }));
}

export function setLayoutIntent(role: IntentRole, id: string | null, placement?: IntentPlacement) {
  try {
    transact('Set ' + role + ' preference', d => edits.setIntent(d, role, id, placement));
    toast(
      id
        ? 'Layout preference saved. Improve or compare to arrange it.'
        : 'Cleared ' + role + ' preference',
    );
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

export function markSelectedAs(role: IntentRole) {
  const id = selectedIds().find(id => findNode(doc, id));
  if (id) setLayoutIntent(role, id);
  else toast('Select a shape first.');
}

export function addWaypointAt(edgeId: string, point?: Point) {
  const route = routesById().get(edgeId);
  if (!route) return;
  const current = doc.layout.edges[edgeId]?.waypoints || [];
  if (current.length >= 40) {
    toast('Use at most 40 waypoints per edge.');
    return;
  }
  const first = route.points[0],
    last = route.points.at(-1)!;
  const p = point || {
    x: route.label?.x ?? (first.x + last.x) / 2,
    y: (route.label?.y ?? (first.y + last.y) / 2) + 38,
  };
  if (edits.bendInsideShape(doc, p)) {
    toast('Place a waypoint outside a node.');
    return;
  }
  transact('Add waypoint', d => edits.addWaypoint(d, edgeId, p));
  setSelection([edgeId]);
}

export function removeWaypoint(edgeId: string, index: number) {
  transact('Remove bend', d => edits.removeWaypoint(d, edgeId, index));
}

/** Recompute connections without moving shapes. With `auto`, release fixed port sides first. */
export function reroute({ auto = false } = {}) {
  finishInlineEdit(true);
  if (auto) {
    const edgesSelected = selectedIds().filter(id => isEdge(doc, id));
    const ids = edgesSelected.length
      ? edgesSelected
      : doc.graph.edges.filter(e => isSelected(e.from) || isSelected(e.to)).map(e => e.id);
    if (!ids.length) {
      toast('Select connections or shapes to release their fixed ports.');
      return;
    }
    transact('Use automatic ports', d => edits.useAutomaticPorts(d, ids));
  }
  resetRoutes();
  setAdoptedRoutes(null);
  // Reading the report forces the routes to be recomputed now.
  const r = routingReport();
  toast(
    `Routes refreshed · ${r.crossings} crossings · ${r.lanePairs} close lane pairs · ${r.blocked} obstructed · shapes unchanged`,
  );
}

export function toggleTheme() {
  transact('Change theme', d => {
    d.theme = d.theme === 'light' ? 'dark' : 'light';
  });
}

// --- Clipboard -------------------------------------------------------------------------------

let clipboard: edits.ClipboardFragment | null = null;

export function copySelection() {
  if (!selection().size) return null;
  clipboard = edits.copyFragment(doc, selection());
  toast(
    `Copied ${clipboard.nodes.length + clipboard.groups.length + clipboard.edges.length} objects`,
  );
  return clipboard;
}

export const hasClipboard = () => !!clipboard;

export function pasteFragment(part: edits.ClipboardFragment | null = clipboard) {
  if (!part || !edits.isClipboardFragment(part)) {
    toast('Copy some objects first, or import JSON.');
    return;
  }
  const result = edits.pasteFragment(doc, part);
  transact('Paste objects', d => Object.assign(d, result.doc));
  setSelection(result.selected);
}

export function duplicateSelection() {
  if (!selection().size) return;
  pasteFragment(edits.copyFragment(doc, selection()));
  toast('Duplicated selection');
}

// --- Whole documents -------------------------------------------------------------------------

/** Replace the diagram as one undo step. */
export function openDocument(input: unknown, { fit = true, label = 'Open diagram' } = {}) {
  discardPreview();
  prepareForEdit();
  const valid = normalize(input);
  const camera = { ...doc.camera };
  transact(label, d => {
    Object.assign(d, valid);
    if (!fit) d.camera = camera;
  });
  batch(() => {
    clearSelection();
    setConnectFrom(null);
    setToolSignal('select');
    resetRoutes();
  });
  if (fit) requestAnimationFrame(() => fitView());
  return valid;
}

setDocumentOpener((d, label) => openDocument(d, { fit: false, label }));

export function newDocument() {
  confirmAction({
    title: 'New diagram?',
    message:
      'The current diagram is saved in this browser. Starting a new diagram replaces it. Undo can restore it until you close this page.',
    confirmLabel: 'New diagram',
    onConfirm: () => openDocument(edits.emptyDiagram(), { label: 'New diagram' }),
  });
}

export function openSample(id: string) {
  const load = () => openDocument(loadSample(id), { label: 'Load example' });
  if (!doc.graph.nodes.length && !doc.graph.groups.length) return load();
  confirmAction({
    title: 'Open example?',
    message: 'This replaces the current diagram. Undo restores it. Save a copy first to keep both.',
    confirmLabel: 'Open example',
    onConfirm: load,
  });
}
