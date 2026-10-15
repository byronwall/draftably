/**
 * A `.meld` file opened through `pnpm meld open` (or `DIAGRAM_FILE=… pnpm dev`).
 *
 * The file on disk is the source of truth. Each valid revision is compiled and projected into the
 * editor document; browser storage is switched off. An invalid revision keeps the last valid
 * drawing on screen and reports the error line.
 */
import { batch, createRoot, createSignal } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { compile, type Diagnostic, type Scene } from '../dsl/compile';
import { projectScene } from '../dsl/project';
import { DslError } from '../dsl/syntax';
import { clone } from '../model/geometry';
import { normalize } from '../model/document';
import {
  disableBrowserStorage,
  doc,
  restoreDocument,
  selectedIds,
  setCommitHandler,
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

const state = createRoot(() => {
  const [info, setInfo] = createSignal<FileSessionInfo | null>(null);
  const [status, setStatus] = createSignal<FileStatus>('saved');
  const [sourceError, setSourceError] = createSignal<{ message: string; line: number } | null>(
    null,
  );
  const [scene, setScene] = createSignal<Scene | null>(null);
  return { info, setInfo, status, setStatus, sourceError, setSourceError, scene, setScene };
});

/** The open file, or null when the editor works on browser storage as usual. */
export const fileSession = state.info;
export const fileMode = () => !!state.info();
export const fileStatus = state.status;
export const sourceError = state.sourceError;
export const fileScene = state.scene;
export const fileDiagnostics = (): Diagnostic[] => state.scene()?.diagnostics ?? [];

/** The last source read from or written to disk, and its revision. */
let diskSource = '',
  diskRevision = '';
export const currentSource = () => diskSource;

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
export function showSource(source: string): Scene | null {
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
  const kept = selectedIds();
  batch(() => {
    restoreDocument(projectScene(scene, viewState()), { keepCamera: true });
    setSelection(kept);
    state.setScene(scene);
    state.setSourceError(null);
  });
  return scene;
}

function acceptDisk(source: string, revision: string) {
  diskSource = source;
  diskRevision = revision;
  if (showSource(source)) state.setStatus('saved');
}

/** Viewer edits are not saved yet; put the document back and say so. */
function rejectEdit(before: string) {
  restoreDocument(normalize(JSON.parse(before)), { keepCamera: true });
  toast('This file is read-only in the viewer. Edit the .meld source instead.');
  return false;
}

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
  setCommitHandler(rejectEdit);
  state.setInfo(info);
  document.title = `${info.name} · Diagram Studio`;
  acceptDisk(info.source, info.revision);
  listen();
  return true;
}

function listen() {
  const events = new EventSource('./api/events');
  events.addEventListener('source', event => {
    const { source, revision } = JSON.parse((event as MessageEvent).data);
    if (revision === diskRevision) return;
    acceptDisk(source, revision);
    if (state.status() !== 'invalid') toast(`${state.info()!.name} changed on disk.`);
  });
  events.addEventListener('error', () => state.setStatus('offline'));
  events.addEventListener('open', async () => {
    // Catch up on anything missed while disconnected.
    try {
      const info: FileSessionInfo = await (await fetch('./api/session')).json();
      if (info.revision !== diskRevision) acceptDisk(info.source, info.revision);
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
