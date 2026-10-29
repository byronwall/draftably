/**
 * The layout timeline (scrub recorded solver steps, keep one) and the layout brush
 * (local tidy, flow, space, restore and hold). Both preview through temporary geometry;
 * nothing reaches the document until a step is kept or a stroke ends.
 */
import { batch, createEffect, createRoot, createSignal, on } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { LayoutLab } from '../engines/layout-engine.js';
import {
  SculptLab,
  type BrushSettings,
  type DabOptions,
  type DabResult,
  type Timeline,
} from '../engines/sculpt-engine.js';
import { documentIdentity, normalize, routingFingerprint } from '../model/document';
import { clamp, clone } from '../model/geometry';
import type { Diagram, NodeGeometry, Point } from '../model/types';
import { CancelledError, startEngineTask, type RunningTask } from '../lib/engine-tasks';
import { downloadText } from '../lib/svg-export';
import { finishInlineEdit, openDocument, setToolInterceptor } from './actions';
import {
  annotateLastUndo,
  clearSelection,
  commit,
  doc,
  onBeforeEdit,
  onHistoryStep,
  pushUndo,
  selection,
  setDoc,
  snapshot,
} from './document';
import {
  canvasCenter,
  fitRects,
  focusCanvas,
  reducedMotion,
  screenToWorld,
  setConnectFrom,
  setToolSignal,
  stageSize,
  tool,
} from './editor';
import { filename, setTimelineImporter } from './files';
import {
  cancelLayout,
  currentScope,
  layoutBusy,
  layoutPreview,
  setFixedIdsProvider,
  setLayoutReport,
} from './layout';
import { routing, resetRoutes, setAdoptedRoutes, setRoutePrior, setSculptGeometry } from './scene';
import { shortcutKey } from './keys';
import { toast } from './toast';
import { closeMenu, setLayoutLabOpen } from './ui';

const ARCHIVE_KEY = 'diagram-studio-v7-last-journey';

export type GhostMode = 'next' | 'final' | 'off';

export interface TimelineState {
  signature: string;
  scope: string;
  algorithm: string;
  busy: boolean;
  index: number;
  peek: number | null;
  ghost: GhostMode;
  data: Timeline | null;
}

const state = createRoot(() => {
  const [timeline, setTimeline] = createSignal<TimelineState | null>(null);
  const [playing, setPlaying] = createSignal(false);
  const [brushActive, setBrushActive] = createSignal(false);
  const [brushSettings, setBrushSettings] = createSignal<BrushSettings>({ ...SculptLab.defaults });
  const [brushPoint, setBrushPoint] = createSignal<Point | null>(null);
  const [hover, setHover] = createSignal<DabResult | null>(null);
  const [stroking, setStroking] = createSignal(false);
  const [restoreKey, setRestoreKey] = createSignal(false);
  const [holds, setHolds] = createSignal<ReadonlySet<string>>(new Set<string>());
  const [referenceLabel, setReferenceLabel] = createSignal('Before brush');
  const [hasArchive, setHasArchive] = createSignal(false);
  return {
    timeline,
    setTimeline,
    playing,
    setPlaying,
    brushActive,
    setBrushActive,
    brushSettings,
    setBrushSettings,
    brushPoint,
    setBrushPoint,
    hover,
    setHover,
    stroking,
    setStroking,
    restoreKey,
    setRestoreKey,
    holds,
    setHolds,
    referenceLabel,
    setReferenceLabel,
    hasArchive,
    setHasArchive,
  };
});

export const {
  timeline,
  playing,
  brushActive,
  brushSettings,
  brushPoint,
  hover: brushHover,
  stroking,
  restoreKey,
  referenceLabel,
} = state;

export const timelineOpen = () => !!state.timeline();
/** True while a timeline preview or brush stroke holds unkept geometry. */
export const sculptInteracting = () => timelineOpen() || state.stroking();

let reference: NodeGeometry | null = null;
let archive: Timeline | null = null;
let documentId = doc.id;

/** Brush holds that still exist in the document; layout treats them as fixed. */
export const heldIds = () => [...state.holds()].filter(id => doc.layout.nodes[id]);
setFixedIdsProvider(heldIds);

