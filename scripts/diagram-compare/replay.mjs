#!/usr/bin/env node
/**
 * Render every committed source into a new directory with the native renderers.
 * `--publish` also copies each SVG to the site and records render status in results.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCell } from './render.mjs';

const base = 'docs/evaluations/agent-diagrams';
const site = 'site/public/evaluations/agent-diagrams';
const target = process.argv[2];
const publish = process.argv.includes('--publish');
if (!target) throw Error('Usage: node scripts/diagram-compare/replay.mjs <new-dir> [--publish]');

const results = JSON.parse(await fs.readFile(`${base}/results.json`, 'utf8'));
if (publish) await fs.mkdir(site, { recursive: true });
let failed = 0;
for (const cell of results.cells) {
  const outputDir = path.join(target, cell.arm, cell.task, cell.tool);
  const result = await renderCell({
    tool: cell.tool,
    sourcePath: `${base}/${cell.source}`,
    outputDir,
  });
  console.log(`${cell.arm}/${cell.task}/${cell.tool}: ${result.status}`);
  if (result.status !== 'success') failed++;
  if (!publish) continue;
  cell.render = result.status;
  cell.renderer = `${result.renderer} ${result.rendererVersion ?? ''}`.trim();
  delete cell.image;
  delete cell.error;
  if (result.status === 'success') {
    cell.image = `${cell.arm}-${cell.task}-${cell.tool}.svg`;
    await fs.copyFile(path.join(outputDir, 'output.svg'), path.join(site, cell.image));
  } else {
    cell.error = (result.error || result.stderr).split('\n').slice(0, 3).join('\n');
  }
}
if (publish) await fs.writeFile(`${base}/results.json`, JSON.stringify(results, null, 2) + '\n');
console.log(`${results.cells.length - failed}/${results.cells.length} rendered`);
