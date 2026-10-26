/**
 * The title and subtitle drawn above an exported diagram, shared by `inspect --svg` and the
 * editor's export, so a copied image still says what it shows.
 */
import type { Heading, ResolvedAppearance } from './appearance';
import { measureText, typeProfile } from './fonts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Title type: the theme's title face, larger; subtitle type: its annotation face. */
function types(look: ResolvedAppearance) {
  return {
    title: typeProfile(look.title.role, true, 20, 26),
    subtitle: typeProfile(look.annotation.role, false, 13, 18),
  };
}

/** Size of the heading block, including the gap under it. Zero when there is nothing to draw. */
export function headingSize(look: ResolvedAppearance, heading?: Heading) {
  const t = types(look),
    title = heading?.title ?? '',
    subtitle = heading?.subtitle ?? '';
  if (!title && !subtitle) return { w: 0, h: 0 };
  return {
    w: Math.ceil(Math.max(measureText(title, t.title), measureText(subtitle, t.subtitle))),
    h: (title ? t.title.lineHeight : 0) + (subtitle ? t.subtitle.lineHeight : 0) + 20,
  };
}

/** SVG markup for the heading with its top-left corner at (x, y). */
export function headingMarkup(
  look: ResolvedAppearance,
  heading: Heading | undefined,
  x: number,
  y: number,
): string {
  const t = types(look),
    out: string[] = [];
  let top = y;
  const line = (text: string, p: (typeof t)['title'], fill: string) => {
    out.push(
      `<text x="${x}" y="${top + p.lineHeight / 2}" dominant-baseline="central" font-family="${esc(p.family)}" font-size="${p.size}" font-weight="${p.weight}" fill="${fill}">${esc(text)}</text>`,
    );
    top += p.lineHeight;
  };
  if (heading?.title) line(heading.title, t.title, look.text);
  if (heading?.subtitle) line(heading.subtitle, t.subtitle, look.muted);
  return out.join('');
}
