/**
 * The `cells` recipe: a group's members laid edge to edge as one object, such as the parts of a
 * request in order. Pure geometry, shared by the compiler for every theme.
 */
import { measureText } from '../model/fonts';
import { titleHeight, wrapTitle } from '../model/labels';
import type { ResolvedAppearance } from '../model/appearance';

/** Width of a marker's bar, centred on the seam it marks. */
export const MARKER_WIDTH = 8;
/** How far a marker's bar runs past the cells, so a line meets it clear of their corners. */
export const MARKER_TAIL = 16;
/** Narrowest and widest cell sized from its title alone. */
const MIN_CELL = 64,
  MAX_CELL = 240;

/** Height of a cells group's title band for a title type of this line height. */
export const cellsBandFor = (lineHeight: number) => Math.round(lineHeight + 14);

export interface CellInput {
  id: string;
  label: string;
  marker: boolean;
  /** From a `size` line. */
  size?: { width: number; height: number };
}

export interface CellBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A cell's own size: one line of title when it fits in `MAX_CELL`, wrapped when it does not. */
export function cellSize(c: CellInput, look: ResolvedAppearance) {
  if (c.size) return { w: c.size.width, h: c.size.height };
  const pad = 2 * look.paddingX,
    w = Math.min(MAX_CELL, Math.max(MIN_CELL, Math.ceil(measureText(c.label, look.title)) + pad)),
    lines = wrapTitle(c.label, w - pad, look).length;
  return { w, h: titleHeight('box', lines, 0, look) };
}

/**
 * Cells in a row (`right`) or a column (`down`), touching. Every cell in a row shares its height
 * (in a column, its width). A marker takes no room: its bar sits on the seam before the next cell
 * and spans the band above as well, so it cuts the whole object, and runs a short tail past the
 * cells where lines meet it. Cells at least `minWidth` wide
 * in all fill a title band wider than they are: a row stretches its last cell, a column its width.
 */
export function layoutCells(
  cells: CellInput[],
  direction: 'right' | 'down',
  look: ResolvedAppearance,
  minWidth = 0,
): { boxes: Map<string, CellBox>; w: number; h: number } {
  const right = direction === 'right',
    sizes = new Map(cells.filter(c => !c.marker).map(c => [c.id, cellSize(c, look)])),
    across = Math.max(right ? 0 : minWidth, ...[...sizes.values()].map(s => (right ? s.h : s.w)));
  const total = [...sizes.values()].reduce((t, s) => t + (right ? s.w : s.h), 0),
    last = cells.findLast(c => !c.marker);
  if (right && last && total < minWidth) {
    const s = sizes.get(last.id)!;
    sizes.set(last.id, { ...s, w: s.w + minWidth - total });
  }
  const band = cellsBandFor(look.groupTitle.lineHeight),
    boxes = new Map<string, CellBox>();
  let at = 0;
  for (const c of cells) {
    if (c.marker) {
      const half = MARKER_WIDTH / 2;
      boxes.set(
        c.id,
        right
          ? { x: at - half, y: -band, w: MARKER_WIDTH, h: across + band + MARKER_TAIL }
          : { x: 0, y: at - half, w: across + MARKER_TAIL, h: MARKER_WIDTH },
      );
      continue;
    }
    const s = sizes.get(c.id)!,
      along = right ? s.w : s.h;
    boxes.set(
      c.id,
      right ? { x: at, y: 0, w: along, h: across } : { x: 0, y: at, w: across, h: along },
    );
    at += along;
  }
  return { boxes, w: right ? at : across, h: right ? across : at };
}
