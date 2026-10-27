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

/**
 * A relative `href` against a URL `link-base` (`https://host/org/repo/blob/<sha>/`), as the URL
 * it opens; null when the base is a folder or unset, or `href` is already a URL.
 */
export function baseUrl(href: string, base: string | undefined): string | null {
  if (!base || !SCHEME.test(base) || linkTarget(href).kind === 'url') return null;
  try {
    return new URL(href.replace(/^\/+/, ''), base.endsWith('/') ? base : base + '/').href;
  } catch {
    return null;
  }
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

/** The path from folder `from` to `to`, both absolute with forward slashes. */
export function relativePath(from: string, to: string): string {
  const a = from.split('/').filter(Boolean),
    b = to.split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/') || '.';
}

/**
 * A link as a static SVG carries it. A URL stays as written; a file or `.draft` becomes a path
 * from the diagram's folder (a first guess at where the SVG is saved), without its line.
 */
export function staticHref(href: string, base: string, folder: string): string {
  const t = linkTarget(href);
  return t.kind === 'url' ? href : relativePath(folder, joinPath(base, t.path));
}

/** Editors that open `<scheme>://file/<path>:<line>:<col>`. */
export const EDITORS = ['vscode', 'vscode-insiders', 'cursor', 'windsurf', 'zed'] as const;
export type Editor = (typeof EDITORS)[number];

/** File settings from `config` statements. */
export interface FileConfig {
  /**
   * Where relative links start: a folder relative to the diagram's (its git root when unset), or
   * a URL that relative links are joined to.
   */
  linkBase?: string;
  /** The editor file links open in; VS Code when unset. */
  editor?: Editor;
}

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
  if (shape === 'circle' || shape === 'diamond') {
    // Just outside the outline, halfway along its top-right side, so it touches the shape
    // instead of floating at the empty corner of the bounding box.
    const [px, py, nx, ny] =
      shape === 'diamond'
        ? [0.75 * w, 0.25 * h, h, w]
        : [w / 2 + (w / 2) * Math.SQRT1_2, h / 2 - (h / 2) * Math.SQRT1_2, h, w];
    const len = Math.hypot(nx, ny),
      [ux, uy] = [nx / len, ny / len],
      away = (size / 2) * (ux + uy) + 2;
    return { x: px + ux * away - size / 2, y: py - uy * away - size / 2, size, inside: false };
  }
  if (shape === 'text' || shape === 'icon')
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
