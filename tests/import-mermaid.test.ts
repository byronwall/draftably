import { JSDOM } from 'jsdom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { createMermaidFlowParser, makePlainLabel } from '../src/import/mermaid-facade';
import { importMermaidFlow } from '../src/import/mermaid-importer';
import { detectSource } from '../src/import/detect';

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

describe('Mermaid frontmatter', () => {
  const imported = async (source: string) =>
    importMermaidFlow(await parse(source), makePlainLabel(dom.window.document), 'File name');

  it('takes the title and a mapped theme, and names the settings it ignores', async () => {
    const r = await imported(`---
title: "Checkout: flow"
config:
  theme: dark
  flowchart: {curve: basis, htmlLabels: false}
---
flowchart LR
  A --> B`);
    expect(r.nativeSource!.split('\n').slice(0, 2)).toEqual([
      'diagram "Checkout: flow" version=1',
      'theme blueprint',
    ]);
    expect(r.diagnostics.find(d => d.code === 'MERMAID_FRONTMATTER_IGNORED')?.message).toContain(
      'config.flowchart.curve, config.flowchart.htmlLabels.',
    );
    await compile(r.nativeSource!);
    expect(detectSource('---\ntitle: X\n---\nsequenceDiagram\na->>b: hi').status).toBe('detected');
  });

  it('keeps a title written in the diagram over the frontmatter title', async () => {
    const r = await imported('---\ntitle: Outer\n---\nsequenceDiagram\ntitle Inner\na->>b: hi');
    expect(r.nativeSource!.split('\n')[0]).toBe('diagram "Inner" version=1');
    expect(r.diagnostics.some(d => d.code === 'MERMAID_FRONTMATTER_IGNORED')).toBe(false);
  });

  // Codex review round 1: YAML that a line-based reader got wrong, and boundaries that detection
  // and the import read differently.
  it('reads YAML as Mermaid does: comments, escapes, block scalars, other line endings', async () => {
    const r = await imported(
      '---\ntitle: "Checkout flow" # nav label\nnotes: "Caf\\xE9"\nlist: [a, b]\nnone:\n' +
        'config:\n  theme: "dark" # night\n---\nflowchart LR\n  A --> B',
    );
    expect(r.nativeSource!.split('\n').slice(0, 2)).toEqual([
      'diagram "Checkout flow" version=1',
      'theme blueprint',
    ]);
    expect(r.diagnostics.find(d => d.code === 'MERMAID_FRONTMATTER_IGNORED')?.message).toBe(
      'Frontmatter settings with no Draftably equivalent were ignored: notes, list, none.',
    );
    const scalar = '---\ntitle: x\nnote: |\n  a\n  ---\n  b\n---\nflowchart LR\nA-->B';
    expect((await imported(scalar)).status).not.toBe('failed');
    expect(detectSource(scalar).status).toBe('detected');
    const cr = '---\rtitle: X\r---\rflowchart LR\rA-->B';
    expect(detectSource(cr).status).toBe('detected');
    expect((await imported(cr)).nativeSource!.split('\n')[0]).toBe('diagram "X" version=1');
  });

  it('keeps a title with a line separator whole when it adds a theme', async () => {
    const r = await imported(
      '---\ntitle: "First\\u2028Second"\nconfig: {theme: dark}\n---\nflowchart LR\nA-->B',
    );
    expect(r.status).not.toBe('failed');
    expect(r.nativeSource!.split('\n')[1]).toBe('theme blueprint');
    await compile(r.nativeSource!);
  });

  it('refuses an unclosed block', async () => {
    const parsed = await parse('---\ntitle: X\nflowchart LR\nA-->B');
    expect(parsed.diagnostics.map(d => d.code)).toEqual(['MERMAID_FRONTMATTER_INVALID']);
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
    // The dotted cross loses its cross, so the import asks for a review.
    expect(r.status).toBe('needs-review');
    expect(lines(r.nativeSource!, 'group')).toEqual(['group box_1 "Client"']);
    expect(lines(r.nativeSource!, 'node')).toEqual(['node a "App" in=box_1', 'node b "b"']);
    expect(lines(r.nativeSource!, 'layout')).toEqual(['layout root sequence']);
    expect(lines(r.nativeSource!, 'edge')).toEqual([
      'edge m1 a -> b "call" message=call',
      'edge m2 b -> a "reply" answers=m1',
      'edge m3 a -> b "plain" head=none',
      'edge m4 a -> b "lost" head=cross',
      // A dotted line with another end is a reply with the plain arrowhead. It runs the same
      // way as the call, so it answers nothing.
      'edge m5 a -> b "late" message=reply',
      'edge m6 a -> b "both" tail=arrow',
    ]);
    expect(r.nativeSource).not.toContain('kind=async');
    expect(r.diagnostics.map(d => d.code)).toEqual(['MERMAID_SEQUENCE_DOTTED_END']);
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

  it('answers the nearest call with no answer yet, and each call once', async () => {
    const r = await run(`a->>b: outer
b->>c: inner
c-->>b: inner done
a-)b: fire
b-->>a: outer done
b-->>a: extra
c-->>c: to itself`);
    expect(lines(r.nativeSource!, 'edge')).toEqual([
      'edge m1 a -> b "outer" message=call',
      'edge m2 b -> c "inner" message=call',
      'edge m3 c -> b "inner done" answers=m2',
      'edge m4 a -> b "fire" message=send',
      // The nearest message from a to b with no answer is the send, then the call.
      'edge m5 b -> a "outer done" answers=m4',
      'edge m6 b -> a "extra" answers=m1',
      'edge m7 c -> c "to itself" message=reply',
    ]);
    await compile(r.nativeSource!);
  });

  it('keeps bars off, with both counts, when they are not from a call to its reply', async () => {
    const r = await run(`a->>b: go
activate a
b-->>a: back
deactivate a`);
    expect(lines(r.nativeSource!, 'layout')).toEqual(['layout root sequence']);
    const warning = r.diagnostics.find(d => d.code === 'MERMAID_SEQUENCE_ACTIVATION')!;
    expect(warning.message).toContain('gives 1 bar where the source draws 1');
    // Nested activations that match turn the bars on.
    const nested = await run(`a->>+b: one
b->>+c: two
c-->>-b: two done
b-->>-a: one done`);
    expect(lines(nested.nativeSource!, 'layout')).toEqual(['layout root sequence activations=on']);
    expect(nested.diagnostics).toEqual([]);
  });

  it('reports what has no native form and refuses half arrows', async () => {
    const r = await run(`autonumber
actor a
a->>+b: go
b-->>-a: back
a-)b: send`);
    // The bar runs from the call to its reply, so the native bars are the source's.
    expect(r.diagnostics.map(d => d.code).sort()).toEqual([
      'MERMAID_SEQUENCE_ACTOR_TYPE',
      'MERMAID_SEQUENCE_AUTONUMBER',
    ]);
    expect(lines(r.nativeSource!, 'layout')).toEqual(['layout root sequence activations=on']);
    expect(lines(r.nativeSource!, 'edge')).toEqual([
      'edge m1 a -> b "go" message=call',
      'edge m2 b -> a "back" answers=m1',
      'edge m3 a -> b "send" message=send',
    ]);
    await compile(r.nativeSource!);
    expect((await run('a-|\\b: half')).status).toBe('failed');
  });
});

describe('Mermaid gantt and timeline import', () => {
  const run = async (text: string) =>
    importMermaidFlow(await parse(text), makePlainLabel(dom.window.document));

  it('keeps Mermaid’s computed dates and draws `after` as dependencies', async () => {
    const imported = await run(`gantt
title Plan
dateFormat YYYY-MM-DD
excludes weekends
section Build
Index :done, a1, 2025-01-06, 10d
API :active, a2, after a1, 2w
Ship :milestone, m1, after a2, 0d
section Launch
Docs :crit, d1, 2025-02-03, 2025-02-14
Freeze :vert, v1, 2025-02-10, 0d`);
    expect(imported.status).toBe('ready');
    const src = imported.nativeSource!;
    // Ten working days from Monday Jan 6: Mermaid schedules the next task on Monday Jan 20 and
    // draws this bar to Saturday Jan 18, before the weekend it skips.
    expect(src).toContain(
      'node a1 "Index" in=section_1 from=2025-01-06 to=2025-01-18 progress=100',
    );
    expect(src).toContain('node a2 "API" in=section_1 from=2025-01-20 to=2025-02-07');
    expect(src).toContain('node m1 "Ship" in=section_1 at=2025-02-07');
    expect(src).toContain('color=red');
    expect(src).toContain('milestone v1 "Freeze" at=2025-02-10');
    expect(src).toMatch(/^edge \S+ a1 -> a2 ""$/m);
    expect(src).toContain('layout root timeline');
    const doc = projectScene(await compile(src));
    // Both dependencies draw on the chart, not through the router.
    expect(doc.layout.timelines![0].edges).toHaveLength(2);
    expect(imported.diagnostics.map(d => d.code)).toContain('MERMAID_GANTT_EXCLUDES');
  });

  it('keeps labels verbatim, centers milestones and reports what it cannot keep', async () => {
    const imported = await run(`gantt
dateFormat YYYY-MM-DD
section Build
section Build
Test List<T> parser :t1, 2025-01-01, 5d
Ship :milestone, m, 2025-01-06, 4d
Late :l1, after base.v2, 2d
base :base, 2025-01-01, 1d
base.v2 :base.v2, 2025-01-01, 90d
section Markers
Freeze :vert, v1, 2025-01-05, 0d`);
    expect(imported.status).toBe('needs-review');
    const src = imported.nativeSource!;
    expect(src).toContain('"Test List<T> parser"');
    // Mermaid centers a four-day milestone on its middle day.
    expect(src).toContain('node m "Ship" in=section_1 at=2025-01-08');
    // One band for a repeated section name, and none for a section with only a vertical rule.
    expect(src.match(/^group /gm)).toHaveLength(1);
    // Mermaid resolved `after base.v2` to another task, so no arrow claims otherwise.
    expect(src).not.toMatch(/-> l1/);
    expect(imported.diagnostics.map(d => d.code)).toContain('MERMAID_GANTT_AFTER');
    await compile(src);
    const reversed = await run(`gantt
dateFormat YYYY-MM-DD
Wrong :t, 2025-01-10, 2025-01-05`);
    expect(reversed.status).toBe('failed');
    expect(reversed.diagnostics.map(d => d.message).join()).toMatch(
      /2025-01-05, before it starts on 2025-01-10/,
    );
  });

  it('checks reversal on Mermaid’s own times, and reads <br> as a space', async () => {
    const reversed = await run(`gantt
dateFormat YYYY-MM-DD HH:mm
Backwards :milestone, m, 2025-01-10 16:00, 2025-01-05 08:00`);
    expect(reversed.status).toBe('failed');
    expect(reversed.diagnostics.map(d => d.code)).toContain('MERMAID_GANTT_REVERSED');
    const timeline = await run(`timeline
section Build<br>Deploy
2004 : Build<br>Launch`);
    expect(timeline.nativeSource).toContain('"Build Launch"');
    expect(timeline.nativeSource).toContain('"Build Deploy"');
  });

  it('places timeline periods on an ordinal axis, one row per event', async () => {
    const imported = await run(`timeline
title History
section Early
2002 : LinkedIn
2004 : Facebook : Google
section Later
2005 : YouTube`);
    expect(imported.status).toBe('ready');
    const src = imported.nativeSource!;
    expect(src).toContain('layout root timeline scale=ordinal');
    expect(src).toContain('node event_2_2 "Google" in=section_1 at=2004-01-01');
    await compile(src);
  });

  it('refuses a timeline whose periods are not dates, so the drop-in leaves it to Mermaid', async () => {
    const imported = await run(`timeline
Industry 1.0 : Machinery
Industry 2.0 : Electricity`);
    expect(imported.status).toBe('failed');
    expect(imported.diagnostics[0].code).toBe('MERMAID_TIMELINE_UNDATED');
  });
});
