/**
 * A `.meld` file opened through `pnpm meld open` (or `DIAGRAM_FILE=… pnpm dev`).
 *
 * The file on disk is the source of truth. Each valid revision is compiled and projected into the
 * editor document; browser storage is switched off. An invalid revision keeps the last valid
 * drawing on screen and reports the error line.
 *
 * Committed viewer edits are translated into source statements (`dsl/translate.ts`), shown, and
 * saved with the revision they were based on. Undo and redo step through source versions. If the
 * file changes on disk while an edit is unsaved, the edit is kept aside and the file is shown;
 * the user then keeps the file or explicitly saves the edit over it.
 */
import { batch, createRoot, createSignal } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { compile, type Diagnostic, type Scene } from '../dsl/compile';
import { projectScene } from '../dsl/project';
import { DslError, printSource, readSource } from '../dsl/syntax';
import { translateEdit, UnsupportedEdit } from '../dsl/translate';
import { normalize } from '../model/document';
import { clone } from '../model/geometry';
import {
  clearSelection,
  disableBrowserStorage,
  doc,
  restoreDocument,
  selectedIds,
  setCommitHandler,
  setHistoryHandler,
  setSelection,
} from './document';
import { toast } from './toast';

export interface FileSessionInfo {
  name: string;
  path: string;
  source: string;
  revision: string;
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
  return {
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

/** The open file, or null when the editor works on browser storage as usual. */
export const fileSession = state.info;
export const fileMode = () => !!state.info();
export const fileStatus = state.status;
export const sourceError = state.sourceError;
export const fileScene = state.scene;
export const fileDiagnostics = (): Diagnostic[] => state.scene()?.diagnostics ?? [];
export const conflictProposal = state.proposal;

/** The last source confirmed on disk and its revision. */
let diskSource = '',
  diskRevision = '';
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

/** Compile `source` and show it. Returns the scene, or null when the source is invalid. */
export function showSource(source: string, selection = selectedIds()): Scene | null {
  let scene: Scene;
  try {
    scene = compile(source);
  } catch (error) {
    if (!(error instanceof DslError)) throw error;
    batch(() => {
      state.setSourceError({ message: error.message, line: error.line });
      state.setStatus('invalid');
    });
    return null;
  }
  batch(() => {
    restoreDocument(projectScene(scene, viewState()), { keepCamera: true });
    setSelection(selection);
    state.setScene(scene);
    state.setSourceError(null);
  });
  return scene;
}

function resetHistory() {
  state.setUndoStack([]);
  state.setRedoStack([]);
}

/** Show a newer file from disk. Local history cannot undo past someone else's change. */
function acceptDisk(source: string, revision: string, { announce = false } = {}) {
  diskSource = localSource = source;
  diskRevision = revision;
  resetHistory();
  if (showSource(source)) {
    state.setStatus('saved');
    if (announce) toast(`${state.info()!.name} changed on disk.`);
  }
}

// --- Saving -----------------------------------------------------------------------------------

let saving = false,
  saveAgain = false;
/** Shown once the server confirms the save, so a refused save never reads as saved. */
let savedMessage: string | null = null;
/** A change on disk reported while a save was in flight. */
let externalDuringSave: { source: string; revision: string } | null = null;

async function save() {
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
      const res = await fetch('./api/source', {
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
      acceptDisk(external.source, external.revision, { announce: true });
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
    showSource(source);
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
  showSource(proposal);
  void save();
}

/** Try the last failed save again. */
export const retrySave = () => void save();

// --- Edits and history ---------------------------------------------------------------------------

/** Undo an edit the file cannot take by showing the source again, with a reason. */
function snapBack(message: string) {
  showSource(localSource);
  toast(message);
  return false;
}

function handleEdit(before: string, label: string): boolean {
  if (state.sourceError()) return snapBack('Fix the error in the file before editing here.');
  if (state.proposal()) return snapBack('Keep the file or save your edit before editing again.');
  const scene = state.scene();
  if (!scene) return snapBack('The file has no valid drawing yet.');
  let result;
  try {
    result = translateEdit({
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
    compile(next);
  } catch (error) {
    if (error instanceof DslError) return snapBack(`That edit cannot be saved. ${error.message}`);
    throw error;
  }
  batch(() => {
    state.setUndoStack(stack => [...stack, { before: localSource, after: next, label }].slice(-80));
    state.setRedoStack([]);
  });
  localSource = next;
  showSource(
    next,
    selectedIds().map(id => result.ids.get(id) ?? id),
  );
  savedMessage = result.notes.length ? `Saved · ${result.notes.join(' · ')}` : `Saved · ${label}`;
  void save();
  return true;
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
  showSource(localSource);
  clearSelection();
  toast((direction === 'undo' ? 'Undid ' : 'Redid ') + entry.label.toLowerCase());
  void save();
}

// --- Session ---------------------------------------------------------------------------------

/**
 * Ask the local server for a file session. Resolves false for the static app, where
 * `/api/session` does not exist.
 */
export async function detectFileSession(): Promise<boolean> {
  let info: FileSessionInfo;
  try {
    const res = await fetch('./api/session', { headers: { accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return false;
    info = await res.json();
  } catch {
    return false;
  }
  disableBrowserStorage();
  setCommitHandler(handleEdit);
  setHistoryHandler({
    undo: () => historyStep('undo'),
    redo: () => historyStep('redo'),
    canUndo: () => state.undoStack().length > 0,
    canRedo: () => state.redoStack().length > 0,
  });
  state.setInfo(info);
  document.title = `${info.name} · Diagram Studio`;
  acceptDisk(info.source, info.revision);
  listen();
  return true;
}

function onExternalChange(source: string, revision: string) {
  if (revision === diskRevision) return;
  if (saving) externalDuringSave = { source, revision };
  else if (localSource !== diskSource) enterConflict(source, revision);
  else acceptDisk(source, revision, { announce: true });
}

function listen() {
  const events = new EventSource('./api/events');
  events.addEventListener('source', event => {
    const { source, revision } = JSON.parse((event as MessageEvent).data);
    onExternalChange(source, revision);
  });
  events.addEventListener('error', () => state.setStatus('offline'));
  events.addEventListener('open', async () => {
    // Catch up on anything missed while disconnected.
    try {
      const info: FileSessionInfo = await (await fetch('./api/session')).json();
      if (info.revision !== diskRevision) onExternalChange(info.source, info.revision);
      else if (state.status() === 'offline')
        state.setStatus(state.sourceError() ? 'invalid' : 'saved');
    } catch {
      state.setStatus('offline');
    }
  });
}

/** Short text for the toolbar's save indicator. */
export function fileStatusText(): string {
  const name = state.info()?.name ?? '';
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
