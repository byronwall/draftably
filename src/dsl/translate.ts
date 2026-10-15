/**
 * Translate one committed editor edit into source statements.
 *
 * The editor works on a projected `Diagram`. When an edit is committed, the document before and
 * after it are compared and the supported differences become targeted source changes: model edits
 * become declarations, and moves become relative preferences. Geometry the translator does not
 * write snaps back when the source is reprojected, so nothing unsaved looks saved. Changes the
 * file cannot express are rejected outright.
 */
import { selectionRoots } from '../model/graph';
import type { ColorKey, Diagram, DiagramEdge, PortSide, Rect } from '../model/types';
import { contentOrigin, type Scene } from './compile';
import {
  addRefinement,
  bare,
  clearPosition,
  declaration,
  edgeStatement,
  getAttr,
  insertAfter,
  layoutStatement,
  num,
  quoted,
  removeReferences,
  removeWhere,
  setAttr,
  statement,
  statements,
} from './source-edits';
import { DSL_SHAPES, type NearSide, type SourceDoc, type Statement, type Word } from './syntax';

export class UnsupportedEdit extends Error {}

export interface EditInput {
  source: SourceDoc;
  scene: Scene;
  before: Diagram;
  after: Diagram;
  label: string;
  /** Selected ids when the edit was committed; moves and resizes apply to these. */
  selection: string[];
}

