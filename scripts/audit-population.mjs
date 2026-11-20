#!/usr/bin/env node
/**
 * Measure the population of diagrams that Byron's repos hold, bucket them by shape, and write the
 * weights that `audit:compare` uses. See docs/CHECKS.md ("Frequency weights").
 *
 *   node scripts/audit-population.mjs [--roots ~/Projects] [--out tmp/population]
 *
 * Collects every `.draft` file, every ```draft fence and every Mermaid flowchart fence in
 * Markdown, in repos that Byron owns (an origin remote under byronwall, or no remote). Skips
 * node_modules, worktrees, build output and exact duplicates. Converts Mermaid with
 * `draftably import`, measures each diagram with `draftably inspect --json`, and writes:
 *
 *   <out>/manifest.json  every diagram: origin, path, shape features and bucket
 *   <out>/drafts/        each diagram as a `.draft`, named by its content hash
 *   <out>/report.md      the bucket distribution
 *
 * Run it again when the repos gain diagrams, then commit the new
 * docs/intent/diagram-quality/population/weights.json it prints.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bucketOf, featuresOf } from './lib/buckets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args.splice(i, 2)[1];
};
const roots = option('--roots', path.join(os.homedir(), 'Projects')).split(',');
const outDir = path.resolve(option('--out', 'tmp/population'));
const write = args.includes('--write');
const cli = path.join(root, 'dist-cli/main.js');
execFileSync(process.execPath, [path.join(root, 'scripts/draftably.mjs'), '--help'], {
  stdio: 'ignore',
});

// ---------- walk ----------
const SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'dist-cli',
  'build',
  'tmp',
  '.turbo',
]);
const ownRepo = dir => {
  if (!fs.existsSync(path.join(dir, '.git'))) return true;
  try {
    const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return /byronwall/.test(url);
  } catch {
    return true; // no remote
  }
};
const found = [];
function walk(dir, repo) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP.has(e.name) || /worktrees?$/.test(e.name) || e.name.startsWith('.claude')) continue;
      if (fs.existsSync(path.join(p, '.git')) && !ownRepo(p)) continue;
      walk(p, repo ?? e.name);
    } else if (e.isFile()) {
      if (e.name.endsWith('.draft')) found.push({ repo, file: p, kind: 'draft' });
      else if (/\.mdx?$/.test(e.name)) {
        const text = fs.readFileSync(p, 'utf8');
        const re = /^\s*```(draft|mermaid)\s*\n([\s\S]*?)^\s*```/gm;
        let m,
          i = 0;
        while ((m = re.exec(text))) {
          if (m[1] === 'mermaid' && !/^\s*(flowchart|graph)\b/.test(m[2])) continue;
          found.push({ repo, file: `${p}#${i++}`, kind: m[1], source: m[2] });
        }
      }
    }
  }
}
for (const r of roots) walk(path.resolve(r.replace(/^~/, os.homedir())));

// Where a diagram comes from decides whether it counts toward frequency (see bucket weights).
const originOf = f => {
  if (/diagram-studio\/examples\//.test(f)) return 'examples';
  if (/diagram-studio\/packages\/cli\/examples\//.test(f)) return 'examples';
  if (/diagram-quality\/issues\//.test(f)) return 'issues';
  if (/diagram-quality\/(corpus|heldout)\//.test(f)) return 'audit';
  if (/diagram-studio\/(docs\/intent\/diagram-imports|scripts\/bench|tests|src)\//.test(f))
    return 'fixture';
  return 'docs';
};

/** Is the repo public on GitHub? Repos with no GitHub remote count as private. */
const visibility = new Map();
function isPublic(repo) {
  if (!visibility.has(repo)) {
    let open = false;
    try {
      const url = execFileSync(
        'git',
        [
          '-C',
          path.join(roots[0].replace(/^~/, os.homedir()), repo),
          'remote',
          'get-url',
          'origin',
        ],
        { encoding: 'utf8', stdio: 'pipe' },
      );
      const name = url.match(/github\.com[:/](.+?)(\.git)?\s*$/)?.[1];
      open =
        !!name &&
        execFileSync('gh', ['repo', 'view', name, '--json', 'visibility', '-q', '.visibility'], {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim() === 'PUBLIC';
    } catch {}
    visibility.set(repo, open);
  }
  return visibility.get(repo);
}

/**
 * Replace every label, title and id with a placeholder of the same length and letter case, so
 * a private diagram keeps its shape and box sizes but none of its words. Comments go too.
 */
function scramble(source, seed) {
  const C = 'bcdfghklmnprstvz',
    V = 'aeiou';
  const word = w => {
    let h = crypto
      .createHash('sha1')
      .update(seed + w)
      .digest();
    return [...w]
      .map((ch, k) => {
        if (!/[a-z]/i.test(ch)) return ch;
        const set = k % 2 ? V : C;
        const out = set[h[k % h.length] % set.length];
        return ch === ch.toUpperCase() ? out.toUpperCase() : out;
      })
      .join('');
  };
  const ids = new Set();
  for (const m of source.matchAll(/^\s*(?:node|group|edge|note)\s+([A-Za-z_][\w-]*)/gm))
    ids.add(m[1]);
  // Keep ids unique: suffix a counter on a collision.
  const map = new Map();
  const used = new Set();
  for (const id of ids) {
    let next = word(id),
      k = 1;
    while (used.has(next)) next = `${word(id)}${k++}`;
    used.add(next);
    map.set(id, next);
  }
  return source
    .split('\n')
    .filter(l => !/^\s*#/.test(l))
    .map(l =>
      l
        .replace(/([\w-]+=)?"((?:[^"\\]|\\.)*)"/g, (all, key, t) =>
          key && !/^(href|link-base)=$/.test(key)
            ? all
            : `${key ?? ''}"${t
                .replace(/\\n/g, '\u0000')
                .replace(/[A-Za-z]+/g, word)
                .replace(/\u0000/g, '\\n')}"`,
        )
        .replace(
          /^(\s*\S+)(.*)$/,
          (_, head, rest) =>
            head +
            rest.replace(/([\s>,(=])([A-Za-z_][\w-]*)(?=$|[\s,)\]:.])/g, (all, pre, id) =>
              map.has(id) ? pre + map.get(id) : all,
            ),
        ),
    )
    .join('\n');
}

