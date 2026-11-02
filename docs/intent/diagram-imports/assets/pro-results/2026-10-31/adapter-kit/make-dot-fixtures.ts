/** Regenerate only these controlled DOT fixtures. No renderer or external resource loader runs. */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importDot } from './dot-importer.js';

const sources: Record<string, string> = {
  nested: `digraph Pipeline {
  rankdir=LR;
  node [shape=box];
  subgraph cluster_backend {
    label="Backend";
    api [label="API",style=filled,fillcolor="#dbeafe",color="#2563eb",fontcolor="#172033"];
    subgraph cluster_data {
      label="Data";
      db [label="Store",shape=circle];
    }
  }
  user -> api [label="request"];
  api -> db [label="read"];
  api -> db [label="write",style=dashed];
}
`,
  strictUndirected: `strict graph Relationships {
  node [shape=box];
  a:e -- b:w [label="first"];
  b:s -- a:n [label="latest"];
  b -- b [label="self"];
}
`,
  scopedDefaults: `digraph Scopes {
  node [shape=box,label="Root default"];
  a;
  subgraph local {
    node [label="Local default"];
    b;
    a [label="Shared identity"];
  }
  c;
  edge [headport=n];
  a:e -> b:s [label="explicit endpoint beats default"];
  b -> c [label="non-ranking",constraint=0];
}
`,
  uniqueSets: `digraph Sets {
  node [shape=box];
  {a:n a:s b:e} -> {c c d} -> e [label="work"];
}
`,
  safeIdsAndLabels: `digraph Named {
  node [shape=box];
  subgraph cluster_named { label="\\G"; "root" [label="line\\nnext"]; }
  subgraph cluster_empty { "a\\nb" [label="Explicit escaped-ID label"]; }
  "a b" -> "a_u20_b";
  edge_1 -> "root";
  "__proto__" -> "constructor";
}
`,
  anonymousRank: `digraph Ranking {
  node [shape=box];
  {rank=same; a; b;}
  a -> b;
}
`,
  directionAndStyle: `digraph Appearance {
  rankdir=RL;
  node [shape=box];
  a [shape=cylinder,image="https://import.invalid/logo.svg"];
  a -> b [color="#ff0000",style=bold];
}
`,
  compassApproximation: `digraph Compass {
  node [shape=box];
  a:ne -> b:c;
}
`,
  malformed: 'digraph Broken { a -> }\n',
  nonPrefixCluster: 'digraph G { node[shape=box]; subgraph service { cluster=true; label="Service"; a; b; } }\n',
  recordPorts: 'digraph G { a[shape=record,label="<p> field|other"]; a:p -> b; }\n',
  htmlLabel: 'digraph G { a[label=<<TABLE><TR><TD PORT="p">Field</TD></TR></TABLE>>]; }\n',
  unsupportedArrow: 'digraph G { node[shape=box]; a -> b[dir=both]; }\n',
  entityLabel: 'digraph G { node[shape=box]; a[label="&beta;"]; }\n',
  parserSubgraphOperand: 'digraph G { a -> subgraph selected { b; c; } }\n',
};

const directory = dirname(fileURLToPath(import.meta.url));
const kit = basename(directory) === 'dist' ? dirname(directory) : directory;
const destination = join(kit, 'fixtures', 'dot');
await mkdir(destination, { recursive: true });
for (const [name, source] of Object.entries(sources)) {
  const result = importDot(source, 'DOT ' + name);
  await writeFile(join(destination, name + '.dot'), source);
  await writeFile(join(destination, name + '.expected.json'), JSON.stringify(result, null, 2) + '\n');
  if (result.nativeSource) await writeFile(join(destination, name + '.draft'), result.nativeSource);
  else await rm(join(destination, name + '.draft'), { force: true });
  console.log('[fixture]', name, result.status, result.facts
    ? result.facts.objects.length + ' objects / ' + result.facts.edges.length + ' edges' : 'no native output');
}