function setReference(nodes: NodeGeometry | null, label: string) {
  reference = nodes ? clone(nodes) : null;
  state.setReferenceLabel(label);
}

// Holds, restore sources and the archived timeline belong to one document.
createRoot(() =>
  createEffect(
    on(
      () => doc.id,
      id => {
        if (id === documentId) return;
        documentId = id;
        batch(() => {
          state.setHolds(new Set<string>());
          setReference(null, 'Before brush');
          archive = null;
          state.setHasArchive(false);
          if (state.brushActive()) deactivateBrush();
        });
      },
    ),
  ),
);

// --- Timeline --------------------------------------------------------------------------------

let job = 0;
let running: RunningTask<Timeline> | null = null;
let playTimer: number | undefined;

function saveArchive(data: Timeline) {
  archive = clone(data);
  state.setHasArchive(true);
  try {
    const raw = JSON.stringify(data);
    if (raw.length < 3_500_000) localStorage.setItem(ARCHIVE_KEY, raw);
    else
      toast(
        'Timeline kept for this session; too large for browser history. Save the timeline file to keep it.',
      );
  } catch {
    toast('Timeline kept in this tab. Browser history storage is unavailable.');
  }
}

export function restoreArchive() {
  try {
    const text = localStorage.getItem(ARCHIVE_KEY);
    if (!text) return;
    const raw = JSON.parse(text);
    if (raw.baseline?.id !== doc.id) return;
    archive = validateTimeline(raw);
    state.setHasArchive(true);
    setReference(archive.frames[0].nodes, 'Before last layout');
  } catch {
    // An unreadable archive is simply ignored.
  }
}

const updateTimeline = (patch: Partial<TimelineState>) =>
  state.setTimeline(t => (t ? { ...t, ...patch } : t));

export async function openTimeline(options: Record<string, unknown> = {}) {
  if (layoutPreview()) {
    toast('Keep or discard the existing layout preview first.');
    return;
  }
  closeComparison();
  finishInlineEdit(true);
  if (layoutBusy()) cancelLayout();
  cancelStroke();
  deactivateBrush();
  closeMenu();
  setLayoutLabOpen(false);
  batch(() => {
    setToolSignal('select');
    setConnectFrom(null);
  });
  if (state.timeline()) closeTimeline();
  const baseline = JSON.parse(snapshot()) as Diagram,
    thisJob = ++job;
  setRoutePrior(routing().routes.map(r => ({ id: r.id, fromSide: r.fromSide, toSide: r.toSide })));
  const opts = {
    ...doc.settings,
    ...currentScope(),
    selected: [...selection()],
    fixedIds: heldIds(),
    maxIterations: 640,
    viewport: { w: stageSize().width, h: stageSize().height },
    ...options,
  };
  state.setTimeline({
    signature: documentIdentity(doc),
    scope: opts.scope,
    algorithm: opts.algorithm,
    busy: true,
    index: 0,
    peek: null,
    ghost: 'next',
    data: null,
  });
  focusCanvas();
  try {
    running = startEngineTask({ kind: 'timeline', doc: baseline, options: opts });
    const data = await running.promise;
    if (!state.timeline() || thisJob !== job) return;
    if (documentIdentity(doc) !== state.timeline()!.signature) {
      closeTimeline();
      toast('Diagram changed while computing. Reopen the timeline.');
      return;
    }
    data.routePrior = routing().routes.map(r => ({
      id: r.id,
      fromSide: r.fromSide,
      toSide: r.toSide,
    }));
    setReference(data.frames[0].nodes, 'Before this layout');
    saveArchive(data);
    updateTimeline({ data, busy: false, index: 0 });
    scrub(0);
  } catch (error) {
    if (error instanceof CancelledError || thisJob !== job) return;
    closeTimeline();
    toast('Timeline could not finish: ' + (error instanceof Error ? error.message : error));
  } finally {
    if (thisJob === job) running = null;
  }
}

export function closeTimeline() {
  if (!state.timeline()) return;
  job++;
  running?.cancel();
  running = null;
  stopPlayback();
  batch(() => {
    state.setTimeline(null);
    setSculptGeometry(null);
    setRoutePrior(null);
    resetRoutes();
  });
  focusCanvas();
}

