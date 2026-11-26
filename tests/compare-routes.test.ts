import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { runShared } from '../src/lib/engine-tasks';

it('shows the editor routes on the Current card for a file with generated lanes', async () => {
  const source = readFileSync('docs/intent/diagram-quality/corpus/hn-deploy/v0.draft', 'utf8');
  const spec = { key: 'current', title: 'Current', subtitle: '', patch: {} };
  const current = await runShared({ kind: 'source', source, spec });
  const editor = await runShared({ kind: 'scene', source, view: {} });
  expect(current.routing.routes).toEqual(editor.routing.routes);
});
