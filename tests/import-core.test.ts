import assert from 'node:assert/strict';
import { test } from 'vitest';
import { Ids, LIMITS, blankPlan, finish } from '../src/import/import-core';

test('native construction bounds generated UTF-8 source independently of labels', () => {
  const plan = blankPlan('Long identifiers');
  for (let i = 0; i < 450; i++)
    plan.objects.push({ id: 'n' + i + '_' + 'x'.repeat(2400), kind: 'node', label: 'N' });
  const result = finish('dot', 'graph', plan, [], new Ids());
  assert.equal(result.status, 'failed');
  assert.equal(result.nativeSource, undefined);
  assert.equal(result.facts, undefined);
  assert(result.diagnostics.some(d => d.code === 'IMPORT_OUTPUT_LIMIT'));
});

test('native construction bounds aggregate labels using bytes, not code-unit length', () => {
  const plan = blankPlan('Unicode labels');
  for (let i = 0; i < 70; i++)
    plan.objects.push({ id: 'n' + i, kind: 'node', label: 'β'.repeat(8000) });
  assert(70 * 8000 < LIMITS.totalLabelBytes);
  const result = finish('dot', 'graph', plan, [], new Ids());
  assert.equal(result.status, 'failed');
  assert.equal(result.nativeSource, undefined);
  assert(result.diagnostics.some(d => d.code === 'IMPORT_TOTAL_LABEL_LIMIT'));
});

test('native title has the same per-label bound as objects and edges', () => {
  const result = finish(
    'dot',
    'graph',
    blankPlan('x'.repeat(LIMITS.labelChars + 1)),
    [],
    new Ids(),
  );
  assert.equal(result.status, 'failed');
  assert.equal(result.nativeSource, undefined);
  assert(result.diagnostics.some(d => d.code === 'IMPORT_LABEL_LIMIT'));
});

test('native source character limit is enforced below the independent UTF-8 byte cap', () => {
  const plan = blankPlan('Expanded source');
  for (let i = 0; i < 20; i++)
    plan.objects.push({ id: 'n' + i, kind: 'node', label: 'x'.repeat(16_000) });
  const result = finish('dot', 'graph', plan, [], new Ids());
  assert.equal(result.status, 'failed');
  assert.equal(result.nativeSource, undefined);
  assert.equal(result.facts, undefined);
  assert(result.diagnostics.some(d => d.code === 'IMPORT_NATIVE_SOURCE_LIMIT'));
  assert(!result.diagnostics.some(d => d.code === 'IMPORT_OUTPUT_LIMIT'));
});
