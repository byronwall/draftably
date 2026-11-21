#!/usr/bin/env node
/**
 * Compare the diagram quality audit between a base ref and the working tree, across the audit
 * corpus, the held-out diagrams, the examples, the issue reproductions and the population of
 * docs diagrams. See docs/CHECKS.md.
 *
 *   node scripts/audit-compare.mjs [--base origin/main] [--sets corpus,heldout,examples,issues]
 *                                  [--only slug,slug] [--shots] [--gate | --gate=flat]
 *                                  [--review] [--out tmp/audit/compare]
 *
 * `--gate` checks the frequency-weighted rules in docs/CHECKS.md ("Ratchet gate for heuristic changes"),
 * prints PASS, WARN or FAIL per rule and the top movers, and exits 1 when a rule fails.
 * `--gate=flat` checks the older flat rules ("Flat gate") instead.
 * `--review` writes `<out>/review.html` and `<out>/review.pdf`: before and after for every render
 * that changed, grouped by shape bucket. `--gate` and `--review` add the population set to the
 * default sets.
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
const review = flag('--review');
/** `--gate` runs the frequency-weighted rules (`--gate=weighted` too); `--gate=flat` the flat ones. */
const gate = flag('--gate=flat')
  ? 'flat'
  : flag('--gate=weighted') || flag('--gate')
    ? 'weighted'
    : undefined;
const baseRef = option('--base', 'origin/main');
const setNames = option(
  '--sets',
  gate === 'weighted' || review
    ? 'corpus,heldout,examples,issues,population'
    : 'corpus,heldout,examples,issues',
).split(',');
const only = option('--only');
const outDir = path.resolve(option('--out', 'tmp/audit/compare'));
if (args.length) {
  console.error(
    'Usage: node scripts/audit-compare.mjs [--base <ref>] [--sets corpus,heldout,examples,issues,population] [--only a,b] [--shots] [--gate | --gate=flat] [--review] [--out <dir>]',
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
  issues: 'docs/intent/diagram-quality/issues',
  population: 'docs/intent/diagram-quality/population',
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
    console.error(`Unknown set "${name}". Sets: corpus, heldout, examples, issues, population.`);
    process.exit(1);
  }
  return { name, dir: path.join(root, SET_DIRS[name]) };
});

// ---------- base checkout ----------
// The audit measures text with this checkout's font table, so both sides measure alike.
const SCRIPTS = [
  'scripts/diagram-audit.mjs',
  'scripts/shoot.mjs',
  'scripts/lib/buckets.mjs',
  'src/model/font-metrics.json',
];
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
for (const s of SCRIPTS) {
  fs.mkdirSync(path.dirname(path.join(baseScripts, s)), { recursive: true });
  fs.copyFileSync(path.join(root, s), path.join(baseScripts, s));
}
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
/** Issue counts by kind; crossings and back edges count too, as `crossing` and `back-edge`. */
const kindsOf = r => {
  const totals = {};
  for (const i of r.issues ?? []) totals[i.kind] = (totals[i.kind] ?? 0) + 1;
  if (r.crossings) totals.crossing = r.crossings;
  if (r.backEdges) totals['back-edge'] = r.backEdges;
  return totals;
};
const kinds = (list, weightOf = () => 1) => {
  const totals = {};
  for (const r of list)
    for (const [k, n] of Object.entries(kindsOf(r))) totals[k] = (totals[k] ?? 0) + n * weightOf(r);
  return totals;
};
const signed = n => (n > 0 ? `+${n}` : `${n}`);

const loaded = {};
for (const set of sets)
  loaded[set.name] = { base: load(path.join(outDir, 'base', set.name)), head: load(headOut(set)) };
const ok = list => list.filter(r => !r.error);

// ---------- frequency weights ----------
// Each render's bucket has a share of the docs-diagram population (weights.json). Renders in one
// bucket split its share, so a bucket's renders together carry its share; a bucket no docs
// diagram falls in counts as half a diagram. Weights are scaled to average 1 over the renders
// they cover, so a weighted count reads in renders. See docs/CHECKS.md ("Frequency weights").
const weightsFile = path.join(root, SET_DIRS.population, 'weights.json');
const population = fs.existsSync(weightsFile)
  ? JSON.parse(fs.readFileSync(weightsFile, 'utf8'))
  : undefined;
