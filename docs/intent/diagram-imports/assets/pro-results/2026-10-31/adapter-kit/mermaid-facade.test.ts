import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseMermaidFlowNode } from './mermaid-node.js';
import { makePlainLabel } from './mermaid-facade.js';

const source = `flowchart LR
subgraph system[System]
  direction TB
  A[API]
  subgraph workers[Workers]
    B{Ready?}
    C[(Store)]
  end
end
A -->|send| B
B -. retry .-> A
A --> B
B --> C
classDef ok fill:#dbeafe,stroke:#123456
class A ok`;
const parsed = await parseMermaidFlowNode(source);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
assert.equal(parsed.snapshot.vertices.length, 3);
assert.equal(parsed.snapshot.edges.length, 4);
assert.equal(parsed.snapshot.groups.length, 2);
assert.equal(parsed.snapshot.edges.filter((e) => e.start === 'A' && e.end === 'B').length, 2);
assert.deepEqual(parsed.snapshot.groups.find((g) => g.id === 'system')?.nodes, ['A', 'workers']);
assert.equal(parsed.snapshot.groups.find((g) => g.id === 'system')?.dir, 'TB');
assert.equal(parsed.snapshot.edges.find((e) => e.text === 'retry')?.stroke, 'dotted');
console.log('[PASS] native-relevant snapshot: nested groups, explicit direction, labels, parallel and dashed edges.');

const malformed = await parseMermaidFlowNode('flowchart LR\nA[Missing');
assert.equal(malformed.ok, false);
assert.ok(malformed.diagnostics.some((d) => d.code === 'MERMAID_PARSE_ERROR'));
const sequence = await parseMermaidFlowNode('sequenceDiagram\nA->>B: message');
assert.equal(sequence.ok, false);
assert.equal(sequence.diagnostics[0].code, 'MERMAID_FAMILY_UNSUPPORTED');
const config = await parseMermaidFlowNode('%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\nA-->B');
assert.equal(config.ok, false);
assert.equal(config.diagnostics[0].code, 'MERMAID_CONFIGURATION_UNSUPPORTED');
const timeout = await parseMermaidFlowNode('flowchart LR\nA-->B', 1);
assert.equal(timeout.ok, false);
assert.equal(timeout.diagnostics[0].code, 'IMPORT_TIMEOUT');
console.log('[PASS] malformed/family/configuration rejection and real worker timeout.');

const asset = await parseMermaidFlowNode('flowchart LR\n A["<b>A</b><br/>line"] --> B["#9829; &amp; #quot;"]\nclick A "https://invalid.local/private"\n C@{ img: "https://invalid.local/image.png", label: "Asset" }');
if (!asset.ok) throw new Error(JSON.stringify(asset.diagnostics));
assert.ok(asset.diagnostics.some((d) => d.code === 'MERMAID_INTERACTION_IGNORED'));
assert.equal(asset.snapshot.vertices.find((v) => v.id === 'C')?.img, 'https://invalid.local/image.png');
const dom = new JSDOM('');
const plain = makePlainLabel(dom.window.document);
assert.equal(plain(asset.snapshot.vertices.find((v) => v.id === 'A')!.text), 'A\nline');
assert.equal(plain(asset.snapshot.vertices.find((v) => v.id === 'B')!.text), '♥ & "');
assert.equal(dom.window.document.body.innerHTML, '');
dom.window.close();
console.log('[PASS] HTML/line-break/entity text conversion; URLs remain unexecuted snapshot data.');
