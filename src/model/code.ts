/**
 * Code nodes: a listing drawn in JetBrains Mono, one source line per row, each character in its
 * own column. Every position comes from column arithmetic on the mono advance, so the compiler,
 * the canvas, `renderSvg`, PNG and PDF place each character at the same spot and nothing depends
 * on how a renderer treats spaces (`xml:space`).
 *
 * `codeLayout` is the one place that decides sizes, wrapping and clipping. Its rows point back
 * into the source lines by index and character range, so later layers (token colors, diff line
 * bands, highlighted line ranges) attach to rows without changing the layout.
 */
import { drawTable, readTable, type Table } from './code-table';
import { measureText, truncateText, typeProfile, type TypeProfile } from './fonts';
import type { ResolvedAppearance } from './appearance';
import type { Spot, Status } from './status';

/** A code node's body and its options, as the file states them. */
export interface CodeBlock {
  /** Body lines after tab expansion, trailing-space removal and dedent. */
  lines: string[];
  /** `lang=`, as written. */
  lang?: string;
  /** `wrap=on` (default): a line wider than the box continues on more rows; off clips it. */
  wrap: boolean;
  /** `numbers=on`: a line-number gutter. */
  numbers: boolean;
  /** `table=on`: line 1 is a header, drawn muted with a rule under it, and the columns align. */
  table?: boolean;
  /**
   * `labels=inside`: range labels sit in a column inside the box. By default they sit outside
   * its right edge, each on a leader line from a dot just inside the edge.
   */
  labels?: 'inside';
  /** `start=`: the first line's number. */
  start: number;
  /** `max-width=`: the widest the box grows before lines wrap or clip. */
  maxWidth: number;
  /** Source line of `lines[0]`, so a note about a body line names the line in the file. */
  sourceLine: number;
  /** Named line ranges from `range` statements, in file order. */
  ranges?: CodeRange[];
  /**
   * The heredoc body as the file holds it, tabs and all: what the Editor's text box edits, and
   * what an edit writes back. `lines` are drawn from it. Absent for `src=` code.
   */
  body?: string[];
  /** `table=on`: the body read once as a table. The drawing and the Editor both use it. */
  cells?: Table;
  /** `tab=`, when it is not the default 4. */
  tab?: number;
  /** The file sets `wrap=`, so turning `table=` on or off keeps it. */
  wrapSet?: boolean;
  /** `src=`: the body was read from this file, relative to the `.draft`. */
  src?: {
    path: string;
    /** The host could not read it, so `lines` is a placeholder that names it. */
    placeholder?: boolean;
    problem?: { level: 'error' | 'warning'; message: string };
  };
}

/**
 * A named run of body lines (`range sql.copy1 lines=3-6`): a tinted band behind them, a bar in
 * the left margin and an optional label. Its ID is `<node>.<name>`, which edges, notes and states
 * name like any object. Labels add a lane to the node's layout box (`labelColumn`): outside the
 * drawn box by default, inside it with `labels=inside`. A range without a label adds nothing.
 */
export interface CodeRange {
  name: string;
  /** First and last body line, as indexes into `CodeBlock.lines`. */
  from: number;
  to: number;
  /** Color family of the band and bar. */
  color: string;
  label?: string;
  /** From a change mark on the `range` line. */
  status?: Status;
  /** How the drawn emphasis state treats it; see `withState`. */
  spot?: Spot;
}

/** The languages `model/highlight.ts` colors; any other `lang=` draws plain text. */
export const CODE_LANGS = ['sql', 'python', 'ts', 'js', 'json', 'yaml', 'sh', 'diff'] as const;
export const CODE_MAX_WIDTH = 960;
export const CODE_TAB = 4;

/** The listing's type: always JetBrains Mono, whatever the theme's fonts. */
export const CODE_TYPE: TypeProfile = typeProfile('mono', true, 12, 17);
/** Width of one column. */
export const CODE_ADVANCE = measureText('M', CODE_TYPE);
export const CODE_PAD = { x: 12, y: 10 };
/** The caption band above the code, when the node has a quoted label. */
export const CAPTION_HEIGHT = 26;
/**
 * Opacity of the caption band's tint, the box's stroke color. One value for light and dark, so a
 * file drawn for both schemes differs in color alone.
 */
export const CAPTION_TINT = 0.09;

/** The caption band's tint: `w` wide, `h` tall, its top corners rounded to the box's `radius`. */
export function captionBandPath(x: number, y: number, w: number, h: number, radius: number) {
  const k = Math.min(radius, w / 2, h);
  return `M${x} ${y + h}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h}Z`;
}

