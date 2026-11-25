/**
 * Database table rows: a member of a group's body drawn as one row of `layout g table`, with a key
 * glyph, the column name and a muted type. The compiler sizes rows from `rowSize`, and the canvas
 * and the SVG renderer draw them from `rowParts`, so both give the same geometry.
 */
import { measureText } from './fonts';
import type { ResolvedAppearance } from './appearance';

/** The key marks a row takes: primary, foreign and unique key, and not null. */
export const TABLE_KEYS = ['pk', 'fk', 'uk', 'nn'] as const;
export type TableKey = (typeof TABLE_KEYS)[number];

export interface TableRow {
  /** The column's type as written, such as `uuid` or `varchar(255)`; empty when not given. */
  type: string;
  keys: TableKey[];
  /** `-> table.column`: the row this one refers to. */
  ref?: string;
}

/** Key glyphs on a 24-unit grid, drawn with a round stroke. From Lucide (ISC). */
export const TABLE_GLYPHS = {
  key: 'M2 15.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0M21 2l-9.6 9.6M15.5 7.5l2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4',
  link: 'M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8',
} as const;
export type TableGlyph = keyof typeof TABLE_GLYPHS;

/** Drawn size of a glyph, the room after it, and the gap before the type column. */
const GLYPH = 12,
  GLYPH_GAP = 6,
  TYPE_GAP = 16;
/** Most room at a row's sides and above and below its name: rows pack tight, like a table's. */
const ROW_PAD_X = 10,
  ROW_PAD_Y = 5;

/** A primary key shows a key, a foreign key or a `->` a link; other rows have none. */
export const glyphOf = (row: TableRow): TableGlyph | undefined =>
  row.keys.includes('pk') ? 'key' : row.keys.includes('fk') || row.ref ? 'link' : undefined;

/** The type column's text: the type, then `uk` and `nn` when the row has them. */
export const typeText = (row: TableRow) =>
  [row.type, ...row.keys.filter(k => k === 'uk' || k === 'nn')].filter(Boolean).join(' ');

const padX = (look: ResolvedAppearance) => Math.min(look.paddingX, ROW_PAD_X);

/** A row's own size. Every row keeps room for a glyph, so names line up down the table. */
export function rowSize(name: string, row: TableRow, look: ResolvedAppearance) {
  const type = typeText(row),
    w =
      2 * padX(look) +
      GLYPH +
      GLYPH_GAP +
      measureText(name, look.title) +
      (type ? TYPE_GAP + measureText(type, look.detail) : 0);
  return {
    w: Math.ceil(w),
    h: Math.round(look.title.lineHeight + 2 * Math.min(look.paddingY, ROW_PAD_Y)),
  };
}

/** Where a row's glyph, name and type sit in a row `w` by `h`, from its top-left corner. */
export function rowParts(row: TableRow, w: number, h: number, look: ResolvedAppearance) {
  const x = padX(look),
    glyph = glyphOf(row),
    type = typeText(row);
  return {
    ...(glyph
      ? { glyph: { d: TABLE_GLYPHS[glyph], x, y: h / 2 - GLYPH / 2, scale: GLYPH / 24 } }
      : {}),
    name: { x: x + GLYPH + GLYPH_GAP, y: h / 2 },
    ...(type ? { type: { text: type, x: w - x, y: h / 2 } } : {}),
  };
}
