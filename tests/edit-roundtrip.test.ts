// Every editor action, on every example file, in file mode. The browser applies an edit at once;
// the session then writes it to the source and draws the source again. The two must agree: what
// the saved file draws has the same objects, captions, members, links and colors the edit showed.
// An edit the file cannot take is refused with a message and the drawing goes back.
//
// A new editor action joins the matrix by adding a line to ACTIONS. KNOWN lists the edits that
// still disagree; each must keep failing until it is fixed, then leave the list.
//
// The matrix takes about 80 seconds, so it runs as `pnpm test:edits` (and in CI through
// `pnpm release:check`), not in `pnpm check:fast`.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { headOf } from '../src/model/markers';
import type { Diagram } from '../src/model/types';
import type { DiagramSession } from '../src/state/session';

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal(
    'DOMRect',
    class {
      x = 0;
      y = 0;
      width = 1;
      height = 1;
      left = 0;
      top = 0;
      right = 1;
      bottom = 1;
    },
  );
  vi.stubGlobal('document', {
    title: '',
    createElement: () => ({
      getContext: () => ({ measureText: (text: string) => ({ width: text.length * 7 }) }),
    }),
  });
});
afterAll(() => vi.unstubAllGlobals());

const settle = async (s: DiagramSession) => {
  for (let i = 0; i < 400 && s.fileCompiling(); i++)
    await new Promise(resolve => setTimeout(resolve, 0));
};

type Kind = 'node' | 'group' | 'edge';
type Action = { name: string; on: Kind[]; run: (s: DiagramSession, id: string) => void };

// Each action as the editor calls it, with the selection already set to its target.
const ACTIONS: Action[] = [
  { name: 'duplicate', on: ['node', 'group'], run: s => s.duplicateSelection() },
  {
    name: 'copy and paste',
    on: ['node', 'group'],
    run: s => {
      s.copySelection();
      s.pasteFragment();
    },
  },
  { name: 'delete', on: ['node', 'group', 'edge'], run: s => s.deleteSelection() },
  { name: 'delete with contents', on: ['group'], run: s => s.deleteSelection(true) },
  { name: 'ungroup', on: ['group'], run: s => s.ungroupSelection() },
  { name: 'nudge', on: ['node', 'group'], run: s => s.nudgeSelection(24, 0) },
  { name: 'pin', on: ['node', 'group'], run: s => s.togglePin() },
  { name: 'color', on: ['node', 'group', 'edge'], run: s => s.setColor('teal') },
  { name: 'wrap in a group', on: ['node'], run: s => s.wrapSelection() },
  { name: 'reverse', on: ['edge'], run: s => s.reverseSelectedEdge() },
  { name: 'reset bends', on: ['edge'], run: s => s.resetSelectedBends() },
  { name: 'fit group', on: ['group'], run: s => s.fitSelectedContainer() },
  { name: 'quick extend', on: ['node'], run: s => s.quickExtend() },
  {
    name: 'rename',
    on: ['node', 'group', 'edge'],
    run: (s, id) => {
      s.startInlineEdit(id);
      if (s.codeEditId())
        return s.finishCodeEdit(s.codeDraft()!.token, { table: false, title: 'Renamed' });
      s.setInlineDraft('Renamed');
      s.finishInlineEdit(true);
    },
  },
];

/** What a reader sees of a drawing, by caption, so ids the save gives new objects do not count. */
function shape(d: Diagram, target = '') {
  const name = new Map<string, string>();
  for (const n of d.graph.nodes) name.set(n.id, `n:${n.title}`);
  for (const g of d.graph.groups) name.set(g.id, `g:${g.title}`);
  const of = (id: string | undefined) => (id ? (name.get(id) ?? '?') : '-');
  // Only the edited object's own color: others inherit a group's color when the file is drawn
  // again, which the browser does not copy before the save.
  const color = (id: string) => (id === target ? (d.styles[id]?.color ?? 'auto') : '');
  return {
    nodes: d.graph.nodes.map(n => `${of(n.id)} in ${of(n.parentId)} ${color(n.id)}`).sort(),
    groups: d.graph.groups.map(g => `${of(g.id)} in ${of(g.parentId)} ${color(g.id)}`).sort(),
    edges: d.graph.edges
      .map(
        e =>
          `${of(e.from)} -> ${of(e.to)} "${e.label}" ${headOf(e)}${e.directed ? '' : ' undirected'} ${color(e.id)}`,
      )
      .sort(),
  };
}

