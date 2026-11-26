// An editor draft is taken when the editor opens. If the file changes under it, a save of that
// draft must not write over the change. Each case below changes one thing the file can say about a
// code node while the Code editor is open, then saves a draft. The file keeps the change. A draft
// of a different field still saves; a draft of the same field is refused. A body saved from grid
// cells also depends on the tab width and table setting it read the cells with; typed text does not.
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { findNode } from '../src/model/graph';
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
  caption: { draft: { table: false, title: 'Mine' }, shows: '"Mine"', same: ['caption'] },
  body: {
    draft: { body: ['SELECT 3'], table: false, title: 'Query' },
    shows: 'SELECT 3',
    same: ['body'],
  },
  grid: {
    draft: { body: ['a  b', 'c  d'], table: true, title: 'Query', grid: true },
    shows: 'a  b',
    same: ['body', 'table', 'tab'],
  },
  toggle: { draft: { table: true, title: 'Query' }, shows: 'table=on', same: ['table'] },
};

it('saves a draft when the file did not change under it', async () => {
  const s = await session();
  await s.openExampleSession('drafts', 'Drafts', BASE);
  await settle(s);
  s.startInlineEdit('q');
  const token = s.codeDraft()!.token;
  expect(s.codeEditId()).toBe('q');
  s.finishCodeEdit(token, DRAFTS.body.draft);
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
      const token = s.codeDraft()!.token;
      expect(s.codeEditId()).toBe('q');
      await s.receiveSource(changed);
      await settle(s);
      s.finishCodeEdit(token, draft);
      await settle(s);
      const saved = s.currentSource();
      expect(saved).toContain(kept);
      // Both edited the same field: the file's version wins and the draft is refused.
      if (same.includes(what)) expect(saved).toBe(changed);
      // A draft of another field lands on top of the file's change.
      else expect(saved).toContain(shows);
    });

it('refuses a draft after another file opened, and leaves that file as it is', async () => {
  const s = await session();
  const { toastMessage } = await import('../src/state/toast');
  await s.openExampleSession('drafts-a', 'A', BASE);
  await settle(s);
  s.startInlineEdit('q');
  const token = s.codeDraft()!.token;
  const other = file(' lang=sql', 'Query', ['SELECT 9']);
  await s.openExampleSession('drafts-b', 'B', other);
  await settle(s);
  s.finishCodeEdit(token, DRAFTS.caption.draft);
  await settle(s);
  expect(s.currentSource()).toBe(other);
  expect(toastMessage()?.text).toMatch(/Another file/);
});

it('refuses a draft whose node the file renamed, and says so', async () => {
  const s = await session();
  const { toastMessage } = await import('../src/state/toast');
  await s.openExampleSession('drafts-renamed', 'Drafts', BASE);
  await settle(s);
  s.startInlineEdit('q');
  const token = s.codeDraft()!.token;
  const renamed = BASE.replace('node q ', 'node r ');
  await s.receiveSource(renamed);
  await settle(s);
  s.finishCodeEdit(token, DRAFTS.caption.draft);
  await settle(s);
  expect(s.currentSource()).toBe(renamed);
  expect(toastMessage()?.text).toMatch(/removed or renamed/);
});

it('opens no draft from the last drawing while the newly opened file does not draw', async () => {
  const s = await session();
  const { toastMessage } = await import('../src/state/toast');
  await s.openExampleSession('drafts-shown-a', 'A', BASE);
  await settle(s);
  await s.openExampleSession('drafts-shown-b', 'B', 'node q "Query" shape=code <<SQL\n');
  await settle(s);
  // A's drawing is still on screen, but the session saves to B: no draft opens.
  s.startInlineEdit('q');
  expect(s.codeEditId()).toBeNull();
  expect(toastMessage()?.text).toMatch(/Still opening/);
  // B repaired on disk draws, and its own node opens.
  await s.receiveSource(BASE);
  await settle(s);
  s.startInlineEdit('q');
  expect(s.codeEditId()).toBe('q');
});