/** Show a recorded step. A peek is a hover preview that does not move the chosen step. */
export function scrub(index: number, { peek = false } = {}) {
  const t = state.timeline();
  if (!t?.data || t.busy) return;
  const i = Math.round(clamp(Number(index), 0, t.data.frames.length - 1));
  updateTimeline(peek ? { peek: i } : { peek: null, index: i });
  setSculptGeometry(t.data.frames[i].nodes);
  return i;
}

export const endPeek = () => {
  const t = state.timeline();
  if (t?.data) scrub(t.index);
};

export function setGhost(ghost: GhostMode) {
  updateTimeline({ ghost });
}

export function bookmarkStep() {
  const t = state.timeline();
  if (!t?.data) return;
  const i = t.index,
    data = t.data;
  if (!data.bookmarks.some(b => b.index === i))
    data.bookmarks = [...data.bookmarks, { index: i, title: 'Good at step ' + i }];
  setReference(data.frames[i].nodes, 'Timeline step ' + i);
  saveArchive(data);
  updateTimeline({ data: { ...data } });
  toast('Restore source: step ' + i + '. Keep a later step, then brush this area back.');
}

/** Keep the chosen step as one undo entry, optionally continuing with the brush. */
export function keepStep({ brush = false } = {}) {
  const t = state.timeline();
  if (!t?.data) return false;
  if (documentIdentity(doc) !== t.signature) {
    closeTimeline();
    toast('The diagram changed. Preview discarded.');
    return false;
  }
  scrub(t.index);
  const routed = clone(routing().result);
  const before = snapshot(),
    data = t.data,
    step = t.index,
    frame = data.frames[step];
  saveArchive(data);
  closeTimeline();
  const prior = (JSON.parse(before) as Diagram).layout.nodes;
  setDoc('layout', 'nodes', clone(frame.nodes));
  // A geometric checkpoint never imports changes to graph meaning or pin flags.
  setDoc('settings', s => ({ ...s, ...data.settings }));
  const movements = Object.keys(frame.nodes).map(id =>
    Math.hypot(frame.nodes[id].x - prior[id].x, frame.nodes[id].y - prior[id].y),
  );
  const moved = movements.filter(d => d > 0.01).length;
  setAdoptedRoutes({ fingerprint: routingFingerprint(doc), result: routed });
  commit(before, 'Layout timeline · step ' + step, 'arrangement');
  setLayoutReport({
    ...data.report,
    mode: 'journey',
    selectedStep: step,
    after: clone(frame.metrics),
    moved,
    maxDisplacement: +Math.max(0, ...movements).toFixed(2),
    rmsDisplacement: +Math.sqrt(
      movements.reduce((n, d) => n + d * d, 0) / Math.max(1, moved),
    ).toFixed(2),
  });
  if (brush) {
    activateBrush({ mode: reference ? 'restore' : 'tidy' });
    toast(
      `Brush locally to restore ${state.referenceLabel().toLowerCase()}. Other areas keep their new layout.`,
    );
  } else toast('Kept step ' + step + '. Undo restores the arrangement before the timeline.');
  return true;
}

export function stopPlayback() {
  window.clearInterval(playTimer);
  playTimer = undefined;
  state.setPlaying(false);
}

export function togglePlayback() {
  const t = state.timeline();
  if (!t?.data) return;
  if (playTimer) {
    stopPlayback();
    return;
  }
  if (t.index === t.data.frames.length - 1) scrub(0);
  state.setPlaying(true);
  playTimer = window.setInterval(
    () => {
      const current = state.timeline();
      if (!current?.data) return stopPlayback();
      scrub(current.index + 1);
      if (current.index + 1 >= current.data.frames.length - 1) stopPlayback();
    },
    reducedMotion() ? 750 : 420,
  );
}

/** Fit every recorded arrangement in view with one steady camera. */
export function fitTimelinePath(reservedBottom: number) {
  const data = state.timeline()?.data;
  if (data)
    fitRects(
      data.frames.flatMap(f => Object.values(f.nodes)),
      reservedBottom + 42,
    );
}

