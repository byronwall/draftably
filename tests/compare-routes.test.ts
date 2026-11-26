import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

it('shows the editor routes on the Current card for a file with generated lanes', async () => {
  const source = readFileSync('docs/intent/diagram-quality/corpus/hn-deploy/v0.draft', 'utf8');
  const spec = { key: 'current', title: 'Current', subtitle: '', patch: {} };
  const currentWorker = await import('../src/lib/engine-tasks');
  const current = await currentWorker.runShared({ kind: 'source', source, spec });
  vi.resetModules();
  const editorWorker = await import('../src/lib/engine-tasks');
  const editor = await editorWorker.runShared({ kind: 'scene', source, view: {} });
  expect(current.routing.routes).toEqual(editor.routing.routes);
});
