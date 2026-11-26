// An editor draft is taken when the editor opens. If the file changes under it, a save of that
// draft must not write over the change. Each case below changes one thing the file can say about a
// code node while the Code editor is open, then saves a draft. The file keeps the change. A draft
// of a different field still saves; a draft of the same field is refused.
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
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

// A new session per case, so no draft or toast carries over.
const session = async (): Promise<DiagramSession> =>
  (await import('../src/state/session')).createDiagramSession();

const settle = async (s: DiagramSession) => {
  for (let i = 0; i < 200 && s.fileCompiling(); i++)
    await new Promise(resolve => setTimeout(resolve, 0));
};

const file = (attrs: string, title = 'Query', body = ['SELECT 1', 'FROM t']) =>
  `diagram "Drafts" version=1\nnode q "${title}" shape=code${attrs} <<SQL\n${body.join('\n')}\nSQL\n`;

const BASE = file(' lang=sql');

// Each change the file can make to the node while its editor is open, and the text that shows
// the change is still in the file.
const CHANGES: Record<string, [string, string]> = {
  caption: [file(' lang=sql', 'Report'), '"Report"'],
  body: [file(' lang=sql', 'Query', ['SELECT 2', 'FROM t']), 'SELECT 2'],
  lang: [file(' lang=python'), 'lang=python'],
  table: [file(' lang=sql table=on'), 'table=on'],
  wrap: [file(' lang=sql wrap=off'), 'wrap=off'],
  tab: [file(' lang=sql tab=2'), 'tab=2'],
  numbers: [file(' lang=sql numbers=on'), 'numbers=on'],
  start: [file(' lang=sql numbers=on start=10'), 'start=10'],
  labels: [file(' lang=sql labels=inside'), 'labels=inside'],
};

// The draft the editor saves: a new caption, or a new body, or the Table switch, with the
// change each one makes and the file change it edits too.
const DRAFTS = {
  caption: { draft: { table: false, title: 'Mine' }, shows: '"Mine"', same: 'caption' },
  body: {
    draft: { body: ['SELECT 3'], table: false, title: 'Query' },
    shows: 'SELECT 3',
    same: 'body',
  },
  toggle: { draft: { table: true, title: 'Query' }, shows: 'table=on', same: 'table' },
};

it('saves a draft when the file did not change under it', async () => {
  const s = await session();
  await s.openExampleSession('drafts', 'Drafts', BASE);
  await settle(s);
  s.startInlineEdit('q');
  expect(s.codeEditId()).toBe('q');
  s.finishCodeEdit('q', DRAFTS.body.draft);
  await settle(s);
  expect(s.currentSource()).toContain('SELECT 3');
});

for (const [what, [changed, kept]] of Object.entries(CHANGES))
  for (const [kind, { draft, shows, same }] of Object.entries(DRAFTS))
    it(`keeps a ${what} change the file made while a ${kind} draft was open`, async () => {
      const s = await session();
      await s.openExampleSession(`drafts-${what}-${kind}`, 'Drafts', BASE);
      await settle(s);
      s.startInlineEdit('q');
      expect(s.codeEditId()).toBe('q');
      await s.receiveSource(changed);
      await settle(s);
      s.finishCodeEdit('q', draft);
      await settle(s);
      const saved = s.currentSource();
      expect(saved).toContain(kept);
      // Both edited the same field: the file's version wins and the draft is refused.
      if (what === same) expect(saved).toBe(changed);
      // A draft of another field lands on top of the file's change.
      else expect(saved).toContain(shows);
    });
