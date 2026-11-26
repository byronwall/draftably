/**
 * `pnpm prove:service-boundary`: the render service's request boundary, in local workerd. The same
 * input through every transport must give the same answer: the same image bytes, or the same
 * error code (and HTTP status, where the transport has one), and the same price.
 *
 * Transports: an anonymous GET image URL, a keyed GET image URL, `POST /v1/render`, the MCP tool
 * `render_diagram`, and a short link (`POST /v1/share`, then `GET /d/{id}.{svg|png}`). Inputs:
 * good sources and options, a leading byte-order mark, Mermaid with and without `type`, a source
 * that does not draw, an empty source, one over 64 KB, a wrong key, and a body over 256 KB.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { build } from 'esbuild';
import { KEYS, startService } from './lib/local-service.ts';

// The URL codec imports DSL modules that plain Node can't load, so bundle the file the Worker does.
const bundled = await build({
  entryPoints: ['src/lib/render-url.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
});
const { encodeSource } = (await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
)) as typeof import('../src/lib/render-url');

const svc = await startService('.wrangler/proof-boundary');
const { base } = svc;
const BAD_KEY = 'dft_bbbbbbbbbbbb.wrong-secret-0123456789abcdef';

interface Input {
  code: string;
  format: 'svg' | 'png';
  type?: 'draftably' | 'mermaid';
  scheme?: 'light' | 'dark';
  scale?: number;
}
/** What a transport answered: `sha:<hash>` of the image, or the error code. */
interface Outcome {
  result: string;
  /** The HTTP status; none for an MCP tool result, which is always 200. */
  status?: number;
}

const sha = (b: Uint8Array) => 'sha:' + createHash('sha256').update(b).digest('hex').slice(0, 16);
const auth = (key?: string): Record<string, string> =>
  key ? { Authorization: `Bearer ${key}` } : {};

function query(i: Input) {
  const q = new URLSearchParams();
  if (i.type) q.set('type', i.type);
  if (i.scheme) q.set('scheme', i.scheme);
  if (i.scale) q.set('scale', String(i.scale));
  return q.size ? `?${q}` : '';
}

