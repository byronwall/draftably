/**
 * Open an object's link from the viewer: a URL in a new tab as written, a `.draft` in the viewer,
 * and a file in the editor at its line.
 */
import { editorUrl, joinPath, linkTarget, type Editor } from '../model/link';
import { fileSession } from './file-session';
import { fileUrl, go, workspace } from './launch';
import { toast } from './toast';

/** Where a relative link starts, or null when no file on disk is open. */
export const linkBase = () => fileSession()?.root ?? null;

const editor = (): Editor => 'vscode';

/** What opening `href` does, for a tooltip or the Inspector. */
export function describeLink(href: string): string {
  const t = linkTarget(href),
    base = linkBase();
  if (t.kind === 'url') return `Open ${href}`;
  const file = base ? joinPath(base, t.path) : t.path;
  if (t.kind === 'draft' && servedPath(file) !== null) return `Open ${t.path} in the viewer`;
  return `Open ${file}${t.line ? `:${t.line}` : ''} in the editor`;
}

/** A path inside the served folder, relative to it, or null. */
function servedPath(file: string): string | null {
  const root = workspace()?.root;
  if (!root) return null;
  const prefix = joinPath(root, '.') + '/';
  return file.startsWith(prefix) ? file.slice(prefix.length) : null;
}

export function openLink(href: string) {
  const t = linkTarget(href);
  if (t.kind === 'url') {
    window.open(href, '_blank', 'noopener');
    return;
  }
  const base = linkBase();
  if (!base) {
    toast(`File links open when the diagram is served with draftably open: ${t.path}`);
    return;
  }
  const file = joinPath(base, t.path),
    served = t.kind === 'draft' ? servedPath(file) : null;
  if (served !== null) void go(fileUrl(served));
  else window.location.assign(editorUrl(editor(), file, t.line, t.col));
}
