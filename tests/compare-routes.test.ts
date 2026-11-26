import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

it('shows the editor routes on the Current card for a file with generated lanes', async () => {
  const source = readFileSync('docs/intent/diagram-quality/corpus/hn-deploy/v0.draft', 'utf8');
  const spec = { key: 'current', title: 'Current', subtitle: '', patch: {} };
  const currentWorker = await import('../src/lib/engine-tasks');
  const view = { collapsed: ['source'] };
  const current = await currentWorker.runShared({ kind: 'source', source, spec, view });
  vi.resetModules();
  const editorWorker = await import('../src/lib/engine-tasks');
  const editor = await editorWorker.runShared({ kind: 'scene', source, view });
  expect(current.routing.routes).toEqual(editor.routing.routes);
});

it('routes a comparison to the loaded lines of an external code file', async () => {
  const dir = 'examples/code-from-file';
  const source = readFileSync(dir + '/orders-report.draft', 'utf8');
  const files = {
    'queries/orders.sql': { text: readFileSync(dir + '/queries/orders.sql', 'utf8') },
  };
  const spec = { key: 'current', title: 'Current', subtitle: '', patch: {} };
  const worker = await import('../src/lib/engine-tasks');
  const resolved = await worker.runShared({ kind: 'scene', source, files, view: {} });
  const placeholder = await worker.runShared({ kind: 'scene', source, view: {} });
  vi.resetModules();
  const compare = await import('../src/lib/engine-tasks');
  const current = await compare.runShared({ kind: 'source', source, spec, files });
  expect(current.routing.routes).toEqual(resolved.routing.routes);
  expect(current.routing.routes).not.toEqual(placeholder.routing.routes);
});