// A refresh from disk is still being laid out when the editor saves. The save waits for the new
// revision and applies to it: a field the file changed is not written over, and a change the file
// made elsewhere (a size line) stays.
const SIZED = BASE + 'size q width=300 height=200\n';
for (const [kind, { draft, shows, same }] of Object.entries(DRAFTS))
  it(`checks a ${kind} draft saved during a refresh against the refreshed file`, async () => {
    const s = await session();
    await s.openExampleSession(`drafts-paused-${kind}`, 'Drafts', BASE);
    await settle(s);
    s.startInlineEdit('q');
    const token = s.codeDraft()!.token;
    const changed = SIZED.replace('"Query"', '"Report"');
    // Not awaited: the refresh is still compiling when Done is pressed.
    const refresh = s.receiveSource(changed);
    expect(s.fileCompiling()).toBe(true);
    s.finishCodeEdit(token, draft);
    await refresh;
    await settle(s);
    const saved = s.currentSource();
    expect(saved).toContain('size q width=300 height=200');
    expect(saved).toContain('"Report"');
    if (same.includes('caption')) expect(saved).toBe(changed);
    else expect(saved).toContain(shows);
  });

it('keeps a draft opened on a new node when its temporary id becomes a source id', async () => {
  const s = await session();
  await s.openExampleSession('drafts-temp', 'Drafts', BASE);
  await settle(s);
  const temp = s.addTable(['a\tb', '1\t2']);
  // The pasted table is not drawn from the file yet: its editor opens on the temporary id.
  s.startInlineEdit(temp);
  const draft = s.codeDraft()!;
  expect(draft.id).toBe(temp);
  await settle(s);
  // The saved file names the table; the same draft now edits it under its source id.
  expect(s.codeDraft()).toBe(draft);
  expect(s.codeEditId()).not.toBe(temp);
  expect(s.codeEditId()).toBe(draft.id);
  s.finishCodeEdit(draft.token, { table: true, title: 'Pasted' });
  await settle(s);
  expect(s.currentSource()).toMatch(new RegExp(`node ${draft.id} "Pasted"`));
});

it('saves a draft to its own file while the next file is still opening', async () => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal(
    'EventSource',
    class extends EventTarget {
      close() {}
    },
  );
  const puts: string[] = [];
  let release!: () => void;
  const paused = new Promise<void>(resolve => (release = resolve));
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      puts.push(url);
      return Response.json({ revision: `r${puts.length}` });
    }
    if (url.includes('file=b.draft')) await paused;
    // The two files are copies: the same text and the same revision.
    return Response.json({ name: 'copy', path: '/copy', source: BASE, revision: 'same' });
  });
  const s = await session();
  await s.openFileSession('a.draft');
  await settle(s);
  s.startInlineEdit('q');
  const token = s.codeDraft()!.token;
  // B is asked for, but has not answered: A is still the open file.
  const opening = s.openFileSession('b.draft');
  s.finishCodeEdit(token, DRAFTS.caption.draft);
  await settle(s);
  await s.settleSave();
  expect(puts).toEqual(['./api/source?file=a.draft']);
  release();
  expect(await opening).toBe(true);
  await settle(s);
  expect(s.currentSource()).toBe(BASE);
  expect(puts).toEqual(['./api/source?file=a.draft']);
});

it('checks a label finished during a refresh against the refreshed label', async () => {
  const source = 'diagram "Labels" version=1\nnode a "Alpha"\nnode b "Beta"\n';
  for (const [changed, expected] of [
    // The file renamed the same node: its name stays and the edit is refused.
    [source.replace('"Alpha"', '"Disk"'), source.replace('"Alpha"', '"Disk"')],
    // The file renamed another node: both changes stay.
    [
      source.replace('"Beta"', '"Disk"'),
      source.replace('"Beta"', '"Disk"').replace('"Alpha"', '"Mine"'),
    ],
  ]) {
    const s = await session();
    await s.openExampleSession(`labels-${changed.length}-${Math.random()}`, 'Labels', source);
    await settle(s);
    s.startInlineEdit('a');
    s.setInlineDraft('Mine');
    const refresh = s.receiveSource(changed);
    expect(s.fileCompiling()).toBe(true);
    s.finishInlineEdit(true);
    await refresh;
    await settle(s);
    expect(s.currentSource()).toBe(expected);
  }
});

