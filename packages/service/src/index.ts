/**
 * The hosted render service. GET image URLs hold the diagram source, so any URL always draws the
 * same image for one runtime version; the edge cache keys on both. Anonymous image URLs are free
 * and rate-limited per IP; with an API key they spend credits instead. `/v1/*` is the keyed REST
 * API and `/account` the sign-in page.
 */
import { runtimeVersion } from '@draftably/runtime';
import { decodeSource, SourceError } from '../../../src/lib/render-url';
import { handleAccount } from './account';
import { ApiError, handleApi, requireKey, type ApiEnv } from './api';
import { drawOptions, errorImage, type DrawOptions, type Format } from './draw';
import { MAX_SEGMENT, render, type Payer } from './render';

export interface Env extends ApiEnv {
  ANON_LIMIT: RateLimit;
}

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

/**
 * Draw an image URL, for free or, with `account`, for credits; errors come back as images. The
 * per-address limit applies only to anonymous misses.
 */
async function imageResponse(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  origin: string,
  segment: string,
  format: Format,
  opts: DrawOptions,
  payer?: Payer,
) {
  const anonLimit = async () => {
    if (payer) return;
    const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
    if (!(await env.ANON_LIMIT.limit({ key: ip })).success)
      throw new ApiError(
        429,
        'ERR_LIMIT_BURST',
        'Too many renders from this address. Wait a minute, or use an API key.',
      );
  };
  try {
    if (segment.length > MAX_SEGMENT)
      throw new SourceError('The URL is over 8 KB. Use POST /v1/render for large diagrams.');
    const source = await decodeSource(segment);
    // A keyed answer is never stored by a browser or CDN, so a revoked key can't be answered from
    // one. An anonymous answer varies on Authorization for the same reason.
    const drawn = await render(
      env,
      ctx,
      origin,
      source,
      format,
      opts,
      async (body, cacheControl) => image(body, format, 200, payer ? 'no-store' : cacheControl),
      payer,
      anonLimit,
    );
    const res = drawn.out;
    if (!payer) res.headers.set('Vary', 'Authorization');
    res.headers.set('X-Draftably-Cache', drawn.hit ? 'hit' : 'miss');
    return res;
  } catch (error) {
    if (error instanceof ApiError)
      return image(await errorImage(error.message, format), format, error.status, 'no-store');
    if (!(error instanceof SourceError)) throw error;
    return image(await errorImage(error.message, format), format, 400, 'no-store');
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
    // HEAD would draw and charge for a body it never sends.
    if (req.method !== 'GET')
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
    if (url.pathname === '/')
      return new Response(HOME, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    if (url.pathname === '/health') return Response.json({ ok: true, version: runtimeVersion });
    const route = parseImagePath(url.pathname);
    if (!route) return new Response('Not found', { status: 404 });

    // Options are checked first, so a bad one never matches a cached image.
    let opts: DrawOptions;
    try {
      opts = drawOptions(k => url.searchParams.get(k));
    } catch (error) {
      if (!(error instanceof SourceError)) throw error;
      return image(await errorImage(error.message, route.format), route.format, 400, 'no-store');
    }
    // A key spends credits and skips the per-address limit. It is checked before the cache, so a
    // revoked or wrong key is refused even for an image that is already cached.
    let payer: Payer | undefined;
    if (req.headers.has('Authorization')) {
      try {
        payer = await requireKey(req, env, ctx);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        const img = await errorImage(error.message, route.format);
        return image(img, route.format, error.status, 'no-store');
      }
    }
    return imageResponse(req, env, ctx, url.origin, route.segment, route.format, opts, payer);
  },
} satisfies ExportedHandler<Env>;
