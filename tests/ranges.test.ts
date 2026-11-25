import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { canonicalGeometry, projectScene } from '../src/dsl/project';
import { resolveAppearance } from '../src/model/appearance';
import { CODE_TYPE, codeLayout, columnX } from '../src/model/code';
import { placeNotes } from '../src/model/note';
import { rangeBand, rangeMarks, rangePort, rangeRect } from '../src/model/ranges';
import { withState } from '../src/model/status';
import { visibleRects } from '../src/dsl/project';
import { nestedQuantifier, printSource, readSource } from '../src/dsl/syntax';
import { translateEdit } from '../src/dsl/translate';
import * as edits from '../src/model/edits';
import { clone } from '../src/model/geometry';
import type { Diagram, Rect } from '../src/model/types';

/** Apply an editor edit and return the source it writes, compiled again to prove it parses. */
function edit(source: string, fn: (d: Diagram) => void) {
  const scene = checkSource(source),
    before = projectScene(scene),
    after = clone(before);
  fn(after);
  const result = translateEdit({
    source: readSource(source),
    scene,
    before,
    after,
    label: 'edit',
    selection: [],
  });
  const text = printSource(result.source);
  return { text, scene: checkSource(text) };
}

const fixture = readFileSync(path.join(__dirname, 'fixtures/code/ranges.draft'), 'utf8');

const code = (extra = '') =>
  [
    'diagram "t"',
    'node a "A"',
    'node sql shape=code lang=sql start=10 <<SQL',
    '  SELECT 1',
    '  FROM t',
    '  JOIN u ON u.id = t.id',
    '  JOIN u ON u.x = t.x',
    'SQL',
    extra,
  ].join('\n');