it('applies a code save made while Source panel text compiles to that text', async () => {
  const s = await session();
  await s.openExampleSession('drafts-typed', 'Drafts', BASE);
  await settle(s);
  s.startInlineEdit('q');
  const token = s.codeDraft()!.token;
  const typing = s.typeSource(SIZED, 1);
  expect(s.fileCompiling()).toBe(true);
  s.finishCodeEdit(token, DRAFTS.caption.draft);
  await typing;
  await settle(s);
  const saved = s.currentSource();
  expect(saved).toBe(SIZED.replace('"Query"', '"Mine"'));
  // The drawing is the saved text, and undo steps back through the caption, then the typing.
  expect(findNode(s.doc, 'q')?.title).toBe('Mine');
  s.undo();
  await settle(s);
  expect(s.currentSource()).toBe(SIZED);
});

it('shows only the newest file when two opens answer in reverse order', async () => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal(
    'EventSource',
    class extends EventTarget {
      close() {}
    },
  );
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  vi.stubGlobal('fetch', async (url: string) => {
    const name = /file=(\w)/.exec(url)![1];
    if (name === 'b') await held;
    const source = file(' lang=sql', `File ${name}`);
    return Response.json({ name, path: `/${name}`, source, revision: name });
  });
  const s = await session();
  const b = s.openFileSession('b.draft');
  expect(await s.openFileSession('c.draft')).toBe(true);
  release();
  expect(await b).toBeNull();
  await settle(s);
  expect(s.fileSession()?.file).toBe('c.draft');
  expect(s.currentSource()).toContain('File c');
});

/** Serve copies of BASE as files a and b; PUTs to a are held until `release`. */
function serveCopies(hold = false, source = BASE) {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal(
    'EventSource',
    class extends EventTarget {
      close() {}
    },
  );
  const puts: [string, string][] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  let opened!: () => void;
  const asked = new Promise<void>(resolve => (opened = resolve));
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      puts.push([url, JSON.parse(init.body as string).source]);
      if (hold && url.includes('a.draft')) await held;
      return Response.json({ revision: `r${puts.length}` });
    }
    if (url.includes('b.draft')) opened();
    return Response.json({ name: 'copy', path: '/copy', source, revision: 'same' });
  });
  return { puts, release, asked };
}

it('never applies a label queued in one file to the next file', async () => {
  const plain = 'diagram "Plain" version=1\nnode a "Alpha"\n';
  const { puts } = serveCopies(false, plain);
  const s = await session();
  await s.openFileSession('a.draft');
  await settle(s);
  s.startInlineEdit('a');
  expect(s.inlineEditId()).toBe('a');
  s.setInlineDraft('From A');
  // A refresh of A is laid out when the label is finished, so the label waits for it.
  const refresh = s.receiveSource(plain + 'node b "Beta"\n');
  s.finishInlineEdit(true);
  await s.openFileSession('b.draft');
  await refresh;
  await settle(s);
  await s.settleSave();
  expect(puts.filter(([url]) => url.includes('b.draft'))).toEqual([]);
  expect(s.currentSource()).toBe(plain);
});

it('saves every edit made in a file while the next file opens to that file', async () => {
  const { puts, release, asked } = serveCopies(true);
  const s = await session();
  await s.openFileSession('a.draft');
  await settle(s);
  const edit = async (title: string) => {
    s.startInlineEdit('q');
    s.finishCodeEdit(s.codeDraft()!.token, { table: false, title });
    await settle(s);
  };
  await edit('First');
  const opening = s.openFileSession('b.draft');
  await asked;
  // A's first save is still in flight: the second edit is A's too.
  await edit('Second');
  release();
  expect(await opening).toBe(true);
  await settle(s);
  await s.settleSave();
  expect(puts.map(([url, text]) => [url, /node q "(\w+)"/.exec(text)?.[1]])).toEqual([
    ['./api/source?file=a.draft', 'First'],
    ['./api/source?file=a.draft', 'Second'],
  ]);
  expect(s.currentSource()).toBe(BASE);
  expect(s.fileStatus()).toBe('saved');
});

it('draws the committed text again when Source panel text is typed back during layout', async () => {
  const s = await session();
  await s.openExampleSession('drafts-revert', 'Drafts', BASE);
  await settle(s);
  void s.typeSource(SIZED, 1);
  expect(s.fileCompiling()).toBe(true);
  await s.typeSource(BASE, 1);
  s.startInlineEdit('q');
  s.finishCodeEdit(s.codeDraft()!.token, DRAFTS.caption.draft);
  await settle(s);
  expect(s.currentSource()).toBe(BASE.replace('"Query"', '"Mine"'));
  expect(s.fileScene()?.model.hints.some(h => h.type === 'size')).toBe(false);
});
