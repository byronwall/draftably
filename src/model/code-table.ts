/**
 * `table=on` code: a body read once into a `Table`, drawn from it, edited as it, and written back
 * from it. Reading accepts what people paste (columns two or more spaces apart, Markdown, psql,
 * spreadsheet cells); writing gives text that reads back to the same `Table`.
 */

export type Align = 'left' | 'right' | 'center';

/** A table body read into rows of cells: what `table=on` draws, and what the Editor edits. */
export interface Table {
  /** The header row first. A blank source line is an empty row, so `range` lines keep counting. */
  rows: string[][];
  /**
   * Each column's chosen alignment, from a `:` mark in a typed rule or from the Editor.
   * `undefined`: the column's cells decide, so a column of numbers aligns right.
   */
  align: (Align | undefined)[];
  /** psql's "(3 rows)" line under the table. */
  footer?: string;
}

/** A number with an optional sign, currency, commas, decimals and short unit: 1,204, $48.2k, 12ms. */
const NUMBER = /^[-+]?[$€£]?\d[\d,]*(\.\d+)?(%|[A-Za-zµ]{1,3})?$/;
/** Cells that hold no value; they never stop a column from counting as numbers. */
const NO_VALUE = /^(-|—|NULL|null|None|NaN|n\/a)?$/;
/** A rule typed under a header: dashes or equals signs, with `|`, `+` or `:` between columns. */
const RULE = /^[\s|+:]*[-=]{3,}[\s|+:=-]*$/;
/** psql's row count under a result. */
export const FOOTER = /^\(\d+ rows?\)$/;

/** A Markdown or psql row's cells: the outer pipes go, and `|` splits the rest. */
const pipeCells = (l: string) => {
  let t = l.trim();
  // Markdown wraps a row in pipes; psql does not, so its blank first or last field keeps its place.
  if (t.length > 1 && t.startsWith('|') && /(?<!\\)\|$/.test(t)) t = t.slice(1, -1);
  return t.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
};

/** A typed rule: dashes or equals signs, or a Markdown row of `---` cells such as `|:-:|--|`. */
const isRule = (l: string) =>
  RULE.test(l) || (l.includes('|') && pipeCells(l).every(c => /^:?-+:?$/.test(c)));

/** Columns a table has: its widest row, and at least one. */
export const tableWidth = (t: Pick<Table, 'rows'>) => Math.max(1, ...t.rows.map(r => r.length));

/**
 * The cells of a table body, by column. When every line holds a `|`, pipes split the cells
 * (Markdown, psql). Otherwise runs of two or more spaces split them when every line gives the
 * same count, and failing that a column break is a run of positions blank in every line. Fewer
 * than two columns: undefined.
 */
