/** The color key drawn under an exported diagram, shared by `inspect --svg` and the editor's export. */
import { NODE_SHADE, swatchFor, type LegendEntry, type ResolvedAppearance } from './appearance';
import { measureText } from './fonts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Size of the key: one row per entry, plus a gap above it. Zero when the file has none. */
export function legendSize(look: ResolvedAppearance, legend: LegendEntry[] = []) {
  const row = Math.round(look.annotation.lineHeight + 8);
  if (!legend.length) return { w: 0, h: 0, row };
  return {
    w: 24 + Math.max(...legend.map(e => measureText(e.label, look.annotation))),
    h: row * legend.length + 12,
    row,
  };
}

/** SVG markup for the key with its top-left corner at (x, y). */
export function legendMarkup(
  look: ResolvedAppearance,
  legend: LegendEntry[] = [],
  x: number,
  y: number,
): string {
  const { row } = legendSize(look, legend),
    { family, size, weight } = look.annotation;
  return legend
    .map((e, i) => {
      const c = swatchFor(look, e.family, e.shade ?? NODE_SHADE, 'node'),
        top = y + 12 + i * row;
      return (
        `<rect x="${x}" y="${top + (row - 12) / 2}" width="16" height="12" rx="3" fill="${c.fill}" stroke="${c.stroke}"/>` +
        `<text x="${x + 24}" y="${top + row / 2}" dominant-baseline="central" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${look.text}">${esc(e.label)}</text>`
      );
    })
    .join('');
}
