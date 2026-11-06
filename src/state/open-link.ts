/**
 * Open an object's link from the viewer: a URL in a new tab as written, a `.draft` in the viewer,
 * and a file in the editor at its line.
 */
import { editorUrl, joinPath, linkTarget } from '../model/link';
import { fileUrl, go } from './launch';
import { joined, linkBase, servedPath } from './links';
import { toast } from './toast';
import type { DiagramSession } from './session';

const editor = (s: DiagramSession) => s.doc.appearance.config?.editor ?? 'vscode';

export function openLink(s: DiagramSession, href: string) {
  const t = linkTarget(href),
    url = t.kind === 'url' ? href : joined(s, href);
  if (url) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const base = linkBase(s);
  if (!base) {
    toast(`File links open when the diagram is served with draftably open: ${t.path}`);
    return;
  }
  const file = joinPath(base, t.path),
    served = t.kind === 'draft' ? servedPath(file) : null;
  if (served !== null) void go(fileUrl(served));
  else window.location.assign(editorUrl(editor(s), file, t.line, t.col));
}
