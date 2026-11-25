/**
 * `pnpm prove:service`: start the render service in local workerd and request every tracked
 * .draft file through its GET image URL. Each answer must equal what `@draftably/runtime` draws
 * for the same source, byte for byte; sources the runtime rejects must come back as a 400 error
 * image. Cycles through the three URL encodings (pako:, Kroki zlib, plain base64url).
 *
 * The same URL twice must give an edge-cache hit the second time. `--base
 * https://api.draftably.dev` runs it all against a deployed service instead.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { deflateSync } from 'node:zlib';
import { encodeSource } from '../src/lib/render-url.ts';

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
    links: { mode: 'safe' },
    limits: { maxSourceBytes: 64 * 1024 },
  });
  if (!want.ok) {
    if (res.status === 400 && body.includes('could not draw')) tally.rejected++;
    else tally.failed.push(`${file}: runtime rejects it, service gave ${res.status}`);
  } else if (res.status === 200 && body === want.value.svg) tally.same++;
  else
    tally.failed.push(
      `${file} (${form.name}, ${scheme}): ${res.status}, ${body.length} vs ${want.value.svg.length} bytes`,
    );
}

console.log(
  `${files.length} files: ${tally.same} identical to the runtime, ${tally.rejected} rejected by both, ` +
    `${tally.tooLong} over the 8 KB URL limit (400), ${tally.failed.length} wrong.`,
);
for (const f of tally.failed) console.log('  ' + f);

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
process.exit(tally.failed.length ? 1 : 0);
