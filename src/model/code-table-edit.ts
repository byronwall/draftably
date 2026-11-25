/**
 * The Editor's table edits, as pure functions on one `Grid`: each takes a grid and returns the
 * next. The grid editor holds a single `Grid` value, so its rows, alignments and footer never
 * drift apart, and these rules are tested without a browser.
 */
import { FOOTER, tableWidth, type Align, type Table } from './code-table';

export interface Grid {
  table: Table;
  /**
   * Rows the body had when the grid opened, less those deleted. Empty rows past these are rows
   * the editor added and nobody filled: `gridTable` drops them.
   */
  kept: number;
  /** Columns the body had; empty columns past these were added and are dropped too. */
  cols: number;
}

export const openGrid = (table: Table): Grid => ({
  table,
  kept: table.rows.length,
  cols: tableWidth(table),
});

/** psql's "(N rows)" with `delta` rows more; any other footer, or none, as it is. */
function recount(footer: string | undefined, delta: number) {
  if (!footer || !delta || !FOOTER.test(footer)) return footer;
  const n = Math.max(0, Number(/\d+/.exec(footer)![0]) + delta);
  return `(${n} row${n === 1 ? '' : 's'})`;
}

/** The grid with its table's fields changed; the footer changes by `rows` rows. */
const next = (g: Grid, t: Partial<Table>, rows = 0, kept = g.kept): Grid => {
  const footer = recount(g.table.footer, rows);
  return { ...g, kept, table: { ...g.table, ...t, ...(footer ? { footer } : {}) } };
};

export function setCell(g: Grid, r: number, c: number, value: string): Grid {
  const rows = g.table.rows.map(row => [...row]);
  while (rows.length <= r) rows.push([]);
  while (rows[r].length <= c) rows[r].push('');
  rows[r][c] = value;
  return next(g, { rows });
}

/** An empty row at `at`, as wide as the table. */
export function addRow(g: Grid, at = g.table.rows.length): Grid {
  const rows = g.table.rows;
  return next(
    g,
    {
      rows: [...rows.slice(0, at), Array<string>(tableWidth(g.table)).fill(''), ...rows.slice(at)],
    },
    1,
    // A row inserted among the body's rows pushes them on: they all stay.
    at < g.kept ? g.kept + 1 : g.kept,
  );
}

/** An empty column at `at`, following its cells' alignment. A blank line stays blank. */
export function addColumn(g: Grid, at = tableWidth(g.table)): Grid {
  const { rows, align } = g.table,
    out = next(g, {
      rows: rows.map(row => (row.length ? [...row.slice(0, at), '', ...row.slice(at)] : row)),
      align: [...align.slice(0, at), undefined, ...align.slice(at)],
    });
  // A column inserted among the body's columns pushes them on: they all stay.
  return at < g.cols ? { ...out, cols: g.cols + 1 } : out;
}

/** Delete row `r`; the header stays. */
export function removeRow(g: Grid, r: number): Grid {
  if (r === 0 || g.table.rows.length < 2) return g;
  return next(
    g,
    { rows: g.table.rows.filter((_, i) => i !== r) },
    -1,
    r < g.kept ? g.kept - 1 : g.kept,
  );
}

/** Delete column `c`; a table keeps at least one. */
export function removeColumn(g: Grid, c: number): Grid {
  if (tableWidth(g.table) < 2) return g;
  const out = next(g, {
    rows: g.table.rows.map(row => row.filter((_, i) => i !== c)),
    align: g.table.align.filter((_, i) => i !== c),
  });
  return c < g.cols ? { ...out, cols: g.cols - 1 } : out;
}

/** Choose column `c`'s alignment. It holds when the column's cells change later. */
export function setAlign(g: Grid, c: number, a: Align): Grid {
  const align = Array.from({ length: tableWidth(g.table) }, (_, i) => g.table.align[i]);
  align[c] = a;
  return next(g, { align });
}

/** Pasted cells, filled in from row `r`, column `c`, adding the rows and columns they need. */
export function pasteCells(g: Grid, r: number, c: number, cells: string[][]): Grid {
  const rows = g.table.rows.map(row => [...row]),
    n = Math.max(tableWidth(g.table), c + Math.max(...cells.map(x => x.length)));
  const added = Math.max(0, r + cells.length - rows.length);
  cells.forEach((line, i) => {
    while (rows.length <= r + i) rows.push([]);
    line.forEach((v, j) => (rows[r + i][c + j] = v.trim()));
  });
  return next(
    g,
    {
      rows: rows.map(row => (row.length ? Array.from({ length: n }, (_, j) => row[j] ?? '') : row)),
      align: Array.from({ length: n }, (_, j) => g.table.align[j]),
    },
    added,
  );
}

/** The grid as the table to write: without the empty rows and columns the editor added. */
export function gridTable(g: Grid): Table {
  let rows = [...g.table.rows],
    n = tableWidth(g.table),
    dropped = 0;
  while (rows.length > Math.max(1, g.kept) && !rows[rows.length - 1].some(c => c.trim())) {
    rows.pop();
    dropped++;
  }
  while (n > Math.max(1, g.cols) && rows.every(r => !r[n - 1]?.trim()) && !g.table.align[n - 1])
    n--;
  rows = rows.map(r => (r.length > n ? r.slice(0, n) : r));
  return next(g, { rows, align: g.table.align.slice(0, n) }, -dropped).table;
}
