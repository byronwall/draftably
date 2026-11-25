import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { formatSource, parseModel, printSource, readSource } from '../src/dsl/syntax';
import { translateEdit, UnsupportedEdit } from '../src/dsl/translate';
import { resolveAppearance } from '../src/model/appearance';
import {
  CODE_ADVANCE,
  CODE_PAD,
  CODE_TYPE,
  codeLayout,
  pastedTable,
  readTable,
  tableLines,
  writeTable,
  type CodeBlock,
} from '../src/model/code';
import { FACES } from '../src/model/fonts';
import { clone } from '../src/model/geometry';
import type { Diagram } from '../src/model/types';

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, 'fixtures/code', name + '.draft'), 'utf8');

const look = resolveAppearance();
const block = (lines: string[], extra: Partial<CodeBlock> = {}): CodeBlock => ({
  lines,
  wrap: true,
  numbers: false,
  start: 1,
  maxWidth: 960,
  sourceLine: 2,
  ...extra,
});

describe('code node source', () => {
  it('keeps a body byte for byte through format, and lines after it keep their numbers', () => {
    const body = [
      '\t{ "a": "x # not a comment" }  ',
      '  echo "$(date)" \\',
      '',
      '    // still text',
    ];
    const source = [
      'diagram   "t"',
      `node c "c.json" shape=code lang=json <<JS # trailing comment`,
      ...body,
      '  JS  ',
      'node   b "B"',
    ].join('\n');
    const formatted = formatSource(source);
    expect(formatted).toBe(
      ['diagram "t"', 'node c "c.json" shape=code lang=json <<JS # trailing comment', ...body]
        .concat(['  JS  ', 'node b "B"', ''])
        .join('\n'),
    );
    const doc = readSource(source);
    const b = doc.lines.find(l => l.kind === 'statement' && l.args[0]?.value === 'b');
    expect(b && 'line' in b && b.line).toBe(8);
  });

  it('dedents across every line, so a diff keeps its first column, and expands tabs', () => {
    const m = parseModel(
      'node d shape=code lang=diff <<D\n  @@ -1 +1 @@\n  -old\n  +new\n   same\nD\n' +
        'node t shape=code tab=2 <<T\n\tif x:\n\t\ty\nT\n',
    );
    expect(m.objects[0].code!.lines).toEqual(['@@ -1 +1 @@', '-old', '+new', ' same']);
    expect(m.objects[1].code!.lines).toEqual(['if x:', '  y']);
    expect(m.objects[0].code!.sourceLine).toBe(2);
  });

  it('reports a body with no end at its <<TAG line, and bodies on the wrong shapes', () => {
    expect(() => readSource('diagram "t"\nnode c shape=code <<SQL\nselect 1\n')).toThrow(
      /^Line 2: The body opened by <<SQL has no closing line/,
    );
    expect(() => parseModel('node c "C" shape=code')).toThrow(/A code node needs a body/);
    expect(() => parseModel('node c "C" <<X\nx\nX')).toThrow(/Only a code node takes a body/);
    expect(() => parseModel('node c "C" lang=sql')).toThrow(/lang= belongs on a code node/);
    // A body on any other statement would swallow the lines after it.
    expect(() =>
      parseModel('node a "A"\nnode b "B"\nedge e a -> b "x" <<T\nnode c "C"\nT'),
    ).toThrow(/^Line 3: The edge line takes no body/);
  });
});

