/** Automatic layout: bounded passes, previewed rebuilds, and the layout lab's options. */
import { batch, createRoot, createSignal } from 'solid-js';
import {
  LayoutLab,
  type LayoutOptions,
  type LayoutReport,
  type LayoutScope,
} from '../engines/layout-engine.js';
import { normalize } from '../model/document';
import { clamp, clone } from '../model/geometry';
import { findGroup, selectionRoots } from '../model/graph';
import type { Diagram, NodeGeometry } from '../model/types';
import { CancelledError, startEngineTask, type RunningTask } from '../lib/engine-tasks';
import {
  commit,
  doc,
  mutate,
  onBeforeEdit,
  persist,
  prepareForEdit,
  restoreDocument,
  revision,
  selection,
  setPersistenceBlocked,
  snapshot,
} from './document';
import { fitView, reducedMotion, stageSize } from './editor';
import { resetRoutes, setAnimationGeometry } from './scene';
import { toast } from './toast';

export type LabScope = 'auto' | LayoutScope;

const state = createRoot(() => {
  const [busy, setBusy] = createSignal(false);
  const [report, setReport] = createSignal<LayoutReport | null>(null);
  const [preview, setPreview] = createSignal<{ before: string; mode: 'pass' | 'rebuild' } | null>(
    null,
  );
  const [labScope, setLabScope] = createSignal<LabScope>('auto');
  const [checkpoint, setCheckpoint] = createSignal<Diagram | null>(null);
  return {
    busy,
    setBusy,
    report,
    setReport,
    preview,
    setPreview,
    labScope,
    setLabScope,
    checkpoint,
    setCheckpoint,
  };
});

export const {
  busy: layoutBusy,
  report: layoutReport,
  setReport: setLayoutReport,
  preview: layoutPreview,
  labScope,
  setLabScope,
  checkpoint: layoutCheckpoint,
} = state;

/** What a layout run applies to, based on the selection. */
export function currentScope(): { scope: LayoutScope; containerId?: string } {
  const roots = selectionRoots(doc, selection());
  if (roots.length === 1 && findGroup(doc, roots[0]))
    return { scope: 'container', containerId: roots[0] };
  if (roots.length) return { scope: 'selection' };
  return { scope: 'all' };
}

/** Ids that layout must not move: brush holds. Set by the brush module. */
let fixedIdsProvider: () => string[] = () => [];
export const setFixedIdsProvider = (provider: () => string[]) => (fixedIdsProvider = provider);
export const fixedIds = () => fixedIdsProvider();

let running: RunningTask<{ document: Diagram; report: LayoutReport }> | null = null;
let job = 0;

export function cancelLayout() {
  job++;
  running?.cancel();
  running = null;
  state.setBusy(false);
}

export interface RunLayoutOptions extends LayoutOptions {
  preview?: boolean;
  fit?: boolean;
}

export type LayoutOutcome =
  | { status: 'busy' | 'cancelled' }
  | { status: 'error'; message: string }
  | ({ status: 'complete' | 'preview' } & LayoutReport);

export async function runLayout(options: RunLayoutOptions = {}): Promise<LayoutOutcome> {
  if (state.busy()) return { status: 'busy' };
  prepareForEdit();
  const before = snapshot(),
    startRevision = revision(),
    thisJob = ++job;
  const { preview, fit, ...overrides } = options;
  const opts: LayoutOptions = {
    ...doc.settings,
    ...currentScope(),
    fixedIds: fixedIds(),
    ...overrides,
    selected: overrides.selected || [...selection()],
    viewport: { w: stageSize().width, h: stageSize().height },
  };
  state.setBusy(true);
  try {
    LayoutLab.settings(opts);
    console.info('[layout] start', {
      algorithm: opts.algorithm,
      mode: opts.mode || 'pass',
      scope: opts.scope,
    });
    running = startEngineTask({ kind: 'layout', doc: JSON.parse(before), options: opts });
    const result = await running.promise;
    result.report.thread = running.thread();
    if (job !== thisJob || revision() !== startRevision) return { status: 'cancelled' };
    const old = clone(doc.layout.nodes);
    batch(() => {
      restoreDocument(normalize(result.document));
      state.setReport(result.report);
      resetRoutes();
    });
    if (preview) {
      state.setPreview({ before, mode: result.report.mode === 'rebuild' ? 'rebuild' : 'pass' });
      setPersistenceBlocked(true);
    } else commit(before, 'Layout: ' + result.report.name);
    await animateLayout(old, clone(doc.layout.nodes));
    if (fit) fitView();
    const r = result.report;
    toast(
      `${r.mode === 'rebuild' ? 'Rebuild' : 'Pass'} · ${r.name} · ${r.moved} moved · max ${r.maxDisplacement}px` +
        (r.after.overlaps ? ` · ${r.after.overlaps} overlaps remain` : ''),
    );
    return { status: preview ? 'preview' : 'complete', ...r };
  } catch (error) {
    if (error instanceof CancelledError) return { status: 'cancelled' };
    const message = error instanceof Error ? error.message : String(error);
    console.error('[layout] failed', error);
    toast(message);
    return { status: 'error', message };
  } finally {
    if (thisJob === job) {
      running = null;
      state.setBusy(false);
    }
  }
}