/** Columns between the widest line number and the code. */
const GUTTER_GAP = 2;
/** A continuation row starts this many columns past its line's own indent. */
const HANG = 2;
/** Space between a table's header line and its first row. */
const TABLE_GAP = 6;
/** The narrowest box. */
const MIN_WIDTH = 80;
/** A range label's padding inside its tag, and the widest a tag grows before its text truncates. */
export const TAG_PAD = 4;
/** The narrowest tag: room for an ellipsis. */
const MIN_TAG = 2 * TAG_PAD + 16;
const TAG_MAX = 168;
/** `labels=inside`: the label column's gap from the box's right edge, and from the code. */
const TAG_INSET = 6;
const TAG_GAP = 12;
/** By default: the leader from the dot inside the right edge to a label outside it. */
export const LEADER = 18;
/** The dot's center, this far inside the box's right edge: on the border, clear of wrap marks. */
export const LEADER_DOT = 0;

/**
 * The label column of a code node whose ranges have labels: the widest tag, capped at
 * `TAG_MAX`. The code never enters this column, so a label covers no code whatever its text or
 * the length of the line beside it. Undefined when no range has a label.
 */
function labelColumn(code: CodeBlock, look: ResolvedAppearance) {
  const labels = (code.ranges ?? []).flatMap(r => (r.label ? [r.label] : []));
  if (!labels.length) return undefined;
  const widest = Math.max(...labels.map(l => measureText(l, look.annotation)));
  return Math.ceil(Math.min(TAG_MAX, widest + 2 * TAG_PAD));
}

/** A range label's text, truncated to the tag width the layout gives it. */
export const tagText = (label: string, layout: CodeLayout, look: ResolvedAppearance) =>
  truncateText(label, layout.tags!.w - 2 * TAG_PAD, look.annotation);

/** Expand tabs to `tab` columns, drop trailing spaces, drop blank lines at both ends, dedent. */
export function codeLines(raw: string[], tab = CODE_TAB): string[] {
  const lines = raw.map(line => {
    let out = '';
    for (const c of line) out += c === '\t' ? ' '.repeat(tab - (out.length % tab)) : c;
    return out.trimEnd();
  });
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  const indent = Math.min(
    ...lines.filter(Boolean).map(l => l.length - l.trimStart().length),
    Infinity,
  );
  return Number.isFinite(indent) ? lines.map(l => l.slice(indent)) : lines;
}

/**
 * The lines a code node draws from its heredoc body: tabs expanded, dedented, and with
 * `table=on`, the table as `drawTable` lays it out.
 */
export const bodyLines = (raw: string[], table?: boolean, tab = CODE_TAB) =>
  codeFromBody(raw, !!table, tab).lines;

/**
 * A code node's body and the lines it draws, from heredoc text: what the compiler reads from a
 * file and what an Editor edit writes, so both give the same block.
 */
export function codeFromBody(raw: string[], table: boolean, tab = CODE_TAB) {
  const lines = codeLines(raw, tab);
  if (!table) return { body: raw, lines };
  const cells = readTable(lines);
  return { body: raw, cells, lines: drawTable(cells) };
}

/** One drawn row: all of a source line, or one piece of a long one. */
export interface CodeRow {
  /** Index into `CodeBlock.lines`. */
  line: number;
  /** The characters `[from, to)` of that line this row shows (UTF-16 offsets). */
  from: number;
  to: number;
  /** Column of the row's first character: 0, or the hanging indent of a continuation. */
  col: number;
  /** Top of the row, from the box's top edge. */
  y: number;
  /** The line continues on the next row: a ↩ mark in the right margin. */
  wraps?: boolean;
  /** `wrap=off`: the line was cut after `to`, and a `…` sits in the next column. */
  clipped?: boolean;
}

export interface CodeLayout {
  /** The size the listing needs, or the size it was given. */
  w: number;
  h: number;
  /** x of column 0 of the code, from the box's left edge. */
  left: number;
  /** x of column 0 of the line numbers; with `numbers=off` there are none. */
  gutter: number;
  /** Columns the numbers take, right-aligned. */
  numberCols: number;
  /** Columns of code a row holds. */
  cols: number;
  /** Height of the caption band; 0 without a caption. */
  caption: number;
  rows: CodeRow[];
  /** Source lines a fixed height left out: drawn as "… N more lines" on the last row. */
  more: number;
  /** y of the "… N more lines" row, when `more` > 0. */
  moreY: number;
  /** The "… N more lines" row fits inside the box; a very short box draws no row for it. */
  moreShown: boolean;
  /** Source lines that wrapped or were clipped. */
  long: number[];
  /** `table=on`: y of the rule under the header line, from the box's top edge. */
  rule?: number;
  /** x where the rule ends: the table's last column, or the right padding when that is nearer. */
  ruleEnd?: number;
  /** Width of the drawn box. `w` adds the outside label lane, when there is one. */
  frame: number;
  /** Right edge of the code column, from the box's left edge: the wrap marks sit just past it. */
  right: number;
  /**
   * The range label column, when a range has a label: its left edge and its width. `outside`:
   * past the drawn box, each label on a leader.
   */
  tags?: { x: number; w: number; outside?: boolean };
}

