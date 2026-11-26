// A written edge between two table rows replaces the line the row's `-> table.column` draws.
// Deleting it in the Editor would bring that line back, in a change diagram in another panel,
// so the edit is refused with a message and the file stays as it was.
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

const settle = async (s: DiagramSession) => {
  for (let i = 0; i < 400 && s.fileCompiling(); i++)
    await new Promise(resolve => setTimeout(resolve, 0));
};

const tables = `
group orgs "orgs" <<T
  id      uuid  pk
T
layout orgs table

group users "users" <<T
  id      uuid  pk
  org_id  uuid  fk -> orgs.id
T
layout users table
`;

for (const [name, source] of [
  [
    'a plain diagram',
    `diagram "T" version=1\n${tables}\nedge owns users.org_id -> orgs.id "owns"\n`,
  ],
  [
    'a change diagram (+edge)',
    `diagram "T" version=1\ncompare "a" "b"\n${tables}\n+edge owns users.org_id -> orgs.id "owns"\n`,
  ],
  [
    'a change diagram (-edge)',
    `diagram "T" version=1\ncompare "a" "b"\n${tables}\n-edge owns users.org_id -> orgs.id "owns"\n`,
  ],
] as const)
  it(`refuses to delete a line that replaces a row's line, in ${name}`, async () => {
    const { createDiagramSession } = await import('../src/state/session');
    const { toastMessage } = await import('../src/state/toast');
    const s = createDiagramSession();
    await s.openExampleSession(`override-${name}`, 't.draft', source);
    await settle(s);
    expect(s.sourceError()).toBeFalsy();
    const opened = s.currentSource();
    s.setSelection(['owns']);
    s.deleteSelection();
    await settle(s);
    expect(s.currentSource()).toBe(opened);
    expect(toastMessage()?.text).toContain('-> orgs.id');
    expect(s.doc.graph.edges.map(e => e.id)).toContain('owns');
  });