describe('code ranges', () => {
  it('without labels, never move a box or a line: geometry matches the file without them', () => {
    const unlabeled = fixture.replace(/^(range .*?) "[^"]*"$/gm, '$1');
    const bare = fixture
      .split('\n')
      .filter(l => !l.startsWith('range '))
      .join('\n')
      // The note and edge then name the node instead of its ranges.
      .replace(/sql\.copy\d/g, 'sql');
    const doc = projectScene(checkSource(unlabeled)),
      plain = projectScene(checkSource(bare));
    expect(canonicalGeometry(doc).nodes).toEqual(canonicalGeometry(plain).nodes);
    // Ranges alone, with nothing pointing at them, change no route either.
    const only = bare.replace(/^(note|edge) .*$/gm, ''),
      withRanges =
        only +
        '\n' +
        unlabeled
          .split('\n')
          .filter(l => l.startsWith('range '))
          .join('\n');
    expect(canonicalGeometry(projectScene(checkSource(withRanges)))).toEqual(
      canonicalGeometry(projectScene(checkSource(only))),
    );
  });

  it('end an edge on the left or right side, level with the range label or its middle line', () => {
    for (const source of [fixture, fixture.replace(/^(range .*?) "[^"]*"$/gm, '$1')]) {
      const doc = projectScene(checkSource(source)),
        { rects } = visibleRects(doc),
        look = resolveAppearance(doc.appearance),
        node = doc.graph.nodes.find(n => n.id === 'sql')!,
        sql = rects.get('sql')!,
        laid = codeLayout(node.code!, node.title, look, { width: sql.w, height: sql.h }),
        range = node.code!.ranges!.find(r => r.name === 'copy1')!,
        route = canonicalGeometry(doc).routes.find(r => r.id === 'e1')!,
        end = route.points[route.points.length - 1];
      expect([sql.x, sql.x + sql.w]).toContain(end.x);
      expect(Math.abs(end.y - (sql.y + rangePort(node.code!, laid, look, range)!))).toBeLessThan(1);
    }
  });

  it('place a note beside its range', () => {
    const doc = projectScene(checkSource(fixture)),
      { rects } = visibleRects(doc),
      look = resolveAppearance(doc.appearance),
      range = rangeRect(doc, look, rects, 'sql.copy2')!,
      [note] = placeNotes(doc, look, rects, []);
    expect(note.rect.x).toBeGreaterThan(range.x + range.w);
    expect(note.rect.y).toBeLessThanOrEqual(range.y + range.h);
    expect(note.rect.y + note.rect.h).toBeGreaterThanOrEqual(range.y);
  });

  it('count lines=a-b from start= and match= from the first hit', () => {
    const scene = checkSource(
      code('range sql.from lines=11-12 color=red "from"\nrange sql.join match="JOIN u" span=2'),
    );
    expect(scene.byId.get('sql')!.code!.ranges).toEqual([
      { name: 'from', from: 1, to: 2, color: 'red', label: 'from' },
      { name: 'join', from: 2, to: 3, color: 'amber' },
    ]);
    expect(scene.diagnostics.find(d => d.code === 'range-match')?.message).toMatch(
      /matches 2 lines of sql \(12, 13\)/,
    );
    const laid = codeLayout(scene.byId.get('sql')!.code!, '', resolveAppearance(), {});
    expect(rangeBand(laid, scene.byId.get('sql')!.code!.ranges![0])!.h).toBe(2 * 17);
  });

  it.each([
    ['range sql.x lines=12-14', /runs to line 14, past sql's last line, 13/],
    ['range sql.x lines=9-10', /starts at line 9, before sql's first line, 10/],
    ['range sql.x match="nothing"', /matches no line of sql/],
    ['range sql.x match="JOIN" span=3', /runs past sql's last line/],
    ['range a.x lines=1-1', /a is not a code node/],
    ['range b.x lines=1-1', /Unknown node b in range b.x/],
    ['range sql.x lines=10-10\nedge e a -> sql.y', /Unknown range sql\.y: sql has x/],
    ['note "n" near=sql.y', /Unknown range sql\.y: sql has no ranges/],
    ['state s "S" sql.y', /Unknown range sql\.y.*in state s/],
    ['range sql.x lines=10-10\nedge e a -> sql.x to=top', /left or right side/],
    ['range sql.x lines=10-10 color=nope', /Unknown color nope/],
    ['range sql.x match="^(a+)+$"', /repeats a group that repeats inside/],
    ['range sql.x match="(x*)*"', /repeats a group that repeats inside/],
  ])('check reports %s', (line, message) => {
    expect(() => checkSource(code(line))).toThrow(message);
  });

  it('fade the other ranges of a node when a state lists one, and draw the same in SVG', () => {
    const source =
      code('range sql.a lines=10-10 "a"\nrange sql.b lines=12-13 color=blue "b"') +
      '\nstate s "S" sql.b';
    const doc = projectScene(checkSource(source)),
      drawn = withState(doc, 's'),
      ranges = drawn.graph.nodes.find(n => n.id === 'sql')!.code!.ranges!;
    expect(ranges.map(r => r.spot)).toEqual(['dim', 'focus']);
    expect(drawn.styles.a?.spot).toBe('dim');
    const svg = renderSvg(drawn);
    expect(svg.match(/class="code-range"/g)).toHaveLength(2);
    expect(svg).toContain('class="code-range" opacity="0.35"');
  });

  it('go with their node when it is deleted, with every line that names them', () => {
    const source = code(
      [
        'node sql.x "Not a range"',
        'range sql.copy1 lines=10-11 "c"',
        'note "n" near=sql.copy1',
        'state s1 "S" sql.copy1 a',
        'state s2 "T" sql.x',
        'edge e1 a -> sql.copy1',
      ].join('\n'),
    );
    const { text } = edit(source, d => edits.deleteObjects(d, ['sql']));
    expect(text).not.toMatch(/sql\.copy1|^range|^edge/m);
    expect(text).toMatch(/^note "n"$/m);
    expect(text).toMatch(/^state s1 "S" a$/m);
    // A node whose ID only starts with `sql.` stays, and so does its state.
    expect(text).toMatch(/^node sql\.x "Not a range"$/m);
    expect(text).toMatch(/^state s2 "T" sql\.x$/m);
  });

  it('stay on the original target when a step is inserted on a line to a range', () => {
    const source = code('range sql.copy1 lines=10-11 "c"\nedge e1 a -> sql.copy1');
    const { text, scene } = edit(source, d => {
      edits.insertStep(d, 'e1', undefined, { x: 0, y: 0 });
    });
    const lines = text.split('\n').filter(l => l.startsWith('edge '));
    expect(lines).toHaveLength(2);
    expect(lines.find(l => l.startsWith('edge e1 '))).toMatch(/^edge e1 a -> new-step$/);
    expect(lines.find(l => !l.startsWith('edge e1 '))).toMatch(/ new-step -> sql\.copy1$/);
    expect(scene.edges.map(e => [e.fromRange, e.toRange])).toEqual([
      [undefined, undefined],
      [undefined, 'copy1'],
    ]);
  });

  it('refuse only nested quantifiers in match=', () => {
    expect(['(a+)+', '(a*)*', '((ab)+)+', '(a+){2,}', '(?:x+y)*'].map(nestedQuantifier)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(
      ['COUNT\\(\\*\\)', '(ab)+', 'a+b*', '[(+)]+', 'SUM\\(I\\.QTY\\) AS Q'].map(nestedQuantifier),
    ).toEqual([false, false, false, false, false]);
  });

  it('take a change mark', () => {
    const doc = projectScene(checkSource(code('~range sql.a lines=11-11 "changed"')));
    expect(doc.graph.nodes.find(n => n.id === 'sql')!.code!.ranges![0].status).toBe('changed');
  });
});

/** The ranges' marks of a diagram's one code node, with its layout and every route. */
function marks(source: string) {
  const doc = projectScene(checkSource(source)),
    look = resolveAppearance(doc.appearance),
    { rects } = visibleRects(doc),
    node = doc.graph.nodes.find(n => n.code)!,
    r = rects.get(node.id)!,
    laid = codeLayout(node.code!, node.title, look, { width: r.w, height: r.h }),
    routes = canonicalGeometry(doc).routes,
    textRight = Math.max(...laid.rows.map(row => columnX(laid, row.col + row.to - row.from))),
    all = rangeMarks(node.code!, laid, look, '#fff');
  return { doc, r, laid, routes, textRight, marks: all, tags: all.flatMap(m => m.tag ?? []) };
}

const listing = (lines: string[], ranges: string[], attrs = '') =>
  [`node sql "q" shape=code numbers=on${attrs} <<SQL`, ...lines, 'SQL', ...ranges].join('\n');

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('range labels', () => {
  const lines = ["WHERE status = 'open' AND region = 'north'", 'ORDER BY total', 'x'];

  it('sit outside the drawn box on a leader, in one column, whatever the label or line', () => {
    for (const label of ['x', 'the slow row', 'a much longer label for this range'])
      for (const line of [1, 2, 3]) {
        const m = marks(listing(lines, [`range sql.a lines=${line} "${label}"`])),
          [tag] = m.tags,
          lead = m.marks[0].leader!;
        expect(tag.x).toBe(m.laid.tags!.x);
        expect(tag.x).toBeGreaterThan(m.laid.frame);
        // The node's layout box holds the label, so layouts, routes and bounds count it.
        expect(tag.x + tag.w).toBeLessThanOrEqual(m.r.w);
        // The dot is inside the drawn box; the label sits just above its leader.
        expect(lead.x1).toBeLessThanOrEqual(m.laid.frame);
        expect(tag.y + tag.h).toBeLessThanOrEqual(lead.y + 1);
      }
  });

  it('with labels=inside, sit in a column right of every row of code', () => {
    for (const label of ['x', 'a much longer label for this range']) {
      const m = marks(listing(lines, [`range sql.a lines=1 "${label}"`], ' labels=inside'));
      expect(m.laid.frame).toBe(m.r.w);
      expect(m.tags[0].x).toBeGreaterThanOrEqual(m.textRight);
      expect(m.marks[0].leader).toBeUndefined();
    }
    const narrow = marks(
      listing(
        lines,
        ['range sql.a lines=1 "the slow row"', 'size sql width=220 height=240'],
        ' labels=inside',
      ),
    );
    expect(narrow.laid.long.length).toBeGreaterThan(0);
    // A width too narrow for the code and the column keeps the code clear of the label.
    const tight = marks(
      listing(
        ['SELECT name'],
        ['range sql.a lines=1 "projection"', 'size sql width=85 height=auto'],
        ' labels=inside',
      ),
    );
    expect(tight.tags[0].x).toBeGreaterThanOrEqual(tight.textRight);
    expect(narrow.tags[0].x).toBeGreaterThanOrEqual(narrow.textRight);
  });

  it('of ranges on next-door or shared rows never overlap', () => {
    for (const attrs of ['', ' labels=inside']) {
      const next = marks(
        listing(
          ['SELECT a', 'FROM t', 'WHERE x', 'ORDER BY a'],
          ['range sql.a lines=2 "first"', 'range sql.b lines=3 color=red "second"'],
          attrs,
        ),
      ).tags;
      expect(next[0].x).toBe(next[1].x);
      expect(overlap(next[0], next[1])).toBe(false);
      const same = marks(
        listing(
          ['SELECT a', 'FROM t', 'WHERE x'],
          ['range sql.a lines=2 "first"', 'range sql.b lines=2 color=red "second"'],
          attrs,
        ),
      ).tags;
      expect(overlap(same[0], same[1])).toBe(false);
    }
  });

  it('truncate a long label and keep the box a sane width', () => {
    const long = 'this label goes on and on far past what any margin column should hold',
      short = marks(listing(['SELECT a'], ['range sql.a lines=1 "slow"'])),
      m = marks(listing(['SELECT a'], [`range sql.a lines=1 "${long}"`]));
    expect(m.tags[0].text.endsWith('…')).toBe(true);
    expect(m.tags[0].x + m.tags[0].w).toBeLessThanOrEqual(m.r.w);
    expect(m.r.w - short.r.w).toBeLessThanOrEqual(180);
  });

  it('share a leader with the lines that leave their ranges, and no line crosses a label', () => {
    const source = readFileSync(path.join(__dirname, 'fixtures/code/range-leaders.draft'), 'utf8'),
      m = marks(source),
      // The label's text: its tag down to just above the leader a line may run along.
      abs = (t: Rect) => ({ ...t, x: m.r.x + t.x, y: m.r.y + t.y, h: t.h - 2 });
    expect(m.tags).toHaveLength(5);
    for (let i = 0; i < m.tags.length; i++)
      for (let j = i + 1; j < m.tags.length; j++) expect(overlap(m.tags[i], m.tags[j])).toBe(false);
    for (const mark of m.marks) {
      const e = m.doc.graph.edges.find(x => x.fromRange === mark.range.name)!,
        start = m.routes.find(x => x.id === e.id)!.points[0];
      // The line leaves the drawn box level with the range's leader.
      expect([m.r.x, m.r.x + m.laid.frame]).toContain(start.x);
      expect(start.y).toBeCloseTo(m.r.y + mark.leader!.y, 0);
    }
    // No route runs through a label, and the line to the whole node keeps off the label side.
    for (const route of m.routes)
      for (const [a, b] of route.points.slice(1).map((p, i) => [route.points[i], p]))
        for (const t of m.tags) {
          const seg = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(a.x - b.x) || 0.01,
            h: Math.abs(a.y - b.y) || 0.01,
          };
          expect(overlap(seg, abs(t)), `${route.id} crosses ${t.text}`).toBe(false);
        }
    const into = m.routes.find(x => x.id === 'e0')!.points.at(-1)!;
    expect(into.x).toBeLessThan(m.r.x + m.laid.frame);
  });

  it('keep a moved label tied to its range: the dot stays on the line, the leader bends', () => {
    for (const lines of [
      ['ABCD', 'EFGH'],
      ['ABCD', 'EFGH', 'IJKL'],
    ]) {
      const last = lines.length,
        m = marks(
          listing(lines, [
            `range sql.a lines=${last} "first"`,
            `range sql.b lines=${last} color=red "second"`,
          ]),
        ),
        row = m.laid.rows[last - 1];
      expect(overlap(m.tags[0], m.tags[1])).toBe(false);
      for (const mark of m.marks) {
        // Both dots sit on the range's own line, whatever row the label took.
        expect(mark.leader!.y1).toBeGreaterThan(row.y);
        expect(mark.leader!.y1).toBeLessThan(row.y + CODE_TYPE.lineHeight);
      }
    }
  });

  it('lay out again at their own width without change, and never squeeze the box under the code', () => {
    const look = resolveAppearance(projectScene(checkSource('node a "A"')).appearance);
    for (const source of [
      listing(['ABCD', 'EFGH'], ['range sql.a lines=1 "check"']),
      listing(lines, ['range sql.a lines=1 "x"']),
      listing(lines, ['range sql.a lines=1 "a much longer label for this range"']),
    ]) {
      const node = projectScene(checkSource(source)).graph.nodes.find(n => n.code)!,
        first = codeLayout(node.code!, node.title, look),
        again = codeLayout(node.code!, node.title, look, { width: first.w, height: first.h });
      expect(again.frame).toBe(first.frame);
      expect(again.tags).toEqual(first.tags);
    }
    const m = marks(
      listing(['ABCD'], ['range sql.a lines=1 "label"', 'size sql width=40 height=auto']),
    );
    expect(m.tags[0].x).toBeGreaterThan(m.laid.frame);
    expect(m.laid.frame).toBeGreaterThanOrEqual(m.textRight);
    expect(m.tags[0].x + m.tags[0].w).toBeLessThanOrEqual(m.r.w);
  });
});