export interface EditResult {
  source: SourceDoc;
  /** Editor ids of new objects and connections, mapped to their ids in the source. */
  ids: Map<string, string>;
  /** Short descriptions of saved refinements, for the status message. */
  notes: string[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const objectsOf = (d: Diagram) => [...d.graph.groups, ...d.graph.nodes];

function slug(text: string, fallback: string) {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return s && /^[a-z_]/.test(s) ? s : s ? fallback + '-' + s : fallback;
}

function rejectUnsupported(before: Diagram, after: Diagram) {
  for (const e of after.graph.edges) {
    const a = before.layout.edges[e.id] ?? {},
      b = after.layout.edges[e.id] ?? {};
    if (!same(a.waypoints?.length ? a.waypoints : null, b.waypoints?.length ? b.waypoints : null))
      throw new UnsupportedEdit('Connection bends are not saved to diagram files yet.');
    if ((a.labelDx ?? 0) !== (b.labelDx ?? 0) || (a.labelDy ?? 0) !== (b.labelDy ?? 0))
      throw new UnsupportedEdit('Connection label positions are not saved to diagram files yet.');
    const old = before.graph.edges.find(x => x.id === e.id);
    if (e.directed === false || e.emphasis || (old && old.emphasis !== e.emphasis))
      throw new UnsupportedEdit('Emphasized and undirected connections are not supported yet.');
  }
  if (!same(before.layout.labels, after.layout.labels))
    throw new UnsupportedEdit('Label positions are not saved to diagram files yet.');
  if (!same(before.layout.intent, after.layout.intent))
    throw new UnsupportedEdit('Start and end preferences are not saved to diagram files yet.');
  for (const n of after.graph.nodes) {
    const style = after.styles[n.id];
    if (n.image || style?.shape === 'image' || style?.shape === 'icon' || style?.icon)
      throw new UnsupportedEdit('Images and icons are not saved to diagram files yet.');
    if (style && !DSL_SHAPES.includes(style.shape as never))
      throw new UnsupportedEdit(`The ${style.shape} shape is not supported in diagram files.`);
  }
}

export function translateEdit(input: EditInput): EditResult {
  const { source, scene, before, after } = input;
  rejectUnsupported(before, after);
  const ids = new Map<string, string>(),
    notes: string[] = [],
    taken = new Set([...scene.objects.map(o => o.id), ...scene.edges.map(e => e.id), 'root']);
  const fresh = (text: string, fallback: string) => {
    const base = slug(text, fallback);
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
    taken.add(id);
    return id;
  };
  /** Source id for an editor id. */
  const sid = (id: string) => ids.get(id) ?? id;
  const parentOf = (d: Diagram, id: string) =>
    objectsOf(d).find(o => o.id === id)?.parentId ?? null;

  // Explicit colors decide what `color=auto` resolves to.
  const explicit = new Map<string, ColorKey>();
  for (const o of scene.model.objects) if (o.color !== 'auto') explicit.set(o.id, o.color);
  const autoColor = (editorParent: string | null, type: 'node' | 'group'): ColorKey => {
    for (let p = editorParent; p; p = parentOf(after, p)) {
      const c = explicit.get(sid(p));
      if (c) return c;
    }
    return type === 'group' ? 'slate' : 'blue';
  };
  const writeColor = (
    s: Statement,
    id: string,
    editorParent: string | null,
    type: 'node' | 'group',
  ) => {
    const color = after.styles[id]?.color;
    if (!color) return;
    if (color === autoColor(editorParent, type)) {
      setAttr(s, 'color', undefined);
      explicit.delete(sid(id));
    } else {
      setAttr(s, 'color', bare(color));
      explicit.set(sid(id), color);
    }
  };

  // Title.
  if (after.title !== before.title) {
    const s = statements(source).find(x => x.command === 'diagram');
    if (s) s.args[0] = quoted(after.title);
    else
      source.lines.unshift(statement('diagram', [quoted(after.title)], [['version', bare(1)]]), {
        kind: 'blank',
      });
  }

  // Removed objects and connections.
  const afterIds = new Set(objectsOf(after).map(o => o.id));
  for (const o of objectsOf(before))
    if (!afterIds.has(o.id)) {
      removeWhere(source, s => s === declaration(source, o.id));
      removeReferences(source, o.id);
    }
  const afterEdges = new Set(after.graph.edges.map(e => e.id));
  for (const e of before.graph.edges)
    if (!afterEdges.has(e.id)) removeWhere(source, s => s === edgeStatement(source, e.id));

  // New containers (outermost first), then new shapes.
  const beforeIds = new Set(objectsOf(before).map(o => o.id));
  const depth = (id: string) => {
    let n = 0;
    for (let p = parentOf(after, id); p; p = parentOf(after, p)) n++;
    return n;
  };
  const isDeclaration = (s: Statement) => s.command === 'node' || s.command === 'group';
  const added = [
    ...after.graph.groups
      .filter(g => !beforeIds.has(g.id))
      .sort((a, b) => depth(a.id) - depth(b.id)),
    ...after.graph.nodes.filter(n => !beforeIds.has(n.id)),
  ];
  for (const o of added) {
    const type = after.graph.groups.includes(o as never) ? 'group' : 'node';
    const id = fresh(o.title, type);
    ids.set(o.id, id);
    const s = statement(type, [bare(id), quoted(o.title)]);
    if (o.parentId) setAttr(s, 'in', bare(sid(o.parentId)));
    const shape = after.styles[o.id]?.shape;
    if (type === 'node' && shape && shape !== 'box') setAttr(s, 'shape', bare(shape));
    // New objects take the editor's default color; leave those to `auto` so they match their group.
    if (after.styles[o.id]?.color !== (type === 'group' ? 'violet' : 'blue'))
      writeColor(s, o.id, o.parentId ?? null, type);
    insertAfter(source, s, isDeclaration);
  }

  // Changed objects.
  for (const o of objectsOf(after)) {
    if (!beforeIds.has(o.id)) continue;
    const old = objectsOf(before).find(x => x.id === o.id)!,
      s = declaration(source, o.id);
    if (!s) continue;
    if (o.title !== old.title) s.args[1] = quoted(o.title);
    if ((o.parentId ?? null) !== (old.parentId ?? null)) {
      setAttr(s, 'in', o.parentId ? bare(sid(o.parentId)) : undefined);
      // Relative preferences are between siblings; the old ones no longer apply.
      removeWhere(
        source,
        x => x.command === 'near' && (x.args[0]?.value === o.id || x.args[1]?.value === o.id),
      );
      removeWhere(
        source,
        x => (x.command === 'align' || x.command === 'order') && x.args.some(w => w.value === o.id),
      );
    }
    const a = before.styles[o.id],
      b = after.styles[o.id];
    if (a?.color !== b?.color)
      writeColor(s, o.id, o.parentId ?? null, s.command as 'node' | 'group');
    if (s.command === 'node' && a?.shape !== b?.shape)
      setAttr(s, 'shape', b.shape === 'box' ? undefined : bare(b.shape));
  }

  // Connections.
  const ports = (cfg: { fromSide?: PortSide; toSide?: PortSide } | undefined, s: Statement) => {
    setAttr(s, 'from', cfg?.fromSide && cfg.fromSide !== 'auto' ? bare(cfg.fromSide) : undefined);
    setAttr(s, 'to', cfg?.toSide && cfg.toSide !== 'auto' ? bare(cfg.toSide) : undefined);
  };
  const writeEdge = (e: DiagramEdge, s: Statement) => {
    s.args = [s.args[0], bare(sid(e.from)), bare('->'), bare(sid(e.to))];
    if (e.label) s.args.push(quoted(e.label));
    const kind = getAttr(s, 'kind')?.value;
    if (e.dashed) setAttr(s, 'kind', bare('async'));
    else if (kind === 'async') setAttr(s, 'kind', undefined);
    ports(after.layout.edges[e.id], s);
  };
  const beforeEdges = new Map(before.graph.edges.map(e => [e.id, e]));
  for (const e of after.graph.edges) {
    const old = beforeEdges.get(e.id);
    if (!old) {
      const id = fresh(`${sid(e.from)}-${sid(e.to)}`, 'edge');
      ids.set(e.id, id);
      const s = statement('edge', [bare(id)]);
      writeEdge(e, s);
      if (statements(source).some(x => x.command === 'edge'))
        insertAfter(source, s, x => x.command === 'edge');
      else insertAfter(source, s, isDeclaration);
    } else if (!same(old, e) || !same(before.layout.edges[e.id], after.layout.edges[e.id])) {
      const s = edgeStatement(source, e.id);
      if (s) writeEdge(e, s);
    }
  }

  placeSelection(input, sid, notes);
  return { source, ids, notes };
}

/** Local rectangle of an object relative to its parent's content origin in the compiled scene. */
function localRect(scene: Scene, parent: string, r: Rect): Rect | null {
  if (parent === 'root') return { ...r };
  const p = scene.byId.get(parent);
  if (!p) return null;
  const o = contentOrigin(p);
  return { x: r.x - o.x, y: r.y - o.y, w: r.w, h: r.h };
}

interface Candidate {
  ref: string;
  side: NearSide;
  gap: number;
  offset: number;
  score: number;
}

/** The nearest sibling an object can be placed next to without overlapping it. */
function nearestSibling(me: Rect, siblings: Array<{ id: string; r: Rect }>): Candidate | null {
  let best: Candidate | null = null;
  for (const { id, r } of siblings) {
    const dx = me.x + me.w / 2 - (r.x + r.w / 2),
      dy = me.y + me.h / 2 - (r.y + r.h / 2);
    const options: Candidate[] = [];
    const horizontal = dx >= 0 ? me.x - (r.x + r.w) : r.x - (me.x + me.w),
      vertical = dy >= 0 ? me.y - (r.y + r.h) : r.y - (me.y + me.h);
    if (horizontal >= 0)
      options.push({
        ref: id,
        side: dx >= 0 ? 'right' : 'left',
        gap: horizontal,
        offset: dy,
        score: 0,
      });
    if (vertical >= 0)
      options.push({
        ref: id,
        side: dy >= 0 ? 'below' : 'above',
        gap: vertical,
        offset: dx,
        score: 0,
      });
    for (const c of options) {
      c.gap = Math.round(c.gap);
      c.offset = Math.round(c.offset);
      c.score = c.gap + Math.abs(c.offset) * 0.6;
      if (!best || c.score < best.score) best = c;
    }
  }
  return best && best.gap <= 2000 ? best : null;
}

function placeSelection(input: EditInput, sid: (id: string) => string, notes: string[]) {
  const { source, scene, before, after, label } = input;
  const roots = new Set(selectionRoots(after, input.selection));
  for (const n of after.graph.nodes) if (!scene.byId.has(n.id)) roots.add(n.id);
  const parentOf = (id: string) =>
    [...after.graph.groups, ...after.graph.nodes].find(o => o.id === id)?.parentId ?? 'root';

  // Positions after the edit, relative to each parent's compiled content origin.
  const local = new Map<string, Rect>();
  for (const id of roots) {
    const r = after.layout.nodes[id],
      l = r && localRect(scene, sid(parentOf(id)), r);
    if (l) local.set(id, l);
  }
  const nearOf = () =>
    new Map(
      statements(source)
        .filter(s => s.command === 'near')
        .map(s => [s.args[0].value, s.args[1].value]),
    );

  for (const id of roots) {
    const sourceId = sid(id),
      compiled = scene.byId.get(id),
      now = local.get(id),
      was = before.layout.nodes[id],
      is = after.layout.nodes[id];
    if (!is) continue;
    const parentChanged = !compiled || compiled.parent !== sid(parentOf(id));
    // Resizing can snap a frame's corner to the grid; that is not a request to move it.
    const moved =
      !!now &&
      !label.startsWith('Resize') &&
      (parentChanged ||
        Math.abs(now.x - compiled!.localX) > 0.5 ||
        Math.abs(now.y - compiled!.localY) > 0.5);
    const resized =
      !!compiled && (Math.abs(is.w - compiled.w) > 0.5 || Math.abs(is.h - compiled.h) > 0.5);

    if (label === 'Clear manual markers' && compiled) {
      removeWhere(
        source,
        s => ['near', 'nudge', 'stay'].includes(s.command) && s.args[0]?.value === sourceId,
      );
      notes.push(`released ${sourceId}`);
      continue;
    }
    if (!!was?.pinned !== !!is.pinned) {
      const at = now && moved ? now : compiled ? { x: compiled.localX, y: compiled.localY } : now;
      if (!at) continue;
      clearPosition(source, sourceId);
      const xy: Array<[string, ReturnType<typeof num>]> = [
        ['x', num(Math.max(0, at.x))],
        ['y', num(Math.max(0, at.y))],
      ];
      addRefinement(source, statement(is.pinned ? 'pin' : 'stay', [bare(sourceId)], xy));
      notes.push(is.pinned ? `pinned ${sourceId}` : `released the pin on ${sourceId}`);
    } else if (moved && now) {
      clearPosition(source, sourceId);
      if (is.pinned) {
        addRefinement(
          source,
          statement(
            'pin',
            [bare(sourceId)],
            [
              ['x', num(Math.max(0, now.x))],
              ['y', num(Math.max(0, now.y))],
            ],
          ),
        );
        notes.push(`moved the pin on ${sourceId}`);
      } else {
        const near = nearOf();
        const createsCycle = (ref: string) => {
          for (let x: string | undefined = ref, n = 0; x && n < 500; x = near.get(x), n++)
            if (x === sourceId) return true;
          return false;
        };
        const siblings = [...after.graph.groups, ...after.graph.nodes]
          .filter(o => o.id !== id && parentOf(o.id) === parentOf(id))
          .flatMap(o => {
            const c = scene.byId.get(o.id),
              r = local.get(o.id) ?? (c ? { x: c.localX, y: c.localY, w: c.w, h: c.h } : null);
            return r && !createsCycle(sid(o.id))
              ? [{ id: sid(o.id), r, moved: local.has(o.id) }]
              : [];
          });
        // Prefer siblings that stayed put as references.
        const pick =
          nearestSibling(
            now,
            siblings.filter(s => !s.moved),
          ) ?? nearestSibling(now, siblings);
        if (pick) {
          addRefinement(
            source,
            statement(
              'near',
              [bare(sourceId), bare(pick.ref)],
              [
                ['side', bare(pick.side)],
                ['gap', num(pick.gap)],
                ...(pick.offset ? [['offset', num(pick.offset)] as [string, Word]] : []),
              ],
            ),
          );
          notes.push(
            `${sourceId} ${pick.side === 'above' || pick.side === 'below' ? pick.side : pick.side + ' of'} ${pick.ref}`,
          );
        } else if (compiled && !parentChanged) {
          addRefinement(
            source,
            statement(
              'nudge',
              [bare(sourceId)],
              [
                ['dx', num(now.x - compiled.baseX)],
                ['dy', num(now.y - compiled.baseY)],
              ],
            ),
          );
          notes.push(`nudged ${sourceId}`);
        } else {
          addRefinement(
            source,
            statement(
              'stay',
              [bare(sourceId)],
              [
                ['x', num(Math.max(0, now.x))],
                ['y', num(Math.max(0, now.y))],
              ],
            ),
          );
          notes.push(`placed ${sourceId}`);
        }
      }
    }

    if (resized && compiled) {
      if (compiled.type === 'node') {
        removeWhere(source, s => s.command === 'size' && s.args[0]?.value === sourceId);
        addRefinement(
          source,
          statement(
            'size',
            [bare(sourceId)],
            [
              ['width', num(Math.min(1200, Math.max(40, is.w)))],
              ['height', num(Math.min(1200, Math.max(24, is.h)))],
            ],
          ),
        );
      } else {
        let s = layoutStatement(source, sourceId);
        if (!s) {
          s = statement('layout', [bare(sourceId), bare('column')], [['gap', bare(24)]]);
          if (statements(source).some(x => x.command === 'layout'))
            insertAfter(source, s, x => x.command === 'layout');
          else addRefinement(source, s);
        }
        setAttr(s, 'min-width', num(Math.min(10_000, is.w)));
        setAttr(s, 'min-height', num(Math.min(10_000, is.h)));
      }
      notes.push(`resized ${sourceId} to ${Math.round(is.w)}×${Math.round(is.h)}`);
    }
  }
}
