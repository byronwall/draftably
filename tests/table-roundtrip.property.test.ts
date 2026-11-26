// Generated tables survive every way a table enters or leaves a body: saved and read back, copied
// from a spreadsheet, and edited cell by cell. Fixed cases live in code-table.test.ts; this file
// draws thousands of tables from a seeded generator, so a new cell shape is covered by default.
import { describe, expect, it } from 'vitest';
import {
  pastedTable,
  readTable,
  writeTable,
  type Align,
  type Table,
} from '../src/model/code-table';
import * as edit from '../src/model/code-table-edit';

/** A small seeded generator, so a failure names the seed that reproduces it. */
function rng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
  };
}

// Cells that past reviews broke: blanks, runs of spaces, pipes, rule-like and footer-like text,
// alignment colons, signed numbers and SQL nulls.
const CELLS = [
  '',
  'a',
  'New York',
  'two  spaces',
  'a|b',
  '---',
  ':--',
  '-',
  '+',
  '(1 row)',
  '12',
  '-3.5%',
  '1,024',
  'NULL',
  'x:y',
  '| lead',
  'end |',
] as const;
const ALIGNS: (Align | undefined)[] = [undefined, undefined, 'left', 'center', 'right'];

type Gen = ReturnType<typeof rng>;

/** A table as the editor holds it: trimmed cells, rows as wide as the table, blank rows empty. */
function genTable(r: Gen): Table {
  const cols = 2 + r.int(4),
    count = 1 + r.int(6),
    rows: string[][] = [];
  for (let i = 0; i < count; i++)
    rows.push(
      // A blank line in the body, but never the header.
      i > 0 && r.chance(0.1) ? [] : Array.from({ length: cols }, () => r.pick(CELLS)),
    );
  // The header row needs one cell with text, or there is no table to keep.
  if (rows[0].every(c => !c)) rows[0][0] = 'id';
  const align = Array.from({ length: cols }, () => r.pick(ALIGNS));
  return { rows, align, ...(r.chance(0.2) ? { footer: `(${count - 1} rows)` } : {}) };
}

/** What a table holds that a reader can see: its cells, blank rows, footer and chosen marks. */
const held = (t: Table) => ({
  rows: t.rows,
  align: t.align.map(a => a ?? null),
  footer: t.footer ?? null,
});

/** The cells as a spreadsheet copies them: tabs between cells, quotes around special cells. */
const tsv = (rows: string[][]) =>
  rows
    .map(row =>
      row
        .map(c => (/[\t\n"]/.test(c) || c.startsWith('"') ? `"${c.replace(/"/g, '""')}"` : c))
        .join('\t'),
    )
    .join('\n');

const SEEDS = 3000;

describe('generated tables', () => {
  it('read back cell for cell after a save, with blank rows, footer and chosen alignment', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const t = genTable(rng(seed)),
        saved = writeTable(t);
      expect(held(readTable(saved)), `seed ${seed}\n${saved.join('\n')}`).toEqual(held(t));
      // A second save writes the same text: saving is stable.
      expect(writeTable(readTable(saved)), `seed ${seed}`).toEqual(saved);
    }
  });

  it('paste from a spreadsheet as the cells that were copied, blank records included', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = rng(seed),
        t = genTable(r),
        width = t.rows[0].length,
        // A spreadsheet copies a blank record as a row of tabs, never as an empty line.
        rows = t.rows.map(row => (row.length ? row : Array.from({ length: width }, () => '')));
      // One copied row is text, not a table.
      if (rows.length < 2) continue;
      // A cell may hold a tab or a quote; the paste turns a tab into a space.
      if (r.chance(0.3)) rows[rows.length - 1][0] = r.pick(['a\tb', 'say "hi"', '"quoted"']);
      const text = tsv(rows) + (r.chance(0.5) ? '\r\n' : '');
      const want = rows.map(row => row.map(c => c.replace(/\t/g, ' ').trim()));
      expect(pastedTable(text)?.rows, `seed ${seed}\n${JSON.stringify(text)}`).toEqual(want);
    }
  });

  it('change only the cells an edit names, and every edit saves to text that reads back', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = rng(seed),
        t = genTable(r);
      let g = edit.openGrid(t);
      const width = t.rows[0].length;
      for (let step = 0; step < 4; step++) {
        const before = edit.gridTable(g),
          n = before.rows.length,
          row = r.int(n),
          col = r.int(width);
        const kind = r.pick(['set', 'addRow', 'removeRow', 'align'] as const);
        if (kind === 'set' && before.rows[row].length) {
          const value = r.pick(CELLS);
          g = edit.setCell(g, row, col, value);
          const after = edit.gridTable(g);
          // Every other cell keeps its value.
          after.rows.forEach((cells, i) =>
            cells.forEach((c, j) => {
              if (i !== row || j !== col)
                expect(c, `seed ${seed} ${i},${j}`).toBe(before.rows[i][j]);
            }),
          );
        } else if (kind === 'addRow') {
          g = edit.addRow(g, row);
          // An added row nobody fills is dropped on save; every other row stays, in order.
          expect(
            edit.gridTable(g).rows.filter(c => c.some(Boolean)),
            `seed ${seed}`,
          ).toEqual(before.rows.filter(c => c.some(Boolean)));
        } else if (kind === 'removeRow' && n > 1 && row > 0) {
          g = edit.removeRow(g, row);
          const after = edit.gridTable(g);
          expect(after.rows, `seed ${seed}`).toEqual(before.rows.filter((_, i) => i !== row));
        } else if (kind === 'align') {
          g = edit.setAlign(g, col, r.pick(['left', 'center', 'right'] as const));
        }
        const saved = writeTable(edit.gridTable(g));
        expect(writeTable(readTable(saved)), `seed ${seed} step ${step}`).toEqual(saved);
      }
    }
  });
});
