/** Regenerate only these six controlled Mermaid fixtures; no arbitrary foreign files are opened. */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { makePlainLabel } from './mermaid-facade.js';
import { parseMermaidFlowNode } from './mermaid-node.js';
import { importMermaidFlow } from './mermaid-importer.js';

const sources: Record<string, string> = {
  nested: `flowchart LR
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
class A ok
`,
  explicitUndirected: `flowchart RL
A request@--> B
B --- C
`,
  richLabels: `flowchart BT
A["<b>API</b><br/>#9829;"] --> B[(Store)]
B --> D(Complete)
click A "https://import.invalid/private"
style A fill:#abc,stroke:#def,color:#123,font-size:20px
C@{ img: "https://import.invalid/logo.svg", label: "Asset" }
`,
  malformed: 'flowchart LR\nA[Missing\n',
  unsupportedFamily: 'sequenceDiagram\nparticipant A as Alice\nparticipant B as Bob\nA->>B: Hello\n',
  unsupportedArrow: 'flowchart LR\nA <--> B\n',
};

const directory = dirname(fileURLToPath(import.meta.url));
const kit = basename(directory) === 'dist' ? dirname(directory) : directory;
const destination = join(kit, 'fixtures', 'mermaid');
await mkdir(destination, { recursive: true });
const dom = new JSDOM('');
try {
  const plainText = makePlainLabel(dom.window.document);
  for (const [name, source] of Object.entries(sources)) {
    const parsed = await parseMermaidFlowNode(source);
    const result = importMermaidFlow(parsed, plainText, 'Mermaid ' + name);
    await writeFile(join(destination, name + '.mmd'), source);
    await writeFile(join(destination, name + '.expected.json'), JSON.stringify(result, null, 2) + '\n');
    if (result.nativeSource) await writeFile(join(destination, name + '.draft'), result.nativeSource);
    else await rm(join(destination, name + '.draft'), { force: true });
    console.log('[fixture]', name, result.status, result.facts
      ? `${result.facts.objects.length} objects / ${result.facts.edges.length} edges` : 'no native output');
  }
} finally {
  dom.window.close();
}