/** One target of each kind in a drawing: a top-level node, a group, a link. */
function targets(d: Diagram): [Kind, string][] {
  const out: [Kind, string][] = [];
  const node = d.graph.nodes.find(n => !n.parentId) ?? d.graph.nodes[0];
  if (node) out.push(['node', node.id]);
  const group = d.graph.groups[0];
  if (group) out.push(['group', group.id]);
  const edge = d.graph.edges[0];
  if (edge) out.push(['edge', edge.id]);
  return out;
}

/**
 * Edits whose saved file draws something else today, as `<example>: <action> on <kind> <id>`,
 * with what goes wrong. Fix one, then delete its line: the test fails while a fixed edit is listed.
 */
const KNOWN: Record<string, string> = {};

const RUN = !!process.env.EDIT_MATRIX;
const dir = path.join(__dirname, '../examples');
const examples = readdirSync(dir)
  .filter(f => f.endsWith('.draft'))
  .sort();

it.runIf(RUN)('lists the examples the matrix runs over', () => {
  expect(examples.length).toBeGreaterThan(20);
});

for (const file of examples)
  it.runIf(RUN)(
    `saves every editor action on ${file} as the browser drew it`,
    async () => {
      const source = readFileSync(path.join(dir, file), 'utf8');
      const { createDiagramSession } = await import('../src/state/session');
      const { toastMessage } = await import('../src/state/toast');
      const probe = createDiagramSession();
      await probe.openExampleSession(`probe-${file}`, file, source);
      await settle(probe);
      if (probe.sourceError()) return;
      const failures: string[] = [];
      let ran = 0;
      for (const [kind, id] of targets(JSON.parse(JSON.stringify(probe.doc)))) {
        for (const action of ACTIONS.filter(a => a.on.includes(kind))) {
          const s = probe;
          s.setSelection([]);
          await s.openExampleSession(`${file}-${action.name}-${id}`, file, source);
          await settle(s);
          const opened = s.currentSource(),
            before = shape(s.doc, id),
            lastToast = toastMessage();
          s.setSelection([id]);
          try {
            action.run(s, id);
          } catch (error) {
            failures.push(`${action.name} on ${kind} ${id}: threw ${(error as Error).message}`);
            continue;
          }
          const shown = shape(s.doc, id);
          await settle(s);
          const saved = shape(s.doc, id),
            toast = toastMessage();
          // The edit changed nothing a reader sees: nothing to compare.
          if (JSON.stringify(shown) === JSON.stringify(before)) continue;
          ran++;
          const label = `${action.name} on ${kind} ${id}`;
          if (s.currentSource() === opened) {
            // Refused: it says why, and the drawing goes back.
            if (toast === lastToast) failures.push(`${label}: refused without a message`);
            if (JSON.stringify(saved) !== JSON.stringify(before))
              failures.push(`${label}: refused, but the drawing kept the edit`);
            continue;
          }
          if (JSON.stringify(saved) !== JSON.stringify(shown))
            failures.push(
              `${label}: saved file draws something else\n  shown ${JSON.stringify(diff(shown, saved))}`,
            );
        }
      }
      const key = (f: string) => `${file}: ${f.split(':')[0]}`,
        known = Object.keys(KNOWN).filter(k => k.startsWith(`${file}: `));
      expect(
        failures.filter(f => !(key(f) in KNOWN)),
        `${file}: ${ran} edits compared`,
      ).toEqual([]);
      // A listed edit that now saves as drawn is fixed: take it off KNOWN.
      expect(known.filter(k => !failures.some(f => key(f) === k))).toEqual([]);
    },
    120_000,
  );

/** The lines one drawing has and the other lacks. */
function diff(a: ReturnType<typeof shape>, b: ReturnType<typeof shape>) {
  const out: Record<string, { shown: string[]; saved: string[] }> = {};
  for (const k of Object.keys(a) as (keyof typeof a)[]) {
    const shown = a[k].filter(x => !b[k].includes(x)),
      saved = b[k].filter(x => !a[k].includes(x));
    if (shown.length || saved.length) out[k] = { shown, saved };
  }
  return out;
}