const shareOf = bucket => (population.buckets[bucket] ?? 0.5) / population.total;
const medianShare = (() => {
  if (!population) return 0;
  const shares = Object.values(population.buckets)
    .map(c => c / population.total)
    .sort((a, b) => a - b);
  const mid = shares.length / 2;
  return shares.length % 2 ? shares[Math.floor(mid)] : (shares[mid - 1] + shares[mid]) / 2;
})();
/** How far one render's DI may rise under the weighted gate: 1.0 at the median bucket share. */
const limitOf = bucket => Math.min(4, Math.max(0.5, medianShare / shareOf(bucket)));
const keyOf = (set, r) => `${set}/${r.slug} ${r.file}`;
/** The render's bucket, from either side (a render that fails to build on one side keeps it). */
const bucketOf = (set, r) =>
  r.shape?.bucket ??
  [...loaded[set].head, ...loaded[set].base].find(
    o => o.slug === r.slug && o.file === r.file && o.shape,
  )?.shape.bucket ??
  'unknown';
/** Weights for the renders of the given sets, keyed by `set/slug file`. */
function weigh(setList) {
  const renders = setList.flatMap(set =>
    loaded[set].head.map(r => ({ key: keyOf(set, r), bucket: bucketOf(set, r) })),
  );
  const perBucket = {};
  for (const r of renders) perBucket[r.bucket] = (perBucket[r.bucket] ?? 0) + 1;
  const raw = renders.map(r => shareOf(r.bucket) / perBucket[r.bucket]);
  const scale =
    renders.length /
    Math.max(
      1e-9,
      raw.reduce((a, b) => a + b, 0),
    );
  return new Map(renders.map((r, i) => [r.key, raw[i] * scale]));
}
/** Weighted mean DI of one side, over renders that build on both sides. */
function weightedMean(setList, side, weights) {
  let sum = 0,
    total = 0;
  for (const set of setList)
    for (const r of loaded[set][side]) {
      const other = loaded[set][side === 'head' ? 'base' : 'head'].find(
        o => o.slug === r.slug && o.file === r.file,
      );
      if (r.error || !other || other.error) continue;
      const w = weights.get(keyOf(set, r)) ?? 0;
      sum += w * r.defectIndex;
      total += w;
    }
  return sum / Math.max(1e-9, total);
}

