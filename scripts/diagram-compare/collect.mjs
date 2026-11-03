#!/usr/bin/env node
/** Collect evidence without inferring semantic or visual quality from SVG structure. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const base = 'docs/evaluations/agent-diagrams';
const runDir = process.argv[2];
const repairedRunDir = process.argv[3];
const tasks = JSON.parse(await fs.readFile(`${base}/tasks.json`, 'utf8'));
const formats = { mermaid: 'mmd', draftably: 'draft', d2: 'd2', dot: 'dot', svg: 'svg' };
const cells = [];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const referenceHashes = {};
for (const tool of Object.keys(formats))
  referenceHashes[tool] = sha(await fs.readFile(`scripts/diagram-compare/references/${tool}.txt`));
for (const task of tasks)
  for (const [tool, ext] of Object.entries(formats)) {
    const dir = `${base}/cells/${task.id}/${tool}`;
    const source = await fs.readFile(`${dir}/initial.${ext}`, 'utf8');
    const evidenceDir = runDir ? path.join(runDir, task.id, tool) : `${dir}/initial`;
    const initial = JSON.parse(await fs.readFile(path.join(evidenceDir, 'render.json'), 'utf8'));
    // Keep the original CI metadata file untouched; manifest paths resolve in this checkout.
    if (initial.svgPath) {
      initial.originalSvgPath = initial.svgPath;
      initial.svgPath = path.join(evidenceDir, 'output.svg');
    }
    initial.evidenceRecord = path.join(evidenceDir, 'render.json');
    try {
      initial.capture = JSON.parse(
        await fs.readFile(path.join(evidenceDir, 'capture.json'), 'utf8'),
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    let repair = null;
    try {
      repair = JSON.parse(await fs.readFile(`${dir}/repair.json`, 'utf8'));
      const repairedSource = await fs.readFile(`${dir}/repaired.${ext}`, 'utf8');
      repair.source = `cells/${task.id}/${tool}/repaired.${ext}`;
      repair.sha256 = sha(repairedSource);
      repair.sourceBytes = Buffer.byteLength(repairedSource);
      repair.sourceLines = repairedSource.replace(/\n$/, '').split('\n').length;
      if (repairedRunDir) {
        const finalDir = path.join(repairedRunDir, task.id, tool);
        repair.render = JSON.parse(await fs.readFile(path.join(finalDir, 'render.json'), 'utf8'));
        repair.render.evidenceRecord = path.join(finalDir, 'render.json');
        if (repair.render.svgPath) {
          repair.render.originalSvgPath = repair.render.svgPath;
          repair.render.svgPath = path.join(finalDir, 'output.svg');
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    cells.push({
      task: task.id,
      tool,
      source: `cells/${task.id}/${tool}/initial.${ext}`,
      sha256: crypto.createHash('sha256').update(source).digest('hex'),
      sourceBytes: Buffer.byteLength(source),
      sourceLines: source.replace(/\n$/, '').split('\n').length,
      initial,
      repair,
    });
  }
const manifest = {
  schemaVersion: 1,
  canonicalRenderRun: runDir || 'local-initial',
  repairedRenderRun: repairedRunDir || null,
  taskFileSha256: sha(await fs.readFile(`${base}/tasks.json`)),
  referenceHashes,
  baseline: 'afac5d088a8b5a5791373a66300a869a62ee1af5',
  protocolCommit: '2997711',
  generation: {
    model: 'unavailable',
    seed: 'unavailable',
    temperature: 'unavailable',
    tokenUsage: 'unavailable',
    cost: 'unavailable',
    design:
      'One independent agent context per cell, one first-pass response, no renderer feedback. Nine cells before maintenance recovery and six afterward; exact backend/configuration continuity unverifiable.',
  },
  cells,
};
await fs.writeFile(path.join(base, 'results.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Collected ${cells.length} cells: ${cells.filter(c => c.initial.status === 'success').length} initial renders succeeded.`,
);