/** Reopen the archived timeline when the diagram still matches it. */
export function reopenTimeline() {
  if (!archive || archive.baseline.id !== doc.id) {
    toast('No recorded path for this diagram yet. Open Timeline first.');
    return;
  }
  const data = clone(archive);
  const compatible =
    JSON.stringify(data.baseline.graph) === JSON.stringify(doc.graph) &&
    Object.keys(doc.layout.nodes).every(
      id =>
        data.frames[0].nodes[id] &&
        data.frames.some(f =>
          (['w', 'h', 'pinned'] as const).every(
            key => f.nodes[id][key] === doc.layout.nodes[id][key],
          ),
        ),
    );
  if (!compatible) {
    toast(
      'Objects, connections, sizes or pins changed. Record a new timeline; the brush can still restore matching nodes from its bookmark.',
    );
    return;
  }
  if (state.timeline()) closeTimeline();
  deactivateBrush();
  closeMenu();
  if (layoutBusy()) cancelLayout();
  // Start at the recorded step closest to the current arrangement.
  const index = data.frames.reduce(
    (best, f, i) => {
      const score = Object.keys(f.nodes).reduce(
        (n, id) =>
          n +
          Math.hypot(
            f.nodes[id].x - doc.layout.nodes[id].x,
            f.nodes[id].y - doc.layout.nodes[id].y,
          ),
        0,
      );
      return score < best.score ? { score, index: i } : best;
    },
    { score: Infinity, index: 0 },
  ).index;
  setRoutePrior((data.routePrior as never) || []);
  state.setTimeline({
    signature: documentIdentity(doc),
    scope: 'all',
    algorithm: data.settings.algorithm,
    busy: false,
    index,
    peek: null,
    ghost: 'next',
    data,
  });
  job++;
  scrub(index);
}

export function saveTimelineFile() {
  const data = state.timeline()?.data || archive;
  if (!data) {
    toast('Record a timeline first.');
    return;
  }
  downloadText(JSON.stringify(data, null, 2), filename('layout-journey.json'), 'application/json');
}

export function validateTimeline(input: unknown): Timeline {
  const raw = input as Timeline;
  if (raw?.kind !== 'diagram-studio-journey') throw Error('Not a Draftably timeline.');
  if (
    raw.schemaVersion !== 1 ||
    !Array.isArray(raw.frames) ||
    raw.frames.length < 1 ||
    raw.frames.length > 128
  )
    throw Error('Invalid timeline checkpoint collection.');
  const baseline = normalize(raw.baseline),
    ids = Object.keys(baseline.layout.nodes),
    objects = new Map<string, { id: string; parentId?: string }>(
      [...baseline.graph.nodes, ...baseline.graph.groups].map(n => [n.id, n]),
    );
  const pinned = (id: string) => {
    for (
      let item = objects.get(id);
      item;
      item = item.parentId ? objects.get(item.parentId) : undefined
    )
      if (baseline.layout.nodes[item.id]?.pinned) return true;
    return false;
  };
  for (const frame of raw.frames) {
    if (
      !frame.metrics ||
      Object.values(frame.metrics).some(v => !Number.isFinite(v)) ||
      typeof frame.phase !== 'string' ||
      !Number.isFinite(frame.iteration)
    )
      throw Error('Invalid timeline metrics.');
    if (!frame.nodes || Object.keys(frame.nodes).length !== ids.length)
      throw Error('Timeline frames must contain the same objects as their baseline.');
    for (const id of ids) {
      const p = frame.nodes[id],
        original = baseline.layout.nodes[id];
      if (
        !p ||
        !(['x', 'y', 'w', 'h'] as const).every(k => Number.isFinite(p[k])) ||
        p.w <= 0 ||
        p.h <= 0 ||
        p.pinned !== original.pinned
      )
        throw Error('Invalid timeline coordinates or pins: ' + id);
      if (pinned(id) && (['x', 'y', 'w', 'h'] as const).some(k => p[k] !== original[k]))
        throw Error('A timeline cannot move a pinned object: ' + id);
    }
  }
  if (
    !raw.report ||
    !Number.isFinite(raw.report.iterations) ||
    !['settled', 'objective plateau', 'iteration limit', 'bounded pass'].includes(
      raw.report.termination,
    ) ||
    !Array.isArray(raw.bookmarks)
  )
    throw Error('The timeline is missing its report or bookmarks.');
  const data = clone(raw);
  data.baseline = baseline;
  const checked = LayoutLab.settings(raw.settings);
  data.settings = Object.fromEntries(
    Object.keys(LayoutLab.defaults).map(key => [key, checked[key as keyof typeof checked]]),
  ) as unknown as Timeline['settings'];
  data.bookmarks = data.bookmarks
    .filter(b => Number.isInteger(b.index) && b.index >= 0 && b.index < data.frames.length)
    .map(b => ({ index: b.index, title: String(b.title || 'Bookmark') }));
  return data;
}