/** An image answer: its bytes, or the error code the service names in a header or JSON. */
async function image(res: Response): Promise<Outcome> {
  if (res.ok) return { result: sha(new Uint8Array(await res.arrayBuffer())), status: res.status };
  const code =
    res.headers.get('X-Draftably-Error-Code') ??
    ((await res.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
  return { result: code ?? `HTTP_${res.status}`, status: res.status };
}

const viaGet = (key?: string) => async (i: Input) =>
  image(
    await fetch(`${base}/${i.format}/${await encodeSource(i.code)}${query(i)}`, {
      headers: auth(key),
    }),
  );

const post = (route: string, body: string, key?: string) =>
  fetch(`${base}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...auth(key),
    },
    body,
  });

const viaRest = (key?: string) => async (i: Input) =>
  image(await post('/v1/render', JSON.stringify(i), key));

let rpcId = 0;
const rpcBody = (name: string, args: object) =>
  JSON.stringify({
    jsonrpc: '2.0',
    id: ++rpcId,
    method: 'tools/call',
    params: { name, arguments: args },
  });
const viaMcp = (key?: string) => async (i: Input) => {
  const res = await post('/mcp', rpcBody('render_diagram', i), key);
  if (res.status !== 200) return image(res);
  const result = (await res.json()).result;
  if (result.isError) return { result: result._meta?.['draftably/error'] ?? 'no code' };
  const out = result.content[0];
  return {
    result: sha(
      out.type === 'image' ? Buffer.from(out.data, 'base64') : new TextEncoder().encode(out.text),
    ),
  };
};

/** A short link: store, then draw `/d/{id}`. A refusal at either step is the answer. */
const viaShare = (key?: string) => async (i: Input) => {
  const stored = await post(
    '/v1/share',
    JSON.stringify({ code: i.code, type: i.type, scheme: i.scheme, scale: i.scale }),
    key,
  );
  if (!stored.ok) return image(stored);
  const { id } = await stored.json();
  const q = new URLSearchParams();
  if (i.scheme) q.set('scheme', i.scheme);
  if (i.scale) q.set('scale', String(i.scale));
  return image(await fetch(`${base}/d/${id}.${i.format}${q.size ? `?${q}` : ''}`));
};

const checkout = fs.readFileSync('examples/checkout.draft', 'utf8');
const mermaid = 'flowchart LR\n  A[Start] --> B[End]\n';
// Compresses into a short URL, so the GET route reaches the source limit, not the URL limit.
const huge = checkout + '\n#' + 'x'.repeat(66 * 1024);
// Exactly at the 64 KB limit, and the same with a byte-order mark, which counts as sent.
const atLimit = checkout + '\n#' + 'x'.repeat(64 * 1024 - Buffer.byteLength(checkout) - 2);
assert.equal(Buffer.byteLength(atLimit), 64 * 1024);

/** Inputs that every transport takes, with the answer all must agree on. */
const cases: { name: string; input: Input; want: 'image' | string; share?: boolean }[] = [
  { name: 'SVG', input: { code: checkout, format: 'svg' }, want: 'image', share: true },
  { name: 'PNG', input: { code: checkout, format: 'png' }, want: 'image', share: true },
  {
    name: 'PNG dark scale 1',
    input: { code: checkout, format: 'png', scheme: 'dark', scale: 1 },
    want: 'image',
    share: true,
  },
  {
    name: 'byte-order mark',
    input: { code: '﻿' + checkout, format: 'svg' },
    want: 'image',
    share: true,
  },
  { name: 'Mermaid detected', input: { code: mermaid, format: 'svg' }, want: 'image', share: true },
  {
    name: 'Mermaid typed',
    input: { code: mermaid, format: 'svg', type: 'mermaid' },
    want: 'image',
  },
  { name: 'bad source', input: { code: 'node a "unclosed', format: 'svg' }, want: 'ERR_SOURCE' },
  { name: 'empty source', input: { code: '  \n', format: 'svg' }, want: 'ERR_SOURCE' },
  { name: 'source over 64 KB', input: { code: huge, format: 'svg' }, want: 'ERR_SOURCE' },
  { name: 'source at 64 KB', input: { code: atLimit, format: 'svg' }, want: 'image' },
  {
    name: 'byte-order mark past 64 KB',
    input: { code: '\uFEFF' + atLimit, format: 'svg' },
    want: 'ERR_SOURCE',
  },
];

const transports = {
  'GET anonymous': viaGet(),
  'GET keyed': viaGet(KEYS.rich),
  REST: viaRest(KEYS.rich),
  MCP: viaMcp(KEYS.rich),
  share: viaShare(),
};
type Name = keyof typeof transports;

let checked = 0;
for (const c of cases) {
  const seen: [Name, Outcome][] = [];
  for (const [name, run] of Object.entries(transports) as [Name, (i: Input) => Promise<Outcome>][])
    if (name !== 'share' || c.share || c.want !== 'image') seen.push([name, await run(c.input)]);
  const results = new Set(seen.map(([, o]) => o.result));
  const statuses = new Set(seen.flatMap(([, o]) => (o.status ? [o.status] : [])));
  const table = seen.map(([n, o]) => `${n}=${o.result}/${o.status ?? '-'}`).join(', ');
  assert.equal(results.size, 1, `${c.name}: transports differ: ${table}`);
  assert.equal(statuses.size, 1, `${c.name}: statuses differ: ${table}`);
  const [result] = results;
  if (c.want === 'image') assert.match(result, /^sha:/, `${c.name}: ${table}`);
  else assert.equal(result, c.want, `${c.name}: ${table}`);
  checked += seen.length;
}
console.log(`Same answer: ${cases.length} inputs through ${checked} transport calls.`);

// A wrong key is refused before the source is read and before the cache, everywhere, also for an
// image that is already cached. A body over 256 KB is refused before it is parsed.
const warm = { code: checkout, format: 'svg' } as Input;
const refusals: [string, Outcome][] = [
  ['GET', await viaGet(BAD_KEY)(warm)],
  ['REST', await viaRest(BAD_KEY)(warm)],
  ['MCP', await image(await post('/mcp', rpcBody('render_diagram', warm), BAD_KEY))],
  ['share', await viaShare(BAD_KEY)(warm)],
  [
    'GET /link',
    await image(
      await fetch(`${base}/link?format=json&code=${encodeURIComponent(warm.code + '\n# k')}`, {
        headers: auth(BAD_KEY),
      }),
    ),
  ],
];
for (const [name, o] of refusals)
  assert.equal(o.status, 401, `wrong key over ${name}: ${o.status}`);
for (const [name, o] of refusals.filter(([n]) => n !== 'MCP'))
  assert.equal(o.result, 'ERR_AUTH', `wrong key over ${name}: ${o.result}`);
const pad = 'x'.repeat(300 * 1024);
const tooBig: [string, Outcome][] = [
  ['REST', await image(await post('/v1/render', JSON.stringify({ code: pad }), KEYS.rich))],
  ['MCP', await image(await post('/mcp', rpcBody('render_diagram', { code: pad }), KEYS.rich))],
  ['share', await image(await post('/v1/share', JSON.stringify({ code: pad })))],
];
for (const [name, o] of tooBig)
  assert.deepEqual(o, { result: 'ERR_TOO_LARGE', status: 413 }, `300 KB body over ${name}`);
// MCP keeps its own protocol errors for a body that is not JSON-RPC.
const plain = await fetch(`${base}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    Accept: 'application/json, text/event-stream',
    ...auth(KEYS.rich),
  },
  body: '{}',
});
assert.equal(plain.status, 415);
const cut = await post('/mcp', '{"jsonrpc": "2.0", "id": 1, "meth', KEYS.rich);
assert.equal((await cut.json()).error?.code, -32700);
console.log(
  'Refused alike: a wrong key 401 on 5 routes, warm image too; a 300 KB body 413 on 3; MCP keeps 415 and -32700.',
);

