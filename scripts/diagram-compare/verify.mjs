#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base = 'docs/evaluations/agent-diagrams';
const results = JSON.parse(await fs.readFile(`${base}/results.json`, 'utf8'));
const tasks = JSON.parse(await fs.readFile(`${base}/tasks.json`, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(await fs.readFile(`${base}/tasks.json`)), results.taskFileSha256);
for (const [tool, hash] of Object.entries(results.referenceHashes))
  assert.equal(sha(await fs.readFile(`scripts/diagram-compare/references/${tool}.txt`)), hash);
const audit = JSON.parse(await fs.readFile(`${base}/source-audit.json`, 'utf8'));
const repairAudit = JSON.parse(await fs.readFile(`${base}/repair-source-audit.json`, 'utf8'));
assert.equal(results.cells.length, 15);
assert.equal(new Set(results.cells.map(c => `${c.task}/${c.tool}`)).size, 15);
for (const c of results.cells) {
  assert(tasks.some(t => t.id === c.task));
  assert(['mermaid', 'draftably', 'd2', 'dot', 'svg'].includes(c.tool));
  assert.equal(
    audit.cells.find(a => a.task === c.task && a.tool === c.tool)?.source_sha256,
    c.sha256,
    'Source audit must match exact initial bytes',
  );
  const source = await fs.readFile(`${base}/${c.source}`);
  assert.equal(
    crypto.createHash('sha256').update(source).digest('hex'),
    c.sha256,
    `${c.task}/${c.tool}: initial evidence changed`,
  );
  assert.equal(source.length, c.sourceBytes);
  assert(c.sourceLines <= 200, `${c.task}/${c.tool}: line budget exceeded`);
  assert(['success', 'failed'].includes(c.initial.status));
  if (c.initial.status === 'success')
    assert((await fs.readFile(c.initial.svgPath, 'utf8')).includes('<svg'));
  else assert(c.initial.error);
  assert(c.repair, 'Every cell needs a recorded repair decision');
  assert.equal(c.repair.responseCount, 1);
  const repaired = await fs.readFile(`${base}/${c.repair.source}`);
  assert.equal(sha(repaired), c.repair.sha256);
  assert.equal(
    repairAudit.cells.find(a => a.task === c.task && a.tool === c.tool)?.source_sha256,
    c.repair.sha256,
  );
  assert(c.repair.sourceLines <= 200);
  assert(['changed', 'unchanged'].includes(c.repair.decision));
  assert.equal(c.repair.decision === 'unchanged', c.sha256 === c.repair.sha256);
  if (results.repairedRenderRun) {
    assert(c.repair.render, 'Final run needs all repair render records');
    assert(['success', 'failed'].includes(c.repair.render.status));
    if (c.repair.render.status === 'success')
      assert((await fs.readFile(c.repair.render.svgPath, 'utf8')).includes('<svg'));
    else assert(c.repair.render.error);
  }
}
console.log(
  'Verified 15 unique cells, immutable initial hashes, line budgets, render evidence and repair decisions.',
);