/** Run with the lab's scope. `mode` is a bounded pass or a full rebuild. */
export function runLabLayout(mode: 'pass' | 'rebuild' = 'pass', preview = false) {
  const scope = state.labScope();
  return runLayout({ ...(scope === 'auto' ? currentScope() : { scope }), mode, preview });
}

/** Ease shapes from their old to new positions. Edits during the animation stop it. */
function animateLayout(from: NodeGeometry, to: NodeGeometry): Promise<void> {
  // Hidden pages get no animation frames, so skip straight to the result.
  if (reducedMotion() || document.hidden) return Promise.resolve();
  const startRevision = revision();
  return new Promise(resolve => {
    const start = performance.now();
    const frame = (now: number) => {
      if (revision() !== startRevision) {
        setAnimationGeometry(null);
        resolve();
        return;
      }
      const t = clamp((now - start) / 180, 0, 1),
        k = 1 - (1 - t) ** 3,
        nodes: NodeGeometry = {};
      for (const [id, p] of Object.entries(to)) {
        const old = from[id] || p;
        nodes[id] = {
          ...p,
          x: old.x + (p.x - old.x) * k,
          y: old.y + (p.y - old.y) * k,
          w: old.w + (p.w - old.w) * k,
          h: old.h + (p.h - old.h) * k,
        };
      }
      setAnimationGeometry(t < 1 ? nodes : null);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export function acceptPreview() {
  const p = state.preview();
  if (!p) return;
  batch(() => {
    state.setPreview(null);
    setAnimationGeometry(null);
    setPersistenceBlocked(false);
  });
  commit(p.before, 'Layout preview');
}

export function discardPreview() {
  const p = state.preview();
  if (!p) return;
  batch(() => {
    state.setPreview(null);
    setAnimationGeometry(null);
    setPersistenceBlocked(false);
    restoreDocument(normalize(JSON.parse(p.before)));
    resetRoutes();
  });
  persist();
}

/** While held, show the arrangement from before the previewed layout. */
export function holdPreviewBefore(held: boolean) {
  const p = state.preview();
  setAnimationGeometry(held && p ? (JSON.parse(p.before) as Diagram).layout.nodes : null);
}

/** Layout settings are preferences, not edits: they save without an undo step. */
export function updateLayoutSettings(patch: Partial<Diagram['settings']>) {
  try {
    const next = LayoutLab.settings({ ...doc.settings, ...patch });
    mutate(d => Object.assign(d.settings, next));
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

export function captureCheckpoint() {
  acceptPreview();
  state.setCheckpoint(JSON.parse(snapshot()));
  toast('Checkpoint captured. Restore it before trying another approach.');
}

/** Registered by the document actions module to avoid a circular import at startup. */
let openDocument: (doc: Diagram, label: string) => void = () => {};
export const setDocumentOpener = (open: (doc: Diagram, label: string) => void) =>
  (openDocument = open);

export function restoreCheckpoint() {
  const saved = state.checkpoint();
  if (!saved) return;
  discardPreview();
  openDocument(clone(saved), 'Restore layout checkpoint');
}

// Starting an edit keeps the previewed layout, as if Keep had been pressed.
onBeforeEdit(() => acceptPreview());