// ---------- convert and measure ----------
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'drafts'), { recursive: true });
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'population-'));
const seen = new Map();
const items = [];
let n = 0;
for (const f of found) {
  if (++n % 25 === 0) console.log(`${n}/${found.length}`);
  let source = f.source ?? fs.readFileSync(f.file, 'utf8');
  if (f.kind === 'mermaid') {
    const mmd = path.join(scratch, 'in.mmd');
    const out = path.join(scratch, 'out.draft');
    fs.writeFileSync(mmd, source);
    fs.rmSync(out, { force: true });
    try {
      execFileSync(
        process.execPath,
        [cli, 'import', mmd, '--from', 'mermaid', '--accept-lossy', '--output', out],
        { stdio: 'pipe' },
      );
      source = fs.readFileSync(out, 'utf8');
    } catch {
      items.push({ ...f, source: undefined, origin: originOf(f.file), error: 'import failed' });
      continue;
    }
  }
  const hash = crypto
    .createHash('sha1')
    .update(source.replace(/\s+/g, ' ').trim())
    .digest('hex')
    .slice(0, 10);
  if (seen.has(hash)) {
    seen.get(hash).copies++;
    continue;
  }
  const draft = path.join(outDir, 'drafts', `${hash}.draft`);
  fs.writeFileSync(draft, source);
  let geo;
  try {
    geo = JSON.parse(
      execFileSync(process.execPath, [cli, 'inspect', draft, '--json'], {
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    );
  } catch {
    items.push({
      ...f,
      source: undefined,
      hash,
      origin: originOf(f.file),
      error: 'compile failed',
    });
    continue;
  }
  const features = featuresOf(source, geo);
  const item = {
    hash,
    repo: f.repo,
    file: f.file,
    kind: f.kind,
    origin: originOf(f.file),
    copies: 1,
    ...features,
    bucket: bucketOf(features),
  };
  seen.set(hash, item);
  items.push(item);
}
fs.rmSync(scratch, { recursive: true, force: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(items, null, 1));

// ---------- report ----------
const ok = items.filter(i => !i.error);
const count = (list, key) => {
  const c = {};
  for (const i of list) c[key(i)] = (c[key(i)] ?? 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
const table = (title, rows, total) => [
  `### ${title}`,
  '',
  '| Value | Diagrams | Share |',
  '| --- | --- | --- |',
  ...rows.map(([k, v]) => `| ${k} | ${v} | ${((100 * v) / total).toFixed(0)}% |`),
  '',
];
const counted = ok.filter(i => i.origin === 'docs');
const lines = [
  '# Diagram population',
  '',
  `Found ${found.length} diagrams; ${items.length} after removing duplicates; ${items.length - ok.length} failed to import or compile.`,
  '',
  ...table(
    'Origin',
    count(ok, i => i.origin),
    ok.length,
  ),
  ...table(
    'Kind (docs only)',
    count(counted, i => i.kind),
    counted.length,
  ),
  ...table(
    'Repo (docs only)',
    count(counted, i => i.repo),
    counted.length,
  ),
  ...table(
    'Size (docs only)',
    count(counted, i => i.size),
    counted.length,
  ),
  ...table(
    'Groups (docs only)',
    count(counted, i => i.nesting),
    counted.length,
  ),
  ...table(
    'Density (docs only)',
    count(counted, i => i.density),
    counted.length,
  ),
  ...table(
    'Recipe (docs only)',
    count(counted, i => i.recipe),
    counted.length,
  ),
  ...table(
    'Direction (docs only)',
    count(counted, i => i.direction),
    counted.length,
  ),
  ...table(
    'Bucket (docs only)',
    count(counted, i => i.bucket),
    counted.length,
  ),
];
fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'));

// ---------- the population set and its weights ----------
if (write) {
  const setDir = path.join(root, 'docs/intent/diagram-quality/population');
  for (const e of fs.existsSync(setDir) ? fs.readdirSync(setDir) : [])
    if (fs.statSync(path.join(setDir, e)).isDirectory())
      fs.rmSync(path.join(setDir, e), { recursive: true });
  const index = [];
  for (const i of counted) {
    const open = isPublic(i.repo);
    const slug = open ? `${i.repo.toLowerCase()}-${i.hash}` : `private-${i.hash}`;
    let source = fs.readFileSync(path.join(outDir, 'drafts', `${i.hash}.draft`), 'utf8');
    if (!open) source = scramble(source, i.hash);
    if (!open) {
      const tmpFile = path.join(outDir, 'scrambled.draft');
      fs.writeFileSync(tmpFile, source);
      const geo = JSON.parse(
        execFileSync(process.execPath, [cli, 'inspect', tmpFile, '--json'], {
          encoding: 'utf8',
          stdio: 'pipe',
        }),
      );
      const f = featuresOf(source, geo);
      if (bucketOf(f) !== i.bucket || f.edges !== i.edges)
        throw new Error(`Scrambling changed the shape of ${i.file}: ${bucketOf(f)} vs ${i.bucket}`);
    }
    const header = open
      ? `# Population: ${path.relative(path.join(roots[0]), i.file.replace(/#\d+$/, ''))}${i.kind === 'mermaid' ? ' (Mermaid, imported)' : ''}\n`
      : `# Population: a private repo; labels replaced by placeholders of the same length\n`;
    fs.mkdirSync(path.join(setDir, slug), { recursive: true });
    fs.writeFileSync(
      path.join(setDir, slug, 'v0.draft'),
      header + source.replace(/^#[^\n]*\n/gm, ''),
    );
    index.push({
      slug,
      bucket: i.bucket,
      leaves: i.leaves,
      edges: i.edges,
      depth: i.depth,
      recipe: i.recipeName,
      direction: i.direction,
    });
  }
  const buckets = {};
  for (const i of counted) buckets[i.bucket] = (buckets[i.bucket] ?? 0) + 1;
  const weights = {
    note: 'Written by scripts/audit-population.mjs. Bucket counts of the docs diagrams in Byron\'s repos; see docs/CHECKS.md ("Frequency weights").',
    measured: new Date().toISOString().slice(0, 10),
    total: counted.length,
    buckets: Object.fromEntries(Object.entries(buckets).sort((a, b) => b[1] - a[1])),
    diagrams: index.sort((a, b) => a.slug.localeCompare(b.slug)),
  };
  fs.writeFileSync(path.join(setDir, 'weights.json'), JSON.stringify(weights, null, 1) + '\n');
  console.log(
    `Wrote ${counted.length} diagrams and weights.json to ${path.relative(root, setDir)}`,
  );
}
console.log(lines.join('\n'));
console.log(`\nWrote ${path.relative(root, outDir)}/manifest.json and report.md`);
