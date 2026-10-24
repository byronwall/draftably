#!/usr/bin/env node
/**
 * Compare the diagram quality audit between a base ref and the working tree, across the audit
 * corpus, the held-out diagrams and the examples. See docs/CHECKS.md.
 *
 *   node scripts/audit-compare.mjs [--base origin/main] [--sets corpus,heldout,examples]
 *                                  [--only slug,slug] [--shots] [--out tmp/audit/compare]
 *
 * The base side runs this checkout's audit script and inputs against the base ref's engine, so
 * the two sides differ only in the code under test. The base ref is checked out once into
 * `tmp/audit-base/<sha>`, and each set's base results are cached there by the audit script,
 * the inputs and the flags. Sets run in parallel. Writes `<out>/<side>/<set>/` (the audit's
 * usual output; the working tree's summary carries each render's base defect index) and
 * `<out>/compare.md`, which is also printed.
 */
import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf(name);
  return i < 0 ? false : (args.splice(i, 1), true);
};
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args.splice(i, 2)[1];
};
const shots = flag('--shots');
const baseRef = option('--base', 'origin/main');
const setNames = option('--sets', 'corpus,heldout,examples').split(',');
const only = option('--only');
const outDir = path.resolve(option('--out', 'tmp/audit/compare'));
if (args.length) {
  console.error(
    'Usage: node scripts/audit-compare.mjs [--base <ref>] [--sets corpus,heldout,examples] [--only a,b] [--shots] [--out <dir>]',
  );
  process.exit(1);
}

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const sha = git('rev-parse', '--verify', `${baseRef}^{commit}`);
const short = sha.slice(0, 10);

// ---------- sets ----------
const SET_DIRS = {
  corpus: 'docs/intent/diagram-quality/corpus',
  heldout: 'docs/intent/diagram-quality/heldout',
};
/** The examples are single files; the audit wants one folder per diagram with a `v0.draft`. */
function examplesSet() {
  const dir = path.join(outDir, 'inputs/examples');
  fs.rmSync(dir, { recursive: true, force: true });
  for (const f of fs.readdirSync(path.join(root, 'examples')).filter(f => f.endsWith('.draft'))) {
    fs.mkdirSync(path.join(dir, f.replace('.draft', '')), { recursive: true });
    fs.copyFileSync(
      path.join(root, 'examples', f),
      path.join(dir, f.replace('.draft', ''), 'v0.draft'),
    );
  }
  return dir;
}
const sets = setNames.map(name => {
  if (name === 'examples') return { name, dir: examplesSet() };
  if (!SET_DIRS[name]) {
    console.error(`Unknown set "${name}". Sets: corpus, heldout, examples.`);
    process.exit(1);
  }
  return { name, dir: path.join(root, SET_DIRS[name]) };
});

// ---------- base checkout ----------
const SCRIPTS = ['scripts/diagram-audit.mjs', 'scripts/shoot.mjs'];
const baseRoot = path.join(root, 'tmp/audit-base', short);
if (!fs.existsSync(path.join(baseRoot, 'package.json'))) {
  console.log(`Checking out ${baseRef} (${short}) into ${path.relative(root, baseRoot)}`);
  fs.mkdirSync(path.dirname(baseRoot), { recursive: true });
  git('worktree', 'add', '--quiet', '--detach', '--force', baseRoot, sha);
}
// The base checkout has no node_modules; packages resolve up the tree to this checkout's. Its
// `draftably.mjs` would rebuild with its own (missing) Vite, so build its CLI from here.
if (!fs.existsSync(path.join(baseRoot, 'dist-cli/main.js')))
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/vite/bin/vite.js'),
      'build',
      '--ssr',
      'src/cli/main.ts',
      '--outDir',
      'dist-cli',
      '--target',
      'node22',
      '--logLevel',
      'error',
    ],
    { cwd: baseRoot, stdio: ['ignore', 'ignore', 'inherit'] },
  );
// Measure both sides with this checkout's script, so the defect index is comparable. The copies
// sit in the base checkout's ignored tmp/ (so it stays clean for `gh stack rebase`), beside a link
// to its own CLI.
const baseScripts = path.join(baseRoot, 'tmp/audit-scripts');
fs.mkdirSync(path.join(baseScripts, 'scripts'), { recursive: true });
for (const s of SCRIPTS) fs.copyFileSync(path.join(root, s), path.join(baseScripts, s));
const cliLink = path.join(baseScripts, 'scripts/draftably.mjs');
if (!fs.existsSync(cliLink)) fs.symlinkSync(path.join(baseRoot, 'scripts/draftably.mjs'), cliLink);

/** What a base result depends on besides the ref: the audit scripts, the inputs and the flags. */
function cacheKey(set) {
  const hash = crypto.createHash('sha1');
  for (const s of SCRIPTS) hash.update(fs.readFileSync(path.join(root, s)));
  const files = fs.readdirSync(set.dir, { recursive: true }).filter(f => f.endsWith('.draft'));
  for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(set.dir, f)));
  return hash
    .update(`${shots}|${only ?? ''}`)
    .digest('hex')
    .slice(0, 12);
}

