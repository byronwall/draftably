/**
 * A `.draft` file opened through `pnpm draftably open` (or `DIAGRAM_ROOT=… pnpm dev`), or an example
 * opened as a scratch copy.
 *
 * The file on disk is the source of truth. Each valid revision is compiled and projected into the
 * editor document; browser storage is switched off. An invalid revision keeps the last valid
 * drawing on screen and reports the error line.
 *
 * Committed viewer edits are translated into source statements (`dsl/translate.ts`), shown, and
 * saved with the revision they were based on. Undo and redo step through source versions. If the
 * file changes on disk while an edit is unsaved, the edit is kept aside and the file is shown;
 * the user then keeps the file or explicitly saves the edit over it.
 *
 * An example works the same way, except that nothing is sent to disk: its edits live only in this
 * tab until the user saves the example as a new file.
 */
import { batch, createRoot, createSignal } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { checkSource, compile, type Diagnostic, type Scene } from '../dsl/compile';
import { projectScene } from '../dsl/project';
import { DslError, printSource, readSource } from '../dsl/syntax';
import {
  anchorSurroundings,
  movedOutsideEdit,
  reflowGroup,
  translateEdit,
  UnsupportedEdit,
} from '../dsl/translate';
import {
  setLayoutRecipe,
  setRouting,
  UnstorableLayout,
  writeArrangement,
} from '../dsl/layout-edits';
import type { RoutingResult } from '../engines/routing-engine.js';
import { runShared } from '../lib/engine-tasks';
import { normalize, routingFingerprint } from '../model/document';
import type { Diagram, LayoutSettings, RoutingSettings } from '../model/types';
import { clone } from '../model/geometry';
import {
  clearSelection,
  disableBrowserStorage,
  doc,
  mapSourceIds,
  restoreDocument,
  selectedIds,
  setCommitHandler,
  setHistoryHandler,
  setSelection,
  type EditKind,
} from './document';
import { toast } from './toast';

export interface FileSessionInfo {
  name: string;
  path: string;
  source: string;
  revision: string;
  /** Set for an example: its id. The source is never written to disk. */
  example?: string;
  /** The file's path relative to the served folder (files only). */
  file?: string;
}

export type FileStatus = 'saved' | 'saving' | 'invalid' | 'conflict' | 'failed' | 'offline';

interface SourceStep {
  before: string;
  after: string;
  label: string;
}

const state = createRoot(() => {
  const [info, setInfo] = createSignal<FileSessionInfo | null>(null);
  const [status, setStatus] = createSignal<FileStatus>('saved');
  const [sourceError, setSourceError] = createSignal<{ message: string; line: number } | null>(
    null,
  );
  const [scene, setScene] = createSignal<Scene | null>(null);
  /** An edit that could not be saved because the file changed first. */
  const [proposal, setProposal] = createSignal<string | null>(null);
  const [undoStack, setUndoStack] = createSignal<SourceStep[]>([]);
  const [redoStack, setRedoStack] = createSignal<SourceStep[]>([]);
  /** Objects outside the last external change that moved anyway. */
  const [movedByChange, setMovedByChange] = createSignal<string[]>([]);
  /** A revision is being laid out; layout engines run asynchronously. */
  const [compiling, setCompiling] = createSignal(false);
  return {
    compiling,
    setCompiling,
    movedByChange,
    setMovedByChange,
    info,
    setInfo,
    status,
    setStatus,
    sourceError,
    setSourceError,
    scene,
    setScene,
    proposal,
    setProposal,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
  };
});

/** The open file or example, or null when the editor works on browser storage as usual. */
export const fileSession = state.info;
export const fileMode = () => !!state.info();
/** True while an example is open: edits are kept in this tab only. */
export const exampleMode = () => !!state.info()?.example;
/** The example has edits that are not in any file. */
export const exampleEdited = () => exampleMode() && state.undoStack().length > 0;
export const fileStatus = state.status;
export const sourceError = state.sourceError;
export const fileScene = state.scene;
export const fileDiagnostics = (): Diagnostic[] => state.scene()?.diagnostics ?? [];
export const conflictProposal = state.proposal;
export const movedByChange = state.movedByChange;
export const fileCompiling = state.compiling;

/** The last source confirmed on disk and its revision. */
let diskSource = '',
  diskRevision = '';
