/**
 * What the viewer opens on, chosen from the URL and the server it runs on:
 *
 * - `?file=path.draft` with `draftably open`: that file, saved back to disk.
 * - `?example=id`: a scratch copy of a bundled example. Never written to disk.
 * - `draftably open` without a file: the start page, showing the folder's diagrams.
 * - The static site: the diagram kept in browser storage, as before.
 */
import { createRoot, createSignal } from 'solid-js';
import { findExample } from '../model/examples';
import type { WorkspaceFile, WorkspaceInfo } from '../server/workspace';
import { openExampleSession, openFileSession } from './file-session';

export type LaunchMode = 'static' | 'start' | 'file' | 'example';

const state = createRoot(() => {
  const [workspace, setWorkspace] = createSignal<WorkspaceInfo | null>(null);
  const [startOpen, setStartOpen] = createSignal(false);
  const [launchNotice, setLaunchNotice] = createSignal('');
  return { workspace, setWorkspace, startOpen, setStartOpen, launchNotice, setLaunchNotice };
});

/** The served folder, or null on the static site. */
export const workspace = state.workspace;
/** The start screen shown over the editor (the static site's first run, or File › Start). */
export const startOpen = state.startOpen;
export const setStartOpen = state.setStartOpen;
/** Why the requested file or example could not be opened. */
export const launchNotice = state.launchNotice;

export const fileUrl = (path: string) => `${location.pathname}?file=${encodeURIComponent(path)}`;
export const exampleUrl = (id: string) => `${location.pathname}?example=${encodeURIComponent(id)}`;
export const startUrl = () => location.pathname;

async function fetchWorkspace(): Promise<WorkspaceInfo | null> {
  try {
    const res = await fetch('./api/workspace', { headers: { accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** List the folder's diagrams again. */
export async function refreshWorkspace() {
  const info = await fetchWorkspace();
  const current = state.workspace();
  if (!info) return;
  if (current && JSON.stringify(info) === JSON.stringify(current)) return;
  // Unchanged files keep their objects, so their rows and thumbnails are not drawn again.
  const known = new Map(current?.files.map(f => [f.path, f]));
  const files = info.files.map(f => {
    const old = known.get(f.path);
    return old && old.title === f.title && old.modified === f.modified ? old : f;
  });
  state.setWorkspace({ ...info, files });
}

/**
 * Keep the folder's list current while the page is visible, so diagrams an agent or the command
 * line writes appear without a reload. Returns a function that stops watching.
 */
export function watchWorkspace(intervalMs = 4000) {
  const refresh = () => document.visibilityState === 'visible' && void refreshWorkspace();
  const timer = setInterval(refresh, intervalMs);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('focus', refresh);
  };
}

/** The served file drawn as SVG. The modified time makes a changed file a new image. */
export const thumbnailUrl = (file: WorkspaceFile) =>
  `./api/workspace/thumbnail?file=${encodeURIComponent(file.path)}&v=${Math.round(file.modified)}`;

export async function launch(): Promise<LaunchMode> {
  const params = new URLSearchParams(location.search);
  const info = await fetchWorkspace();
  state.setWorkspace(info);
  const file = params.get('file'),
    exampleId = params.get('example');
  if (file && info) {
    if (await openFileSession(file)) return 'file';
    state.setLaunchNotice(`There is no diagram at ${file}.`);
  } else if (file) state.setLaunchNotice('Files open only through `draftably open`.');
  if (exampleId) {
    const example = findExample(exampleId);
    if (example) {
      await openExampleSession(example.id, example.title, example.source);
      return 'example';
    }
    state.setLaunchNotice(`There is no example named ${exampleId}.`);
  }
  return info ? 'start' : 'static';
}

/** Write a new diagram file in the served folder. Resolves its path, or throws the reason. */
export async function createDiagramFile(path: string, source: string): Promise<string> {
  const res = await fetch('./api/workspace/files', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, source }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(body.error ?? res.statusText);
  return body.path;
}

/** A file name for a title: "Billing flow" → "billing-flow.draft". */
export const fileNameFor = (title: string) =>
  (title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled') + '.draft';

/** Source for a new, nearly empty diagram. */
export const newDiagramSource = (title: string) =>
  `diagram ${JSON.stringify(title || 'Untitled diagram')} version=1\n\nnode start "Start" shape=pill\n`;