// ---------- run ----------
// Build this checkout's CLI once up front, so parallel audits don't race to rebuild it.
execFileSync(process.execPath, [path.join(root, 'scripts/draftably.mjs'), '--help'], {
  stdio: 'ignore',
});

fs.mkdirSync(path.join(outDir, 'logs'), { recursive: true });
function audit(side, cwd, set, out, extra = []) {
  const log = path.join(outDir, 'logs', `${side}-${set.name}.log`);
  const argv = [path.join(cwd, 'scripts/diagram-audit.mjs'), set.dir, out, ...extra];
  if (!shots) argv.push('--no-shots');
  if (only) argv.push('--only', only);
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const stream = fs.createWriteStream(log);
    child.stdout.pipe(stream);
    child.stderr.pipe(stream);
    child.on('close', code => {
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      if (code) return reject(new Error(`${side} ${set.name} failed (exit ${code}); see ${log}`));
      console.log(`${side} ${set.name}: done in ${secs}s`);
      resolve();
    });
  });
}

const baseOut = set => path.join(baseRoot, 'tmp/audit-results', cacheKey(set), set.name);
const headOut = set => path.join(outDir, 'head', set.name);
await Promise.all(
  sets.map(async set => {
    const cached = baseOut(set);
    if (fs.existsSync(path.join(cached, 'summary.md'))) console.log(`base ${set.name}: cached`);
    else {
      fs.rmSync(cached, { recursive: true, force: true });
      await audit('base', baseScripts, set, cached);
    }
    fs.rmSync(path.join(outDir, 'base', set.name), { recursive: true, force: true });
    fs.mkdirSync(path.join(outDir, 'base'), { recursive: true });
    fs.cpSync(cached, path.join(outDir, 'base', set.name), { recursive: true });
    fs.rmSync(headOut(set), { recursive: true, force: true });
    await audit('head', root, set, headOut(set), [
      '--baseline',
      path.join(outDir, 'base', set.name),
    ]);
  }),
);

// ---------- compare ----------
function load(dir) {
  const renders = [];
  for (const slug of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, slug, 'metrics.json');
    if (!fs.existsSync(file)) continue;
    for (const r of JSON.parse(fs.readFileSync(file, 'utf8'))) renders.push({ slug, ...r });
  }
  return renders;
}
const mean = list => list.reduce((s, r) => s + r.defectIndex, 0) / Math.max(1, list.length);
const kinds = list => {
  const totals = {};
  for (const r of list) for (const i of r.issues ?? []) totals[i.kind] = (totals[i.kind] ?? 0) + 1;
  return totals;
};
const signed = n => (n > 0 ? `+${n}` : `${n}`);

const lines = [
  `# Audit: ${baseRef} (${short}) → working tree`,
  '',
  '| Set | Renders | Mean DI base | Mean DI head | Δ | Errors base/head |',
  '| --- | --- | --- | --- | --- | --- |',
];
const details = [];
for (const set of sets) {
  const base = load(path.join(outDir, 'base', set.name));
  const head = load(headOut(set));
  const ok = list => list.filter(r => !r.error);
  const [b, h] = [mean(ok(base)), mean(ok(head))];
  lines.push(
    `| ${set.name} | ${ok(head).length} | ${b.toFixed(1)} | ${h.toFixed(1)} | ${signed(+(h - b).toFixed(1))} | ${base.length - ok(base).length}/${head.length - ok(head).length} |`,
  );
  const [kb, kh] = [kinds(ok(base)), kinds(ok(head))];
  const changed = [...new Set([...Object.keys(kb), ...Object.keys(kh)])]
    .map(k => [k, kb[k] ?? 0, kh[k] ?? 0])
    .filter(([, x, y]) => x !== y)
    .sort((x, y) => Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1]));
  const moved = ok(head)
    .map(r => {
      const old = base.find(o => o.slug === r.slug && o.file === r.file && !o.error);
      return old && { name: `${r.slug} ${r.file}`, from: old.defectIndex, to: r.defectIndex };
    })
    .filter(m => m && m.from !== m.to)
    .sort((x, y) => Math.abs(y.to - y.from) - Math.abs(x.to - x.from));
  details.push('', `## ${set.name}`, '');
  if (!changed.length && !moved.length) {
    details.push('No change.');
    continue;
  }
  if (changed.length)
    details.push(
      '| Issue | Base | Head | Δ |',
      '| --- | --- | --- | --- |',
      ...changed.map(([k, x, y]) => `| ${k} | ${x} | ${y} | ${signed(y - x)} |`),
      '',
    );
  if (moved.length)
    details.push(
      '| Render | DI base | DI head | Δ |',
      '| --- | --- | --- | --- |',
      ...moved
        .slice(0, 15)
        .map(m => `| ${m.name} | ${m.from} | ${m.to} | ${signed(+(m.to - m.from).toFixed(1))} |`),
      ...(moved.length > 15 ? ['', `…and ${moved.length - 15} more renders changed.`] : []),
    );
}
lines.push(...details);
const report = lines.join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'compare.md'), report);
console.log(`\n${report}\nWrote ${path.relative(root, path.join(outDir, 'compare.md'))}`);