/** Selects this file's session on the server: `?file=…`. */
let fileQuery = '';
/** What an edit is called once it is kept: saved to disk, or only in the example. */
const keptLabel = () => (exampleMode() ? 'Example only' : 'Saved');
/** The source the viewer shows; it differs from `diskSource` while a save is pending. */
let localSource = '';
export const currentSource = () => localSource;

/** Editor state that is not in the file and survives each reprojection. */
const viewState = () => {
  const current = unwrap(doc);
  return {
    settings: clone(current.settings),
    camera: { ...current.camera },
    theme: current.theme,
    collapsed: [...current.collapsed],
  };
};

let showing = 0;

/** How a redrawn file reaches the scene's routes; `scene.ts` registers it (it imports this module). */
let routeSink: {
  adopt: (routes: { fingerprint: string; result: RoutingResult }) => void;
  quick: (on: boolean) => void;
} = { adopt: () => {}, quick: () => {} };
export const setRouteSink = (sink: typeof routeSink) => (routeSink = sink);

interface Compiled {
  scene: Scene;
  /** Routes drawn off the main thread, for the document `fingerprint` describes. */
  routes?: { fingerprint: string; result: RoutingResult };
}

/** Recently compiled sources. A preview and the commit that follows compile the same source. */
const compiled = new Map<string, Promise<Compiled>>();
function compileCached(source: string): Promise<Compiled> {
  let scene = compiled.get(source);
  if (!scene) {
    scene = compileOffThread(source);
    compiled.set(source, scene);
    scene.catch(() => compiled.delete(source));
    while (compiled.size > 16) compiled.delete(compiled.keys().next().value!);
  }
  return scene;
}

/**
 * Layout and routing take hundreds of milliseconds on a mid-sized file, so they run in the
 * engine worker while the drawing stays responsive. A source the worker refuses is compiled here
 * again, which reports the error with its line.
 */
async function compileOffThread(source: string): Promise<Compiled> {
  try {
    const { scene, fingerprint, routing } = await runShared({
      kind: 'scene',
      source,
      view: viewState(),
    });
    return { scene, routes: { fingerprint, result: routing } };
  } catch {
    return { scene: await compile(source) };
  }
}

/**
 * Compile `source` and show it. Resolves to the scene, or null when the source is invalid or a
 * newer call superseded this one.
 */
export async function showSource(
  source: string,
  selection: string[] | (() => string[]) = selectedIds(),
  mapId: (id: string) => string = id => id,
): Promise<Scene | null> {
  const ticket = ++showing;
  state.setCompiling(true);
  let scene: Scene, routes: Compiled['routes'];
  try {
    ({ scene, routes } = await compileCached(source));
  } catch (error) {
    if (ticket !== showing) return null;
    state.setCompiling(false);
    routeSink.quick(false);
    if (!(error instanceof DslError)) throw error;
    batch(() => {
      state.setSourceError({ message: error.message, line: error.line });
      state.setStatus('invalid');
    });
    return null;
  }
  if (ticket !== showing) return null;
  batch(() => {
    mapSourceIds(mapId);
    restoreDocument(projectScene(scene, viewState()), { keepCamera: true });
    // The worker's routes stand only if it projected the same document; otherwise route here.
    if (routes?.fingerprint === routingFingerprint(unwrap(doc))) routeSink.adopt(routes);
    // A drag in a file keeps quick routes until its saved version is drawn.
    routeSink.quick(false);
    setSelection(typeof selection === 'function' ? selection() : selection);
    state.setScene(scene);
    state.setSourceError(null);
    state.setCompiling(false);
  });
  return scene;
}

function resetHistory() {
  state.setUndoStack([]);
  state.setRedoStack([]);
}

/** Show a newer file from disk. Local history cannot undo past someone else's change. */
async function acceptDisk(source: string, revision: string, { announce = false } = {}) {
  const previous = state.scene(),
    previousSource = localSource;
  diskSource = localSource = source;
  diskRevision = revision;
  resetHistory();
  const scene = await showSource(source);
  if (!scene) return;
  state.setStatus('saved');
  if (!announce) return;
  const moved = previous
    ? movedOutsideEdit(previous, scene, readSource(previousSource), readSource(source))
    : [];
  state.setMovedByChange(moved);
  const name = state.info()!.name;
  toast(
    moved.length
      ? `${name} changed on disk · also moved: ${moved.slice(0, 4).join(', ')}${moved.length > 4 ? '…' : ''}`
      : `${name} changed on disk.`,
  );
}