setTimelineImporter(input => {
  const data = validateTimeline(input);
  if (state.timeline()) closeTimeline();
  openDocument(data.baseline, { label: 'Open saved layout timeline' });
  documentId = doc.id;
  saveArchive(data);
  setReference(data.frames[0].nodes, 'Before imported layout');
  reopenTimeline();
});

// --- Brush -----------------------------------------------------------------------------------

interface Stroke {
  before: string;
  working: Diagram;
  signature: string;
  holdsBefore: string[];
  pointerId: number;
  samples: number;
  moved: Set<string>;
  last: Point;
}

let stroke: Stroke | null = null;
let hoverTimer: number | undefined;
let strokeTimer: number | undefined;
let lastDabAt = 0;

export function activateBrush(options: Partial<BrushSettings> = {}) {
  if (state.timeline()) {
    toast('Keep a timeline step before brushing. Use Keep & brush.');
    return;
  }
  if (layoutPreview()) {
    toast('Keep or discard the layout preview first.');
    return;
  }
  closeComparison();
  if (layoutBusy()) cancelLayout();
  finishInlineEdit(true);
  if (!reference) setReference(doc.layout.nodes, 'Before brush');
  batch(() => {
    state.setBrushSettings(s => SculptLab.settings({ ...s, ...options }));
    state.setBrushActive(true);
    state.setBrushPoint(null);
    state.setHover(null);
    clearSelection();
    setToolSignal('brush');
    setConnectFrom(null);
  });
  focusCanvas();
}

export function deactivateBrush() {
  if (!state.brushActive()) return;
  cancelStroke();
  window.clearTimeout(hoverTimer);
  batch(() => {
    state.setBrushActive(false);
    state.setHover(null);
    state.setBrushPoint(null);
    if (tool() === 'brush') setToolSignal('select');
  });
}

export const toggleBrush = () => (state.brushActive() ? deactivateBrush() : activateBrush());

export function updateBrushSettings(patch: Partial<BrushSettings>) {
  state.setBrushSettings(s => ({ ...s, ...patch }));
  refreshHover();
}

export function useCurrentAsReference() {
  setReference(doc.layout.nodes, 'Current arrangement');
}

function dabOptions(point: Point, extra: DabOptions = {}): DabOptions {
  const s = state.brushSettings();
  return {
    ...s,
    point,
    worldRadius: s.radius / doc.camera.k,
    reference,
    protectedIds: s.mode === 'restore' ? [] : heldIds(),
    ...(state.restoreKey() && s.mode !== 'protect'
      ? { mode: 'restore' as const, protectedIds: [] }
      : {}),
    ...extra,
  };
}

function hoverAt(point: Point) {
  if (!state.brushActive() || stroke) return;
  state.setBrushPoint(point);
  state.setHover(SculptLab.dab(unwrap(doc), dabOptions(point)));
}

const refreshHover = () => {
  const point = state.brushPoint();
  if (point) hoverAt(point);
};

function strokeDab(point: Point) {
  const st = stroke;
  if (!st) return;
  const restoring = state.restoreKey() || state.brushSettings().mode === 'restore';
  const result = SculptLab.dab(
    st.working,
    dabOptions(point, { protectedIds: restoring ? [] : st.holdsBefore }),
  );
  st.samples++;
  st.last = point;
  lastDabAt = performance.now();
  state.setHover(result);
  if (result.mode === 'protect') {
    const next = new Set(state.holds());
    for (const [id, w] of Object.entries(result.weights))
      if (w >= 0.25) {
        if (state.restoreKey()) next.delete(id);
        else next.add(id);
      }
    state.setHolds(next);
    return;
  }
  st.working = result.document;
  const next = new Set(state.holds());
  for (const id of result.moved) {
    st.moved.add(id);
    if (result.mode === 'restore' && state.brushSettings().holdRestored) next.add(id);
  }
  batch(() => {
    state.setHolds(next);
    setSculptGeometry(st.working.layout.nodes);
  });
}