// The links the MCP link tools return keep the options: they draw what render_diagram draws.
const scaled: Input = { code: checkout + '\n# links\n', format: 'png', scheme: 'dark', scale: 1 };
const direct = await viaRest(KEYS.rich)(scaled);
const toolText = async (name: string) => {
  const res = await post('/mcp', rpcBody(name, scaled), KEYS.rich);
  return (await res.json()).result.content[0].text as string;
};
const longUrl = await toolText('image_url');
const shortUrl = /png: (\S+)/.exec(await toolText('share_diagram'))![1];
for (const [name, link] of [
  ['image_url', longUrl],
  ['share_diagram', shortUrl],
])
  assert.equal((await image(await fetch(link))).result, direct.result, `${name}: ${link}`);
console.log('MCP link tools: image_url and share_diagram links draw the render_diagram bytes.');

// Price: a miss costs 1 credit for SVG and 2 for PNG on every paid transport; the same image again,
// by any transport, is a free hit; a source that does not draw costs nothing.
const left = async () =>
  (await (await fetch(`${base}/v1/balance`, { headers: auth(KEYS.rich) })).json()).bought as number;
const paid = { 'GET keyed': transports['GET keyed'], REST: transports.REST, MCP: transports.MCP };
const prices: string[] = [];
for (const format of ['svg', 'png'] as const)
  for (const [name, run] of Object.entries(paid)) {
    const input: Input = { code: `${checkout}\n# price ${name} ${format}\n`, format };
    let before = await left();
    assert.match((await run(input)).result, /^sha:/);
    const cost = before - (await left());
    assert.equal(cost, format === 'svg' ? 1 : 2, `${name} ${format} miss cost ${cost}`);
    // cache.put runs after the answer.
    await new Promise(r => setTimeout(r, 300));
    for (const [again, rerun] of Object.entries(paid)) {
      before = await left();
      await rerun(input);
      assert.equal(await left(), before, `${again} charged for a hit drawn by ${name}`);
    }
    before = await left();
    assert.equal((await run({ code: 'node a "unclosed', format })).result, 'ERR_SOURCE');
    assert.equal(await left(), before, `${name}: a bad source cost credits`);
    prices.push(`${name} ${format} ${cost}`);
  }
console.log(`Same price: ${prices.join(', ')}; hits and bad sources free on every transport.`);

svc.stop();
