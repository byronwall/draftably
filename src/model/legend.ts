/** The color key drawn under an exported diagram, shared by `inspect --svg` and the editor's export. */
import { NODE_SHADE, swatchFor, type LegendEntry, type ResolvedAppearance } from './appearance';
import { measureText } from './fonts';
import { statusLabel, statusPaint, statusSwatch, type StatusCount } from './status';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Space between change entries, which share one row. */
const STATUS_GAP = 24;

/** Width of one entry: its swatch, the gap after it, and its label. */
const entryW = (look: ResolvedAppearance, label: string) =>
  24 + measureText(label, look.annotation);

/**
 * Size of the key: one row per `legend` entry, then one row holding every change mark used with
 * its count, plus a gap above it. Zero when there is neither.
 */
export function legendSize(
  look: ResolvedAppearance,
  legend: LegendEntry[] = [],
  statuses: StatusCount[] = [],
) {
  const row = Math.round(look.annotation.lineHeight + 8),
    rows = legend.length + (statuses.length ? 1 : 0);
  if (!rows) return { w: 0, h: 0, row };
  const marks = statuses.reduce((w, s) => w + entryW(look, statusLabel(s)), 0);
  return {
    w: Math.max(
      ...legend.map(e => entryW(look, e.label)),
      marks + STATUS_GAP * Math.max(0, statuses.length - 1),
    ),
    h: row * rows + 12,
    row,
  };
}

/** SVG markup for the key with its top-left corner at (x, y). */
export function legendMarkup(
  look: ResolvedAppearance,
  legend: LegendEntry[] = [],
  x: number,
  y: number,
  statuses: StatusCount[] = [],
): string {
  const { row } = legendSize(look, legend, statuses),
    { family, size, weight } = look.annotation;
  const entry = (left: number, i: number, swatch: string, label: string) => {
    const top = y + 12 + i * row;
    return (
      `<rect x="${left}" y="${top + (row - 12) / 2}" width="16" height="12" rx="3" ${swatch}/>` +
      `<text x="${left + 24}" y="${top + row / 2}" dominant-baseline="central" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${look.text}">${esc(label)}</text>`
    );
  };
  let left = x;
  return [
    ...legend.map((e, i) => {
      const c = swatchFor(look, e.family, e.shade ?? NODE_SHADE, 'node');
      return entry(x, i, `fill="${c.fill}" stroke="${c.stroke}"`, e.label);
    }),
    // A change entry draws a neutral box with that mark's border, dash and fade.
    ...statuses.map(s => {
      const p = statusPaint(look, s.status),
        c = statusSwatch(look, s.status, 'node'),
        label = statusLabel(s),
        at = left;
      left += entryW(look, label) + STATUS_GAP;
      return entry(
        at,
        legend.length,
        `fill="${c.fill}" stroke="${c.stroke}" stroke-width="${p.width ?? 1}"${p.dash ? ` stroke-dasharray="3 2"` : ''} opacity="${p.opacity}"`,
        label,
      );
    }),
  ].join('');
}