export function tableCells(lines: string[]): string[][] | undefined {
  const rows = lines.filter(l => l.trim());
  if (rows.length < 2) return undefined;
  if (rows.every(l => l.includes('|'))) return lines.map(l => (l.trim() ? pipeCells(l) : []));
  const split = rows.map(l => l.trim().split(/ {2,}/));
  if (split[0].length > 1 && split.every(c => c.length === split[0].length))
    return lines.map(l => (l.trim() ? l.trim().split(/ {2,}/) : []));
  const width = Math.max(...rows.map(l => l.length)),
    spans: Array<[number, number]> = [];
  for (let i = 0; i < width; i++) {
    if (rows.every(l => (l[i] ?? ' ') === ' ')) continue;
    const last = spans[spans.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else spans.push([i, i + 1]);
  }
  if (spans.length < 2) return undefined;
  return lines.map(l => (l.trim() ? spans.map(([a, b]) => l.slice(a, b).trim()) : []));
}

/** Right for a column whose cells under the header all hold numbers; left otherwise. */
function autoAlign(rows: string[][], n: number): Align[] {
  const head = rows.findIndex(c => c.length);
  return Array.from({ length: n }, (_, i) => {
    const values = rows.filter((c, j) => j !== head && !NO_VALUE.test(c[i] ?? ''));
    return values.length > 0 && values.every(c => NUMBER.test(c[i])) ? 'right' : 'left';
  });
}

/** How each column draws: its chosen alignment, or the one its cells give. */
export function alignOf(t: Table): Align[] {
  const n = tableWidth(t);
  return autoAlign(t.rows, n).map((a, i) => t.align[i] ?? a);
}

const pad = (s: string, w: number, a: Align) =>
  a === 'right'
    ? s.padStart(w)
    : a === 'center'
      ? s.padStart(s.length + Math.floor((w - s.length) / 2)).padEnd(w)
      : s.padEnd(w);

/** Rows of cells as lines, each column padded to its widest cell, two spaces apart. */
function alignRows(rows: string[][], align: Align[]): string[] {
  const widths = align.map((_, i) => Math.max(...rows.map(c => (c[i] ?? '').length)));
  return rows.map(c =>
    c.length
      ? widths
          .map((w, i) => pad(c[i] ?? '', w, align[i]))
          .join('  ')
          .trimEnd()
      : '',
  );
}

/**
 * Read a table body. A rule typed under the header (`-----`, `|---|---:|`, `----+----`) is
 * dropped, since the drawing has its own; its `:` marks choose the alignment (`---:`, `:---:`).
 * A body with fewer than two columns is one column of its lines, indent and all.
 */
export function readTable(lines: string[]): Table {
  const last = lines.findLastIndex(l => l.trim());
  if (last > 0 && FOOTER.test(lines[last].trim()))
    return { ...readTable(lines.slice(0, last)), footer: lines[last].trim() };
  const first = lines.findIndex(l => l.trim()),
    typed = first >= 0 && isRule(lines[first + 1] ?? '') ? pipeCells(lines[first + 1]) : [],
    body = typed.length ? lines.filter((_, i) => i !== first + 1) : lines,
    piped = body.every(l => !l.trim() || l.includes('|')),
    // psql's rule joins its columns with `+`: every `|` splits, so blank first and last fields
    // keep their places.
    psql = typed.length > 0 && lines[first + 1].includes('+') && piped,
    read = psql
      ? body.map(l => (l.trim() ? l.split(/(?<!\\)\|/).map(c => c.trim()) : []))
      : (tableCells(body) ??
        // A pipe table with a rule is a table even with only its header.
        (typed.length && piped
          ? body.map(l => (l.trim() ? pipeCells(l) : []))
          : body.map(l => (l.trim() ? [l] : [])))),
    n = Math.max(1, ...read.map(c => c.length)),
    // A short row gets empty cells, so every row of cells is as wide as the table.
    rows = read.map(r => (r.length ? Array.from({ length: n }, (_, i) => r[i] ?? '') : r)),
    align = Array.from({ length: n }, (_, i): Align | undefined => {
      const mark = typed.length === n ? typed[i] : '';
      if (mark.startsWith(':') && mark.endsWith(':')) return 'center';
      if (mark.endsWith(':')) return 'right';
      if (mark.startsWith(':')) return 'left';
      return undefined;
    });
  return { rows, align };
}

/**
 * How `table=on` draws a table: its columns two spaces apart, and psql's footer on its own line
 * under it. One column draws its lines as they are.
 */
export function drawTable(t: Table): string[] {
  const out = tableWidth(t) < 2 ? t.rows.map(r => r[0] ?? '') : alignRows(t.rows, alignOf(t));
  return t.footer ? [...out, t.footer] : out;
}

/** `table=on`: a body's lines as the table draws them. */
export const tableLines = (lines: string[]) => drawTable(readTable(lines));

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A table as body text that `readTable` reads back the same. Columns go two spaces apart when
 * that reads back cell for cell and no column has a chosen alignment. Otherwise it is a Markdown
 * table: `|` in a cell escaped, and a `:` mark on each chosen column, so the choice holds when
 * the cells change later. Every row and column stays, so a `range` keeps its lines. The footer is
 * written as it is given.
 */
export function writeTable(t: Table): string[] {
  if (!t.rows.length) return t.footer ? [t.footer] : [];
  const one = tableWidth(t) === 1;
  let rows = t.rows.map(r => (one ? [...r] : r.map(c => c.trim())));
  const n = tableWidth({ rows });
  // A blank line stays a blank line, and a row of empty cells stays a row.
  rows = rows.map(r => (r.length ? Array.from({ length: n }, (_, i) => r[i] ?? '') : []));
  // A chosen alignment is kept even on one column, so it holds if a column is added later.
  const align = Array.from({ length: n }, (_, i) => t.align[i]),
    table: Table = { rows, align, ...(t.footer ? { footer: t.footer } : {}) },
    footer = t.footer ? [t.footer] : [];
  // The header: the first row with cells, after any blank lines.
  const head = rows.findIndex(r => r.length);
  // One column with a chosen alignment: its lines as they are, with a bare rule under the header
  // to hold the choice, so an indent survives.
  if (n === 1 && align[0] && head >= 0) {
    const mark = align[0] === 'center' ? ':---:' : align[0] === 'right' ? '---:' : ':---',
      lines = rows.map(r => r[0] ?? '');
    lines.splice(head + 1, 0, mark);
    if (same(readTable([...lines, ...footer]), table)) return [...lines, ...footer];
  }
  if (align.every(a => !a)) {
    const plain = [
      ...(n === 1 ? rows.map(r => r[0] ?? '') : alignRows(rows, alignOf(table))),
      ...footer,
    ];
    if (same(readTable(plain), table)) return plain;
  }
  // Each pipe column is its widest cell plus a space either side; a chosen column's `:` marks
  // sit at the ends of its rule.
  const drawn = alignOf(table),
    cells = rows.map(r => r.map(c => c.replace(/\|/g, '\\|'))),
    widths = drawn.map((_, i) => Math.max(3, ...cells.map(r => (r[i] ?? '').length))),
    line = (r: string[]) =>
      r.length ? `| ${r.map((c, i) => pad(c, widths[i], drawn[i])).join(' | ')} |` : '',
    rule = widths.map((w, i) =>
      align[i] === 'center'
        ? `:${'-'.repeat(w)}:`
        : align[i] === 'right'
          ? `${'-'.repeat(w + 1)}:`
          : align[i] === 'left'
            ? `:${'-'.repeat(w + 1)}`
            : '-'.repeat(w + 2),
    );
  // The rule goes under the header: the first row with cells, after any blank lines.
  const out = cells.map(line);
  out.splice(Math.max(0, head) + 1, 0, `|${rule.join('|')}|`);
  return [...out, ...footer];
}

/**
 * Cells a spreadsheet copied: tabs between cells and a line per row, with quotes around a cell
 * that holds a tab, a newline or a quote. A tab or newline inside a cell becomes a space.
 */
export function tsvRows(text: string): string[][] {
  const src = text.replace(/\r\n?/g, '\n').replace(/\n$/, ''),
    rows: string[][] = [[]];
  let cell = '',
    quoted = false;
  const end = () => {
    rows[rows.length - 1].push(cell);
    cell = '';
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted && ch === '"' && src[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (quoted && ch === '"') quoted = false;
    // A file expands tabs, so a tab inside a cell would move the columns: it becomes a space.
    else if (quoted) cell += ch === '\n' || ch === '\t' ? ' ' : ch;
    else if (ch === '"' && !cell) quoted = true;
    else if (ch === '\t') end();
    else if (ch === '\n') {
      end();
      rows.push([]);
    } else cell += ch;
  }
  end();
  return rows.map(r => r.map(c => c.trim()));
}

/**
 * A table pasted as text: cells a spreadsheet copied (tabs, the same count on every row), or a
 * Markdown or psql table with its rule. Anything else is not a table: undefined.
 */
export function pastedTable(text: string): Table | undefined {
  const clean = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (clean.includes('\t')) {
    // A row of only tabs is a blank record, and stays.
    const rows = tsvRows(clean);
    if (rows.length > 1 && rows[0].length > 1 && rows.every(r => r.length === rows[0].length))
      return { rows, align: rows[0].map(() => undefined) };
  }
  const lines = clean.split('\n').filter(l => l.trim());
  // A Markdown or psql table: its rule under the header, and a `|` on every other line but a
  // psql footer.
  if (
    lines.length > 1 &&
    isRule(lines[1]) &&
    lines.every((l, i) => i === 1 || l.includes('|') || FOOTER.test(l.trim()))
  )
    // Read with its blank lines, as the file would be, so a `range` counts the same lines.
    return readTable(clean.split('\n'));
  return undefined;
}
