/**
 * One way to draw for every interface: GET image URLs, `/v1/render` and the MCP tool. They share
 * one edge cache, keyed by what changes the image (the source's hash, the format, the checked
 * options, the runtime version), so a cache hit is free everywhere and the three can't price the
 * same image differently.
 *
 * A paid render checks the balance, draws, and only then takes the credits with the guarded
 * UPDATE. A render that fails, or that Cloudflare cuts off at its CPU limit, costs nothing, so
 * there is no refund path. Parallel renders can all pass the first check; the guarded UPDATE then
 * lets only as many through as the balance covers, and the rest get 402 after drawing.
 */
import { runtimeVersion } from '@draftably/runtime';
import {
  encodeSource,
  MAX_SEGMENT,
  MAX_SOURCE_BYTES,
  SourceError,
} from '../../../src/lib/render-url';
import { balance, COST, spend, type Balance } from './credits';
import { draw, type DrawOptions, type Format } from './draw';
import { ApiError } from './errors';
import { freshness } from './mermaid';

export { MAX_SEGMENT };

// The public URL carries no version, so a browser may keep it for a day, not a year. The edge
// cache keys on the deploy, so it never serves an image an older deploy drew.
const IMMUTABLE = 'public, max-age=86400';

export interface Drawn {
  body: string | Uint8Array;
  hit: boolean;
  /** How long a browser or CDN may keep it: a day for images that depend on today's date. */
  cacheControl: string;
  /** The balance after a paid miss. */
  left?: Balance;
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** The cache key for an image: on this service's own origin, so the Cache API accepts it. */
async function cacheKey(
  origin: string,
  build: string,
  source: string,
  format: Format,
  opts: DrawOptions,
) {
  const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)));
  const url = new URL(`/__cache/${format}/${hash}`, origin);
  // Scale changes only a PNG; an SVG keyed on it would be drawn and charged twice.
  for (const [k, v] of Object.entries(opts))
    if (v != null && !(k === 'scale' && format === 'svg')) url.searchParams.set(k, String(v));
  url.searchParams.set('v', runtimeVersion);
  url.searchParams.set('build', build);
  // A gantt chart can draw differently tomorrow, so its key carries today's date.
  const day = freshness(source, opts.type)?.day;
  if (day) url.searchParams.set('day', day);
  return new Request(url.toString());
}

// The DOM lib (for Mermaid's types) hides the Workers-only `caches.default`.
const cache = () => (caches as unknown as { default: Cache }).default;

/** Who pays: the account and the key it called with. */
export interface Payer {
  account: string;
  key: string;
}

/**
 * Draw `source`, or take it from the cache. `prepare` turns the image into what the caller sends
 * (a Response, MCP content) and runs before the credits are taken, so nothing that can fail runs
 * after the debit; the cache entry is written only after it.
 */
export async function render<P>(
  env: { DB: D1Database; CF_VERSION_METADATA: WorkerVersionMetadata },
  ctx: ExecutionContext,
  origin: string,
  rawSource: string,
  format: Format,
  opts: DrawOptions,
  prepare: (body: string | Uint8Array, cacheControl: string) => Promise<P>,
  /** Who pays, or nobody for a free anonymous image. */
  payer?: Payer,
  /** Runs on a miss before drawing: the anonymous per-address limit. */
  beforeDraw?: () => Promise<void>,
): Promise<Drawn & { out: P }> {
  // A GET URL's decoder drops a leading byte-order mark; drop it here too, so both hash the same.
  const source = rawSource.replace(/^\uFEFF/, '');
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES)
    throw new SourceError(`The source is over ${MAX_SOURCE_BYTES / 1024} KB.`);
  const key = await cacheKey(origin, env.CF_VERSION_METADATA.id, source, format, opts);
  const hit = await cache().match(key);
  if (hit) {
    const body = format === 'png' ? new Uint8Array(await hit.arrayBuffer()) : await hit.text();
    const cacheControl = hit.headers.get('Cache-Control') ?? IMMUTABLE;
    return { body, hit: true, cacheControl, out: await prepare(body, cacheControl) };
  }
  await beforeDraw?.();
  const cost = COST[format];
  const outOfCredits = () =>
    new ApiError(402, 'ERR_LIMIT_BALANCE', 'Out of credits. Buy more at /account.');
  if (payer) {
    const b = await balance(env.DB, payer.account);
    if (b.grant + b.bought < cost) throw outOfCredits();
  }
  const body = await draw(source, format, opts);
  const cacheControl = freshness(source, opts.type)?.cacheControl ?? IMMUTABLE;
  const out = await prepare(body, cacheControl);
  let left: Balance | undefined;
  if (payer) {
    left = (await spend(env.DB, payer.account, cost, format, payer.key)) ?? undefined;
    if (!left) {
      const live = await env.DB.prepare(`SELECT 1 FROM keys WHERE id = ?1 AND revoked_at IS NULL`)
        .bind(payer.key)
        .first();
      if (!live) throw new ApiError(401, 'ERR_AUTH', 'This key was revoked.');
      throw outOfCredits();
    }
  }
  ctx.waitUntil(
    cache().put(key, new Response(body, { headers: { 'Cache-Control': cacheControl } })),
  );
  return { body, hit: false, cacheControl, left, out };
}

/**
 * The public GET URL for the same image, with its options, or null when the source is too long
 * for a URL (the caller then has only the bytes it was given).
 */
export async function embedUrl(origin: string, source: string, format: Format, opts: DrawOptions) {
  const segment = await encodeSource(source);
  if (segment.length > MAX_SEGMENT) return null;
  const q = new URLSearchParams();
  if (opts.type) q.set('type', opts.type);
  if (opts.scheme !== 'light') q.set('scheme', opts.scheme);
  if (format === 'png' && opts.scale !== 2) q.set('scale', String(opts.scale));
  return `${origin}/${format}/${segment}${q.size ? `?${q}` : ''}`;
}
