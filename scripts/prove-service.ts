/**
 * `pnpm prove:service`: start the render service in local workerd and request every tracked
 * .draft file through its GET image URL. Each answer must equal what `@draftably/runtime` draws
 * for the same source, byte for byte; sources the runtime rejects must come back as a 400 error
 * image. Cycles through the three URL encodings (pako:, Kroki zlib, plain base64url).
 *
 * Then PNG: each file's `/png/` answer must have the same pixels as `draftably inspect --png`
 * (the CLI, resvg-js) and carry the source that `draftably extract` reads back.
 *
 * The same URL twice must give an edge-cache hit the second time. `--base
 * https://api.draftably.dev` runs it all against a deployed service instead.
 */
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { deflateSync, inflateSync } from 'node:zlib';
import { encodeSource, webLinkBase } from '../src/lib/render-url.ts';

const at = process.argv.indexOf('--base');
const remote = at > 0 ? process.argv[at + 1].replace(/\/$/, '') : undefined;
const PORT = 8787 + Math.floor(Math.random() * 1000);
const base = remote ?? `http://127.0.0.1:${PORT}`;
const { renderSvg } = await import('../packages/runtime/dist/index.js');

const dev = remote
  ? undefined
  : spawn(
      'pnpm',
      [
        'exec',
        'wrangler',
        'dev',
        '--local',
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

const files = execFileSync('git', ['ls-files', '*.draft'], { encoding: 'utf8' }).trim().split('\n');
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
    links: { mode: 'safe', baseUrl: webLinkBase(source) },
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
const png = { same: 0, local: 0, sourceBack: 0, failed: [] as string[] };
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
  if (res.status !== 200) return void png.failed.push(`${file}: PNG ${res.status}`);
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
  if (back === source) png.sourceBack++;
  else png.failed.push(`${file}: extract gave a different source`);
}
for (let i = 0; i < drawn.length; i += 8)
  await Promise.all(drawn.slice(i, i + 8).map((d, j) => checkPng(d, i + j)));
console.log(
  `PNG: ${drawn.length} files: ${png.same} pixel-identical to the CLI, ${png.local} differ only ` +
    `because they use local files or links, ${png.failed.length} wrong; ` +
    `${png.sourceBack} read back by extract.`,
);
for (const f of png.failed) console.log('  ' + f);
const huge = await fetch(`${base}/png/${await encodeSource('a -> b')}?scale=9`);
assert.equal(huge.status, 400);
assert.equal(huge.headers.get('Content-Type'), 'image/png');

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
process.exit(tally.failed.length || png.failed.length ? 1 : 0);
