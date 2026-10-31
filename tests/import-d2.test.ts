import fs from 'node:fs';
import path from 'node:path';
import type { CompileResponse } from '@d2lang/d2';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { d2FactsToNative } from '../src/import/d2-importer';
import { normalizeD2 } from '../src/import/d2-normalize';

const fixture = JSON.parse(
  fs.readFileSync(
    path.resolve(
      'docs/intent/diagram-imports/assets/pro-results/2026-10-31/adapter-kit/d2-probe-results.json',
    ),
    'utf8',
  ),
).fixtures as Record<string, { result: CompileResponse }>;

describe('D2 graph import', () => {
  it('maps nested objects and parallel connections to valid native source', async () => {
    const result = d2FactsToNative(normalizeD2(fixture.nested.result));
    expect(result.status).toBe('needs-review');
    const graph = projectScene(await compile(result.nativeSource!)).graph;
    expect(graph.groups).toHaveLength(1);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(4);
    expect(
      graph.edges.filter(edge => edge.from === 'service.api' && edge.to === 'service.cache'),
    ).toHaveLength(2);
  });

  it('rejects two-ended relationships instead of changing their meaning', () => {
    const result = d2FactsToNative(normalizeD2(fixture.arrows.result));
    expect(result.status).toBe('failed');
    expect(result.nativeSource).toBeUndefined();
    expect(result.diagnostics.some(d => d.code === 'D2_TWO_ENDED_ARROW_UNSUPPORTED')).toBe(true);
  });
});