const columns = (s: string) => s.length;
const indentOf = (s: string) => s.length - s.trimStart().length;

/**
 * Split a line into rows `cols` wide. A continuation starts at its line's indent plus two, and a
 * break falls after the last space of the window when one sits in its second half, past the
 * line's indent.
 */
function wrapLine(text: string, cols: number): Array<{ from: number; to: number; col: number }> {
  if (columns(text) <= cols) return [{ from: 0, to: text.length, col: 0 }];
  const indent = indentOf(text),
    hang = Math.min(indent + HANG, Math.floor(cols / 2)),
    out: Array<{ from: number; to: number; col: number }> = [];
  let from = 0,
    col = 0;
  while (from < text.length) {
    const room = cols - col;
    if (text.length - from <= room) {
      out.push({ from, to: text.length, col });
      break;
    }
    let to = from + room;
    const space = text.lastIndexOf(' ', to - 1);
    // A space in the line's own indent is no break: it would leave a row of nothing.
    if (space >= Math.max(from + Math.ceil(room / 2), indent)) to = space + 1;
    out.push({ from, to, col });
    from = to;
    // A continuation never starts on spaces: they sit at the end of the row before.
    while (text[from] === ' ' && from < text.length) from++;
    col = hang;
  }
  return out;
}

/**
 * Size and rows of a code node. Without a size, the box fits its longest line, up to
 * `maxWidth`; past that, lines wrap (or clip with `wrap=off`). A given width wraps at that
 * width, and a given height keeps the rows that fit and ends with "… N more lines".
 */
export function codeLayout(
  code: CodeBlock,
  caption: string,
  look: ResolvedAppearance,
  size: { width?: number; height?: number } = {},
): CodeLayout {
  const adv = CODE_ADVANCE,
    lh = CODE_TYPE.lineHeight,
    lines = code.lines.length ? code.lines : [''],
    last = code.start + lines.length - 1,
    numberCols = code.numbers ? String(last).length : 0,
    gutterW = code.numbers ? (numberCols + GUTTER_GAP) * adv : 0,
    band = caption ? CAPTION_HEIGHT : 0,
    longest = Math.max(...lines.map(columns)),
    captionW = caption ? measureText(caption, look.annotation) + 2 * CODE_PAD.x : 0,
    column = labelColumn(code, look),
    inside = code.labels === 'inside',
    // Inside, the label column takes the right padding's place: the code ends a gap before it.
    // Outside, a lane right of the box holds the leaders and labels.
    extra = column && inside ? column + TAG_INSET + TAG_GAP - CODE_PAD.x : 0,
    narrowest = Math.ceil(2 * CODE_PAD.x + gutterW + extra + 8 * adv),
    natural = Math.ceil(
      Math.max(MIN_WIDTH, captionW, 2 * CODE_PAD.x + gutterW + extra + longest * adv + 0.01),
    ),
    // The layout box: the drawn box and the outside lane. A given width is the layout box's,
    // so the lane counts in every layout, route and bounds. A narrow width gives up label width
    // first, and never squeezes the drawn box below the narrowest one natural sizing gives, so
    // laying a node out again at its own measured width changes nothing.
    fitted = Math.min(natural, Math.max(code.maxWidth, narrowest)),
    least = Math.min(natural, narrowest),
    outTag =
      column && !inside
        ? size.width === undefined
          ? column
          : Math.max(Math.min(MIN_TAG, column), Math.min(column, size.width - LEADER - least))
        : 0,
    lane = outTag ? LEADER + outTag : 0,
    frame =
      size.width === undefined
        ? fitted
        : lane || (column && inside)
          ? Math.max(least, size.width - lane)
          : size.width,
    w = frame + lane,
    // A given width too narrow for both keeps half its code area for the code.
    room = frame - 2 * CODE_PAD.x - gutterW,
    tagW =
      column &&
      (inside
        ? Math.max(Math.min(MIN_TAG, column), Math.min(column, room / 2 - TAG_INSET - TAG_GAP))
        : outTag),
    reserve = tagW && inside ? tagW + TAG_INSET + TAG_GAP - CODE_PAD.x : 0,
    // A small tolerance, so rounding a fitted width never costs the last column.
    cols = Math.max(4, Math.floor((room - reserve) / adv + 0.05));
  const rows: CodeRow[] = [],
    long: number[] = [],
    top = band + CODE_PAD.y,
    // A table's header line gets a gap below it, and its rule sits in the middle of the gap.
    gap = code.table && lines.length > 1 ? TABLE_GAP : 0;
  lines.forEach((text, line) => {
    const pieces = code.wrap
      ? wrapLine(text, cols)
      : columns(text) > cols
        ? [{ from: 0, to: cols - 1, col: 0 }]
        : [{ from: 0, to: text.length, col: 0 }];
    if (pieces.length > 1 || pieces[0].to < text.length) long.push(line);
    pieces.forEach((p, i) =>
      rows.push({
        line,
        ...p,
        y: top + rows.length * lh + (line > 0 ? gap : 0),
        ...(i < pieces.length - 1 ? { wraps: true } : {}),
        ...(!code.wrap && p.to < text.length ? { clipped: true } : {}),
      }),
    );
  });
  const auto = band + 2 * CODE_PAD.y + rows.length * lh + gap;
  let more = 0,
    moreY = 0,
    moreShown = false;
  if (size.height !== undefined && auto > size.height + 0.5) {
    // Keep the rows that fit with one row to spare for "… N more lines".
    const fit = Math.max(0, Math.floor((size.height - band - 2 * CODE_PAD.y - gap) / lh) - 1);
    let kept = rows.slice(0, fit);
    // Never end on part of a wrapped line: drop its earlier rows too.
    const cut = rows[fit];
    if (cut && kept.length && kept[kept.length - 1].line === cut.line)
      kept = kept.filter(r => r.line !== cut.line);
    more = lines.length - (kept.length ? kept[kept.length - 1].line + 1 : 0);
    rows.length = 0;
    rows.push(...kept);
    moreY = top + kept.length * lh + (kept.some(r => r.line > 0) ? gap : 0);
    moreShown = moreY + lh <= size.height + 0.5;
  }
  const head = rows.filter(r => r.line === 0).pop(),
    rule = gap && head ? head.y + lh + gap / 2 : undefined;
  return {
    ...(rule !== undefined
      ? {
          rule,
          ruleEnd: Math.min(frame - CODE_PAD.x - reserve, CODE_PAD.x + gutterW + longest * adv),
        }
      : {}),
    w,
    h: size.height ?? auto,
    left: CODE_PAD.x + gutterW,
    gutter: CODE_PAD.x,
    numberCols,
    cols,
    caption: band,
    rows,
    more,
    moreY,
    moreShown,
    long,
    frame,
    right: frame - CODE_PAD.x - reserve,
    ...(tagW
      ? {
          tags: inside
            ? { x: frame - TAG_INSET - tagW, w: tagW }
            : { x: frame + LEADER, w: tagW, outside: true },
        }
      : {}),
  };
}

