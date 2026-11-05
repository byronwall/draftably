/**
 * Prose with links, for notes and footnotes: `[#1997](https://github.com/org/repo/pull/1997)`
 * draws `#1997` as a link. Lines wrap exactly as the plain words would, so a link never moves
 * anything; each line comes back as runs with their offsets, for SVG `<a>` and click targets.
 */
import { measureText, wrapLines, type TypeProfile } from './fonts';

/** `[label](href)`; the label may not hold `]` and the href may not hold `)` or spaces. */
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export interface Run {
  text: string;
  href?: string;
  /** Offset from the line's start, and width. */
  x: number;
  w: number;
}

/** The text as drawn, with every link written as its label. */
export const plainText = (text: string) => text.replace(LINK, '$1');

/** Every link's target, in order. */
export const textLinks = (text: string) => [...text.matchAll(LINK)].map(m => m[2]);

/** The text's lines at `width`, each as runs of plain text and links. */
export function richLines(text: string, width: number, type: TypeProfile): Run[][] {
  // The target of each character of the plain text, or undefined outside links.
  let plain = '';
  const hrefs: Array<string | undefined> = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    const before = text.slice(at, m.index);
    plain += before + m[1];
    hrefs.push(
      ...Array<undefined>(before.length).fill(undefined),
      ...Array(m[1].length).fill(m[2]),
    );
    at = m.index + m[0].length;
  }
  plain += text.slice(at);
  hrefs.push(...Array<undefined>(text.length - at).fill(undefined));

  let p = 0;
  const space = (i: number) => /\s/.test(plain[i] ?? '');
  return wrapLines(plain, width, type).map(line => {
    while (p < plain.length && space(p)) p++;
    const marks: Array<string | undefined> = [];
    for (const ch of line) {
      if (ch === ' ' && space(p)) {
        // A space inside one link's label is part of the link.
        const prev = hrefs[p - 1];
        while (p < plain.length && space(p)) p++;
        marks.push(prev && prev === hrefs[p] ? prev : undefined);
      } else marks.push(hrefs[p++]);
    }
    const runs: Run[] = [];
    marks.forEach((href, i) => {
      const last = runs.at(-1);
      if (last && last.href === href) last.text += line[i];
      else runs.push({ text: line[i], href, x: 0, w: 0 });
    });
    let x = 0;
    for (const r of runs) {
      r.x = x;
      r.w = measureText(r.text, type);
      x += r.w;
    }
    return runs.length ? runs : [{ text: '', x: 0, w: 0 }];
  });
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A scheme such as `https:`, which opens in a new tab. */
const SCHEME = /^[a-z][a-z0-9+.-]+:/i;

/**
 * One line's content inside its `<text>`: plain runs as text, links as an underlined `<tspan>` in
 * `link`, wrapped in `<a>` with `href` as `write` gives it.
 */
export function runsMarkup(
  runs: Run[],
  link: string,
  write: (href: string) => string | null,
) {
  return runs
    .map(r => {
      const href = r.href ? write(r.href) : null;
      if (!href) return esc(r.text);
      return (
        `<a href="${esc(href)}"${SCHEME.test(href) ? ' target="_blank" rel="noopener"' : ''}>` +
        `<tspan fill="${link}" text-decoration="underline">${esc(r.text)}</tspan></a>`
      );
    })
    .join('');
}
