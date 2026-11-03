#!/usr/bin/env node
// Expands the exact native-agent handoff without generating or replacing outputs.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const base = 'docs/evaluations/agent-diagrams';
const tasks = JSON.parse(fs.readFileSync(`${base}/tasks.json`, 'utf8'));
const formats = { mermaid: 'mmd', draftably: 'draft', d2: 'd2', dot: 'dot', svg: 'svg' };
const template = fs.readFileSync('scripts/diagram-compare/generation-prompt.txt', 'utf8');
for (const task of tasks) {
  for (const [tool, ext] of Object.entries(formats)) {
    const dir = `${base}/cells/${task.id}/${tool}`;
    fs.mkdirSync(dir, { recursive: true });
    const prompt = template
      .replaceAll('{{ROOT}}', root)
      .replaceAll('{{TASK}}', task.id)
      .replaceAll('{{TOOL}}', tool)
      .replaceAll('{{EXT}}', ext);
    fs.writeFileSync(path.join(dir, 'prompt.txt'), prompt);
  }
}
console.log('Wrote 15 generation handoffs; no model invoked. Run each in a fresh context.');
