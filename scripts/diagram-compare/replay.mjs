#!/usr/bin/env node
/** Re-render committed native sources into a new directory; never overwrite evidence. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCell } from './render.mjs';
const target = process.argv[2];
if (!target) throw Error('Usage: node scripts/diagram-compare/replay.mjs <new-output-directory>');
const results = JSON.parse(
  await fs.readFile('docs/evaluations/agent-diagrams/results.json', 'utf8'),
);
let failed = 0;
for (const cell of results.cells) {
  const result = await renderCell({
    tool: cell.tool,
    sourcePath: path.join('docs/evaluations/agent-diagrams', cell.source),
    outputDir: path.join(target, cell.task, cell.tool),
  });
  console.log(`${cell.task}/${cell.tool}: ${result.status}`);
  if (result.status !== 'success') failed++;
}
if (failed) process.exitCode = 1;
