/** Finding and ordering the served folder's diagrams, shared by the start page and the files panel. */
import { createSignal } from 'solid-js';
import type { WorkspaceFile } from '../server/workspace';

export type FileOrder = 'recent' | 'name' | 'folder';

const ORDER_STORAGE = 'diagram-studio-file-order';

function readOrder(): FileOrder {
  try {
    const stored = localStorage.getItem(ORDER_STORAGE);
    return stored === 'name' || stored === 'folder' ? stored : 'recent';
  } catch {
    return 'recent';
  }
}

const [order, setOrderSignal] = createSignal<FileOrder>(readOrder());

/** How lists of diagrams are ordered, remembered per browser. */
export const fileOrder = order;
export function setFileOrder(next: FileOrder) {
  setOrderSignal(next);
  try {
    localStorage.setItem(ORDER_STORAGE, next);
  } catch {
    // The order is a convenience only.
  }
}

/** Files whose title or path contain every word of the query. */
export function matchFiles(files: readonly WorkspaceFile[], query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...files];
  return files.filter(f => {
    const text = `${f.title} ${f.path}`.toLowerCase();
    return words.every(w => text.includes(w));
  });
}

export function sortFiles(files: WorkspaceFile[], by: FileOrder) {
  if (by === 'recent')
    return files.sort((a, b) => b.modified - a.modified || a.path.localeCompare(b.path));
  if (by === 'folder')
    return files.sort(
      (a, b) =>
        compareFolders(folderOf(a.path), folderOf(b.path)) ||
        baseName(a.path).localeCompare(baseName(b.path)),
    );
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

/** Folders in tree order: the root first, then each folder followed by its own sub-folders. */
function compareFolders(a: string, b: string) {
  if (a === b) return 0;
  if (!a || !b) return a ? 1 : -1;
  const as = a.split('/'),
    bs = b.split('/');
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    const order = as[i].localeCompare(bs[i]);
    if (order) return order;
  }
  return as.length - bs.length;
}

/** The order to show: the folder view falls back to A–Z when every file is in the root. */
export const shownOrder = (files: readonly WorkspaceFile[]): FileOrder =>
  order() === 'folder' && !hasFolders(files) ? 'name' : order();

/** Whether any diagram sits in a sub-folder, so a folder view has something to show. */
export const hasFolders = (files: readonly WorkspaceFile[]) =>
  files.some(f => f.path.includes('/'));

/**
 * Files already sorted by folder, cut into one run per folder. `depth` counts the folder's
 * levels below the root, for indenting a tree.
 */
export function groupByFolder(files: readonly WorkspaceFile[]) {
  const groups: { folder: string; depth: number; files: WorkspaceFile[] }[] = [];
  for (const file of files) {
    const folder = folderOf(file.path),
      last = groups.at(-1);
    if (last?.folder === folder) last.files.push(file);
    else groups.push({ folder, depth: folder ? folder.split('/').length : 0, files: [file] });
  }
  return groups;
}

/** The folder part of a path, or '' at the root: "flows/checkout.draft" → "flows". */
export const folderOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));

/** The file name without its folder. */
export const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export const ago = (ms: number) => {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  // Within a week the time of day tells same-day files apart, so a Recent list reads as sorted.
  if (hours < 24 * 7)
    return new Date(ms).toLocaleString(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const openedAt = Date.now();

/** Changed since this page opened, e.g. by an agent or the command line. */
export const changedSinceOpen = (ms: number) => ms > openedAt;
