import { JSDOM } from 'jsdom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { createMermaidFlowParser, makePlainLabel } from '../src/import/mermaid-facade';
import { importMermaidFlow } from '../src/import/mermaid-importer';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const parse = createMermaidFlowParser(async () => (await import('mermaid')).default);
beforeAll(() => {
  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
});
afterAll(() => {
  vi.unstubAllGlobals();
  dom.window.close();
});

describe('Mermaid flowchart import', () => {
  it('preserves groups, edge occurrences, labels and arrowless links in native source', async () => {
    const parsed = await parse(`flowchart LR
subgraph system[System]
  A[API] -->|read| B[Database]
  A -->|write| B
end
X --- A`);
    expect(parsed.ok).toBe(true);
    const imported = importMermaidFlow(parsed, makePlainLabel(dom.window.document));
    expect(imported.status).toBe('needs-review');
    const graph = projectScene(await compile(imported.nativeSource!)).graph;
    expect(graph.groups.map(g => g.id)).toEqual(['system']);
    expect(graph.nodes.find(n => n.id === 'A')?.parentId).toBe('system');
    expect(graph.edges.map(e => [e.from, e.to, e.label, e.directed])).toEqual([
      ['A', 'B', 'read', true],
      ['A', 'B', 'write', true],
      ['X', 'A', '', false],
    ]);
  });

  it('rejects malformed input, non-flowchart families and configuration directives', async () => {
    for (const [source, code] of [
      ['flowchart LR\nA[Missing', 'MERMAID_PARSE_ERROR'],
      ['sequenceDiagram\nA->>B: hi', 'MERMAID_FAMILY_UNSUPPORTED'],
      [
        '%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\nA-->B',
        'MERMAID_CONFIGURATION_UNSUPPORTED',
      ],
    ]) {
      const parsed = await parse(source);
      expect(parsed.ok).toBe(false);
      expect(parsed.diagnostics.some(d => d.code === code)).toBe(true);
      expect(
        importMermaidFlow(parsed, makePlainLabel(dom.window.document)).nativeSource,
      ).toBeUndefined();
    }
  });
});
