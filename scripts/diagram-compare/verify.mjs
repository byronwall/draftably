#!/usr/bin/env node
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base = 'docs/evaluations/agent-diagrams';
const results = JSON.parse(await fs.readFile(`${base}/results.json`, 'utf8'));
const tasks = JSON.parse(await fs.readFile(`${base}/tasks.json`, 'utf8'));
assert.equal(results.cells.length, 15);
assert.equal(new Set(results.cells.map(c => `${c.task}/${c.tool}`)).size, 15);
for (const c of results.cells) {
  assert(tasks.some(t => t.id === c.task));
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
}
console.log(
  'Verified 15 unique cells, immutable initial hashes, line budgets, render evidence and repair decisions.',
);