// --- Saving -----------------------------------------------------------------------------------

let saving = false,
  saveAgain = false;
/** Shown once the server confirms the save, so a refused save never reads as saved. */
let savedMessage: string | null = null;
/** A change on disk reported while a save was in flight. */
let externalDuringSave: { source: string; revision: string } | null = null;

async function save() {
  if (exampleMode()) {
    // Examples keep their edits in this tab; there is no file to write.
    if (savedMessage) toast(savedMessage);
    savedMessage = null;
    return;
  }
  if (saving) {
    saveAgain = true;
    return;
  }
  saving = true;
  state.setStatus('saving');
  try {
    for (;;) {
      saveAgain = false;
      const sending = localSource;
      const res = await fetch(`./api/source${fileQuery}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: sending, base: diskRevision }),
      });
      const body = await res.json();
      if (res.status === 409) {
        enterConflict(body.source, body.revision);
        return;
      }
      if (!res.ok) {
        state.setStatus('failed');
        toast(`Not saved: ${body.error ?? res.statusText}`);
        return;
      }
      diskSource = sending;
      diskRevision = body.revision;
      if (!saveAgain) break;
    }
    state.setStatus('saved');
    if (savedMessage) toast(savedMessage);
    savedMessage = null;
  } catch {
    state.setStatus('failed');
    toast('Not saved: the file server is not reachable.');
  } finally {
    saving = false;
    const external = externalDuringSave;
    externalDuringSave = null;
    // The file was replaced after this save landed; show the newer version.
    if (external && external.revision !== diskRevision && state.status() === 'saved')
      void acceptDisk(external.source, external.revision, { announce: true });
  }
}

/** Keep the unsaved edit aside and show the newer file. */
function enterConflict(source: string, revision: string) {
  const unsaved = localSource;
  savedMessage = null;
  diskSource = localSource = source;
  diskRevision = revision;
  resetHistory();
  batch(() => {
    state.setProposal(unsaved);
    void showSource(source);
    state.setStatus('conflict');
  });
}

/** Discard the edit that could not be saved and keep the file as it is on disk. */
export function keepDiskVersion() {
  batch(() => {
    state.setProposal(null);
    state.setStatus(state.sourceError() ? 'invalid' : 'saved');
  });
}

/** Save the edit that could not be saved, replacing the newer file. */
export function saveProposalOverDisk() {
  const proposal = state.proposal();
  if (!proposal) return;
  state.setProposal(null);
  localSource = proposal;
  void showSource(proposal);
  void save();
}

/** Try the last failed save again. */
export const retrySave = () => void save();

// --- Edits and history ---------------------------------------------------------------------------

/** Undo an edit the file cannot take by showing the source again, with a reason. */
function snapBack(message: string) {
  void showSource(localSource);
  toast(message);
  return false;
}

/** A drawing from a layout pass, timeline step or brush stroke, as positions in the source. */
function arrangementEdit(scene: Scene, label: string) {
  const source = readSource(localSource),
    after = normalize(JSON.parse(JSON.stringify(unwrap(doc))));
  const placed = writeArrangement(source, scene, after),
    anchored = anchorSurroundings(source, scene, placed);
  const notes = placed.length
    ? [`${placed.length} positions` + (anchored.length ? ` · anchored ${anchored.length}` : '')]
    : [];
  return { source, ids: new Map<string, string>(), notes: [label, ...notes] };
}

function handleEdit(before: string, label: string, kind: EditKind = 'edit'): boolean {
  if (state.sourceError()) return snapBack('Fix the error in the file before editing here.');
  if (state.proposal()) return snapBack('Keep the file or save your edit before editing again.');
  if (state.compiling()) return snapBack('Still laying out the file. Try again in a moment.');
  const scene = state.scene();
  if (!scene) return snapBack('The file has no valid drawing yet.');
  let result;
  try {
    result =
      kind === 'arrangement'
        ? arrangementEdit(scene, label)
        : translateEdit({
            source: readSource(localSource),
            scene,
            before: normalize(JSON.parse(before)),
            after: normalize(JSON.parse(JSON.stringify(unwrap(doc)))),
            label,
            selection: selectedIds(),
          });
  } catch (error) {
    if (error instanceof UnsupportedEdit) return snapBack(error.message);
    throw error;
  }
  const next = printSource(result.source);
  // Nothing the file stores changed (for example a move of an object that was not selected).
  if (next === localSource) return snapBack('That change is not saved to diagram files.');
  try {
    checkSource(next);
  } catch (error) {
    if (error instanceof DslError) return snapBack(`That edit cannot be saved. ${error.message}`);
    throw error;
  }
  batch(() => {
    state.setUndoStack(stack => [...stack, { before: localSource, after: next, label }].slice(-80));
    state.setRedoStack([]);
  });
  localSource = next;
  const mapId = (id: string) => result.ids.get(id) ?? id;
  void showSource(next, () => selectedIds().map(mapId), mapId);
  savedMessage = `${keptLabel()} · ${result.notes.length ? result.notes.join(' · ') : label}`;
  void save();
  return true;
}

/**
 * Record and save a change made directly to the source, such as a reflow or a layout recipe.
 * `message` describes it after "Saved ·" (or "Example only ·"). Resolves once the new revision
 * is on screen; false when the source was refused.
 */
export async function commitSource(next: string, label: string, message: string) {
  if (next === localSource) {
    toast('Nothing to change.');
    return false;
  }
  try {
    checkSource(next);
  } catch (error) {
    if (error instanceof DslError) {
      toast(`That change cannot be saved. ${error.message}`);
      return false;
    }
    throw error;
  }
  batch(() => {
    state.setUndoStack(stack => [...stack, { before: localSource, after: next, label }].slice(-80));
    state.setRedoStack([]);
  });
  localSource = next;
  savedMessage = `${keptLabel()} · ${message}`;
  void save();
  await showSource(next);
  return true;
}

// --- Layout tools ------------------------------------------------------------------------------

/** Why the file cannot take a layout change right now, or null when it can. */
export function fileBlocked(): string | null {
  if (state.sourceError()) return 'Fix the error in the file first.';
  if (state.proposal()) return 'Keep the file or save your edit first.';
  if (state.compiling()) return 'Still laying out the file. Try again in a moment.';
  if (!state.scene()) return 'The file has no valid drawing yet.';
  return null;
}

/** The source scope a layout scope maps to: `root`, a group, or null for a loose selection. */
export function sourceScope(scope: { scope: string; containerId?: string }): string | null {
  if (scope.scope === 'all') return 'root';
  if (scope.scope === 'container' && scope.containerId) return scope.containerId;
  return null;
}

/**
 * The current source with `scope` arranged by the engine in `settings`. Throws
 * `UnstorableLayout` for an engine a file cannot name.
 */
export function sourceWithRecipe(scope: string, settings: LayoutSettings) {
  const source = readSource(localSource),
    removed = setLayoutRecipe(source, state.scene()!, scope, settings);
  return { source: printSource(source), removed };
}

/** The current source with these router settings. */
export function sourceWithRouting(routing: RoutingSettings) {
  const source = readSource(localSource);
  setRouting(source, routing);
  return printSource(source);
}

/** Compile a source variant into an editor document, keeping the current view state. */
export async function projectSource(source: string): Promise<Diagram> {
  return projectScene((await compileCached(source)).scene, viewState());
}

export { UnstorableLayout };

/**
 * Let the automatic recipe arrange a group's contents again. Its soft refinements are removed,
 * pins stay, and the objects around it are anchored.
 */
export function reflowSelectedGroup(id: string) {
  const scene = state.scene();
  if (!scene || state.sourceError() || state.proposal())
    return toast('The file cannot be changed right now.');
  const source = readSource(localSource),
    count = reflowGroup(source, scene, id);
  void commitSource(printSource(source), 'Reflow group', `reflowed ${count} objects in ${id}`);
}

function historyStep(direction: 'undo' | 'redo') {
  if (state.proposal() || state.sourceError()) return;
  const from = direction === 'undo' ? state.undoStack : state.redoStack;
  const entry = from().at(-1);
  if (!entry) return;
  batch(() => {
    if (direction === 'undo') {
      state.setUndoStack(s => s.slice(0, -1));
      state.setRedoStack(s => [...s, entry]);
    } else {
      state.setRedoStack(s => s.slice(0, -1));
      state.setUndoStack(s => [...s, entry]);
    }
  });
  localSource = direction === 'undo' ? entry.before : entry.after;
  void showSource(localSource);
  clearSelection();
  toast((direction === 'undo' ? 'Undid ' : 'Redid ') + entry.label.toLowerCase());
  void save();
}

// --- Session ---------------------------------------------------------------------------------

/**
 * Ask the local server for the session of `file` (a path relative to the served folder).
 * Resolves false when the server has no such file.
 */
export async function openFileSession(file: string): Promise<boolean> {
  fileQuery = `?file=${encodeURIComponent(file)}`;
  let info: FileSessionInfo;
  try {
    const res = await fetch(`./api/session${fileQuery}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return false;
    info = { ...(await res.json()), file };
  } catch {
    return false;
  }
  document.title = `${file} · Diagram Studio`;
  await begin(info);
  listen();
  return true;
}

/** Wait for a save in flight, so leaving the file never drops an edit. */
export async function settleSave() {
  while (saving) await new Promise(resolve => setTimeout(resolve, 20));
}

/** Leave the open file for the start page: stop following it on disk. */
export function closeFileSession() {
  stopListening();
  setCommitHandler(null);
  setHistoryHandler(null);
  state.setInfo(null);
}

/** Open an example as a scratch copy. Nothing is read from or written to disk. */
export function openExampleSession(id: string, title: string, source: string) {
  document.title = `Example: ${title} · Diagram Studio`;
  return begin({ name: title, path: '', source, revision: 'example', example: id });
}

/** The source of the example as it was opened, for Reset. */
let exampleOriginal = '';

/** Throw away the example's edits and show it as it was opened. */
export function resetExample() {
  if (!exampleMode()) return;
  localSource = exampleOriginal;
  resetHistory();
  void showSource(localSource);
  clearSelection();
}

/** The example's edits now live in a file; leaving the page no longer loses them. */
export const markExampleSaved = () => resetHistory();

function begin(info: FileSessionInfo): Promise<void> {
  stopListening();
  exampleOriginal = info.example ? info.source : '';
  disableBrowserStorage();
  setCommitHandler(handleEdit);
  setHistoryHandler({
    undo: () => historyStep('undo'),
    redo: () => historyStep('redo'),
    canUndo: () => state.undoStack().length > 0,
    canRedo: () => state.redoStack().length > 0,
  });
  state.setInfo(info);
  return acceptDisk(info.source, info.revision);
}

function onExternalChange(source: string, revision: string) {
  if (revision === diskRevision) return;
  if (saving) externalDuringSave = { source, revision };
  else if (localSource !== diskSource) enterConflict(source, revision);
  else void acceptDisk(source, revision, { announce: true });
}

let fileEvents: EventSource | null = null;

function stopListening() {
  fileEvents?.close();
  fileEvents = null;
}

function resumeListening(event: PageTransitionEvent) {
  if (event.persisted && state.info()?.file) listen();
}

function listen() {
  stopListening();
  const query = fileQuery;
  const events = new EventSource(`./api/events${query}`);
  fileEvents = events;
  // Cached pages otherwise keep their HTTP/1 streams and exhaust the browser's connection pool.
  window.addEventListener('pagehide', stopListening);
  window.addEventListener('pageshow', resumeListening);
  events.addEventListener('source', event => {
    if (fileEvents !== events) return;
    const { source, revision } = JSON.parse((event as MessageEvent).data);
    onExternalChange(source, revision);
  });
  events.addEventListener('error', () => {
    if (fileEvents === events) state.setStatus('offline');
  });
  events.addEventListener('open', async () => {
    // Catch up on anything missed while disconnected.
    try {
      const info: FileSessionInfo = await (await fetch(`./api/session${query}`)).json();
      if (fileEvents !== events) return;
      if (info.revision !== diskRevision) onExternalChange(info.source, info.revision);
      else if (state.status() === 'offline')
        state.setStatus(state.sourceError() ? 'invalid' : 'saved');
    } catch {
      if (fileEvents === events) state.setStatus('offline');
    }
  });
}

/** Short text for the toolbar's save indicator. */
export function fileStatusText(): string {
  const info = state.info();
  if (info?.example) {
    const edits = state.undoStack().length;
    return edits
      ? `Example · ${edits} unsaved edit${edits === 1 ? '' : 's'}`
      : 'Example · not on disk';
  }
  const name = info?.file ?? info?.name ?? '';
  switch (state.status()) {
    case 'saving':
      return `${name} · Saving…`;
    case 'invalid':
      return `${name} · Source error`;
    case 'conflict':
      return `${name} · Changed on disk`;
    case 'failed':
      return `${name} · Not saved`;
    case 'offline':
      return `${name} · Disconnected`;
    default:
      return `${name} · Saved`;
  }
}