/**
 * A run of text at its column; a row draws as its runs. A run holds single spaces, which every
 * renderer keeps and which take one mono column. Leading spaces and runs of two or more are
 * never drawn: the next run starts at its own column instead.
 */
export interface CodeRun {
  col: number;
  text: string;
}

/**
 * A row's text as runs that each start at their own column, so no renderer has to keep a run of
 * spaces. Token colors split these runs again at token edges.
 */
export function codeRuns(row: CodeRow, text: string): CodeRun[] {
  const out: CodeRun[] = [],
    part = text.slice(row.from, row.to);
  for (const m of part.matchAll(/\S+(?: \S+)*/g)) out.push({ col: row.col + m.index!, text: m[0] });
  if (row.clipped) out.push({ col: row.col + part.length, text: '…' });
  return out;
}

/** x of a column, from the box's left edge. */
export const columnX = (layout: CodeLayout, col: number) => layout.left + col * CODE_ADVANCE;

/** The line number drawn on a row, or '' on a continuation row. */
export function rowNumber(code: CodeBlock, layout: CodeLayout, row: CodeRow, i: number) {
  if (!code.numbers || (i > 0 && layout.rows[i - 1].line === row.line)) return '';
  return String(code.start + row.line);
}

/** The vertical extent of a source line's rows, for a band behind it; undefined when hidden. */
export function lineBand(layout: CodeLayout, line: number) {
  const rows = layout.rows.filter(r => r.line === line);
  if (!rows.length) return undefined;
  return { y: rows[0].y, h: rows.length * CODE_TYPE.lineHeight };
}

/** The ↩ that marks a wrapped row: a hook arrow in the right margin, as a path. */
export function wrapMarkPath(x: number, y: number) {
  const s = CODE_TYPE.lineHeight;
  // Centered in an 8px square at the middle of the row.
  const cx = x,
    cy = y + s / 2;
  return `M${cx + 3},${cy - 3.5} v2.5 a1.5,1.5 0 0 1 -1.5,1.5 h-4.5 m1.8,-1.8 l-1.8,1.8 l1.8,1.8`;
}

/** "… 12 more lines". */
export const moreText = (n: number) => `… ${n} more line${n === 1 ? '' : 's'}`;
