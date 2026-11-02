/**
 * The title and subtitle drawn above an exported diagram, shared by `inspect --svg` and the
 * editor's export, so a copied image still says what it shows.
 */
import type { Heading, ResolvedAppearance } from './appearance';
import { measureText, typeProfile, wrapLines } from './fonts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Title type: the theme's title face, larger; subtitle type: its annotation face. */
function types(look: ResolvedAppearance) {
  return {
    title: typeProfile(look.title.role, true, 20, 26),
    subtitle: typeProfile(look.annotation.role, false, 13, 18),
  };
}

/** Narrowest and widest a subtitle line wraps to: 360px, and about 70 characters of its type. */
const MIN_MEASURE = 360;
const MAX_CHARS = 70;

/**
 * Width the subtitle wraps to over a drawing `room` wide: the drawing's width, held between 360px
 * and about 70 characters, so a long subtitle wraps instead of widening the frame.
 */
export function subtitleMeasure(look: ResolvedAppearance, room: number) {
  const type = types(look).subtitle,
    max = (measureText('abcdefghijklmnopqrstuvwxyz ', type) / 27) * MAX_CHARS;
  return Math.round(Math.min(Math.max(room, MIN_MEASURE), Math.max(max, MIN_MEASURE)));
}

/** Size of the heading block, including the gap under it. Zero when there is nothing to draw. */
export function headingSize(look: ResolvedAppearance, heading: Heading | undefined, wrap: number) {
  const lines = headingLines(look, heading, 0, 0, wrap);
  if (!lines.length) return { w: 0, h: 0 };
  return {
    w: Math.ceil(Math.max(...lines.map(l => measureText(l.text, l.type)))),
    h: lines.reduce((h, l) => h + l.type.lineHeight, 0) + 20,
  };
}

/**
 * Each line of the heading with its own type and box, top-left corner at (x, y). The title is one
 * line; the subtitle wraps to `wrap` (`subtitleMeasure`).
 */
export function headingLines(
  look: ResolvedAppearance,
  heading: Heading | undefined,
  x: number,
  y: number,
  wrap: number,
) {
  const t = types(look),
    out: Array<{
      key: 'title' | 'subtitle';
      text: string;
      type: Type;
      fill: string;
      x: number;
      y: number;
    }> = [];
  let top = y;
  for (const key of ['title', 'subtitle'] as const) {
    const text = heading?.[key];
    if (!text) continue;
    for (const line of key === 'title' ? [text] : wrapLines(text, wrap, t.subtitle)) {
      out.push({
        key,
        text: line,
        type: t[key],
        fill: key === 'title' ? look.text : look.muted,
        x,
        y: top,
      });
      top += t[key].lineHeight;
    }
  }
  return out;
}

type Type = ReturnType<typeof types>['title'];

/** SVG markup for the heading with its top-left corner at (x, y). */
export function headingMarkup(
  look: ResolvedAppearance,
  heading: Heading | undefined,
  x: number,
  y: number,
  wrap: number,
): string {
  return headingLines(look, heading, x, y, wrap)
    .map(
      ({ text, type: p, fill, y: top }) =>
        `<text x="${x}" y="${top + p.lineHeight / 2}" dominant-baseline="central" font-family="${esc(p.family)}" font-size="${p.size}" font-weight="${p.weight}" fill="${fill}">${esc(text)}</text>`,
    )
    .join('');
}

/** Title and subtitle type, for drawing and editing them in the viewer. */
export const headingTypes = types;
