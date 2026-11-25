/**
 * `pnpm prove:service`: start the render service in local workerd and request every tracked
 * .draft file through its GET image URL. Each answer must equal what `@draftably/runtime` draws
 * for the same source, byte for byte; sources the runtime rejects must come back as a 400 error
 * image. Cycles through the three URL encodings (pako:, Kroki zlib, plain base64url).
 *
 * Then PNG: each file's `/png/` answer must have the same pixels as `draftably inspect --png`
 * (the CLI, resvg-js) and carry the source that `draftably extract` reads back.
 *
 * Then Mermaid: every Mermaid input in the repo must draw the same as `draftably import`. Then
 * the REST API on a fresh local D1: parallel spends can't overdraw, a failed render refunds,
 * REST and GET give the same bytes, and calls without a valid key get 401.
 *
 * The same URL twice must give an edge-cache hit the second time. `--base
 * https://api.draftably.dev` checks a deployed service instead: 10 files, SVG and PNG, and the
 * cache, which stays under its 60-a-minute address limit.
 */
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { deflateSync, inflateSync } from 'node:zlib';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { build } from 'esbuild';

// The URL codec and link policy import DSL modules that plain Node can't load, so bundle the
// same file the Worker bundles.
const bundled = await build({
  entryPoints: ['src/lib/render-url.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
});
const { encodeSource, webLinkBase, webLinks } = (await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
)) as typeof import('../src/lib/render-url');

const at = process.argv.indexOf('--base');
const remote = at > 0 ? process.argv[at + 1].replace(/\/$/, '') : undefined;
const PORT = 8787 + Math.floor(Math.random() * 1000);
const base = remote ?? `http://127.0.0.1:${PORT}`;
const { renderSvg } = await import('../packages/runtime/dist/index.js');

// A fresh local D1 with two accounts: `poor` holds 20 credits, `rich` 100,000. Their keys are
// fixtures for this proof only. Its state lives in its own folder, so a run never touches the
// database `pnpm service:dev` uses.
const STATE = '.wrangler/proof-state';
const KEYS = {
  poor: 'dft_aaaaaaaaaaaa.proof-secret-poor-0123456789',
  rich: 'dft_bbbbbbbbbbbb.proof-secret-rich-0123456789',
};
const d1 = (...args: string[]) =>
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', ...args, '--local', '--env', 'proof', '--persist-to', STATE],
    {
      cwd: 'packages/service',
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
const sql = (command: string) =>
  JSON.parse(d1('execute', 'DB', '--json', '--command', command))[0].results as Record<
    string,
    number
  >[];
if (!remote) {
  fs.rmSync(path.join('packages/service', STATE), { recursive: true, force: true });
  d1('migrations', 'apply', 'DB');
  const month = new Date().toISOString().slice(0, 7),
    now = new Date().toISOString();
  const hash = (key: string) => createHash('sha256').update(key.split('.')[1]).digest('hex');
  sql(
    `INSERT INTO accounts (id, email, grant_left, grant_month, bought, created_at) VALUES
     ('poor', 'poor@example.com', 20, '${month}', 0, '${now}'), ('rich', 'rich@example.com', 0, '${month}', 100000, '${now}');
     INSERT INTO keys (id, account_id, hash, label, created_at) VALUES
     ('aaaaaaaaaaaa', 'poor', '${hash(KEYS.poor)}', 'proof', '${now}'),
     ('bbbbbbbbbbbb', 'rich', '${hash(KEYS.rich)}', 'proof', '${now}');`,
  );
}

const dev = remote
  ? undefined
  : spawn(
      'pnpm',
      [
        'exec',
        'wrangler',
        'dev',
        '--local',
        '--persist-to',
        STATE,
        '--env',
        'proof',
        '--port',
        String(PORT),
        '--ip',
        '127.0.0.1',
      ],
      { cwd: 'packages/service', stdio: ['ignore', 'pipe', 'pipe'] },
    );
let log = '';
dev?.stdout.on('data', d => (log += d));
dev?.stderr.on('data', d => (log += d));
const stop = () => dev?.kill('SIGTERM');
process.on('exit', stop);

async function ready() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw Error('wrangler dev did not start:\n' + log);
}
await ready();

const b64url = (b: Uint8Array) => Buffer.from(b).toString('base64url');
const forms = [
  { name: 'pako', encode: (s: string) => encodeSource(s) },
  { name: 'kroki', encode: async (s: string) => b64url(deflateSync(s, { level: 9 })) },
  { name: 'plain', encode: async (s: string) => b64url(new TextEncoder().encode(s)) },
];

