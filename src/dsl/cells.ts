/**
 * The `cells` recipe: a group's members laid edge to edge as one object, such as the parts of a
 * request in order. Pure geometry, shared by the compiler for every theme.
 */
import { measureText } from '../model/fonts';
import { wrapTitle } from '../model/labels';
import type { ResolvedAppearance } from '../model/appearance';

/** Width of a marker's bar, centred on the seam it marks. */
export const MARKER_WIDTH = 8;
/** How far a marker's bar runs past the cells, so a line meets it clear of their corners. */
export const MARKER_TAIL = 16;
/** Most room above and below a cell's title: cells pack tighter than nodes, like table rows. */
const CELL_PAD_Y = 10;
/** Narrowest and widest cell sized from its title alone. */
const MIN_CELL = 64,
  MAX_CELL = 240;

/** Height of a cells group's title band for a title type of this line height. */
export const cellsBandFor = (lineHeight: number) => Math.round(lineHeight + 14);

export interface CellInput {
  id: string;
  label: string;
  marker: boolean;
  /** Columns the cell covers in a grid. */
  span?: number;
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
  return { w, h: lines * look.title.lineHeight + 2 * Math.min(look.paddingY, CELL_PAD_Y) };
}

/**
 * Cells edge to edge, in rows of `columns` columns filled in order; a cell's `span` covers that
 * many columns, and a cell that does not fit the rest of a row starts the next one. Without
 * `columns`, the cells form one row (`right`) or one column (`down`). Each column is as wide as
 * its widest single cell, widened at its last column for a wider spanning cell, and each row is
 * as tall as its tallest cell. Cells narrower than `minWidth` in all, the title band's width,
 * widen the last column.
 *
 * A marker takes no room: in one row or column, its bar sits on the seam before the next cell
 * and spans the band above as well, so it cuts the whole object, and runs a short tail past the
 * cells where lines meet it.
 */
export function layoutCells(
  cells: CellInput[],
  shape: { direction: 'right' | 'down'; columns?: number },
  look: ResolvedAppearance,
  minWidth = 0,
): { boxes: Map<string, CellBox>; w: number; h: number } {
  const parts = cells.filter(c => !c.marker),
    sizes = new Map(parts.map(c => [c.id, cellSize(c, look)])),
    cols = Math.max(
      1,
      shape.columns ??
        (shape.direction === 'down' ? 1 : parts.reduce((n, c) => n + (c.span ?? 1), 0)),
    );
  // Rows and columns in order.
  const slots = new Map<string, { row: number; col: number; span: number }>();
  let row = 0,
    col = 0;
  for (const c of parts) {
    const span = Math.min(c.span ?? 1, cols);
    if (col + span > cols) {
      row++;
      col = 0;
    }
    slots.set(c.id, { row, col, span });
    col += span;
  }
  const widths = Array<number>(cols).fill(0),
    heights = Array<number>(parts.length ? row + 1 : 0).fill(0);
  for (const c of parts) {
    const { row, col, span } = slots.get(c.id)!;
    if (span === 1) widths[col] = Math.max(widths[col], sizes.get(c.id)!.w);
    heights[row] = Math.max(heights[row], sizes.get(c.id)!.h);
  }
  for (const c of parts) {
    const { col, span } = slots.get(c.id)!,
      short = sizes.get(c.id)!.w - widths.slice(col, col + span).reduce((a, b) => a + b, 0);
    if (short > 0) widths[col + span - 1] += short;
  }
  const short = minWidth - widths.reduce((a, b) => a + b, 0);
  if (short > 0) widths[cols - 1] += short;
  const xs = [0],
    ys = [0];
  for (const w of widths) xs.push(xs.at(-1)! + w);
  for (const h of heights) ys.push(ys.at(-1)! + h);
  const w = xs.at(-1)!,
    h = ys.at(-1)!,
    boxes = new Map<string, CellBox>();
  for (const c of parts) {
    const { row, col, span } = slots.get(c.id)!;
    boxes.set(c.id, { x: xs[col], y: ys[row], w: xs[col + span] - xs[col], h: heights[row] });
  }
  const band = cellsBandFor(look.groupTitle.lineHeight),
    across = cols > 1 || shape.direction === 'right';
  cells.forEach((c, i) => {
    if (!c.marker) return;
    const next = cells.slice(i + 1).find(n => !n.marker),
      at = next ? boxes.get(next.id)! : undefined,
      half = MARKER_WIDTH / 2;
    boxes.set(
      c.id,
      across
        ? { x: (at?.x ?? w) - half, y: -band, w: MARKER_WIDTH, h: h + band + MARKER_TAIL }
        : { x: 0, y: (at?.y ?? h) - half, w: w + MARKER_TAIL, h: MARKER_WIDTH },
    );
  });
  return { boxes, w, h };
}
