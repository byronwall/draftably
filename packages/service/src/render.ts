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
import { encodeSource, MAX_SOURCE_BYTES, SourceError } from '../../../src/lib/render-url';
import { balance, COST, spend, type Balance } from './credits';
import { draw, type DrawOptions, type Format } from './draw';
import { ApiError } from './errors';
import { dated } from './mermaid';

/** The longest GET path segment accepted; longer sources go through POST. */
export const MAX_SEGMENT = 8 * 1024;

const IMMUTABLE = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';

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
async function cacheKey(origin: string, source: string, format: Format, opts: DrawOptions) {
  const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)));
  const url = new URL(`/__cache/${format}/${hash}`, origin);
  for (const [k, v] of Object.entries(opts)) if (v != null) url.searchParams.set(k, String(v));
  url.searchParams.set('v', runtimeVersion);
  return new Request(url.toString());
}

// The DOM lib (for Mermaid's types) hides the Workers-only `caches.default`.
const cache = () => (caches as unknown as { default: Cache }).default;

export async function render(
  env: { DB: D1Database },
  ctx: ExecutionContext,
  origin: string,
  source: string,
  format: Format,
  opts: DrawOptions,
  /** Who pays, or nobody for a free anonymous image. */
  account?: string,
  /** Runs on a miss before drawing: the anonymous per-address limit. */
  beforeDraw?: () => Promise<void>,
): Promise<Drawn> {
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES)
    throw new SourceError(`The source is over ${MAX_SOURCE_BYTES / 1024} KB.`);
  const key = await cacheKey(origin, source, format, opts);
  const hit = await cache().match(key);
  if (hit)
    return {
      body: format === 'png' ? new Uint8Array(await hit.arrayBuffer()) : await hit.text(),
      hit: true,
      cacheControl: hit.headers.get('Cache-Control') ?? IMMUTABLE,
    };
  await beforeDraw?.();
  const cost = COST[format];
  const outOfCredits = () =>
    new ApiError(402, 'ERR_LIMIT_BALANCE', 'Out of credits. Buy more at /account.');
  if (account) {
    const b = await balance(env.DB, account);
    if (b.grant + b.bought < cost) throw outOfCredits();
  }
  const body = await draw(source, format, opts);
  let left: Balance | undefined;
  if (account) {
    left = (await spend(env.DB, account, cost, format)) ?? undefined;
    if (!left) throw outOfCredits();
  }
  const cacheControl = dated(source, opts.type) ? ONE_DAY : IMMUTABLE;
  ctx.waitUntil(
    cache().put(key, new Response(body, { headers: { 'Cache-Control': cacheControl } })),
  );
  return { body, hit: false, cacheControl, left };
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