/** Canvas pointer hooks. Each returns true when the brush or timeline handled the event. */
export function brushPointerDown(e: PointerEvent, target: Element): boolean {
  if (e.button > 1 || e.ctrlKey || e.metaKey || e.button === 1) return false;
  if (!state.brushActive()) return false;
  e.preventDefault();
  const point = screenToWorld(e.clientX, e.clientY);
  state.setBrushPoint(point);
  state.setRestoreKey(e.altKey);
  stroke = {
    before: snapshot(),
    working: JSON.parse(snapshot()),
    signature: documentIdentity(doc),
    holdsBefore: [...state.holds()],
    pointerId: e.pointerId,
    samples: 0,
    moved: new Set(),
    last: point,
  };
  state.setStroking(true);
  try {
    target.setPointerCapture(e.pointerId);
  } catch {
    // Capture is best effort.
  }
  strokeDab(point);
  // Holding still keeps painting.
  window.clearInterval(strokeTimer);
  strokeTimer = window.setInterval(() => {
    const p = state.brushPoint();
    if (stroke && p && performance.now() - lastDabAt >= 85) strokeDab(p);
  }, 90);
  focusCanvas();
  return true;
}

export function brushPointerMove(e: PointerEvent): boolean {
  if (!state.brushActive() || e.ctrlKey || e.metaKey) return false;
  const point = screenToWorld(e.clientX, e.clientY);
  state.setBrushPoint(point);
  state.setRestoreKey(e.altKey);
  if (stroke) {
    const moved = Math.hypot(point.x - stroke.last.x, point.y - stroke.last.y) * doc.camera.k;
    if (performance.now() - lastDabAt > 38 || moved > state.brushSettings().radius * 0.15)
      strokeDab(point);
    return true;
  }
  window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => hoverAt(point), 55);
  return true;
}

export function brushPointerUp(e?: PointerEvent): boolean {
  const st = stroke;
  if (!st || (e && e.pointerId !== st.pointerId)) return false;
  window.clearInterval(strokeTimer);
  stroke = null;
  batch(() => {
    state.setStroking(false);
    setSculptGeometry(null);
  });
  if (documentIdentity(doc) !== st.signature) {
    state.setHolds(new Set(st.holdsBefore));
    toast('Diagram changed during the stroke; the stroke was discarded.');
    return true;
  }
  setDoc('layout', 'nodes', clone(st.working.layout.nodes));
  const changed = commit(st.before, 'Local layout brush', 'arrangement');
  recordHolds(st.holdsBefore, changed, st.before);
  refreshHover();
  console.info('[brush] stroke', { samples: st.samples, moved: st.moved.size, undo: changed });
  return true;
}

export function brushPointerLeave() {
  if (stroke) return;
  window.clearTimeout(hoverTimer);
  state.setBrushPoint(null);
  state.setHover(null);
}

export function cancelStroke(): boolean {
  const st = stroke;
  if (!st) return false;
  window.clearInterval(strokeTimer);
  stroke = null;
  batch(() => {
    state.setStroking(false);
    state.setHolds(new Set(st.holdsBefore));
    setSculptGeometry(null);
    state.setHover(null);
  });
  return true;
}

/** One dab at a point (L in brush mode). */
export function brushDab(point: Point = state.brushPoint() || canvasCenter()) {
  if (state.timeline()) throw Error('Keep or cancel the timeline before brushing.');
  const before = snapshot(),
    result = SculptLab.dab(JSON.parse(before), dabOptions(point));
  const oldHolds = [...state.holds()];
  if (result.mode === 'protect') {
    const next = new Set(state.holds());
    for (const [id, w] of Object.entries(result.weights)) if (w >= 0.25) next.add(id);
    state.setHolds(next);
    recordHolds(oldHolds, false, before);
  } else {
    setDoc('layout', 'nodes', result.document.layout.nodes);
    const changed = commit(before, 'Local layout brush', 'arrangement');
    if (result.mode === 'restore' && state.brushSettings().holdRestored)
      state.setHolds(new Set([...state.holds(), ...result.moved]));
    recordHolds(oldHolds, changed, before);
  }
  refreshHover();
  return result;
}