// A deployed service has the 60-a-minute address limit, so a remote run checks 10 files.
const files = execFileSync('git', ['ls-files', '*.draft'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .slice(0, remote ? 10 : undefined);
const tally = { same: 0, rejected: 0, tooLong: 0, failed: [] as string[] };
/** Files both sides draw, for the PNG pass: name, source and the URL segment used. */
const drawn: { file: string; source: string; segment: string }[] = [];
for (const [i, file] of files.entries()) {
  const source = fs.readFileSync(file, 'utf8');
  const form = forms[i % forms.length];
  const scheme = i % 5 === 0 ? 'dark' : 'light';
  const segment = await form.encode(source);
  const res = await fetch(`${base}/svg/${segment}${scheme === 'dark' ? '?scheme=dark' : ''}`);
  const body = await res.text();
  if (segment.length > 8 * 1024) {
    if (res.status === 400 && body.includes('over 8 KB')) tally.tooLong++;
    else tally.failed.push(`${file}: long URL gave ${res.status}`);
    continue;
  }
  const want = await renderSvg(source, {
    colorScheme: scheme,
    links: webLinks(source),
    limits: { maxSourceBytes: 64 * 1024 },
  });
  if (!want.ok) {
    if (res.status === 400 && body.includes('could not draw')) tally.rejected++;
    else tally.failed.push(`${file}: runtime rejects it, service gave ${res.status}`);
  } else if (res.status === 200 && body === want.value.svg) {
    tally.same++;
    drawn.push({ file, source, segment });
  } else
    tally.failed.push(
      `${file} (${form.name}, ${scheme}): ${res.status}, ${body.length} vs ${want.value.svg.length} bytes`,
    );
}

console.log(
  `${files.length} files: ${tally.same} identical to the runtime, ${tally.rejected} rejected by both, ` +
    `${tally.tooLong} over the 8 KB URL limit (400), ${tally.failed.length} wrong.`,
);
for (const f of tally.failed) console.log('  ' + f);

/** RGBA pixels of an 8-bit RGBA, non-interlaced PNG, which is what resvg writes. */
function pixels(png: Buffer) {
  const w = png.readUInt32BE(16),
    h = png.readUInt32BE(20);
  assert.equal(png[24], 8, 'bit depth');
  assert.equal(png[25], 6, 'RGBA');
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const len = png.readUInt32BE(at),
      type = png.toString('latin1', at + 4, at + 8);
    if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)),
    row = w * 4,
    out = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (row + 1)],
      src = raw.subarray(y * (row + 1) + 1, (y + 1) * (row + 1));
    for (let x = 0; x < row; x++) {
      const a = x >= 4 ? out[y * row + x - 4] : 0,
        b = y ? out[(y - 1) * row + x] : 0,
        c = x >= 4 && y ? out[(y - 1) * row + x - 4] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[y * row + x] = (src[x] + pred) & 0xff;
    }
  }
  return { w, h, data: out };
}

const run = promisify(execFile);
const cli = (...args: string[]) => run(process.execPath, ['dist-cli/main.js', ...args]);
execFileSync('node', ['scripts/draftably.mjs', '--version'], { stdio: 'ignore' }); // build the CLI
const dir = 'tmp/service-proof';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const png = { same: 0, local: 0, overCap: 0, sourceBack: 0, failed: [] as string[] };
/**
 * A file that leans on its folder: `src=` code files, or relative links with no web link-base.
 * The service has neither, so the CLI may draw such a file differently (a link arrow, code text).
 */
const local = (source: string) =>
  /\bsrc="/.test(source) || (/\bhref="(?!https?:)/.test(source) && !webLinkBase(source));
