/**
 * What the viewer opens on, chosen from the URL and the server it runs on:
 *
 * - `?file=path.draft` with `draftably open`: that file, saved back to disk.
 * - `?example=id`: a scratch copy of a bundled example. Never written to disk.
 * - `#s=…`: a scratch copy of source shared from the site's playground, opened like an example.
 *   With `?new` it is the blank draft that New opens. Unsaved edits to any scratch copy come back
 *   after a reload.
 * - `draftably open` without a file: the start page, showing the folder's diagrams.
 * - The static site: the diagram kept in browser storage, as before.
 */
import { createRoot, createSignal } from 'solid-js';
import { decodeSource, encodeSource } from '../lib/source-hash';
import { readImportedSource } from '../import/scratch';
import { findExample } from '../model/examples';
import type { WorkspaceFile, WorkspaceInfo } from '../server/workspace';
import { clearSelection, prepareForEdit, setDoc } from './document';
import { fitView } from './editor';
import {
  agreeToLeave,
  closeFileSession,
  DRAFT_ID,
  currentSource,
  exampleMode,
  fileSession,
  openExampleSession,
  openFileSession,
  prefetchFile,
  settleSave,
} from './file-session';

export type LaunchMode = 'static' | 'start' | 'file' | 'example';

const state = createRoot(() => {
  const [workspace, setWorkspace] = createSignal<WorkspaceInfo | null>(null);
  const [startOpen, setStartOpen] = createSignal(false);
  const [launchNotice, setLaunchNotice] = createSignal('');
  const [view, setView] = createSignal<LaunchMode>('static');
  return {
    workspace,
    setWorkspace,
    startOpen,
    setStartOpen,
    launchNotice,
    setLaunchNotice,
    view,
    setView,
  };
});

/** The served folder, or null on the static site. */
export const workspace = state.workspace;
/** The start screen shown over the editor (the static site's first run, or File › Start). */
export const startOpen = state.startOpen;
export const setStartOpen = state.setStartOpen;
/** Why the requested file or example could not be opened. */
export const launchNotice = state.launchNotice;
/** What the page shows: the start page, or the editor on a file, an example or browser storage. */
export const launchView = state.view;

export const fileUrl = (path: string) => `${location.pathname}?file=${encodeURIComponent(path)}`;
export const exampleUrl = (id: string) => `${location.pathname}?example=${encodeURIComponent(id)}`;
export const startUrl = () => location.pathname;

/** The public site serves the editor at `<site>/app/`. `draftably open` serves it at the root. */
const onSite = () => /\/app\/(index\.html)?$/.test(location.pathname);

/**
 * A page of the public site (docs, the Playground). `draftably open` and the dev server have no
 * site, so their links go to draftably.dev.
 */
export const siteUrl = (path = '') =>
  new URL(path, onSite() ? new URL('..', location.href) : 'https://draftably.dev/').href;

/** Home: the served folder's start page, or the public site's landing page. */
export const homeUrl = () => (state.workspace() ? startUrl() : siteUrl());

/** The editor was opened from the Playground, as its "Open in the editor" does. */
export const cameFromPlayground = () => {
  try {
    return /\/play\/?$/.test(new URL(document.referrer).pathname);
  } catch {
    return false;
  }
};

/** What happens to the source when it goes to the Playground, said before it goes. */
export function playgroundNote(): string {
  const file = fileSession();
  if (!file) return '';
  return file.example
    ? 'The Playground opens in this tab with this source. Your edits here stay in this browser, and Back returns to them.'
    : `The Playground opens in a new tab with a copy of this source. Edits there are not saved to ${file.file}.`;
}

/**
 * Show the current source in the Playground. A file stays open here and the Playground opens in
 * a new tab; an example goes in this tab, since its source is all it has.
 */
export async function openInPlayground() {
  const url = `${siteUrl('play')}#${await encodeSource(currentSource())}`;
  if (!exampleMode()) return void window.open(url, '_blank', 'noopener');
  agreeToLeave();
  location.assign(url);
}

