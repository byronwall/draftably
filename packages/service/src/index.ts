/**
 * The hosted render service. GET image URLs hold the diagram source, so any URL always draws the
 * same image for one runtime version; the edge cache keys on both.
 */
import { runtimeVersion } from '@draftably/runtime';
import { decodeSource, MAX_SEGMENT, SourceError } from '../../../src/lib/render-url';
import { freshness } from './mermaid';
import { draw, drawOptions, errorImage, type DrawOptions, type Format } from './draw';

export interface Env {
  ANON_LIMIT: RateLimit;
  /** Changes on every deploy, so a deploy that draws differently starts a fresh cache. */
  CF_VERSION_METADATA: WorkerVersionMetadata;
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

async function imageResponse(segment: string, format: Format, opts: DrawOptions) {
  try {
    if (segment.length > MAX_SEGMENT)
      throw new SourceError('The URL is over 8 KB. Use POST /v1/render for large diagrams.');
    const source = await decodeSource(segment);
    const body = await draw(source, format, opts);
    return image(body, format, 200, freshness(source, opts.type)?.cacheControl ?? IMMUTABLE);
  } catch (error) {
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

Version ${runtimeVersion}. Language: https://draftably.dev/docs
`;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return new Response('Method not allowed', { status: 405 });
    if (url.pathname === '/')
      return new Response(HOME, { headers: { 'Content-Type': 'text/plain' } });
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
    keyUrl.searchParams.set('build', env.CF_VERSION_METADATA.id);
    // A gantt chart can draw differently tomorrow, so its key carries today's date.
    const day = await decodeSource(route.segment)
      .then(source => freshness(source, opts.type)?.day)
      .catch(() => undefined);
    if (day) keyUrl.searchParams.set('day', day);
    const key = new Request(keyUrl.toString());
    // The DOM lib (for Mermaid's types) hides the Workers-only `caches.default`.
    const cache = (caches as unknown as { default: Cache }).default;
    const hit = await cache.match(key);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set('X-Draftably-Cache', 'hit');
      return res;
    }

    const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
    const { success } = await env.ANON_LIMIT.limit({ key: ip });
    if (!success)
      return image(
        await errorImage(
          'Too many renders from this address. Wait a minute, or use an API key.',
          route.format,
        ),
        route.format,
        429,
        'no-store',
      );

    const res = await imageResponse(route.segment, route.format, opts);
    if (res.status === 200) ctx.waitUntil(cache.put(key, res.clone()));
    res.headers.set('X-Draftably-Cache', 'miss');
    return res;
  },
} satisfies ExportedHandler<Env>;