export function clearHolds() {
  const old = [...state.holds()];
  state.setHolds(new Set<string>());
  recordHolds(old, false, snapshot());
  toast('Local holds cleared. Explicit pins are unchanged.');
}

/** Holds are undoable: attach them to the stroke's undo step, or add a step of their own. */
function recordHolds(before: string[], geometryChanged: boolean, beforeData: string) {
  const after = [...state.holds()];
  if (JSON.stringify([...before].sort()) === JSON.stringify([...after].sort())) return;
  if (!geometryChanged) pushUndo({ data: beforeData, label: 'Local layout holds' });
  annotateLastUndo({ before: [...before], after });
}

onHistoryStep((entry, direction) => {
  if (entry.holds)
    state.setHolds(new Set(direction === 'undo' ? entry.holds.before : entry.holds.after));
});

// --- Integration with the rest of the editor -------------------------------------------------

onBeforeEdit(() => {
  if (state.timeline()) closeTimeline();
  if (stroke) cancelStroke();
  setSculptGeometry(null);
});

setToolInterceptor(next => {
  if (next === 'brush') {
    activateBrush();
    return true;
  }
  if (state.brushActive()) deactivateBrush();
  if (state.timeline()) {
    toast('Keep or cancel this layout step before editing.');
    return true;
  }
  return false;
});

/** Undo first cancels an open timeline or a stroke in progress. */
export function sculptUndo(): boolean {
  if (state.timeline()) {
    closeTimeline();
    return true;
  }
  return cancelStroke();
}

/** Keyboard handling for the brush and timeline. Returns true when the key was handled. */
export function sculptKey(e: KeyboardEvent): boolean {
  const key = shortcutKey(e),
    mod = e.metaKey || e.ctrlKey,
    target = e.target as HTMLElement,
    onSlider = target.id === 'timeline-slider';
  if (key === 'escape') {
    if (cancelStroke()) return (e.preventDefault(), true);
    if (state.timeline()) return (e.preventDefault(), closeTimeline(), true);
    if (state.brushActive()) return (e.preventDefault(), deactivateBrush(), true);
  }
  if (target.matches?.('input,textarea,select,[contenteditable=true]') && !onSlider) return false;
  if (!mod && e.altKey && key === 't') return (e.preventDefault(), void openTimeline(), true);
  if (!mod && !e.altKey && key === 'w') return (e.preventDefault(), toggleBrush(), true);
  const t = state.timeline();
  if (t) {
    if (mod && key === 'z') return (e.preventDefault(), closeTimeline(), true);
    if (
      onSlider &&
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ].includes(e.key)
    )
      return true;
    if (e.key === 'Enter' && target.tagName !== 'BUTTON')
      return (e.preventDefault(), keepStep(), true);
    if (e.code === 'Space' && onSlider) return (e.preventDefault(), togglePlayback(), true);
    // Navigation keys still work while previewing.
    if (['1', '0', '+', '-', '='].includes(key) || e.code === 'Space') return false;
    if (target.closest?.('.timeline-deck')) return false;
    if (!mod) return (e.preventDefault(), true);
  }
  if (state.brushActive()) {
    if (key === '[' || key === ']') {
      e.preventDefault();
      updateBrushSettings({
        radius: clamp(state.brushSettings().radius + (key === '[' ? -20 : 20), 40, 600),
      });
      return true;
    }
    if (key === 'l' && !mod && !e.altKey) return (e.preventDefault(), brushDab(), true);
  }
  return false;
}

export function sculptBlur() {
  stopPlayback();
  cancelStroke();
  state.setRestoreKey(false);
}

export function sculptBeforeUnload() {
  cancelStroke();
  const data = state.timeline()?.data;
  if (data) saveArchive(data);
}

export const hasArchivedTimeline = state.hasArchive;

/** Registered by the comparison module, which closes itself when a timeline or brush starts. */
let closeComparison: () => void = () => {};
export const setComparisonCloser = (fn: () => void) => (closeComparison = fn);
