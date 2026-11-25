/**
 * The hosted render service. GET image URLs hold the diagram source, so any URL always draws the
 * same image for one runtime version; the edge cache keys on both.
 */
import { renderSvg, runtimeVersion } from '@draftably/runtime';
import {
  decodeSource,
  MAX_SEGMENT,
  MAX_SOURCE_BYTES,
  SourceError,
} from '../../../src/lib/render-url';

export interface Env {
  ANON_LIMIT: RateLimit;
  /** Changes on every deploy, so a deploy that draws differently starts a fresh cache. */
  CF_VERSION_METADATA: WorkerVersionMetadata;
}

export type Format = 'svg';

/** Image options from the query string, with defaults applied and unknown keys dropped. */
export interface ImageOptions {
  scheme: 'light' | 'dark';
}

export function imageOptions(params: URLSearchParams): ImageOptions {
  const scheme = params.get('scheme') ?? 'light';
  if (scheme !== 'light' && scheme !== 'dark')
    throw new SourceError('scheme must be light or dark.');
  return { scheme };
}

/** Draw `source` as SVG, or throw a SourceError with the first diagnostic. */
export async function drawSvg(source: string, opts: ImageOptions) {
  const result = await renderSvg(source, {
    colorScheme: opts.scheme,
    links: { mode: 'safe' },
    limits: { maxSourceBytes: MAX_SOURCE_BYTES },
  });
  if (!result.ok) {
    const d = result.diagnostics.find(x => x.severity === 'error') ?? result.diagnostics[0];
    const line = d?.location?.line ? `line ${d.location.line}: ` : '';
    throw new SourceError(line + (d?.message ?? 'The diagram did not render.'));
  }
  return result.value.svg;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A small SVG that shows the error, so an image tag shows why instead of a broken icon. */
export function errorSvg(message: string) {
  const lines = message.match(/.{1,70}(\s|$)/g) ?? [message];
  const h = 40 + lines.length * 20;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="${h}" viewBox="0 0 560 ${h}">` +
    `<rect width="560" height="${h}" rx="6" fill="#fff4f2" stroke="#d4553f"/>` +
    `<text x="16" y="28" font-family="sans-serif" font-size="14" font-weight="600" fill="#9b2c1c">Draftably could not draw this diagram</text>` +
    lines
      .map(
        (l, i) =>
          `<text x="16" y="${52 + i * 20}" font-family="monospace" font-size="13" fill="#3b1a14">${esc(l.trim())}</text>`,
      )
      .join('') +
    `</svg>`
  );
}

// The public URL carries no version, so a browser may keep it for a day, not a year. The edge
// cache keys on the deploy, so it never serves an image an older deploy drew.
const IMMUTABLE = 'public, max-age=86400';

function image(body: BodyInit, type: string, status = 200, cache = IMMUTABLE) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': type,
      'Cache-Control': cache,
      'Access-Control-Allow-Origin': '*',
      'X-Draftably-Version': runtimeVersion,
    },
  });
}

/** `/svg/{encoded}` and the Kroki-style `/draftably/svg/{encoded}`. */
function parseImagePath(path: string): { format: Format; segment: string } | null {
  const m = /^\/(?:draftably\/)?(svg)\/([^/]+)$/.exec(path);
  return m ? { format: m[1] as Format, segment: m[2] } : null;
}

async function imageResponse(segment: string, opts: ImageOptions) {
  try {
    if (segment.length > MAX_SEGMENT)
      throw new SourceError('The URL is over 8 KB. Use POST /v1/render for large diagrams.');
    const svg = await drawSvg(await decodeSource(segment), opts);
    return image(svg, 'image/svg+xml; charset=utf-8');
  } catch (error) {
    if (!(error instanceof SourceError)) throw error;
    return image(
      errorSvg(error.message),
      'image/svg+xml; charset=utf-8',
      400,
      'public, max-age=60',
    );
  }
}

const HOME = `Draftably render service

GET /svg/{encoded}   SVG drawing of a Draftably diagram
                     {encoded} = "pako:" + base64url(zlib(source)), as mermaid.ink, or
                     base64url(source). Make one with: draftably url <file.draft>
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
    let opts: ImageOptions;
    try {
      opts = imageOptions(url.searchParams);
    } catch (error) {
      if (!(error instanceof SourceError)) throw error;
      return image(errorSvg(error.message), 'image/svg+xml; charset=utf-8', 400, 'no-store');
    }
    const keyUrl = new URL(url.pathname, url.origin);
    keyUrl.searchParams.set('scheme', opts.scheme);
    keyUrl.searchParams.set('v', runtimeVersion);
    keyUrl.searchParams.set('build', env.CF_VERSION_METADATA.id);
    const key = new Request(keyUrl.toString());
    const cache = caches.default;
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
        errorSvg('Too many renders from this address. Wait a minute, or use an API key.'),
        'image/svg+xml; charset=utf-8',
        429,
        'no-store',
      );

    const res = await imageResponse(route.segment, opts);
    if (res.status === 200) ctx.waitUntil(cache.put(key, res.clone()));
    res.headers.set('X-Draftably-Cache', 'miss');
    return res;
  },
} satisfies ExportedHandler<Env>;
