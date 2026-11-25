// Tables read once, drawn from the read, and written back to text that reads the same.
import { describe, expect, it } from 'vitest';
import { codeFromBody } from '../src/model/code';
import {
  pastedTable,
  readTable,
  tableLines,
  writeTable,
  type Align,
  type Table,
} from '../src/model/code-table';
import * as edit from '../src/model/code-table-edit';

/** Every combination of `count` values from `values`, in order. */
function* combos(values: string[], count: number) {
  for (let k = 0; k < values.length ** count; k++)
    yield Array.from(
      { length: count },
      (_, i) => values[Math.floor(k / values.length ** i) % values.length],
    );
}

/** Writing a body's table and reading it back gives the same table, and draws the same. */
function roundTrips(body: string[]) {
  const read = readTable(body),
    saved = writeTable(read);
  expect(readTable(saved), body.join('\n')).toEqual(read);
  expect(tableLines(saved), body.join('\n')).toEqual(tableLines(body));
}

describe('table round trips', () => {
  it('reads back every saved body cell for cell: plain, Markdown, psql and one column', () => {
    const values = ['', 'a', 'New York', '12', 'two  spaces', 'a\\|b', '-3.5%'];
    let checked = 0;
    for (const v of combos(values, 6)) {
      // A table of only blank cells has nothing to keep.
      if (v.every(c => !c)) continue;
      const head = v.slice(0, 3),
        row = v.slice(3);
      roundTrips([`| ${head.join(' | ')} |`, '|---|:--|--:|', `| ${row.join(' | ')} |`]);
      roundTrips([head.join(' | '), '---+---+---', row.join(' | '), '(1 row)']);
      if (!v.some(c => c.includes('  ') || c.includes('|') || !c))
        roundTrips([head.join('  '), row.join('  ')]);
      checked++;
    }
    for (const v of combos(['label', '  indented', '', 'two  spaces', '| pipe'], 4)) {
      if (v.every(c => !c.trim())) continue;
      roundTrips(v);
      checked++;
    }
    // 7⁶ cell sets less the all-blank one, and 5⁴ one-column bodies less the all-blank one.
    expect(checked).toBe(7 ** 6 - 1 + 5 ** 4 - 1);
  }, 60_000);

  it('keeps a chosen alignment as a mark, even where numbers would align the column the same', () => {
    const aligns: (Align | undefined)[] = [undefined, 'left', 'center', 'right'];
    for (const a of aligns)
      for (const b of aligns) {
        const t: Table = {
          rows: [
            ['id', 'amount'],
            ['A', '5'],
          ],
          align: [a, b],
        };
        expect(readTable(writeTable(t)).align).toEqual([a, b]);
      }
  });

  it('keeps blank lines, psql edge fields, a header-only table and an empty table', () => {
    const body = ['id  name', '1   ana', '', '2   bo', '3   cy'];
    expect(writeTable(readTable(body))[2]).toBe('');
    expect(readTable(['id | units | price', '---+-------+------', '   | EUR |   ']).rows).toEqual([
      ['id', 'units', 'price'],
      ['', 'EUR', ''],
    ]);
    expect(readTable(writeTable({ rows: [['id', 'name']], align: [] })).rows).toEqual([
      ['id', 'name'],
    ]);
    expect(writeTable({ rows: [], align: [] })).toEqual([]);
  });

  it('pads ragged rows when read, and keeps a one-column alignment', () => {
    expect(readTable(['|id|qty|', '|--|--|', '|1|']).rows).toEqual([
      ['id', 'qty'],
      ['1', ''],
    ]);
    const one = readTable(['|Amount|', '|---:|', '|4|']);
    expect(one.align).toEqual(['right']);
    expect(readTable(writeTable(one))).toEqual(one);
  });

  it('reads a heredoc once: its text, its cells and the lines they draw', () => {
    const raw = ['| n | ms |', '|---|---:|', '| a | 1 |'],
      code = codeFromBody(raw, true);
    expect(code.body).toBe(raw);
    expect(code.cells?.align).toEqual([undefined, 'right']);
    expect(code.lines).toEqual(tableLines(raw));
  });
});

describe('pasted tables', () => {
  it('reads spreadsheet, Markdown and psql pastes, and nothing else', () => {
    expect(pastedTable('id\tnote\n1\t"a\tb"\n\t\n2\tok\n')?.rows).toEqual([
      ['id', 'note'],
      ['1', 'a b'],
      ['', ''],
      ['2', 'ok'],
    ]);
    expect(pastedTable('id\tplan\n1\t')?.rows).toEqual([
      ['id', 'plan'],
      ['1', ''],
    ]);
    expect(pastedTable('| t | s |\n|---|:-:|\n| a | b |')?.align).toEqual([undefined, 'center']);
    expect(pastedTable('id | plan\n----+------\n1 | pro\n(1 row)')?.footer).toBe('(1 row)');
    expect(pastedTable('| n |\n|---|\n| Ana |\n\n| Bo |')?.rows).toEqual([
      ['n'],
      ['Ana'],
      [],
      ['Bo'],
    ]);
    expect(pastedTable('first step\nsecond step')).toBeUndefined();
    expect(pastedTable('a\tb')).toBeUndefined();
  });
});

describe('table edits', () => {
  const psql = () =>
    edit.openGrid(readTable(['id | name', '---+-----', '1  | Ana', '2  | Bo', '(2 rows)']));

  it('counts psql rows added and deleted, and drops empty rows it added', () => {
    let g = edit.removeRow(psql(), 1);
    expect(edit.gridTable(g).footer).toBe('(1 row)');
    // Tab past the last cell adds a row; leaving it empty adds nothing.
    g = edit.addRow(g);
    expect(edit.gridTable(g)).toEqual(edit.gridTable(edit.removeRow(psql(), 1)));
    g = edit.setCell(g, 2, 0, '3');
    expect(edit.gridTable(g).footer).toBe('(2 rows)');
  });

  it('keeps a chosen alignment when the cells change, and lets other columns follow numbers', () => {
    let g = edit.openGrid(readTable(['id  amount', 'A   NULL']));
    g = edit.setAlign(g, 1, 'left');
    g = edit.setCell(g, 1, 1, '5');
    g = edit.setCell(g, 1, 0, '7');
    const saved = readTable(writeTable(edit.gridTable(g)));
    expect(saved.align).toEqual([undefined, 'left']);
    expect(tableLines(writeTable(edit.gridTable(g)))[1]).toBe(' 7  5');
  });

  it('keeps every body row when a row is inserted above an empty one', () => {
    let g = edit.openGrid(readTable(['id | v', '---+---', '1  | a', '   |  ', '(2 rows)']));
    g = edit.addRow(g, 1);
    g = edit.setCell(g, 1, 0, '0');
    const t = edit.gridTable(g);
    expect(t.rows).toHaveLength(4);
    expect(t.footer).toBe('(3 rows)');
  });

  it('pastes cells from the caret, adding rows, columns and footer rows', () => {
    const g = edit.pasteCells(psql(), 2, 1, [
      ['Cy', 'x'],
      ['Di', 'y'],
    ]);
    expect(g.table.rows).toEqual([
      ['id', 'name', ''],
      ['1', 'Ana', ''],
      ['2', 'Cy', 'x'],
      ['', 'Di', 'y'],
    ]);
    expect(edit.gridTable(g).footer).toBe('(3 rows)');
    expect(edit.setAlign(g, 2, 'center').table.align[2]).toBe('center');
  });
});
