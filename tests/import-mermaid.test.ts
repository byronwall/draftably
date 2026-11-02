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
  vi.stubGlobal('Option', dom.window.Option);
});
afterAll(() => {
  vi.unstubAllGlobals();
  dom.window.close();
});

describe('Mermaid flowchart import', () => {
  it('maps circle, cross and two-ended links to native ends', async () => {
    const parsed = await parse(`flowchart LR
A --o B
A --x C
A <--> D
A o--o E
A x--x F`);
    const imported = importMermaidFlow(parsed, makePlainLabel(dom.window.document));
    expect(imported.status).not.toBe('failed');
    const edges = imported.nativeSource!.split('\n').filter(l => l.startsWith('edge '));
    expect(edges.map(l => l.split('"" ')[1])).toEqual([
      'head=circle',
      'head=cross',
      'tail=arrow',
      'head=circle tail=circle',
      'head=cross tail=cross',
    ]);
    await compile(imported.nativeSource!);
  });

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
      ['classDiagram\nA <|-- B', 'MERMAID_FAMILY_UNSUPPORTED'],
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

describe('Mermaid sequence import', () => {
  const run = async (body: string) =>
    importMermaidFlow(
      await parse('sequenceDiagram\n' + body),
      makePlainLabel(dom.window.document),
      'Seq',
    );
  const lines = (source: string, word: string) =>
    source.split('\n').filter(l => l.startsWith(word + ' '));

  it('maps participants, boxes and each message line', async () => {
    const r = await run(`box Client
participant a as App
end
participant b
a->>b: call
b-->>a: reply
a->b: plain
a-xb: lost
a--xb: late
a<<->>b: both`);
    expect(r.status).toBe('ready');
    expect(lines(r.nativeSource!, 'group')).toEqual(['group box_1 "Client"']);
    expect(lines(r.nativeSource!, 'node')).toEqual(['node a "App" in=box_1', 'node b "b"']);
    expect(lines(r.nativeSource!, 'layout')).toEqual(['layout root sequence']);
    expect(lines(r.nativeSource!, 'edge')).toEqual([
      'edge m1 a -> b "call"',
      'edge m2 b -> a "reply" kind=async',
      'edge m3 a -> b "plain" head=none',
      'edge m4 a -> b "lost" head=cross',
      'edge m5 a -> b "late" head=cross kind=async',
      'edge m6 a -> b "both" tail=arrow',
    ]);
    await compile(r.nativeSource!);
  });

  it('turns each top-level branch into a band and warns', async () => {
    const r = await run(`a->>b: first
alt ok
  b-->>a: yes
  loop retry
    a->>b: again
  end
else failed
  b-->>a: no
end
opt
end
a->>b: last`);
    expect(lines(r.nativeSource!, 'phase')).toEqual([
      'phase phase_1 "alt: ok" m2 m3',
      'phase phase_2 "else: failed" m4',
    ]);
    expect(r.status).toBe('needs-review');
    expect(r.diagnostics.map(d => d.code)).toEqual([
      'MERMAID_SEQUENCE_BLOCK',
      'MERMAID_SEQUENCE_NESTED_BLOCK',
    ]);
    await compile(r.nativeSource!);
  });

  it('anchors a note to the message it follows, or else to its participant', async () => {
    const r = await run(`participant a
participant b
participant c
Note left of a: before
a->>b: go
Note over a,b: on the message
Note right of c: elsewhere`);
    expect(lines(r.nativeSource!, 'note')).toEqual([
      'note "before" near=a side=left',
      'note "on the message" near=m1 side=right',
      'note "elsewhere" near=c side=right',
    ]);
    await compile(r.nativeSource!);
  });

  it('reports what has no native form and refuses half arrows', async () => {
    const r = await run(`autonumber
actor a
a->>+b: go
b-->>-a: back
a-)b: send`);
    expect(r.diagnostics.map(d => d.code).sort()).toEqual([
      'MERMAID_SEQUENCE_ACTIVATION',
      'MERMAID_SEQUENCE_ACTOR_TYPE',
      'MERMAID_SEQUENCE_ASYNC_ARROW',
      'MERMAID_SEQUENCE_AUTONUMBER',
    ]);
    expect((await run('a-|\\b: half')).status).toBe('failed');
  });
});
