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

  /** The arrows fixture with its first connection's target arrowhead set by hand. */
  function arrowhead(shape: string) {
    const response = structuredClone(fixture.arrows.result);
    response.diagram.connections[0].dstArrow = shape as never;
    Object.assign(response.graph.edges![0]!, { dst_arrow: true, dstArrowhead: {} });
    return d2FactsToNative(normalizeD2(response));
  }

  it('keeps two-ended relationships as one edge with two marks', () => {
    const result = d2FactsToNative(normalizeD2(fixture.arrows.result));
    expect(result.status).not.toBe('failed');
    expect(result.nativeSource).toContain('tail=arrow');
  });

  it('maps the arrowheads the native set covers and refuses the rest', () => {
    for (const [shape, native] of [
      ['triangle', 'head=triangle'],
      ['unfilled-triangle', 'head=open-triangle'],
      ['diamond', 'head=open-diamond'],
      ['filled-diamond', 'head=diamond'],
      ['filled-circle', 'head=circle'],
      ['cross', 'head=cross'],
      ['none', 'head=none'],
    ])
      expect(arrowhead(shape).nativeSource).toContain(native);
    for (const shape of ['circle', 'box', 'cf-many']) {
      const result = arrowhead(shape);
      expect(result.status).toBe('failed');
      expect(result.diagnostics.map(d => d.code)).toContain('D2_ARROW_SEMANTICS_UNSUPPORTED');
    }
  });
});
