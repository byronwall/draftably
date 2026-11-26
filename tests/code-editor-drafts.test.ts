// @vitest-environment jsdom
// The Code editor as the user drives it: the real component, its Table switch, its cells and text
// box, and Done. After each save the file is compiled again, and the cells it draws must be the
// cells the editor showed. A switch or an edit put back writes no body, and a caption left as it
// was keeps its outer spaces.
import { render } from 'solid-js/web';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { CodeEditor } from '../src/components/canvas/CodeEditor';
import { DiagramSessionProvider } from '../src/components/session-context';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { findNode } from '../src/model/graph';
import type { DiagramSession } from '../src/state/session';

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  // Text is measured on a canvas; jsdom has none.
  HTMLCanvasElement.prototype.getContext = (() => ({
    measureText: (text: string) => ({ width: text.length * 7 }),
  })) as never;
});
afterAll(() => vi.unstubAllGlobals());

const settle = async (s: DiagramSession) => {
  for (let i = 0; i < 200 && s.fileCompiling(); i++)
    await new Promise(resolve => setTimeout(resolve, 0));
};

const file = (attrs: string, body: string[], title = 'Query') =>
  `diagram "Drafts" version=1\nnode q "${title}" shape=code${attrs} <<SQL\n${body.join('\n')}\nSQL\n`;

/** Open the editor on node `q` of `source` (or on what `pick` opens), and the controls to drive it. */
async function editor(source: string, pick = (_: DiagramSession) => 'q') {
  const { createDiagramSession } = await import('../src/state/session');
  const s = createDiagramSession();
  await s.openExampleSession(`editor-${Math.random()}`, 'Drafts', source);
  await settle(s);
  const id = pick(s);
  s.startInlineEdit(id);
  expect(s.codeEditId()).toBe(id);
  const root = document.createElement('div');
  document.body.append(root);
  const dispose = render(
    () =>
      DiagramSessionProvider({
        session: s,
        get children() {
          return CodeEditor();
        },
      }),
    root,
  );
  const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const ui = {
    s,
    toggle: () => root.querySelector<HTMLButtonElement>('button[aria-pressed]')!.click(),
    cell: (r: number, c: number) =>
      root.querySelector<HTMLInputElement>(`input[data-cell="${r}:${c}"]`)!,
    text: () => root.querySelector<HTMLTextAreaElement>('textarea')!,
    caption: () => root.querySelector<HTMLInputElement>('input[placeholder="Caption"]')!,
    type,
    /** The cells on screen, row by row. */
    grid: () => {
      const rows: string[][] = [];
      for (const input of root.querySelectorAll<HTMLInputElement>('input[data-cell]')) {
        const [r, c] = input.dataset.cell!.split(':').map(Number);
        (rows[r] ??= [])[c] = input.value;
      }
      return rows;
    },
    root,
    /** Press Done and wait for the save to be drawn. */
    done: async () => {
      [...root.querySelectorAll<HTMLButtonElement>('button.primary')].at(-1)!.click();
      await settle(s);
      dispose();
      root.remove();
    },
  };
  return ui;
}

/** The node as the saved source compiles: caption, and the cells it draws. */
async function recompiled(source: string) {
  const node = findNode(projectScene(await compile(source)), 'q')!;
  return { title: node.title, rows: node.code?.cells?.rows };
}

const TABBED = ['col\tval', 'longer\tcontent'];

it('saves the Table switch alone as table=on, and draws the cells it showed', async () => {
  const ui = await editor(file(' lang=sql', TABBED));
  ui.toggle();
  const shown = ui.grid();
  await ui.done();
  const saved = ui.s.currentSource();
  expect(saved).toBe(file(' lang=sql table=on', TABBED));
  expect((await recompiled(saved)).rows).toEqual(shown);
});

it('saves cells split after the Table switch as the grid showed them', async () => {
  const ui = await editor(file(' lang=sql', ['col val', 'a b']));
  ui.toggle();
  // The header reads as one cell; the user splits it into two.
  ui.type(ui.cell(0, 0), 'col');
  ui.type(ui.cell(0, 1), 'val');
  const shown = ui.grid();
  await ui.done();
  expect((await recompiled(ui.s.currentSource())).rows).toEqual(shown);
});

it('writes no body for a cell edit put back, and saves the caption beside it', async () => {
  const source = file(' lang=sql table=on', TABBED);
  const ui = await editor(source);
  const was = ui.cell(1, 1).value;
  ui.type(ui.cell(1, 1), 'other');
  ui.type(ui.cell(1, 1), was);
  ui.type(ui.caption(), 'Mine');
  const shown = ui.grid();
  await ui.done();
  const saved = ui.s.currentSource();
  expect(saved).toBe(source.replace('"Query"', '"Mine"'));
  expect(await recompiled(saved)).toEqual({ title: 'Mine', rows: shown });
});

it('writes no body for text typed and put back before the Table switch', async () => {
  const ui = await editor(file(' lang=sql', TABBED));
  const was = ui.text().value;
  ui.type(ui.text(), 'SELECT 1');
  ui.type(ui.text(), was);
  ui.toggle();
  const shown = ui.grid();
  await ui.done();
  const saved = ui.s.currentSource();
  expect(saved).toBe(file(' lang=sql table=on', TABBED));
  expect((await recompiled(saved)).rows).toEqual(shown);
});

it('keeps the outer spaces of a caption the user did not edit', async () => {
  const ui = await editor(file(' lang=sql', TABBED, '  Query  '));
  ui.toggle();
  const shown = ui.grid();
  await ui.done();
  const saved = ui.s.currentSource();
  expect(saved).toBe(file(' lang=sql table=on', TABBED, '  Query  '));
  expect(await recompiled(saved)).toEqual({ title: '  Query  ', rows: shown });
});

it('keeps the draft of a pasted table when its temporary id becomes a source id', async () => {
  const ui = await editor(file(' lang=sql', TABBED), s => s.addTable(['a\tb', '1\t2']));
  // The paste is still being saved and drawn: its node has a temporary id.
  expect(ui.s.fileCompiling()).toBe(true);
  ui.type(ui.caption(), 'Pasted');
  await settle(ui.s);
  // The same editor, on the node's source id, still holds the caption.
  expect(ui.caption()?.value).toBe('Pasted');
  const id = ui.s.codeEditId()!;
  await ui.done();
  expect(ui.s.currentSource()).toMatch(new RegExp(`node ${id} "Pasted"`));
});