async function checkPng({ file, source, segment }: (typeof drawn)[number], n: number) {
  const ours = path.join(dir, `${n}-service.png`),
    theirs = path.join(dir, `${n}-cli.png`),
    copy = path.join(dir, `${n}.draft`);
  fs.writeFileSync(copy, source); // beside no code files: same as the service sees
  const res = await fetch(`${base}/png/${segment}`);
  if (res.status !== 200) {
    // Over the pixel cap: refused on purpose, and the CLI's own PNG must be that big.
    await cli('inspect', copy, '--png', theirs).catch(() => {});
    const cliPx = fs.existsSync(theirs) ? pixels(fs.readFileSync(theirs)) : undefined;
    if (res.status === 400 && cliPx && cliPx.w * cliPx.h > 8_000_000) png.overCap++;
    else png.failed.push(`${file}: PNG ${res.status}`);
    return;
  }
  fs.writeFileSync(ours, Buffer.from(await res.arrayBuffer()));
  try {
    await cli('inspect', copy, '--png', theirs);
  } catch (error) {
    return void png.failed.push(`${file}: CLI failed: ${(error as Error).message.split('\n')[0]}`);
  }
  const a = pixels(fs.readFileSync(ours)),
    b = pixels(fs.readFileSync(theirs));
  let diff = a.w === b.w && a.h === b.h ? 0 : 255;
  for (let i = 0; !diff && i < a.data.length; i++) diff = a.data[i] - b.data[i];
  if (!diff) png.same++;
  else if (local(source)) png.local++;
  else png.failed.push(`${file}: differs from the CLI (${a.w}×${a.h} vs ${b.w}×${b.h})`);
  const back = (await cli('extract', ours)).stdout;
  if (back === (await cli('extract', theirs)).stdout) png.sourceBack++;
  else png.failed.push(`${file}: extract gave a different source`);
}
for (let i = 0; i < drawn.length; i += 8)
  await Promise.all(drawn.slice(i, i + 8).map((d, j) => checkPng(d, i + j)));
console.log(
  `PNG: ${drawn.length} files: ${png.same} pixel-identical to the CLI, ${png.local} differ only ` +
    `because they use local files or links, ${png.overCap} refused as over 8 M pixels, ` +
    `${png.failed.length} wrong; ` +
    `${png.sourceBack} read back by extract as the CLI's PNG reads back.`,
);
for (const f of png.failed) console.log('  ' + f);
const huge = await fetch(`${base}/png/${await encodeSource('a -> b')}?scale=9`);
assert.equal(huge.status, 400);
assert.equal(huge.headers.get('Content-Type'), 'image/png');

// Mermaid: every Mermaid input in the repo (.mmd files, ```mermaid fences, the importer tests'
// sources) drawn by the service must equal `draftably import` drawn by the runtime.
const mermaid: { name: string; source: string }[] = [];
for (const f of execFileSync('git', ['ls-files', '*.mmd'], { encoding: 'utf8' }).trim().split('\n'))
  mermaid.push({ name: f, source: fs.readFileSync(f, 'utf8') });
