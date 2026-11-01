/** Rebuild native snapshots from checked-in, controlled D2 compiler responses.
 * To regenerate the compiler responses: node --import ./d2-deny-network.mjs
 * --import tsx d2-probe.mts. This never processes an arbitrary directory.
 */
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import type { CompileResponse } from '@d2lang/d2';
import { normalizeD2 } from './d2-normalize.js';
import { d2FactsToNative } from './d2-importer.js';

const data = JSON.parse(await readFile(new URL('../d2-probe-results.json', import.meta.url), 'utf8')) as {
  fixtures: Record<string, { source: string; result?: CompileResponse; error?: string }>;
};
const destination = new URL('../fixtures/d2/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const [name, fixture] of Object.entries(data.fixtures)) {
  await writeFile(new URL(name + '.d2', destination), fixture.source);
  if (!fixture.result) {
    await rm(new URL(name + '.draft', destination), { force: true });
    const failure = d2FactsToNative({
      ok: false, title: '', items: [], edges: [], direction: 'down',
      diagnostics: [{ code: 'D2_PARSE_OR_COMPILE_ERROR', severity: 'error',
        message: fixture.error ?? 'The D2 compiler rejected this input.' }],
    }, 'D2 ' + name);
    await writeFile(new URL(name + '.expected.json', destination), JSON.stringify(failure, null, 2) + '\n');
    continue;
  }
  const result = d2FactsToNative(normalizeD2(fixture.result), 'D2 ' + name);
  await writeFile(new URL(name + '.expected.json', destination), JSON.stringify(result, null, 2) + '\n');
  if (result.nativeSource) await writeFile(new URL(name + '.draft', destination), result.nativeSource);
  else await rm(new URL(name + '.draft', destination), { force: true });
}
