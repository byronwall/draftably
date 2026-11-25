/**
 * The hosted render service. GET image URLs hold the diagram source, so any URL always draws the
 * same image for one runtime version; the edge cache keys on both. Anonymous image URLs are free
 * and rate-limited per IP; with an API key they spend credits instead. `/v1/*` is the keyed REST
 * API and `/account` the sign-in page.
 */
import { runtimeVersion } from '@draftably/runtime';
import { decodeSource, SourceError } from '../../../src/lib/render-url';
import { handleAccount } from './account';
import { ApiError, handleApi, paidDraw, requireKey, type ApiEnv } from './api';
import { freshness } from './mermaid';
import { draw, drawOptions, errorImage, type DrawOptions, type Format } from './draw';

export interface Env extends ApiEnv {
  ANON_LIMIT: RateLimit;
  /** Changes on every deploy, so a deploy that draws differently starts a fresh cache. */
  CF_VERSION_METADATA: WorkerVersionMetadata;
}

/** The longest image URL path accepted; longer sources go through POST. */
const MAX_URL = 8 * 1024;

const TYPES: Record<Format, string> = { svg: 'image/svg+xml; charset=utf-8', png: 'image/png' };
// The public URL carries no version, so a browser may keep it for a day, not a year. The edge
// cache keys on the deploy, so it never serves an image an older deploy drew.
const IMMUTABLE = 'public, max-age=86400';

function image(body: BodyInit, format: Format, status = 200, cache = IMMUTABLE) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': TYPES[format],
      'Cache-Control': cache,
      'Access-Control-Allow-Origin': '*',
      'X-Draftably-Version': runtimeVersion,
    },
  });
}

/** `/{svg|png}/{encoded}` and the Kroki-style `/draftably/{svg|png}/{encoded}`. */
function parseImagePath(path: string): { format: Format; segment: string } | null {
  const m = /^\/(?:draftably\/)?(svg|png)\/([^/]+)$/.exec(path);
  return m ? { format: m[1] as Format, segment: m[2] } : null;
}

/** Draw an image URL, for free or, with `account`, for credits. Errors come back as images. */
async function imageResponse(
  env: Env,
  segment: string,
  format: Format,
  opts: DrawOptions,
  account?: string,
) {
  try {
    if (segment.length > MAX_URL)
      throw new SourceError('The URL is over 8 KB. Use POST /v1/render for large diagrams.');
    const source = await decodeSource(segment);
    const body = account
      ? (await paidDraw(env, account, source, format, opts)).body
      : await draw(source, format, opts);
    return image(body, format, 200, freshness(source, opts.type)?.cacheControl ?? IMMUTABLE);
  } catch (error) {
    if (error instanceof ApiError)
      return image(await errorImage(error.message, format), format, error.status, 'no-store');
    if (!(error instanceof SourceError)) throw error;
    return image(await errorImage(error.message, format), format, 400, 'public, max-age=60');
  }
}

const HOME = `Draftably render service

GET /svg/{encoded}   SVG drawing of a Draftably diagram
GET /png/{encoded}   PNG drawing, with the source embedded; ?scale=1|2|3|4 (default 2)
                     {encoded} = "pako:" + base64url(zlib(source)), as mermaid.ink, or
                     base64url(source). Make one with: draftably url <file.draft>
                     The source is Draftably or Mermaid (flowchart, sequence, gantt,
                     timeline); ?type=mermaid|draftably skips the guess.
                     ?scheme=light|dark
                     Free: 60 new drawings a minute per address. Send an API key
                     (Authorization: Bearer dft_...) to use credits instead.

POST /v1/render      {"code": "...", "format": "svg"|"png", "type"?, "scheme"?, "scale"?}
POST /v1/validate    {"code": "...", "type"?}  -> {valid, type, diagnostics}
POST /v1/convert     {"code": "...", "from": "mermaid"}  -> {draft, warnings}
GET  /v1/balance     -> {grant, bought, resetsAt}
                     All need Authorization: Bearer dft_.... An SVG costs 1 credit, a PNG 2.

/account             Sign in with GitHub, see credits, make API keys. 1,000 free credits a month.

Version ${runtimeVersion}. Language: https://draftably.dev/docs
`;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const api = await handleApi(req, env, ctx, url);
    if (api) return api;
    const account = await handleAccount(req, env, url);
    if (account) return account;
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return new Response('Method not allowed', { status: 405 });
    if (url.pathname === '/')
      return new Response(HOME, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    if (url.pathname === '/health') return Response.json({ ok: true, version: runtimeVersion });
    const route = parseImagePath(url.pathname);
    if (!route) return new Response('Not found', { status: 404 });

    // Options are checked before the cache, so a bad one never matches a good image. The key
    // holds only what changes the image: the path, the checked options, the version.
    let opts: DrawOptions;
    try {
      opts = drawOptions(k => url.searchParams.get(k));
    } catch (error) {
      if (!(error instanceof SourceError)) throw error;
      return image(await errorImage(error.message, route.format), route.format, 400, 'no-store');
    }
    const keyUrl = new URL(url.pathname, url.origin);
    for (const [k, v] of Object.entries(opts)) if (v != null) keyUrl.searchParams.set(k, String(v));
    keyUrl.searchParams.set('v', runtimeVersion);
    const key = new Request(keyUrl.toString());
    // The DOM lib (for Mermaid's types) hides the Workers-only `caches.default`.
    const cache = (caches as unknown as { default: Cache }).default;
    const hit = await cache.match(key);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set('X-Draftably-Cache', 'hit');
      return res;
    }

    // A key spends credits and skips the per-address limit; a bad key is refused, not ignored.
    let payer: string | undefined;
    if (req.headers.has('Authorization')) {
      try {
        payer = (await requireKey(req, env, ctx)).account;
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        const img = await errorImage(error.message, route.format);
        return image(img, route.format, error.status, 'no-store');
      }
    } else if (
      !(await env.ANON_LIMIT.limit({ key: req.headers.get('CF-Connecting-IP') ?? 'local' })).success
    ) {
      const msg = 'Too many renders from this address. Wait a minute, or use an API key.';
      return image(await errorImage(msg, route.format), route.format, 429, 'no-store');
    }

    const res = await imageResponse(env, route.segment, route.format, opts, payer);
    if (res.status === 200) ctx.waitUntil(cache.put(key, res.clone()));
    res.headers.set('X-Draftably-Cache', 'miss');
    return res;
  },
} satisfies ExportedHandler<Env>;
