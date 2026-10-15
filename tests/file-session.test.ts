import { afterAll, expect, it, vi } from 'vitest';

afterAll(() => vi.unstubAllGlobals());

it('keeps the first title edit on a new file-mode shape and selects its source id', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
  });
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

  const [actions, documentState, fileSession] = await Promise.all([
    import('../src/state/actions'),
    import('../src/state/document'),
    import('../src/state/file-session'),
  ]);
  await fileSession.openExampleSession(
    'title-race',
    'Title race',
    'diagram "Title race" version=1\nnode start "Start"\n',
  );

  actions.quickExtend();
  for (let i = 0; i < 20 && fileSession.fileCompiling(); i++)
    await new Promise(resolve => setTimeout(resolve, 0));
  expect(documentState.selectedIds()).toEqual(['next-step']);
  expect((await import('../src/state/editor')).inlineEditId()).toBe('next-step');

  actions.setInlineDraft('Approve request');
  actions.finishInlineEdit(true);
  for (let i = 0; i < 20 && fileSession.fileCompiling(); i++)
    await new Promise(resolve => setTimeout(resolve, 0));

  expect(fileSession.currentSource()).toContain('node next-step "Approve request"');
  expect(documentState.selectedIds()).toEqual(['next-step']);
});

it('releases cached-page streams and catches up when the file page returns', async () => {
  const page = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
  vi.stubGlobal('window', page);
  const streams: FakeEventSource[] = [];
  class FakeEventSource extends EventTarget {
    close = vi.fn();
    constructor(readonly url: string) {
      super();
      streams.push(this);
    }
  }
  vi.stubGlobal('EventSource', FakeEventSource);
  let source = 'diagram "File" version=1\nnode a "Before leaving"\n';
  vi.stubGlobal('fetch', async () =>
    Response.json({ name: 'file.draft', path: '/file.draft', source, revision: source }),
  );
  const session = await import('../src/state/file-session');
  await session.openFileSession('one.draft');
  await session.openFileSession('two.draft');
  expect(streams[0].close).toHaveBeenCalledOnce();
  expect(streams[1].url).toBe('./api/events?file=two.draft');

  page.dispatchEvent(new Event('pagehide'));
  expect(streams[1].close).toHaveBeenCalledOnce();
  streams[1].dispatchEvent(new Event('error'));
  expect(session.fileStatus()).toBe('saved');

  source = 'diagram "File" version=1\nnode a "Changed while away"\n';
  const restored = Object.assign(new Event('pageshow'), { persisted: true });
  page.dispatchEvent(restored);
  expect(streams).toHaveLength(3);
  streams[2].dispatchEvent(new Event('open'));
  await vi.waitFor(() => expect(session.currentSource()).toContain('Changed while away'));

  await session.openExampleSession('scratch', 'Scratch', 'node a "Scratch"\n');
  expect(streams[2].close).toHaveBeenCalledOnce();
  page.dispatchEvent(restored);
  expect(streams).toHaveLength(3);
});
