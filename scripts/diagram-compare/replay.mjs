#!/usr/bin/env node
/** Re-render committed native sources into a new directory; never overwrite evidence. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCell } from './render.mjs';
const target = process.argv[2];
const phase = process.argv[3] || 'initial';
if (!['initial', 'repaired'].includes(phase)) throw Error('Phase must be initial or repaired');
if (!target)
  throw Error(
    'Usage: node scripts/diagram-compare/replay.mjs <new-output-directory> [initial|repaired]',
  );
const results = JSON.parse(
  await fs.readFile('docs/evaluations/agent-diagrams/results.json', 'utf8'),
);
let failed = 0;
for (const cell of results.cells) {
  const result = await renderCell({
    tool: cell.tool,
    sourcePath: path.join(
      'docs/evaluations/agent-diagrams',
      phase === 'initial' ? cell.source : cell.repair.source,
    ),
    outputDir: path.join(target, cell.task, cell.tool),
  });
  console.log(`${cell.task}/${cell.tool}: ${result.status}`);
  if (result.status !== 'success') failed++;
}
if (failed) process.exitCode = 1;
