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