for (const f of execFileSync('git', ['grep', '-l', '^```mermaid', '--', '*.md'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n'))
  for (const [n, m] of [
    ...fs.readFileSync(f, 'utf8').matchAll(/^```mermaid\n([\s\S]*?)^```/gm),
  ].entries())
    mermaid.push({ name: `${f} fence ${n + 1}`, source: m[1] });
const tests = fs.readFileSync('tests/import-mermaid.test.ts', 'utf8');
for (const [n, m] of [
  ...tests.matchAll(
    /[`'](\s*(?:flowchart|graph|sequenceDiagram|gantt|timeline)\b(?:[^`'\\]|\\.)*?)[`']/g,
  ),
].entries())
  if (!m[1].includes('${') && m[1].includes('\n'))
    mermaid.push({ name: `import-mermaid.test.ts #${n + 1}`, source: m[1] });
const drawnMermaid = new Set<number>();
const mm = { same: 0, rejected: 0, failed: [] as string[], families: {} as Record<string, number> };
for (const [n, { name, source }] of (remote ? [] : mermaid).entries()) {
  const file = path.join(dir, `m${n}.mmd`);
  fs.writeFileSync(file, source);
  const family = /^\s*(?:---[\s\S]*?---\s*)?(\w+)/.exec(source)?.[1] ?? '?';
  let draft: string | undefined;
  try {
    draft = (await cli('import', file, '--accept-lossy')).stdout.replace(
      new RegExp(`^diagram "m${n}"`),
      'diagram ""',
    );
  } catch {
    // the CLI refuses it; the service must too
  }
  const res = await fetch(`${base}/svg/${await encodeSource(source)}?type=mermaid`);
  const body = await res.text();
  const want = draft
    ? await renderSvg(draft, {
        links: webLinks(draft),
        limits: { maxSourceBytes: 64 * 1024 },
      })
    : undefined;
  if (!want?.ok) {
    if (res.status === 400) {
      mm.rejected++;
      if (process.argv.includes('--verbose')) console.log(`  refused: ${name}`);
    } else mm.failed.push(`${name}: the CLI refuses it, the service gave ${res.status}`);
  } else if (res.status === 200 && body === want.value.svg) {
    mm.same++;
    drawnMermaid.add(n);
    mm.families[family] = (mm.families[family] ?? 0) + 1;
  } else mm.failed.push(`${name}: ${res.status}, differs from draftably import`);
}
console.log(
  `Mermaid: ${mermaid.length} inputs: ${mm.same} identical to draftably import (` +
    Object.entries(mm.families)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ') +
    `), ${mm.rejected} refused by both, ${mm.failed.length} wrong.`,
);
for (const f of mm.failed) console.log('  ' + f);
// Two shapes from Codex round 1: a sequence with a box (Mermaid checks its color with
// `new Option()`), and a Markdown file with one mermaid fence.
for (const [name, source] of [
  ['sequence box', 'sequenceDiagram\n  box Client\n  participant a\n  end\n  a->>a: check\n'],
  ['markdown fence', '# Notes\n\n```mermaid\nflowchart LR\n  A-->B\n```\n'],
  ['bare flowchart', 'flowchart\n  A-->B\n'],
]) {
  // .mmd is Mermaid by its name; the .md file is found by its fence, as `draftably import` does.
  const file = path.join(
    dir,
    `extra-${name.replace(' ', '-')}.${name === 'markdown fence' ? 'md' : 'mmd'}`,
  );
  fs.writeFileSync(file, source);
  const draft = (await cli('import', file, '--accept-lossy')).stdout.replace(
    /^diagram "[^"]*"/,
    'diagram ""',
  );
  const want = await renderSvg(draft, {
    links: webLinks(draft),
    limits: { maxSourceBytes: 64 * 1024 },
  });
  const got = await fetch(`${base}/svg/${await encodeSource(source)}`);
  assert.equal(got.status, 200, `${name}: ${got.status}`);
  assert.equal(
    await got.text(),
    want.ok ? want.value.svg : '',
    `${name} differs from draftably import`,
  );
}
const gantt = mermaid.find(m => /^\s*gantt\b/m.test(m.source))!;
const ganttRes = await fetch(`${base}/svg/${await encodeSource(gantt.source)}`);
const ganttAge = Number(
  /^public, max-age=(\d+)$/.exec(ganttRes.headers.get('Cache-Control') ?? '')?.[1],
);
assert.ok(
  ganttAge > 0 && ganttAge <= 86400,
  'a gantt image lasts at most to the next UTC midnight',
);
console.log(
  'Mermaid extras: a boxed sequence and a fenced Markdown file draw as draftably import does; a bare flowchart header is detected; a gantt chart is cached until the next UTC midnight.',
);

// Detection: each input both sides draw gives the same image with no ?type= at all.
let detected = 0;
for (const { source } of mermaid.filter((_, n) => drawnMermaid.has(n))) {
  const seg = await encodeSource(source);
  const auto = await (await fetch(`${base}/svg/${seg}`)).text();
  if (auto === (await (await fetch(`${base}/svg/${seg}?type=mermaid`)).text())) detected++;
}
console.log(
  `Mermaid detection: ${detected} of ${drawnMermaid.size} drawn the same with no ?type=.`,
);
assert.equal(detected, drawnMermaid.size, 'automatic and explicit Mermaid detection disagree');

// The REST API and credits, local only (the accounts are fixtures).
if (!remote) {
  const post = (path: string, key: string | undefined, body: object) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
    });
  const checkout = fs.readFileSync('examples/checkout.draft', 'utf8');

  // 50 parallel renders against 20 credits: exactly 20 succeed, and the ledger agrees.
  const race = await Promise.all(
    Array.from({ length: 50 }, (_, n) =>
      post('/v1/render', KEYS.poor, { code: checkout + `\n# ${n}\n`, format: 'svg' }).then(
        r => r.status,
      ),
    ),
  );
  const ok = race.filter(s => s === 200).length,
    broke = race.filter(s => s === 402).length;
  const bal = await (
    await fetch(`${base}/v1/balance`, { headers: { Authorization: `Bearer ${KEYS.poor}` } })
  ).json();
  const ledger = sql(
    `SELECT sum(delta) AS total, count(*) AS rows FROM ledger WHERE account_id = 'poor'`,
  )[0];
  assert.equal(ok, 20);
  assert.equal(broke, 30);
  assert.equal(bal.grant + bal.bought, 0);
  assert.equal(ledger.total, -20);
  console.log(
    `Credits: 50 parallel renders on 20 credits: ${ok} drawn, ${broke} refused with 402; balance 0; ledger -20 in ${ledger.rows} rows.`,
  );

  // The REST answer and the anonymous URL give the same bytes, and the REST answer names that URL.
  const rest = await post('/v1/render', KEYS.rich, { code: checkout, format: 'png', scale: 2 });
  const restBytes = Buffer.from(await rest.arrayBuffer());
  const urlBytes = Buffer.from(
    await (await fetch(rest.headers.get('X-Draftably-Url')! + '?scale=2')).arrayBuffer(),
  );
  assert.equal(rest.status, 200);
  assert.ok(restBytes.equals(urlBytes), 'REST and GET PNG differ');
  const restSvg = await (
    await post('/v1/render', KEYS.rich, { code: checkout, format: 'svg' })
  ).text();
  assert.equal(restSvg, await (await fetch(`${base}/svg/${await encodeSource(checkout)}`)).text());

  // A keyed image URL spends credits (2 for PNG); a failed render costs nothing.
  const before = (
    await (
      await fetch(`${base}/v1/balance`, { headers: { Authorization: `Bearer ${KEYS.rich}` } })
    ).json()
  ).bought;
  const keyed = await fetch(`${base}/png/${await encodeSource(checkout + '\n# keyed\n')}`, {
    headers: { Authorization: `Bearer ${KEYS.rich}` },
  });
  const bad = await post('/v1/render', KEYS.rich, { code: 'node a "unclosed', format: 'svg' });
  const badBody = await bad.json();
  const after = (
    await (
      await fetch(`${base}/v1/balance`, { headers: { Authorization: `Bearer ${KEYS.rich}` } })
    ).json()
  ).bought;
  assert.equal(keyed.status, 200);
  assert.equal(bad.status, 400);
  assert.equal(badBody.error.code, 'ERR_SOURCE');
  assert.equal(before - after, 2);
  console.log(
    `Keyed PNG URL cost 2 credits; a bad source got 400 ${badBody.error.code} and cost nothing.`,
  );

  // One cache for every interface: a cached image is free over REST even with no credits left,
  // and a supplied key is checked before the cache, so a wrong key fails on a warm image too.
  const warm = await post('/v1/render', KEYS.poor, { code: checkout, format: 'svg' });
  assert.equal(warm.status, 200, 'a cached image should be free at 0 credits');
  assert.equal(warm.headers.get('X-Draftably-Cache'), 'hit');
  const wrongKey = await fetch(`${base}/svg/${await encodeSource(checkout)}`, {
    headers: { Authorization: 'Bearer dft_aaaaaaaaaaaa.wrong-secret-0123456789abc' },
  });
  assert.equal(wrongKey.status, 401);
  // The URL REST returns carries the options and draws the same bytes.
  const dark = await post('/v1/render', KEYS.rich, {
    code: checkout,
    format: 'svg',
    scheme: 'dark',
  });
  const darkUrl = dark.headers.get('X-Draftably-Url')!;
  assert.match(darkUrl, /\?scheme=dark$/);
  assert.equal(await dark.text(), await (await fetch(darkUrl)).text());
  // A source too long for a URL renders, with no URL offered; one over 64 KB is refused everywhere.
  const long =
    checkout +
    '\n' +
    Array.from({ length: 300 }, () => `# ${randomBytes(24).toString('hex')}`).join('\n');
  const longRes = await post('/v1/render', KEYS.rich, { code: long, format: 'svg' });
  assert.equal(longRes.status, 200);
  assert.equal(longRes.headers.get('X-Draftably-Url'), null);
  const huge = checkout + '\n#' + 'x'.repeat(66 * 1024);
  assert.equal((await post('/v1/validate', KEYS.rich, { code: huge })).status, 400);
  // Codex round 2. HEAD never draws. Keyed answers are no-store; anonymous ones vary on the key.
  const probeUrl = `${base}/svg/${await encodeSource(checkout + '\n# head\n')}`;
  assert.equal((await fetch(probeUrl, { method: 'HEAD' })).status, 405);
  const anonAns = await fetch(probeUrl);
  assert.equal(anonAns.headers.get('Vary'), 'Authorization');
  const keyedAns = await fetch(probeUrl, { headers: { Authorization: `Bearer ${KEYS.rich}` } });
  assert.equal(keyedAns.headers.get('Cache-Control'), 'no-store');
  // Following the service's own URL never charges twice: SVG ignores scale, and a leading BOM is
  // dropped before hashing, as the URL decoder drops it.
  const richLeft = async () =>
    (
      await (
        await fetch(`${base}/v1/balance`, { headers: { Authorization: `Bearer ${KEYS.rich}` } })
      ).json()
    ).bought;
  for (const [what, code, extra] of [
    ['scale 3 SVG', checkout + '\n# scale\n', { scale: 3 }],
    ['BOM source', '﻿' + checkout + '\n# bom\n', {}],
  ] as const) {
    const first = await post('/v1/render', KEYS.rich, { code, format: 'svg', ...extra });
    await new Promise(r => setTimeout(r, 300));
    const before = await richLeft();
    const again = await fetch(first.headers.get('X-Draftably-Url')!, {
      headers: { Authorization: `Bearer ${KEYS.rich}` },
    });
    assert.equal(again.headers.get('X-Draftably-Cache'), 'hit', `${what}: second fetch missed`);
    assert.equal(await richLeft(), before, `${what}: charged twice`);
  }
  assert.equal((await post('/v1/render', KEYS.rich, null as unknown as object)).status, 400);
  // Round 3: an explicit type shares the detected image's cache entry; the scheme is
  // case-insensitive; REST with no format gives a PNG, as MCP does.
  const typed = await post('/v1/render', KEYS.rich, {
    code: checkout + '\n# typed\n',
    format: 'svg',
    type: 'draftably',
  });
  await new Promise(r => setTimeout(r, 300));
  const detectedHit = await fetch(`${base}/svg/${await encodeSource(checkout + '\n# typed\n')}`, {
    headers: { Authorization: `Bearer ${KEYS.rich}` },
  });
  assert.equal(typed.status, 200);
  assert.equal(detectedHit.headers.get('X-Draftably-Cache'), 'hit');
  const lower = await fetch(`${base}/v1/balance`, {
    headers: { Authorization: `bearer ${KEYS.rich}` },
  });
  assert.equal(lower.status, 200);
  const noFormat = await post('/v1/render', KEYS.rich, { code: checkout + '\n# default\n' });
  assert.equal(noFormat.headers.get('Content-Type'), 'image/png');
  console.log(
    'Round 2: HEAD 405; keyed answers no-store, anonymous vary on Authorization; the returned URL is a free cache hit for a scale-3 SVG and a BOM source; a null body gets 400. Round 3: ?type=draftably shares the detected entry; lowercase bearer works; REST defaults to PNG.',
  );

  // Account forms: a POST from another origin is refused; sign-out is POST only.
  const foreign = await fetch(`${base}/account/keys`, {
    method: 'POST',
    headers: {
      Origin: 'https://evil.example',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'label=x',
    redirect: 'manual',
  });
  assert.equal(foreign.status, 403);
  assert.equal((await fetch(`${base}/logout`, { redirect: 'manual' })).status, 405);
  console.log(
    'One cache: a cached image is free over REST at 0 credits; a wrong key gets 401 on a warm URL; ' +
      'the REST URL keeps ?scheme=dark; a long source gets no URL; 66 KB is refused; foreign POST 403.',
  );

  // Validate, convert, and auth.
  const valid = await (await post('/v1/validate', KEYS.rich, { code: checkout })).json();
  const invalid = await (
    await post('/v1/validate', KEYS.rich, { code: 'node a "unclosed' })
  ).json();
  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
  const flow = mermaid[[...drawnMermaid][0]];
  const conv = await (await post('/v1/convert', KEYS.rich, { code: flow.source })).json();
  const cliDraft = (
    await cli('import', path.join(dir, `m${[...drawnMermaid][0]}.mmd`), '--accept-lossy')
  ).stdout;
  assert.equal(conv.draft, cliDraft.replace(/^diagram "m\d+"/, 'diagram ""'));
  assert.equal((await post('/v1/render', undefined, { code: checkout })).status, 401);
  assert.equal(
    (await post('/v1/render', 'dft_aaaaaaaaaaaa.wrong-secret-0123456789abc', { code: checkout }))
      .status,
    401,
  );
  assert.equal(
    (await fetch(`${base}/account`, { redirect: 'manual' })).headers.get('Location'),
    '/login',
  );
  console.log(
    'API: validate, convert (= draftably import), REST = GET bytes, 401 without or with a bad key, /account sends you to sign in.',
  );

  // Sign-in by email. Locally, wrangler writes each sent email's text to a file and logs its path.
  const form = (to: string, fields: Record<string, string>) =>
    fetch(`${base}${to}`, {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
      redirect: 'manual',
    });
  const sent = () => [...log.matchAll(/Text: (\S+\.txt)/g)].map(m => m[1]);
  const mailLink = async (email: string) => {
    const before = sent().length;
    const res = await form('/login', { email });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Check your email/);
    for (let i = 0; i < 50 && sent().length === before; i++)
      await new Promise(r => setTimeout(r, 100));
    const text = fs.readFileSync(sent()[before], 'utf8');
    return /\/auth\/verify\?token=([\w-]+)/.exec(text)![1];
  };
  const verify = (token: string) => form('/auth/verify', { token });
  const link = await mailLink(' Proof@Example.com ');
  // A GET, as a mail scanner sends, shows the button and leaves the token unspent.
  const scan = await fetch(`${base}/auth/verify?token=${link}`);
  assert.equal(scan.status, 200);
  assert.match(await scan.text(), new RegExp(`name="token" value="${link}"`));
  const signIn = await verify(link);
  assert.equal(signIn.status, 303);
  assert.equal(signIn.headers.get('Location'), '/account');
  const session = signIn.headers.get('Set-Cookie')!.split(';')[0];
  const page = await fetch(`${base}/account`, { headers: { Cookie: session } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Signed in as <b>proof@example\.com<\/b>/);
  assert.equal((await verify(link)).status, 400, 'a used link signed in again');
  const stale = await mailLink('proof@example.com');
  const staleHash = createHash('sha256').update(stale).digest('hex');
  sql(`UPDATE login_tokens SET expires_at = '2000-01-01' WHERE hash = '${staleHash}'`);
  assert.equal((await verify(stale)).status, 400, 'an expired link signed in');
  assert.equal((await verify('not-a-token')).status, 400);
  assert.equal((await verify(await mailLink('proof@example.com'))).status, 303);
  assert.equal(sql(`SELECT count(*) AS n FROM accounts WHERE email = 'proof@example.com'`)[0].n, 1);
  assert.equal((await form('/login', { email: 'not an email' })).status, 400);
  let limited = 0;
  for (let i = 0; i < 25 && !limited; i++)
    if ((await form('/login', { email: 'flood@example.com' })).status === 429) limited = i + 1;
  assert.ok(limited, 'the sign-in form never hit its limit');
  console.log(
    `Email sign-in: a GET leaves the link unspent; its POST signs in once, to one account per address; a used, expired or unknown token gets 400; the form hit 429 after ${limited} more sends.`,
  );

  // MCP: the same key, stateless JSON-RPC. render_diagram returns the same PNG as /v1/render.
  let rpcId = 0;
  const rpc = async (method: string, params: object = {}, key: string | null = KEYS.rich) => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
    });
    return { status: res.status, body: res.status === 200 ? await res.json() : undefined };
  };
  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'prove-service', version: '1' },
  });
  assert.equal(init.body.result.serverInfo.name, 'draftably');
  const tools = (await rpc('tools/list')).body.result.tools.map((t: { name: string }) => t.name);
  assert.deepEqual(tools.sort(), [
    'convert_mermaid',
    'image_url',
    'language_guide',
    'render_diagram',
    'validate_diagram',
  ]);
  const call = async (name: string, args: object) =>
    (await rpc('tools/call', { name, arguments: args })).body.result;
  const guideText = (await call('language_guide', {})).content[0].text;
  assert.equal(guideText, fs.readFileSync('skills/draftably/SKILL.md', 'utf8'));
  const drawnMcp = await call('render_diagram', { code: checkout, format: 'png', scale: 2 });
  assert.equal(drawnMcp.content[0].type, 'image');
  assert.ok(
    Buffer.from(drawnMcp.content[0].data, 'base64').equals(restBytes),
    'MCP PNG differs from /v1/render',
  );
  const badMcp = await call('render_diagram', { code: 'node a "unclosed' });
  assert.equal(badMcp.isError, true);
  const validMcp = (await call('validate_diagram', { code: checkout })).content[0].text;
  assert.match(validMcp, /^valid/);
  const convMcp = (await call('convert_mermaid', { code: flow.source })).content[0].text;
  assert.equal(convMcp.split('\n# Warnings:')[0], conv.draft);
  const bigUrl = await call('image_url', { code: checkout + '\n#' + 'x'.repeat(66 * 1024) });
  assert.equal(bigUrl.isError, true, 'image_url gave a URL the service refuses');
  assert.equal((await rpc('tools/list', {}, null)).status, 401);
  assert.equal(
    (await fetch(`${base}/mcp`, { headers: { Authorization: `Bearer ${KEYS.rich}` } })).status,
    405,
  );
  console.log(
    `MCP: ${tools.length} tools; render_diagram PNG = /v1/render bytes; language_guide = SKILL.md; 401 without a key; GET is 405; image_url refuses a source over 64 KB.`,
  );

  // Stripe: a signed checkout event adds a pack once; bad or stale signatures do nothing.
  const event = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_proof_1',
        payment_status: 'paid',
        metadata: { product: 'draftably-credits', account: 'poor', credits: '25000' },
      },
    },
  });
  const sign = (body: string, t = Math.floor(Date.now() / 1000), secret = 'whsec_proof_fixture') =>
    `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
  const hook = (body: string, sig: string) =>
    fetch(`${base}/stripe/webhook`, { method: 'POST', headers: { 'Stripe-Signature': sig }, body });
  const bought = () => sql(`SELECT bought FROM accounts WHERE id = 'poor'`)[0].bought;
  assert.equal((await hook(event, sign(event))).status, 200);
  assert.equal(bought(), 25000);
  assert.equal((await hook(event, sign(event))).status, 200);
  assert.equal(bought(), 25000, 'a repeated event added credits again');
  assert.equal((await hook(event, sign(event, undefined, 'whsec_wrong'))).status, 400);
  assert.equal((await hook(event, sign(event, Math.floor(Date.now() / 1000) - 600))).status, 400);
  // A delayed payment: completed unpaid, then paid later. Credited once, on the paid event.
  const later = (type: string, paid: string) =>
    JSON.stringify({
      type,
      data: {
        object: {
          id: 'cs_proof_2',
          payment_status: paid,
          metadata: { product: 'draftably-credits', account: 'poor', credits: '1000' },
        },
      },
    });
  const unpaid = later('checkout.session.completed', 'unpaid');
  const settled = later('checkout.session.async_payment_succeeded', 'paid');
  await hook(unpaid, sign(unpaid));
  assert.equal(bought(), 25000);
  await hook(settled, sign(settled));
  await hook(settled, sign(settled));
  assert.equal(bought(), 26000);
  sql(`UPDATE accounts SET bought = bought - 1000 WHERE id = 'poor'`);
  assert.equal(sql(`SELECT count(*) AS n FROM ledger WHERE reason = 'purchase'`)[0].n, 2);
  // Someone else's session, and a marked one for an unknown account: acknowledged, no credits.
  for (const metadata of [
    { account: 'poor', credits: '5' },
    { product: 'draftably-credits', account: 'ghost', credits: '5' },
  ]) {
    const other = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: `cs_${metadata.account}_x`, payment_status: 'paid', metadata } },
    });
    assert.equal((await hook(other, sign(other))).status, 200);
  }
  assert.equal(bought(), 25000);
  assert.equal((await hook('{}', '')).status, 400);
  assert.equal((await hook('x'.repeat(300 * 1024), sign('x'))).status, 413);
  // The grant is spent before bought credits.
  sql(`UPDATE accounts SET grant_left = 1 WHERE id = 'poor'`);
  await post('/v1/render', KEYS.poor, { code: checkout + '\n# grant\n', format: 'svg' });
  assert.equal(bought(), 25000);
  await post('/v1/render', KEYS.poor, { code: checkout + '\n# bought\n', format: 'svg' });
  assert.equal(bought(), 24999);
  console.log(
    'Stripe: a signed event added 25,000 credits once (sent twice); a delayed payment was credited once, on the paid event; unrelated and unknown-account sessions got 200 and no credits; an unsigned post got 400 and a 300 KB one 413; wrong or 10-minute-old signatures got 400; the grant is spent first.',
  );
}

// The same URL twice: the second answer comes from the edge cache.
const fresh = fs.readFileSync('examples/checkout.draft', 'utf8') + `\n# ${Date.now()}\n`;
const url = `${base}/svg/${await encodeSource(fresh)}`;
const first = await fetch(url);
await new Promise(r => setTimeout(r, 500)); // cache.put runs in waitUntil, after the answer
const second = await fetch(url);
assert.equal(first.headers.get('X-Draftably-Cache'), 'miss');
assert.equal(second.headers.get('X-Draftably-Cache'), 'hit');
assert.equal(await first.text(), await second.text());
assert.equal((await fetch(`${base}/svg/pako:@@@`)).status, 400);
// A bad option is refused even when the default image is cached.
assert.equal((await fetch(`${url}?scheme=`)).status, 400);

console.log('Cache: the second request was a hit. Bad encoding: 400.');
stop();
process.exit(tally.failed.length || png.failed.length || mm.failed.length ? 1 : 0);
