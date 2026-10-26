/** The color key drawn under an exported diagram, shared by `inspect --svg` and the editor's export. */
import { NODE_SHADE, swatchFor, type LegendEntry, type ResolvedAppearance } from './appearance';
import { measureText } from './fonts';
import { STATUS_LABELS, statusPaint, type Status } from './status';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Size of the key: one row per entry and per change status used, plus a gap above it. Zero when
 * there is neither.
 */
export function legendSize(
  look: ResolvedAppearance,
  legend: LegendEntry[] = [],
  statuses: Status[] = [],
) {
  const row = Math.round(look.annotation.lineHeight + 8),
    labels = [...legend.map(e => e.label), ...statuses.map(s => STATUS_LABELS[s]!)];
  if (!labels.length) return { w: 0, h: 0, row };
  return {
    w: 24 + Math.max(...labels.map(l => measureText(l, look.annotation))),
    h: row * labels.length + 12,
    row,
  };
}

/** SVG markup for the key with its top-left corner at (x, y). */
export function legendMarkup(
  look: ResolvedAppearance,
  legend: LegendEntry[] = [],
  x: number,
  y: number,
  statuses: Status[] = [],
): string {
  const { row } = legendSize(look, legend, statuses),
    { family, size, weight } = look.annotation;
  const entry = (i: number, swatch: string, label: string) => {
    const top = y + 12 + i * row;
    return (
      `<rect x="${x}" y="${top + (row - 12) / 2}" width="16" height="12" rx="3" ${swatch}/>` +
      `<text x="${x + 24}" y="${top + row / 2}" dominant-baseline="central" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${look.text}">${esc(label)}</text>`
    );
  };
  return [
    ...legend.map((e, i) => {
      const c = swatchFor(look, e.family, e.shade ?? NODE_SHADE, 'node');
      return entry(i, `fill="${c.fill}" stroke="${c.stroke}"`, e.label);
    }),
    // A status row draws a neutral box with that status's border, dash and fade.
    ...statuses.map((s, i) => {
      const p = statusPaint(look, s);
      return entry(
        legend.length + i,
        `fill="${p.stroke ? look.canvas : look.muted}" stroke="${p.stroke ?? look.muted}" stroke-width="${p.width ?? 1}"${p.dash ? ` stroke-dasharray="3 2"` : ''} opacity="${p.opacity}"`,
        STATUS_LABELS[s]!,
      );
    }),
  ].join('');
}