const lines = [
  `# Audit: ${baseRef} (${short}) → working tree`,
  '',
  population
    ? '| Set | Renders | Mean DI base | Mean DI head | Δ | Weighted base | Weighted head | Δw | Errors base/head |'
    : '| Set | Renders | Mean DI base | Mean DI head | Δ | Errors base/head |',
  population
    ? '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    : '| --- | --- | --- | --- | --- | --- |',
];
const details = [];
for (const set of sets) {
  const { base, head } = loaded[set.name];
  const [b, h] = [mean(ok(base)), mean(ok(head))];
  let weighted = '';
  if (population) {
    const w = weigh([set.name]);
    const [wb, wh] = [weightedMean([set.name], 'base', w), weightedMean([set.name], 'head', w)];
    weighted = ` ${wb.toFixed(1)} | ${wh.toFixed(1)} | ${signed(+(wh - wb).toFixed(1))} |`;
  }
  lines.push(
    `| ${set.name} | ${ok(head).length} | ${b.toFixed(1)} | ${h.toFixed(1)} | ${signed(+(h - b).toFixed(1))} |${weighted} ${base.length - ok(base).length}/${head.length - ok(head).length} |`,
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

// ---------- gates ----------
const HARD = [
  'node-overlap',
  'edge-through-node',
  'clipped',
  'label-on-node',
  'label-overlap',
  'label-through-text',
  'expectation-failed',
];
const pairs = Object.entries(loaded).flatMap(([set, { base, head }]) =>
  head.map(r => ({
    set,
    key: keyOf(set, r),
    name: `${set}/${r.slug} ${r.file}`,
    head: r,
    base: base.find(o => o.slug === r.slug && o.file === r.file),
  })),
);
const moves = pairs
  .filter(p => p.base && !p.base.error && !p.head.error)
  .map(p => ({
    ...p,
    from: p.base.defectIndex,
    to: p.head.defectIndex,
    d: +(p.head.defectIndex - p.base.defectIndex).toFixed(1),
  }));

/** Rule 1 of both gates: no new hard defect anywhere, and no render that newly fails to build. */
function hardDefects(inSet = () => true) {
  const added = [];
  for (const p of pairs.filter(p => inSet(p.set))) {
    if (p.head.error && p.base && !p.base.error) added.push(`${p.name} now errors`);
    if (p.head.error || !p.base || p.base.error) continue;
    const [b, h] = [kindsOf(p.base), kindsOf(p.head)];
    for (const k of HARD)
      if ((h[k] ?? 0) > (b[k] ?? 0)) added.push(`${p.name} +${h[k] - (b[k] ?? 0)} ${k}`);
  }
  return ['Hard defects: no new instance', added.length ? 'FAIL' : 'PASS', added.join('; ')];
}
const issuesFall = () => {
  const { base, head } = loaded.issues;
  const d = mean(ok(head)) - mean(ok(base));
  return [
    'Mean DI: issues falls',
    d < -0.005 ? 'PASS' : d > 0.005 ? 'FAIL' : 'WARN',
    `${mean(ok(base)).toFixed(2)} → ${mean(ok(head)).toFixed(2)} (${signed(+d.toFixed(2))})` +
      (Math.abs(d) <= 0.005 ? ', unchanged' : ''),
  ];
};

/** The flat ratchet rules in docs/CHECKS.md ("Ratchet gate for heuristic changes"). */
function flatGate() {
  // The flat gate predates the population set and leaves it out.
  const flat = set => set !== 'population';
  const GUARDED = ['corpus', 'heldout', 'examples'];
  const rows = [hardDefects(flat)];
  for (const [set, { base, head }] of Object.entries(loaded)) {
    if (set === 'issues') rows.push(issuesFall());
    else if (GUARDED.includes(set)) {
      const d = mean(ok(head)) - mean(ok(base));
      const ev = `${mean(ok(base)).toFixed(2)} → ${mean(ok(head)).toFixed(2)} (${signed(+d.toFixed(2))})`;
      rows.push([`Mean DI: ${set} rises ≤ 0.05`, d > 0.05 ? 'FAIL' : 'PASS', ev]);
    }
  }
  const guarded = GUARDED.filter(s => loaded[s]);
  if (guarded.length) {
    const all = side => guarded.flatMap(s => ok(loaded[s][side]));
    const [kb, kh] = [kinds(all('base')), kinds(all('head'))];
    const over = Object.keys(kh)
      .filter(k => kh[k] - (kb[k] ?? 0) > Math.max(1, 0.05 * (kb[k] ?? 0)))
      .map(k => `${k} ${kb[k] ?? 0} → ${kh[k]}`);
    rows.push([
      `Each issue kind (${guarded.join('+')}) rises ≤ max(1, 5%)`,
      over.length ? 'FAIL' : 'PASS',
      over.join('; '),
    ]);
  }
  const mine = moves.filter(m => flat(m.set));
  const worse = mine.filter(m => m.d > 1.0).sort((a, b) => b.d - a.d);
  rows.push([
    'Each render worsens ≤ 1.0 DI',
    worse.length ? 'FAIL' : 'PASS',
    worse.map(m => `${m.name} ${m.from} → ${m.to}`).join('; '),
  ]);
  return { rows, better: mine.filter(m => m.d < 0), worse: mine.filter(m => m.d > 0) };
}

/**
 * The frequency-weighted rules in docs/CHECKS.md ("Frequency weights"): the pooled weighted mean
 * is the main rule, held-out and the population each guard their own weighted mean, the issue
 * kinds count by weight, and each render may rise by a limit that grows as its shape gets rarer.
 */
function weightedGate() {
  if (!population) throw new Error(`--gate=weighted needs ${path.relative(root, weightsFile)}`);
  const GUARDED = ['population', 'corpus', 'heldout', 'examples'].filter(s => loaded[s]);
  const pooled = weigh(GUARDED);
  const rows = [hardDefects()];
  const ev = (b, h) => `${b.toFixed(2)} → ${h.toFixed(2)} (${signed(+(h - b).toFixed(2))})`;
  const [pb, ph] = [weightedMean(GUARDED, 'base', pooled), weightedMean(GUARDED, 'head', pooled)];
  rows.push([
    'Weighted mean DI (pooled sets) rises ≤ 0.05',
    ph - pb > 0.05 ? 'FAIL' : 'PASS',
    ev(pb, ph),
  ]);
  for (const set of GUARDED) {
    const w = weigh([set]);
    const [b, h] = [weightedMean([set], 'base', w), weightedMean([set], 'head', w)];
    // Held-out is the overfitting guard and the population is what people draw: both must hold.
    // Corpus and examples are hand-picked, so the pooled rule covers them; they only warn.
    const strict = set === 'heldout' || set === 'population';
    rows.push([
      `Weighted mean DI: ${set} rises ≤ 0.05`,
      h - b > 0.05 ? (strict ? 'FAIL' : 'WARN') : 'PASS',
      ev(b, h),
    ]);
  }
  if (loaded.issues) rows.push(issuesFall());
  const all = side => GUARDED.flatMap(s => ok(loaded[s][side]).map(r => ({ ...r, set: s })));
  const wOf = r => pooled.get(keyOf(r.set, r)) ?? 0;
  const [kb, kh] = [kinds(all('base'), wOf), kinds(all('head'), wOf)];
  const over = Object.keys(kh)
    .filter(k => kh[k] - (kb[k] ?? 0) > Math.max(1, 0.05 * (kb[k] ?? 0)))
    .map(k => `${k} ${(kb[k] ?? 0).toFixed(1)} → ${kh[k].toFixed(1)}`);
  rows.push([
    'Each issue kind, weighted (pooled sets), rises ≤ max(1, 5%)',
    over.length ? 'FAIL' : 'PASS',
    over.join('; '),
  ]);
  const worse = moves
    .map(m => ({ ...m, limit: limitOf(bucketOf(m.set, m.head)) }))
    .filter(m => m.d > m.limit + 1e-9)
    .sort((a, b) => b.d - b.limit - (a.d - a.limit));
  rows.push([
    'Each render worsens ≤ its bucket limit (0.5–4 DI)',
    worse.length ? 'FAIL' : 'PASS',
    worse
      .map(
        m =>
          `${m.name} ${m.from} → ${m.to} (${bucketOf(m.set, m.head)}, limit ${m.limit.toFixed(1)})`,
      )
      .join('; '),
  ]);
  // Rank movers by weighted impact: the DI change times the render's pooled weight.
  const impact = m => m.d * (pooled.get(m.key) ?? weigh([m.set]).get(m.key) ?? 0);
  const ranked = moves.map(m => ({ ...m, impact: +impact(m).toFixed(2) }));
  return { rows, better: ranked.filter(m => m.d < 0), worse: ranked.filter(m => m.d > 0) };
}

const verdict = g => (g.rows.some(r => r[1] === 'FAIL') ? 'FAIL' : 'PASS');
function gateLines(title, g, weighted) {
  const key = m => (weighted ? m.impact : m.d);
  const top = list =>
    list.length
      ? [
          `| Render | DI base | DI head | Δ |${weighted ? ' Weighted Δ |' : ''}`,
          `| --- | --- | --- | --- |${weighted ? ' --- |' : ''}`,
          ...list.map(
            m =>
              `| ${m.name} | ${m.from} | ${m.to} | ${signed(m.d)} |${weighted ? ` ${signed(m.impact)} |` : ''}`,
          ),
        ]
      : ['None.'];
  return [
    '',
    `## ${title}`,
    '',
    '| Rule | Result | Evidence |',
    '| --- | --- | --- |',
    ...g.rows.map(([name, result, evidence]) => `| ${name} | ${result} | ${evidence || '–'} |`),
    '',
    `### Top 5 better${weighted ? ' by weighted impact' : ''}`,
    '',
    ...top(g.better.sort((a, b) => key(a) - key(b)).slice(0, 5)),
    '',
    `### Top 5 worse${weighted ? ' by weighted impact' : ''}`,
    '',
    ...top(g.worse.sort((a, b) => key(b) - key(a)).slice(0, 5)),
    '',
    verdict(g) === 'FAIL'
      ? 'Gate: FAIL. A failing rule needs the review page (`--review`) and a written reason in the PR.'
      : 'Gate: PASS.',
  ];
}

let failed = false;
const gates = {};
if (gate === 'flat' || review) gates.flat = flatGate();
if ((gate === 'weighted' || review) && population) gates.weighted = weightedGate();
if (gate === 'flat') lines.push(...gateLines('Gate (flat)', gates.flat, false));
if (gate === 'weighted') lines.push(...gateLines('Gate', gates.weighted, true));
if (gate) failed = verdict(gates[gate]) === 'FAIL';

const report = lines.join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'compare.md'), report);
console.log(`\n${report}\nWrote ${path.relative(root, path.join(outDir, 'compare.md'))}`);

if (review) {
  const { writeReview } = await import('./lib/audit-review.mjs');
  // The same weights as the weighted gate: pooled over its guarded sets; other sets (issues)
  // weigh their renders among themselves.
  const guarded = ['population', 'corpus', 'heldout', 'examples'].filter(s => loaded[s]);
  const pooled = weigh(guarded);
  const own = Object.fromEntries(Object.keys(loaded).map(s => [s, weigh([s])]));
  const files = await writeReview({
    outDir,
    title: `${baseRef} (${short}) → working tree`,
    loaded,
    moves: pairs,
    weightOf: (set, key) => (guarded.includes(set) ? pooled : own[set]).get(key) ?? 0,
    setMean: (set, side) => weightedMean([set], side, own[set]),
    population,
    shareOf,
    limitOf,
    bucketOf,
    kindsOf,
    gates: Object.fromEntries(
      Object.entries(gates).map(([name, g]) => [name, { verdict: verdict(g), rows: g.rows }]),
    ),
  });
  console.log(`Wrote ${files.map(f => path.relative(root, f)).join(' and ')}`);
}
if (failed) process.exit(1);
