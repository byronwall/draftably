/**
 * Open an object's link from the viewer: a URL in a new tab as written, a `.draft` in the viewer,
 * and a file in the editor at its line.
 */
import { editorUrl, joinPath, linkTarget, staticHref } from '../model/link';
import { doc } from './document';
import { fileSession } from './file-session';
import { fileUrl, go, workspace } from './launch';
import { toast } from './toast';

/**
 * Where a relative link starts: `config link-base=` from the diagram's folder, else its git root.
 * Null when no file on disk is open.
 */
export function linkBase(): string | null {
  const session = fileSession(),
    base = doc.appearance.config?.linkBase;
  if (!session?.root) return null;
  return base === undefined ? session.root : joinPath(joinPath(session.path, '..'), base);
}

const editor = () => doc.appearance.config?.editor ?? 'vscode';

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

/** A link as an exported SVG carries it: file paths from the diagram's folder, URLs as written. */
export function exportHref(href: string): string {
  const base = linkBase(),
    session = fileSession();
  return base && session ? staticHref(href, base, joinPath(session.path, '..')) : href;
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
