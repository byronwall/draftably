#!/usr/bin/env node
/** Native render + repository screenshot proof. No model calls and no source repair. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { renderCell } from './render.mjs';
const exec = promisify(execFile);
const base = 'docs/evaluations/agent-diagrams';
const out = process.argv[2] || 'tmp/diagram-eval-ci';
const phase = process.argv[3] || 'initial';
if (!['initial', 'repaired'].includes(phase)) throw Error('Phase must be initial or repaired');
const tasks = JSON.parse(await fs.readFile(`${base}/tasks.json`, 'utf8'));
const formats = { mermaid: 'mmd', draftably: 'draft', d2: 'd2', dot: 'dot', svg: 'svg' };
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const browserVersion = browser.version();
await browser.close();
const environment = {
  commit: (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  browserVersion,
  graphviz: (await exec('dot', ['-V'])).stderr.trim(),
  generatedAt: new Date().toISOString(),
  generation: `No generation in CI; replays committed ${phase} source only.`,
  phase,
};
await fs.writeFile(path.join(out, 'environment.json'), JSON.stringify(environment, null, 2) + '\n');
let failures = 0;
const results = [];
for (const task of tasks) {
  const sheet = [];
  for (const [tool, ext] of Object.entries(formats)) {
    const dir = path.join(out, task.id, tool);
    const result = await renderCell({
      tool,
      sourcePath: `${base}/cells/${task.id}/${tool}/${phase}.${ext}`,
      outputDir: dir,
    });
    if (result.status === 'success') {
      try {
        await exec('pnpm', ['shoot', path.join(dir, 'output.svg'), path.join(dir, 'output.png')], {
          timeout: 120000,
          maxBuffer: 4 * 1024 * 1024,
        });
        await fs.writeFile(
          path.join(dir, 'display-960.html'),
          '<!doctype html><style>body{margin:0;background:white}img{display:block;width:960px;height:auto}</style><img src="output.svg" alt="Initial native diagram">',
        );
        await exec(
          'pnpm',
          ['shoot', path.join(dir, 'display-960.html'), path.join(dir, 'display-960.png')],
          { timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
        );
        sheet.push(`${tool}::${path.resolve(dir, 'output.svg')}`);
        result.captureStatus = 'success';
      } catch (error) {
        result.captureStatus = 'failed';
        result.captureError = String(error);
        failures++;
      }
    } else failures++;
    await fs.writeFile(
      path.join(dir, 'capture.json'),
      JSON.stringify(
        { status: result.captureStatus || 'not-attempted', error: result.captureError || null },
        null,
        2,
      ) + '\n',
    );
    results.push(result);
    console.log(`${task.id}/${tool}: ${result.status}`);
  }
  if (sheet.length) {
    try {
      await exec(
        'pnpm',
        ['shoot', '--sheet', path.join(out, `${task.id}-sheet.png`), '--cols', '2', ...sheet],
        { timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      );
    } catch (error) {
      failures++;
      await fs.writeFile(path.join(out, `${task.id}-sheet-error.txt`), String(error));
    }
  }
}
await fs.writeFile(
  path.join(out, 'summary.json'),
  JSON.stringify({ environment, results }, null, 2) + '\n',
);
if (failures) process.exitCode = 1;
