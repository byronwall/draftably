/** Finding and ordering the served folder's diagrams, shared by the start page and the files panel. */
import { createSignal } from 'solid-js';
import type { WorkspaceFile } from '../server/workspace';

export type FileOrder = 'recent' | 'name';

const ORDER_STORAGE = 'diagram-studio-file-order';

function readOrder(): FileOrder {
  try {
    return localStorage.getItem(ORDER_STORAGE) === 'name' ? 'name' : 'recent';
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
  return by === 'recent'
    ? files.sort((a, b) => b.modified - a.modified || a.path.localeCompare(b.path))
    : files.sort((a, b) => a.path.localeCompare(b.path));
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