describe('code layout', () => {
  it('sizes to the longest line with no growth cap, and places columns exactly', () => {
    const line = 'x'.repeat(100),
      laid = codeLayout(block(['  a', line]), '', look);
    expect(laid.w).toBe(Math.ceil(2 * CODE_PAD.x + 100 * CODE_ADVANCE + 0.01));
    expect(laid.rows.map(r => r.col)).toEqual([0, 0]);
    expect(laid.long).toEqual([]);
  });

  it('wraps a long line with a hanging indent, or clips it with wrap=off', () => {
    const line = '    ' + 'word '.repeat(60).trim(),
      wrapped = codeLayout(block([line], { maxWidth: 400 }), '', look);
    expect(wrapped.rows.length).toBeGreaterThan(1);
    expect(wrapped.rows[0].wraps).toBe(true);
    expect(wrapped.rows.slice(1).every(r => r.col === 6)).toBe(true);
    // Every character is drawn exactly once.
    const shown = wrapped.rows.map(r => line.slice(r.from, r.to)).join('');
    expect(shown.replace(/ /g, '')).toBe(line.replace(/ /g, ''));
    const clipped = codeLayout(block([line], { maxWidth: 400, wrap: false }), '', look);
    expect(clipped.rows).toHaveLength(1);
    expect(clipped.rows[0]).toMatchObject({ clipped: true, to: clipped.cols - 1 });
  });

  it('draws no "more lines" row outside a box too short to hold it', () => {
    const laid = codeLayout(block(['a', 'b', 'c']), 'f.sql', look, { height: 20 });
    expect(laid).toMatchObject({ h: 20, rows: [], more: 3, moreShown: false });
    const roomy = codeLayout(block(['a', 'b', 'c']), 'f.sql', look, { height: 80 });
    expect(roomy.moreShown).toBe(true);
    expect(roomy.moreY + 17).toBeLessThanOrEqual(80);
  });

  it('never breaks a line inside its leading indent', () => {
    const line = ' '.repeat(20) + 'x'.repeat(40),
      laid = codeLayout(block([line]), '', look, { width: 200 });
    expect(laid.rows.length).toBeGreaterThan(1);
    for (const r of laid.rows) expect(line.slice(r.from, r.to).trim()).not.toBe('');
  });

  it('clips a fixed height to whole lines and counts the rest', () => {
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i}`),
      laid = codeLayout(block(lines, { numbers: true, start: 98 }), 'f.sql', look, {
        height: 150,
      });
    expect(laid.h).toBe(150);
    expect(laid.more).toBe(30 - laid.rows.length);
    expect(laid.moreY + 17).toBeLessThanOrEqual(150);
    expect(laid.numberCols).toBe(3);
  });
});

describe('code tables', () => {
  it('finds columns from runs of spaces or blank positions, and right-aligns numbers', () => {
    // Ragged gaps of two or more spaces.
    expect(tableLines(['name  cat  count', 'apple   fruit   10', 'bread  bakery  4'])).toEqual([
      'name   cat     count',
      'apple  fruit      10',
      'bread  bakery      4',
    ]);
    // Single spaces in a cell, aligned by hand: blank positions split the columns.
    expect(tableLines(['city     pop', 'New York 8.3', 'Rome     2.8'])).toEqual([
      'city      pop',
      'New York  8.3',
      'Rome      2.8',
    ]);
    // One column is no table: the text stays as it is.
    expect(tableLines(['apples', 'kiwi'])).toEqual(['apples', 'kiwi']);
  });

  it('reads Markdown and psql pastes, drops a typed rule and keeps its alignment marks', () => {
    // `:---` holds a number column left; units and NULL still count as numbers.
    expect(
      tableLines([
        '| id | ms | note |',
        '|:---|---:|------|',
        '| 7 | 12ms | ok |',
        '| 10 | NULL | x |',
      ]),
    ).toEqual(['id    ms  note', '7   12ms  ok', '10  NULL  x']);
    expect(tableLines([' id | plan', '----+------', '  1 | pro', '  2 | free'])).toEqual([
      'id  plan',
      ' 1  pro',
      ' 2  free',
    ]);
    // `:---:` centres; a psql row count stays as its own line, out of the columns.
    expect(tableLines(['| a | b |', '|:-:|---|', '| x | 1 |', '| long | 2 |'])).toEqual([
      ' a    b',
      ' x    1',
      'long  2',
    ]);
    expect(tableLines([' id | n', '----+---', '  1 | 5', '(1 row)'])).toEqual([
      'id  n',
      ' 1  5',
      '(1 row)',
    ]);
    // The old workaround: dashes typed under the header.
    expect(tableLines(['name   n', '-----  --', 'apple  10'])).toEqual(['name    n', 'apple  10']);
  });

  it('draws the rule in a gap under the header, clear of both rows', () => {
    const lh = CODE_TYPE.lineHeight,
      plain = codeLayout(block(['a  b', '1  2', '3  4']), 'q', look),
      laid = codeLayout(block(['a  b', '1  2', '3  4'], { table: true }), 'q', look),
      gap = laid.rows[1].y - laid.rows[0].y - lh;
    expect(plain.rule).toBeUndefined();
    expect(gap).toBeGreaterThan(0);
    expect(laid.rule).toBe(laid.rows[0].y + lh + gap / 2);
    expect(laid.rows[2].y - laid.rows[1].y).toBe(lh);
    expect(laid.h).toBe(plain.h + gap);
    // A box wider than its table: the rule stops at the table's last column.
    const wide = codeLayout(block(['k  v', '1  2'], { table: true }), 'a long caption here', look);
    expect(wide.ruleEnd).toBe(CODE_PAD.x + 4 * CODE_ADVANCE);
    expect(wide.ruleEnd).toBeLessThan(wide.w - CODE_PAD.x);
    // A box too short to show the header draws no rule.
    expect(codeLayout(block(['a', 'b'], { table: true }), 'q', look, { height: 20 }).rule).toBe(
      undefined,
    );
  });

  it('keeps line numbers for ranges, and draws the rule in the SVG', () => {
    const doc = projectScene(
        checkSource(
          [
            'node df "Query result" shape=code table=on <<T',
            'name    cat     count',
            'apple   fruit   10',
            'bread   bakery  4',
            'T',
            'range df.row lines=3',
          ].join('\n'),
        ),
      ),
      node = doc.graph.nodes.find(n => n.id === 'df')!;
    expect(node.code!.lines).toEqual([
      'name   cat     count',
      'apple  fruit      10',
      'bread  bakery      4',
    ]);
    expect(node.code!.ranges![0]).toMatchObject({ from: 2, to: 2 });
    expect(renderSvg(doc)).toContain('class="code-rule"');
  });
});

describe('code nodes in a diagram', () => {
  it('reports long lines, a clipped body and an unknown language', () => {
    const scene = checkSource(
      [
        'node a shape=code lang=cobol <<C',
        'ok',
        'C',
        'node b shape=code max-width=200 <<C',
        'short',
        'x'.repeat(60),
        'C',
        'node c shape=code wrap=off max-width=200 <<C',
        'y'.repeat(60),
        'C',
        'node d shape=code <<C',
        ...Array.from({ length: 20 }, (_, i) => `row ${i}`),
        'C',
        'size d width=200 height=100',
      ].join('\n'),
    );
    const codes = scene.diagnostics.map(d => `${d.code}@${d.line}`);
    expect(codes).toEqual(
      expect.arrayContaining(['code-lang@1', 'code-wrap@6', 'code-clip@9', 'code-clipped@33']),
    );
  });

  it('draws every sample with left-aligned runs at column x, in JetBrains Mono', () => {
    for (const name of ['sql', 'python', 'config', 'shell', 'diff']) {
      const doc = projectScene(checkSource(fixture(name))),
        svg = renderSvg(doc);
      expect(svg).not.toContain('xml:space');
      expect(svg).toContain(`font-family:'${FACES['mono-500'].family}'`);
      expect(svg).toMatch(/<tspan x="[\d.]+" y="[\d.]+"(?: fill="#\w+")?>/);
    }
    const doc = projectScene(checkSource(fixture('diff'))),
      r = doc.layout.nodes.fix,
      svg = renderSvg(doc);
    // ` same`-style lines keep their first column: `+` sits in column 0 at the left padding.
    expect(svg).toContain(`<tspan x="${r.x + CODE_PAD.x}" `);
  });

  it('keeps the body when the editor moves or renames a code node', () => {
    const source = fixture('config'),
      scene = checkSource(source),
      before = projectScene(scene),
      run = (fn: (d: Diagram) => void) => {
        const after = clone(before);
        fn(after);
        return printSource(
          translateEdit({
            source: readSource(source),
            scene,
            before,
            after,
            label: 'Edit',
            selection: ['yaml'],
          }).source,
        );
      };
    const renamed = run(d => (d.graph.nodes.find(n => n.id === 'yaml')!.title = 'values.yaml'));
    expect(renamed).toContain('node yaml "values.yaml" shape=code lang=yaml <<YAML\n  service:');
    expect(checkSource(renamed).byId.get('yaml')!.code!.lines).toEqual(
      scene.byId.get('yaml')!.code!.lines,
    );
    expect(() => run(d => (d.styles.yaml.shape = 'box'))).toThrow(UnsupportedEdit);
  });
});

describe('editing code tables', () => {
  const bodies = {
    ragged: ['name  cat  count', 'apple   fruit   10', 'bread  bakery  4'],
    blanks: [
      'user     last_login   orders',
      'ana      2026-11-02       12',
      'bo                         0',
    ],
    markdown: ['| tier | status | cost |', '|------|:------:|-----:|', '| pro  | ok     | $12  |'],
    psql: [' id | plan  | seats', '----+-------+-------', '  1 | pro   |    12', '(1 row)'],
    oneColumn: ['name', 'ana', 'bo'],
    indented: ['label', '  indentation'],
  };

  it('writes back a table that draws the same, for every kind of body', () => {
    for (const [name, body] of Object.entries(bodies))
      expect(tableLines(writeTable(readTable(body))), name).toEqual(tableLines(body));
  });

  it('reads back every saved table cell for cell, whatever the cells hold', () => {
    // Every two-line, three-column Markdown table from these cells: blanks, spaces, pipes, numbers.
    const values = ['', 'a', 'New York', '12', 'two  spaces', 'a\\|b'],
      row = (cells: string[]) => `| ${cells.join(' | ')} |`;
    let checked = 0;
    for (let k = 0; k < values.length ** 6; k++) {
      const v = Array.from(
        { length: 6 },
        (_, i) => values[Math.floor(k / values.length ** i) % values.length],
      );
      const body = [row(v.slice(0, 3)), '|---|---|---|', row(v.slice(3))],
        saved = writeTable(readTable(body));
      // A table of only blank cells has nothing to keep.
      if (v.every(c => !c)) continue;
      expect(tableLines(saved), body.join('\n')).toEqual(tableLines(body));
      checked++;
    }
    expect(checked).toBe(46655);
  });

  it('keeps a blank line inside a table, so a range keeps its rows', () => {
    const body = ['id  name', '1   ana', '', '2   bo', '3   cy'],
      saved = writeTable(readTable(body));
    expect(saved[2]).toBe('');
    expect(tableLines(saved)).toEqual(tableLines(body));
  });

  it('keeps a chosen alignment, drops empty columns, and recounts a psql footer', () => {
    const t = readTable(bodies.psql);
    t.rows.push(['2', 'free', '1']);
    t.rows = t.rows.map(r => [...r, '']);
    t.align = ['left', 'center', 'right', 'left'];
    const lines = writeTable(t);
    expect(lines[1]).toMatch(/^\|:-+\|:-+:\|-+:\|$/);
    expect(lines.at(-1)).toBe('(2 rows)');
    expect(readTable(lines)).toEqual({
      rows: [
        ['id', 'plan', 'seats'],
        ['1', 'pro', '12'],
        ['2', 'free', '1'],
      ],
      align: ['left', 'center', 'right'],
      footer: '(2 rows)',
    });
  });

  it('reads spreadsheet and Markdown pastes as tables, and nothing else', () => {
    expect(pastedTable('id\tms\n1\t12\n2\t7\n')).toEqual({
      rows: [
        ['id', 'ms'],
        ['1', '12'],
        ['2', '7'],
      ],
      align: ['right', 'right'],
    });
    expect(pastedTable(bodies.markdown.join('\n'))?.align).toEqual(['left', 'center', 'right']);
    expect(pastedTable('id | plan\n----+------\n1 | pro\n(1 row)')?.footer).toBe('(1 row)');
    expect(pastedTable('id\tplan\n1\t')?.rows).toEqual([
      ['id', 'plan'],
      ['1', ''],
    ]);
    expect(pastedTable('first step\nsecond step')).toBeUndefined();
    expect(pastedTable('a\tb')).toBeUndefined();
  });

  it('saves an edited body and the table setting to the source, and only those', () => {
    const save = (
      source: string,
      edit: (code: CodeBlock, node: Diagram['graph']['nodes'][0]) => void,
    ) => {
      const scene = checkSource(source),
        before = projectScene(scene),
        after = clone(before),
        node = after.graph.nodes[0];
      edit(node.code!, node);
      return printSource(
        translateEdit({
          source: readSource(source),
          scene,
          before,
          after,
          label: 'Edit',
          selection: [],
        }).source,
      );
    };
    // A pasted table, turned on.
    const pasted = writeTable(pastedTable('id\tms\n1\t12\n2\t7')!);
    expect(
      save('node q "Result" shape=code <<SQL\nid  ms\n1   12\nSQL\n', c => {
        c.table = true;
        c.body = pasted;
      }),
    ).toBe('node q "Result" shape=code table=on <<SQL\nid  ms\n 1  12\n 2   7\nSQL\n');
    // Table off: the body the text box showed is written, though the drawn lines match it.
    const md = 'node t shape=code table=on <<T\n|id|name|\n|---|---|\n|1|ana|\nT\n';
    expect(
      save(md, c => {
        delete c.table;
        c.body = ['id  name', ' 1  ana'];
      }),
    ).toBe('node t shape=code <<T\nid  name\n 1  ana\nT\n');
    // A caption edit alone leaves the body, its tabs and the tab width as they are.
    const tabbed = 'node c "a" shape=code tab=8 <<C\nx\n\ty\nC\n';
    expect(save(tabbed, (_, n) => (n.title = 'b'))).toBe(tabbed.replace('"a"', '"b"'));
    // A file's lines are never written over.
    const file = 'node f shape=code src="a.sql"\n',
      fileScene = checkSource(file, { 'a.sql': { text: 'x\n' } }),
      was = projectScene(fileScene),
      edited = clone(was);
    edited.graph.nodes[0].code = { ...edited.graph.nodes[0].code!, body: ['y'] };
    expect(() =>
      translateEdit({
        source: readSource(file),
        scene: fileScene,
        before: was,
        after: edited,
        label: 'Edit',
        selection: [],
      }),
    ).toThrow(UnsupportedEdit);
  });
});
