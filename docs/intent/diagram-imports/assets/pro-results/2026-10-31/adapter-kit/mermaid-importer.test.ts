import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { parseMermaidFlowNode } from './mermaid-node.js';
import { makePlainLabel } from './mermaid-facade.js';
import { importMermaidFlow } from './mermaid-importer.js';

async function convert(source: string) {
  const parsed = await parseMermaidFlowNode(source);
  const dom = new JSDOM('');
  try { return importMermaidFlow(parsed, makePlainLabel(dom.window.document)); }
  finally { dom.window.close(); }
}

test('Mermaid: nested groups, shadow group vertex, implicit IDs, chain, parallel edges, class colors', async () => {
  const result = await convert(`flowchart LR
subgraph system[System]
  direction TB
  A[API]
  subgraph workers[Workers]
    B{Ready?}
    C[Store]
  end
end
X --> system
A -->|send| B --> C
B -. retry .-> A
A --> B
classDef ok fill:#dbeafe,stroke:#123456,color:#000
class A ok`);
  assert.equal(result.status, 'needs-review');
  assert.equal(result.facts?.objects.length, 6); // 2 groups, A/B/C/X; no extra 'system' vertex.
  assert.equal(result.facts?.edges.length, 5);
  assert.equal(result.facts?.objects.filter((o) => o.id === 'system').length, 1);
  assert.equal(result.facts?.objects.find((o) => o.id === 'workers')?.parent, 'system');
  assert.equal(result.facts?.objects.find((o) => o.id === 'B')?.parent, 'workers');
  assert.equal(result.facts?.objects.find((o) => o.id === 'B')?.shape, 'diamond');
  assert.equal(result.facts?.objects.find((o) => o.id === 'X')?.label, 'X');
  assert.deepEqual(result.facts?.edges.map(({ from, to, label }) => [from, to, label]), [
    ['X', 'system', ''], ['A', 'B', 'send'], ['B', 'C', ''], ['B', 'A', 'retry'], ['A', 'B', ''],
  ]);
  assert.equal(result.facts?.edges.find((e) => e.label === 'retry')?.dashed, true);
  assert.deepEqual(result.facts?.colors, [{ name: 'import_1', fill: '#dbeafe', stroke: '#123456', ink: '#000000' }]);
  assert.ok(result.nativeSource?.includes('layout system flow direction=down'));
  assert.ok(result.nativeSource?.includes('layout workers flow direction=down'));
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_SUBGRAPH_LAYOUT'));
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_INHERITED_LAYOUT'));
  assert.ok(result.nativeSource?.includes('kind=async'));
});

test('Mermaid: implicit group directions use an explicit reported ancestor/root normalization', async () => {
  const result = await convert(`flowchart LR
subgraph g[Horizontal]
  A --> B
  subgraph nested[Nested]
    C --> D
  end
end
subgraph v[Vertical]
  direction TB
  subgraph deep[Deep]
    E --> F
  end
end`);
  assert.equal(result.status, 'needs-review');
  assert.deepEqual(Object.fromEntries(result.facts!.layouts.map((l) => [l.scope, [l.kind, l.direction]])), {
    root: ['flow', 'right'], nested: ['flow', 'right'], g: ['flow', 'right'],
    deep: ['flow', 'down'], v: ['flow', 'down'],
  });
  assert.deepEqual(result.diagnostics.filter((d) => d.code === 'MERMAID_INHERITED_LAYOUT')
    .flatMap((d) => d.foreignIds ?? []).sort(), ['deep', 'g', 'nested']);
  assert.deepEqual(result.diagnostics.filter((d) => d.code === 'MERMAID_SUBGRAPH_LAYOUT')
    .flatMap((d) => d.foreignIds ?? []), ['v']);
});

test('Mermaid: explicit edge ID and undirected prerequisite preserve identity and direction', async () => {
  const result = await convert('flowchart RL\nA request@--> B\nB --- C');
  assert.equal(result.status, 'needs-review');
  assert.deepEqual(result.facts?.edges.map((e) => [e.id, e.from, e.to, e.directed]), [
    ['request', 'A', 'B', true], ['edge_2', 'B', 'C', false],
  ]);
  assert.deepEqual(result.requires, ['IMP-02-native-undirected']);
  assert.ok(result.nativeSource?.includes('directed=false'));
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_REVERSED_LAYOUT'));
});

test('Mermaid: unsupported arrowheads and invisible constraints block all output', async () => {
  for (const source of ['flowchart LR\nA <--> B', 'flowchart LR\nA o--o B', 'flowchart LR\nA ~~~ B']) {
    const result = await convert(source);
    assert.equal(result.status, 'failed');
    assert.equal(result.nativeSource, undefined);
    assert.equal(result.facts, undefined);
  }
});

test('Mermaid: label entities and HTML become safe text; resources and unsupported CSS are reported', async () => {
  const result = await convert(`flowchart BT
A["<b>API</b><br/>#9829;"] --> B[(Store)]
click A "https://import.invalid/private"
style A fill:#abc,stroke:#def,color:#123,font-size:20px
C@{ img: "https://import.invalid/logo.svg", label: "Asset" }`);
  assert.equal(result.status, 'needs-review');
  assert.equal(result.facts?.objects.find((o) => o.id === 'A')?.label, 'API\n♥');
  assert.equal(result.facts?.objects.find((o) => o.id === 'B')?.shape, 'box');
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_HTML_LABEL'));
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_STYLE_PROPERTY'));
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_ASSET_OMITTED'));
  assert.ok(result.diagnostics.some((d) => d.code === 'MERMAID_LINK_OMITTED'));
  assert.ok(!result.nativeSource?.includes('https://'));
  assert.ok(!result.nativeSource?.includes('<b>'));
});

test('Mermaid: malformed and wrong-family input never yield partial native source', async () => {
  for (const source of ['flowchart LR\nA[missing', 'sequenceDiagram\nA->>B: hi']) {
    const result = await convert(source);
    assert.equal(result.status, 'failed');
    assert.equal(result.nativeSource, undefined);
  }
});
