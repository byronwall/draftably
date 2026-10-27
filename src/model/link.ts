/**
 * Links on objects (`href=`): what a link points at, and where its mark sits on a shape.
 *
 * A link is kept as the author wrote it. A URL (`https://…`, `mailto:`) opens as written; a
 * `.draft` opens in the viewer; anything else is a file path that opens in the editor. A file
 * path may end in `:line` or `:line:col`, and a relative one starts at the link base: the git
 * root of the diagram, unless the file sets `config link-base=`.
 */
import { measureText, type TypeProfile } from './fonts';

export type LinkKind = 'url' | 'draft' | 'file';

export interface LinkTarget {
  kind: LinkKind;
  /** The URL, or the file path without its line and column. */
  path: string;
  line?: number;
  col?: number;
}

/** A scheme such as `https:` or `vscode:`; a Windows drive letter (`C:`) is not one. */
const SCHEME = /^[a-z][a-z0-9+.-]+:/i;

export function linkTarget(href: string): LinkTarget {
  if (SCHEME.test(href) || href.startsWith('//')) return { kind: 'url', path: href };
  const m = /^(.*?)(?::(\d+))?(?::(\d+))?$/.exec(href)!,
    path = m[1] || href;
  return {
    kind: /\.draft$/i.test(path) ? 'draft' : 'file',
    path,
    ...(m[2] ? { line: Number(m[2]) } : {}),
    ...(m[3] ? { col: Number(m[3]) } : {}),
  };
}

/** Join and normalize forward-slash paths; an absolute `path` ignores `base`. */
export function joinPath(base: string, path: string): string {
  const parts: string[] = [];
  for (const p of (path.startsWith('/') ? path : `${base}/${path}`).split('/')) {
    if (p === '..') parts.pop();
    else if (p && p !== '.') parts.push(p);
  }
  return '/' + parts.join('/');
}

/** Editors that open `<scheme>://file/<path>:<line>:<col>`. */
export const EDITORS = ['vscode', 'vscode-insiders', 'cursor', 'windsurf', 'zed'] as const;
export type Editor = (typeof EDITORS)[number];

export const editorUrl = (editor: Editor, file: string, line?: number, col?: number) =>
  `${editor}://file${encodeURI(file)}${line ? `:${line}${col ? `:${col}` : ''}` : ''}`;

/** The link mark: a small arrow out of a shape's top-right corner, inside the shape when it can be. */
export interface LinkMark {
  x: number;
  y: number;
  size: number;
  /** Inside the shape's fill (draw in its ink), or on the canvas beside it. */
  inside: boolean;
}

export const LINK_MARK_SIZE = 10;

/** `badge` is the width of a `count` badge on the corner, which the mark steps left of. */
export function linkMark(shape: string, w: number, h: number, badge = 0): LinkMark {
  const size = LINK_MARK_SIZE,
    y = 5;
  if (shape === 'circle' || shape === 'diamond' || shape === 'text' || shape === 'icon')
    return { x: w - size + 2, y: -size + 2, size, inside: false };
  const right = shape === 'pill' ? w - h / 2 + 4 : w - 5;
  return { x: Math.min(right, w - badge + 2) - size, y, size, inside: true };
}

/** The mark next to a container's title. */
export const groupLinkMark = (title: string, font: TypeProfile, band: number): LinkMark => ({
  x: 33 + measureText(title, font) + 6,
  y: band - LINK_MARK_SIZE / 2,
  size: LINK_MARK_SIZE,
  inside: true,
});

/** The arrow, in a 10×10 box. */
export const LINK_MARK_PATH = 'M2 8L8 2M3.5 2H8V6.5';