async function fetchWorkspace(): Promise<WorkspaceInfo | null> {
  if (onSite()) return null;
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
  const mode = await chooseLaunch();
  state.setView(mode);
  return mode;
}

async function chooseLaunch(): Promise<LaunchMode> {
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
  const imported = params.get('import');
  if (imported) {
    const source = readImportedSource(imported);
    if (source != null) {
      const title = /^diagram\s+"([^"]*)"/m.exec(source)?.[1] || 'Imported diagram';
      await openExampleSession(DRAFT_ID, title, source, `import:${imported}`);
      return 'example';
    }
    state.setLaunchNotice('This imported diagram is no longer available in this browser.');
  }
  const shared = await decodeSource(location.hash);
  if (shared != null) {
    const title = /^diagram\s+"([^"]*)"/m.exec(shared)?.[1] || 'Shared diagram';
    const id = params.has('new') ? DRAFT_ID : 'shared';
    await openExampleSession(id, title, shared, location.hash.slice(1));
    return 'example';
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

// --- Switching in place ----------------------------------------------------------------------

const leaveHandlers: Array<() => void> = [];
/** Register work to close before the page shows another file, such as an open Compare. */
export const onLeaveFile = (handler: () => void) => void leaveHandlers.push(handler);

/**
 * Open a served file, or the start page, without reloading the page, so the current drawing
 * stays on screen until the next one is ready. Anything else (an example, another site, an edited
 * example that the browser should ask about) loads as a normal page.
 */
export async function go(url: string, { push = true } = {}) {
  const next = new URL(url, location.href);
  const file = next.searchParams.get('file');
  const toStart = next.pathname === location.pathname && !next.search;
  if (next.origin !== location.origin || !state.workspace() || exampleMode() || (!file && !toStart))
    return location.assign(url);
  prepareForEdit();
  for (const handler of leaveHandlers) handler();
  await settleSave();
  if (file) {
    const switching = fileSession()?.file !== file;
    if (switching && !(await openFileSession(file))) return location.assign(url);
    if (push) history.pushState(null, '', next.href);
    state.setStartOpen(false);
    if (switching) {
      clearSelection();
      setDoc('collapsed', []);
      // The new drawing is projected in this same task, so it never paints at the old camera.
      fitView();
    }
    state.setView('file');
  } else {
    closeFileSession();
    if (push) history.pushState(null, '', next.href);
    document.title = 'draftably';
    state.setView('start');
    void refreshWorkspace();
  }
}

const isPlainClick = (e: MouseEvent) =>
  e.button === 0 && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * Route plain clicks on links to served files and the start page through `go`, and follow the
 * browser's back and forward buttons. Returns a function that stops.
 */
export function navigateInPlace() {
  const onClick = (e: MouseEvent) => {
    const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || !isPlainClick(e) || link.target || link.hasAttribute('download')) return;
    const next = new URL(link.href, location.href);
    if (next.origin !== location.origin || next.pathname !== location.pathname) return;
    if (next.search && !next.searchParams.get('file')) return;
    e.preventDefault();
    void go(next.href);
  };
  const onPopState = () => void go(location.href, { push: false });
  // A file link hovered briefly is compiled meanwhile, so the click usually finds it ready.
  const prefetched = new Set<string>();
  let hover: ReturnType<typeof setTimeout> | undefined;
  const onPointerOver = (e: PointerEvent) => {
    const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    const file = link && state.workspace() && new URL(link.href).searchParams.get('file');
    clearTimeout(hover);
    if (!file || prefetched.has(file) || file === fileSession()?.file) return;
    hover = setTimeout(() => {
      prefetched.add(file);
      void prefetchFile(file);
    }, 80);
  };
  document.addEventListener('click', onClick);
  document.addEventListener('pointerover', onPointerOver);
  window.addEventListener('popstate', onPopState);
  return () => {
    clearTimeout(hover);
    document.removeEventListener('pointerover', onPointerOver);
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onPopState);
  };
}
