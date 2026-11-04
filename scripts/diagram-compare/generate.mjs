#!/usr/bin/env node
/** Ask one model for every task × format × arm, each in a fresh tool-less `claude -p` process. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const base = 'docs/evaluations/agent-diagrams';
const model = process.argv[2] || 'claude-opus-5-5';
export const formats = {
  mermaid: { name: 'Mermaid', ext: 'mmd' },
  draftably: { name: 'Draftably', ext: 'draft' },
  d2: { name: 'D2', ext: 'd2' },
  dot: { name: 'Graphviz DOT', ext: 'dot' },
  svg: { name: 'raw SVG', ext: 'svg' },
};
// Optional arm names after the model run only those arms.
const arms = process.argv.length > 3 ? process.argv.slice(3) : ['bare', 'reference'];

const tasks = JSON.parse(await fs.readFile(`${base}/tasks.json`, 'utf8'));
const template = await fs.readFile(`${base}/prompt.txt`, 'utf8');
const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-compare-'));

async function run(arm, task, tool) {
  const { name, ext } = formats[tool];
  const reference =
    arm === 'reference'
      ? `\nReference for ${name}:\n\n` +
        (await fs.readFile(`scripts/diagram-compare/references/${tool}.txt`, 'utf8'))
      : '';
  const prompt = template
    .replace('{{TASK}}', task.prompt)
    .replaceAll('{{FORMAT}}', name)
    .replace('{{REFERENCE}}', reference);
  // No tools, settings, MCP servers or project files: the model sees only the prompt.
  const { stdout } = await exec(
    'claude',
    [
      '-p',
      '--model',
      model,
      '--tools',
      '',
      '--strict-mcp-config',
      '--setting-sources',
      '',
      '--system-prompt',
      'You are a helpful assistant.',
      '--output-format',
      'json',
      prompt,
    ],
    { cwd: empty, maxBuffer: 16 * 1024 * 1024, timeout: 600_000 },
  );
  const reply = JSON.parse(stdout);
  let source = reply.result.trim();
  const fenced = source.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
  if (fenced) source = fenced[1];
  const file = `${arm}/${task.id}/${tool}.${ext}`;
  await fs.mkdir(path.dirname(`${base}/${file}`), { recursive: true });
  await fs.writeFile(`${base}/${file}`, source + '\n');
  console.log(`${file}: ${source.split('\n').length} lines`);
  return {
    arm,
    task: task.id,
    tool,
    source: file,
    model: Object.keys(reply.modelUsage ?? {}).join(', '),
    fencesStripped: Boolean(fenced),
    lines: source.split('\n').length,
    bytes: Buffer.byteLength(source + '\n'),
    costUsd: reply.total_cost_usd,
  };
}

const jobs = arms.flatMap(arm =>
  tasks.flatMap(task => Object.keys(formats).map(tool => () => run(arm, task, tool))),
);
// Five at a time; results keep the job order.
const cells = [];
let next = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < jobs.length) {
      const i = next++;
      cells[i] = await jobs[i]();
    }
  }),
);
// Keep the rows of other arms, such as the tooled arm from tooled.mjs.
const old = JSON.parse(
  await fs.readFile(`${base}/results.json`, 'utf8').catch(() => '{"cells":[]}'),
);
const kept = old.cells.filter(c => !arms.includes(c.arm));
const order = c =>
  ['bare', 'reference', 'tooled'].indexOf(c.arm) * 100 +
  tasks.findIndex(t => t.id === c.task) * 10 +
  Object.keys(formats).indexOf(c.tool);
await fs.writeFile(
  `${base}/results.json`,
  JSON.stringify(
    {
      ...old,
      model,
      generated: new Date().toISOString().slice(0, 10),
      cells: [...kept, ...cells].sort((a, b) => order(a) - order(b)),
    },
    null,
    2,
  ) + '\n',
);
