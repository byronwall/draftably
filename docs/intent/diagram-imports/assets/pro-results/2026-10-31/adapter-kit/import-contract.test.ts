import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, link, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectSource, fencedSources } from './detect.js';
import { writeImportedDraft } from './safe-output.js';
import { blankPlan, finish, Ids } from './import-core.js';

test('detection gives explicit choice and extension precedence; short D2 is ambiguous', () => {
  assert.equal(detectSource('a -> b').status, 'unknown');
  assert.equal(detectSource('a -> b', { filename: 'example.d2' }).status, 'detected');
  assert.deepEqual(detectSource('flowchart LR\nA-->B'), {
    status: 'detected', format: 'mermaid', source: 'flowchart LR\nA-->B', via: 'signature', startLine: 1,
  });
  const forced = detectSource('flowchart LR\nA-->B', { filename: 'x.dot' });
  assert.equal(forced.status === 'detected' && forced.format, 'dot');
  const explicit = detectSource('x', { filename: 'x.dot', format: 'd2' });
  assert.equal(explicit.status === 'detected' && explicit.format, 'd2');
  const diamond = detectSource('graph LR\nA{Decision} --> B');
  assert.equal(diamond.status === 'detected' && diamond.format, 'mermaid');
  for (const [source, format] of [
    ['strict digraph G { a -> b }', 'dot'], ['sequenceDiagram\nA->>B: Hi', 'mermaid'],
    ['@startuml\nA->B\n@enduml', 'plantuml'], ['diagram "Native" version=1', 'native'],
  ]) {
    const result = detectSource(source!);
    assert.equal(result.status === 'detected' && result.format, format);
  }
});

test('conventional fences preserve content and line offset; multiple diagrams require a choice', () => {
  const fence = String.fromCharCode(96).repeat(3);
  const doc = '# Notes\n\n' + fence + 'mermaid\nflowchart LR\nA-->B\n' + fence + '\n';
  assert.deepEqual(detectSource(doc), {
    status: 'detected', format: 'mermaid', source: 'flowchart LR\nA-->B', via: 'fence', startLine: 4,
  });
  const multiple = doc + '\n~~~dot\ndigraph {a->b}\n~~~\n';
  assert.equal(detectSource(multiple).status, 'choose-fence');
  assert.equal(fencedSources(fence + 'd2\na -> b').length, 0);
  assert.equal(fencedSources(fence + 'text\nignore\n' + fence + '\n' + doc).length, 1);
  for (const name of ['constructor', '__proto__', 'prototype']) {
    assert.equal(detectSource('ordinary prose', { filename: 'x.' + name }).status, 'unknown');
    assert.equal(fencedSources(fence + name + '\nordinary prose\n' + fence).length, 0);
  }
});

test('safe output validates first, refuses existing paths and links, and preserves the foreign file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'draft-import-'));
  try {
    const input = join(directory, 'input.dot');
    const output = join(directory, 'output.draft');
    const result = finish('dot', 'directed graph', blankPlan('Imported'), [], new Ids());
    await writeFile(input, 'digraph {}');
    await assert.rejects(writeImportedDraft({ inputPath: input, outputPath: output, result,
      validateNative: () => { throw new Error('native invalid'); } }), /native invalid/);
    await assert.rejects(stat(output), { code: 'ENOENT' });
    await writeImportedDraft({ inputPath: input, outputPath: output, result,
      validateNative: source => { assert.match(source, /^diagram /); } });
    assert.equal(await readFile(output, 'utf8'), result.nativeSource);
    await assert.rejects(writeImportedDraft({ inputPath: input, outputPath: output, result,
      validateNative: () => undefined }), { code: 'EEXIST' });
    for (const [name, make] of [['symbolic.draft', symlink], ['hard.draft', link]] as const) {
      const target = join(directory, name);
      await make(input, target);
      await assert.rejects(writeImportedDraft({ inputPath: input, outputPath: target, result,
        validateNative: () => undefined }), { code: 'EEXIST' });
    }
    assert.equal(await readFile(input, 'utf8'), 'digraph {}');
    await assert.rejects(writeImportedDraft({ inputPath: input, outputPath: input, result,
      validateNative: () => undefined }), /IMPORT_SAME_PATH/);
    await assert.rejects(writeImportedDraft({ inputPath: input, outputPath: join(directory, 'wrong.DRAFT'), result,
      validateNative: () => undefined }), /IMPORT_OUTPUT_EXTENSION/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('warnings require explicit review; fatal diagnostics never produce applicable output', async () => {
  const warning = finish('dot', 'directed graph', blankPlan('Imported'), [{
    code: 'EXAMPLE_LOSS', severity: 'warning', impact: 'layout', message: 'Example layout loss.',
  }], new Ids());
  assert.equal(warning.status, 'needs-review');
  await assert.rejects(writeImportedDraft({ inputPath: 'x.dot', outputPath: 'unused.draft',
    result: warning, validateNative: () => { throw new Error('must not validate'); } }), /IMPORT_REVIEW_REQUIRED/);
  const fatal = finish('dot', 'directed graph', blankPlan('Imported'), [{
    code: 'EXAMPLE_FATAL', severity: 'error', impact: 'semantics', message: 'Unsupported meaning.',
  }], new Ids());
  assert.equal(fatal.nativeSource, undefined);
  assert.equal(fatal.facts, undefined);
  await assert.rejects(writeImportedDraft({ inputPath: 'x.dot', outputPath: 'unused.draft',
    result: fatal, acceptLossy: true, validateNative: () => undefined }), /IMPORT_FAILED/);
});
