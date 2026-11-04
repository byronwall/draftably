#!/usr/bin/env node
/**
 * The tooled arm: one agent session per task × format, in an empty folder that holds the
 * format's own CLI and docs. The agent may check and render its file and look at the PNG.
 * Bash runs only that CLI and `ls`; Read, Glob and Grep stay inside the folder.
 *
 * Usage: node scripts/diagram-compare/tooled.mjs <docs-dir> [task/format ...]
 * <docs-dir> has one folder per format (mermaid, d2, dot, svg) with the docs that README.md lists.
 * Needs `claude`, `d2`, `dot` and `rsvg-convert` on PATH; MMDC names the mmdc binary, and
 * MMDC_CONFIG an optional puppeteer config for it.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.join(root, 'docs/evaluations/agent-diagrams');
const model = 'claude-opus-5-5';
const maxTurns = 30;
const maxBudgetUsd = 3;
const timeoutMs = 15 * 60_000;

const formats = {
  mermaid: {
    name: 'Mermaid',
    ext: 'mmd',
    cli: 'mmdc',
    tools: 'the `mmdc` CLI from mermaid-cli (`mmdc --help`) and the Mermaid docs in docs/',
  },
  draftably: {
    name: 'Draftably',
    ext: 'draft',
    cli: 'draftably',
    tools:
      'the `draftably` CLI (`draftably --help`) and its agent skill in .claude/skills/draftably/SKILL.md',
  },
  d2: {
    name: 'D2',
    ext: 'd2',
    cli: 'd2',
    tools: 'the `d2` CLI (`d2 --help`) and the D2 docs in docs/',
  },
  dot: {
    name: 'Graphviz DOT',
    ext: 'dot',
    cli: 'dot',
    tools: 'the Graphviz `dot` CLI (`dot -?`) and the DOT docs in docs/',
  },
  svg: {
    name: 'raw SVG',
    ext: 'svg',
    cli: 'svg2png',
    tools:
      '`svg2png in.svg out.png`, which renders an SVG to PNG, and the MDN SVG tutorial in docs/',
  },
};

const docsDir = path.resolve(process.argv[2] ?? '');
if (!process.argv[2])
  throw Error('Usage: node scripts/diagram-compare/tooled.mjs <docs-dir> [task/format ...]');
const only = process.argv.slice(3);
const tasks = JSON.parse(await fs.readFile(`${base}/tasks.json`, 'utf8'));
const template = await fs.readFile(`${base}/prompt-tooled.txt`, 'utf8');
const logs = path.join(root, 'tmp/diagram-tooled');
await fs.mkdir(logs, { recursive: true });

// Wrappers on the agent's PATH. Draftably's `open` and `serve` start a server, so they are off.
const bin = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-tools-'));
const script = (name, body) =>
  fs.writeFile(path.join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
await script(
  'draftably',
  `case "$1" in open|serve) echo "draftably $1 is not available in this run" >&2; exit 1;; esac\n` +
    `exec "${process.execPath}" "${root}/scripts/draftably.mjs" "$@"`,
);
await script(
  'mmdc',
  `exec "${process.env.MMDC ?? 'mmdc'}" ${process.env.MMDC_CONFIG ? `-p "${process.env.MMDC_CONFIG}"` : ''} "$@"`,
);
await script('svg2png', 'exec rsvg-convert -o "$2" "$1"');
const env = {
  ...process.env,
  PATH: `${bin}:${process.env.PATH}`,
  DRAFTABLY_NO_UPDATE_CHECK: '1',
};

async function run(task, tool) {
  const { name, ext, cli, tools } = formats[tool];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `diagram-${task.id}-${tool}-`));
  if (tool === 'draftably') await exec('draftably', ['skill', 'install'], { cwd: dir, env });
  else await fs.cp(path.join(docsDir, tool), path.join(dir, 'docs'), { recursive: true });
  const prompt = template
    .replace('{{TASK}}', task.prompt)
    .replaceAll('{{FORMAT}}', name)
    .replaceAll('{{EXT}}', ext)
    .replace('{{TOOLS}}', tools);
  const allowed = [cli, 'ls'].map(c => `Bash(${c}:*)`);
  const started = Date.now();
  let stdout;
  try {
    ({ stdout } = await exec(
      'claude',
      [
        '-p',
        '--model',
        model,
        '--max-turns',
        String(maxTurns),
        '--max-budget-usd',
        String(maxBudgetUsd),
        '--tools',
        'Bash,Read,Write,Edit,Glob,Grep',
        '--allowedTools',
        ...allowed,
        '--permission-mode',
        'acceptEdits',
        '--strict-mcp-config',
        '--setting-sources',
        '',
        '--output-format',
        'stream-json',
        '--verbose',
        prompt,
      ],
      { cwd: dir, env, maxBuffer: 512 * 1024 * 1024, timeout: timeoutMs },
    ));
  } catch (error) {
    stdout = error.stdout ?? '';
  }
  await fs.writeFile(path.join(logs, `${task.id}-${tool}.jsonl`), stdout);
  const events = stdout
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
  const calls = events
    .filter(e => e.type === 'assistant')
    .flatMap(e => e.message.content.filter(c => c.type === 'tool_use'));
  const end = events.findLast(e => e.type === 'result') ?? {};
  const file = `tooled/${task.id}/${tool}.${ext}`;
  // An agent that saved no file scores an empty source, which fails to render.
  const source = await fs.readFile(path.join(dir, `diagram.${ext}`), 'utf8').catch(() => '');
  await fs.mkdir(path.dirname(`${base}/${file}`), { recursive: true });
  await fs.writeFile(`${base}/${file}`, source);
  const cell = {
    arm: 'tooled',
    task: task.id,
    tool,
    source: file,
    model: Object.keys(end.modelUsage ?? {}).join(', ') || model,
    stop: end.subtype ?? 'timeout',
    lines: source ? source.replace(/\n$/, '').split('\n').length : 0,
    bytes: Buffer.byteLength(source),
    turns: end.num_turns,
    cliCalls: calls.filter(c => c.name === 'Bash' && c.input.command.includes(cli)).length,
    imageViews: calls.filter(c => c.name === 'Read' && /\.png$/i.test(c.input.file_path ?? ''))
      .length,
    costUsd: end.total_cost_usd,
    durationMs: Date.now() - started,
  };
  console.log(`${file}: ${cell.stop}, ${cell.turns} turns, ${cell.cliCalls} CLI calls`);
  return cell;
}

const jobs = tasks.flatMap(task =>
  Object.keys(formats)
    .filter(tool => !only.length || only.includes(`${task.id}/${tool}`))
    .map(tool => () => run(task, tool)),
);
// Three at a time: mmdc and the SVG renderer each start a browser.
const cells = [];
let next = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (next < jobs.length) {
      const i = next++;
      cells[i] = await jobs[i]();
    }
  }),
);

// Replace this run's rows and keep every other row.
const results = JSON.parse(await fs.readFile(`${base}/results.json`, 'utf8'));
const key = c => `${c.arm}/${c.task}/${c.tool}`;
const fresh = new Set(cells.map(key));
const order = c =>
  [
    ['bare', 'reference', 'tooled'].indexOf(c.arm),
    tasks.findIndex(t => t.id === c.task),
    Object.keys(formats).indexOf(c.tool),
  ].join('.');
results.cells = [...results.cells.filter(c => !fresh.has(key(c))), ...cells].sort((a, b) =>
  order(a).localeCompare(order(b), undefined, { numeric: true }),
);
results.tooled = { maxTurns, maxBudgetUsd, timeoutMinutes: timeoutMs / 60_000 };
await fs.writeFile(`${base}/results.json`, JSON.stringify(results, null, 2) + '\n');
