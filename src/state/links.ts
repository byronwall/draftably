/**
 * Where an object's link goes, for tooltips and exports. The app opens links in `open-link.ts`.
 */
import { baseUrl, joinPath, linkTarget, staticHref } from '../model/link';
import { workspace } from './workspace';
import type { DiagramSession } from './session';

/**
 * Where a relative link starts: `config link-base=` from the diagram's folder, else its git root.
 * Null when no file on disk is open.
 */
export function linkBase(s: DiagramSession): string | null {
  const session = s.fileSession(),
    base = s.doc.appearance.config?.linkBase;
  if (!session?.root || baseUrl('x', base)) return null;
  return base === undefined ? session.root : joinPath(joinPath(session.path, '..'), base);
}

/** `href` joined to a URL `link-base`, or null. */
export const joined = (s: DiagramSession, href: string) =>
  baseUrl(href, s.doc.appearance.config?.linkBase);

/** What opening `href` does, for a tooltip or the Inspector. */
export function describeLink(s: DiagramSession, href: string): string {
  if (joined(s, href)) return `Open ${joined(s, href)}`;
  const t = linkTarget(href),
    base = linkBase(s);
  if (t.kind === 'url') return `Open ${href}`;
  const file = base ? joinPath(base, t.path) : t.path;
  if (t.kind === 'draft' && servedPath(file) !== null) return `Open ${t.path} in the viewer`;
  return `Open ${file}${t.line ? `:${t.line}` : ''} in the editor`;
}

/** A path inside the served folder, relative to it, or null. */
export function servedPath(file: string): string | null {
  const root = workspace()?.root;
  if (!root) return null;
  const prefix = joinPath(root, '.') + '/';
  return file.startsWith(prefix) ? file.slice(prefix.length) : null;
}

/** A link as an exported SVG carries it: file paths from the diagram's folder, URLs as written. */
export function exportHref(s: DiagramSession, href: string): string {
  if (joined(s, href)) return joined(s, href)!;
  const base = linkBase(s),
    session = s.fileSession();
  return base && session ? staticHref(href, base, joinPath(session.path, '..')) : href;
}
