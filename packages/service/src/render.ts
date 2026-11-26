/**
 * One way to draw for every interface: GET image URLs, `/api/v1/render` and the MCP tool. They share
 * one edge cache, keyed by what changes the image (the source's hash, the format, the checked
 * options, the runtime version), so a cache hit is free everywhere and the three can't price the
 * same image differently.
 *
 * A paid render checks the balance, draws, and only then takes the credits with the guarded
 * UPDATE. A render that fails, or that Cloudflare cuts off at its CPU limit, costs nothing, so
 * there is no refund path. Parallel renders can all pass the first check; the guarded UPDATE then
 * lets only as many through as the balance covers, and the rest get 402 after drawing.
 */
import { encodeSource, MAX_SEGMENT } from '../../../src/lib/render-url';
import { balance, COST, spend, type Balance } from './credits';
import { draw } from './draw';
import { ApiError } from './errors';
import { freshness, sourceType } from './mermaid';
import { bump, byteSize, note, span } from './obs';
import { cacheKey, type DrawRequest } from './request';

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

// The DOM lib (for Mermaid's types) hides the Workers-only `caches.default`.
const cache = () => (caches as unknown as { default: Cache }).default;

/** Who pays: the account and the key it called with. */
export interface Payer {
  account: string;
  /** The API key that pays, or none for an OAuth app (its grant is checked per request). */
  key?: string;
}

/**
 * Draw `source`, or take it from the cache. `prepare` turns the image into what the caller sends
 * (a Response, MCP content) and runs before the credits are taken, so nothing that can fail runs
 * after the debit; the cache entry is written only after it.
 */
export function render<P>(
  env: { DB: D1Database; CF_VERSION_METADATA: WorkerVersionMetadata },
  ctx: ExecutionContext,
  origin: string,
  r: DrawRequest,
  prepare: (body: string | Uint8Array, cacheControl: string) => Promise<P>,
  payer?: Payer,
  beforeDraw?: () => Promise<void>,
): Promise<Drawn & { out: P }> {
  // One span per render, for latency by format and cache across GET, REST and MCP.
  return span('render', { format: r.format, paid: !!payer }, async s => {
    const drawn = await renderNow(env, ctx, origin, r, prepare, payer, beforeDraw);
    s.setAttribute('cache_hit', drawn.hit);
    return drawn;
  });
}

async function renderNow<P>(
  env: { DB: D1Database; CF_VERSION_METADATA: WorkerVersionMetadata },
  ctx: ExecutionContext,
  origin: string,
  r: DrawRequest,
  prepare: (body: string | Uint8Array, cacheControl: string) => Promise<P>,
  /** Who pays, or nobody for a free anonymous image. */
  payer?: Payer,
  /** Runs on a miss before drawing: the anonymous per-address limit. */
  beforeDraw?: () => Promise<void>,
): Promise<Drawn & { out: P }> {
  const { source, format, opts } = r;
  note({
    format,
    source_bytes: byteSize(source),
    source_type: opts.type,
    scheme: opts.scheme,
    scale: format === 'png' ? opts.scale : undefined,
  });
  const { key, hit } = await span('cache.lookup', { format }, async s => {
    const key = await cacheKey(origin, env.CF_VERSION_METADATA.id, r);
    const hit = await cache().match(key);
    s.setAttribute('cache_hit', !!hit);
    return { key, hit };
  });
  note({ cache: hit ? 'hit' : 'miss' });
  if (hit) {
    const body = format === 'png' ? new Uint8Array(await hit.arrayBuffer()) : await hit.text();
    // A dated image's lifetime is counted again: it still ends at the next UTC midnight.
    const cacheControl = freshness(source, opts.type)?.cacheControl ?? IMMUTABLE;
    note({ out_bytes: byteSize(body) });
    return { body, hit: true, cacheControl, out: await prepare(body, cacheControl) };
  }
  await beforeDraw?.();
  const cost = COST[format];
  const outOfCredits = () =>
    new ApiError(402, 'ERR_LIMIT_BALANCE', 'Out of credits. Buy more at /account.');
  if (payer) {
    const b = await balance(env.DB, payer.account);
    note({ credits_left: b.grant + b.bought });
    if (b.grant + b.bought < cost) throw outOfCredits();
  }
  const body = await draw(source, format, opts);
  note({ out_bytes: byteSize(body) });
  const cacheControl = freshness(source, opts.type)?.cacheControl ?? IMMUTABLE;
  const out = await prepare(body, cacheControl);
  let left: Balance | undefined;
  if (payer) {
    left = (await spend(env.DB, payer.account, cost, format, payer.key)) ?? undefined;
    if (!left) {
      if (payer.key) {
        const live = await env.DB.prepare(
          `SELECT a.grant_left + a.bought AS left FROM keys k JOIN accounts a ON a.id = k.account_id
           WHERE k.id = ?1 AND k.revoked_at IS NULL`,
        )
          .bind(payer.key)
          .first<{ left: number }>();
        if (!live) throw new ApiError(401, 'ERR_AUTH', 'This key was revoked.');
        note({ credits_left: live.left });
      }
      throw outOfCredits();
    }
    bump('credits_spent', cost);
    note({ credits_left: left.grant + left.bought });
  }
  ctx.waitUntil(
    span('cache.put', { format, out_bytes: byteSize(body) }, () =>
      cache().put(key, new Response(body, { headers: { 'Cache-Control': cacheControl } })),
    ),
  );
  return { body, hit: false, cacheControl, left, out };
}

/**
 * The public GET URL for the same image, with its options, or null when the source is too long
 * for a URL (the caller then has only the bytes it was given).
 */
export async function embedUrl(origin: string, r: DrawRequest) {
  const segment = await encodeSource(r.source);
  if (segment.length > MAX_SEGMENT) return null;
  const q = new URLSearchParams();
  // The language only when the URL would not detect the same one.
  if (sourceType(r.source).type !== r.opts.type) q.set('type', r.opts.type);
  if (r.opts.scheme !== 'light') q.set('scheme', r.opts.scheme);
  if (r.format === 'png' && r.opts.scale !== 2) q.set('scale', String(r.opts.scale));
  return `${origin}/api/${r.format}/${segment}${q.size ? `?${q}` : ''}`;
}
