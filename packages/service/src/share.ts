/**
 * Short share links. A share is a stored source with an id taken from its hash, so the same source
 * always gets the same id and storing it twice adds no row. That makes the GET form safe to
 * prefetch: `GET /link/{encoded}` is how a web agent that can only GET makes a link.
 *
 * - `GET /link/{encoded}` and `POST /v1/share` store the source and return the short URLs.
 * - `GET /d/{id}.png|svg` draws it through `render()`, so the cache and price are the long URL's.
 * - `GET /d/{id}.draft` returns the Draftably source, which the site's `/d/{id}` opens in the
 *   playground.
 */
import { decodeSource, MAX_SEGMENT, SourceError } from '../../../src/lib/render-url';
import { ApiError, body as readBody, errorJson, requireKey, sourceError, type ApiEnv } from './api';
import { drawOptions, drawSvg, maxPngScale, type DrawOptions } from './draw';
import { freshness, sourceType, toDraft } from './mermaid';

export interface ShareEnv extends ApiEnv {
  /** New shares per IP. A link that already exists costs nothing. */
  LINK_LIMIT: RateLimit;
}

export const SITE = 'https://draftably.dev';

/** Base32 (RFC 4648 lowercase), so an id survives case-folding and has no look-alike symbols. */
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
/** 12 characters = 60 bits; a collision is refused, never served as the other diagram. */
const ID_LEN = 12;
export const ID_RE = /^[a-z2-7]{12}$/;

const sha256 = async (text: string) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

/**
 * The source as `render()` hashes it (a leading byte-order mark dropped), and its language as
 * the renderer reads it. The type is part of the id: the same text read as Mermaid or Draftably
 * draws two different images.
 */
async function canonical(raw: string, type?: string | null) {
  const source = raw.replace(/^\uFEFF+/, '');
  if (!source.trim()) throw new SourceError('The source is empty.');
  const kind = sourceType(source, type).type;
  const bytes = await sha256(`${kind}\n${source}`);
  let bits = 0,
    acc = 0,
    id = '';
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5 && id.length < ID_LEN) {
      id += B32[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (id.length === ID_LEN) break;
    acc &= (1 << bits) - 1;
  }
  return { id, source, type: kind };
}

/**
 * The caller's IP, hashed so the raw address is never stored. It groups one sender's shares for
 * an abuse report; it is not secret (an IPv4 hash can be brute-forced), only not stored in clear.
 */
const ipHash = async (req: Request) => {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
  return [...(await sha256(`draftably-share:${ip}`)).subarray(0, 8)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/** A stored share: its id and the largest PNG scale that fits the pixel limit (0 for none). */
export interface Share {
  id: string;
  pngScale: number;
}

/**
 * Store `raw` as a share, or find it. A new source must draw (the first diagnostic comes back as
 * a 400 with its line) and is counted against the caller's limit; one that exists is free.
 */
export async function createShare(
  req: Request,
  env: { DB: D1Database; LINK_LIMIT: RateLimit },
  raw: string,
  type: string | null,
  account: string | null,
): Promise<Share> {
  const { id, source, type: kind } = await canonical(raw, type);
  const find = async () => {
    const row = await env.DB.prepare(`SELECT source, type, png_scale FROM shares WHERE id = ?1`)
      .bind(id)
      .first<{ source: string; type: string; png_scale: number }>();
    if (row && (row.source !== source || row.type !== kind))
      throw new ApiError(
        409,
        'ERR_SHARE',
        'This id is taken by another diagram. Change the source a little.',
      );
    return row && { id, pngScale: row.png_scale };
  };
  const found = await find();
  if (found) return found;
  // Every new row counts against the caller's address, with or without a key.
  const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
  if (!(await env.LINK_LIMIT.limit({ key: ip })).success)
    throw new ApiError(429, 'ERR_LIMIT_BURST', 'Too many new links this minute. Wait a minute.');
  // Only a source that draws is stored. Scheme doesn't change whether it draws.
  const { draft } = await toDraft(source, kind);
  const svg = await drawSvg(draft, { type: kind, scheme: 'light', scale: 1 });
  const pngScale = await maxPngScale(svg, draft);
  const added = await env.DB.prepare(
    `INSERT INTO shares (id, source, type, png_scale, created_at, account_id, ip_hash)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(id) DO NOTHING`,
  )
    .bind(id, source, kind, pngScale, new Date().toISOString(), account, await ipHash(req))
    .run();
  // A parallel call stored it first: the same source, or a collision that find() refuses.
  if (!added.meta.changes) return (await find())!;
  return { id, pngScale };
}

/**
 * The source a GET names: a base64url or `pako:` path segment, or plain text in `?code=`. Both
 * give the same text, so the same cache entry and the same share id.
 */
export async function urlSource(url: URL, segment: string | undefined, big: string) {
  const code = url.searchParams.get('code');
  if (code !== null && segment)
    throw new SourceError('Give the source once: in the path or in ?code=, not both.');
  const over = `The URL is over 8 KB. Use ${big} for large diagrams.`;
  // The path and query together, so a short segment can't carry a long query.
  if (url.pathname.length + url.search.length > MAX_SEGMENT + 256) throw new SourceError(over);
  if (code !== null) {
    // The value as sent, still percent-encoded, is what the 8 KB cap counts.
    const sent = /[?&]code=([^&]*)/.exec(url.search)?.[1] ?? '';
    if (sent.length > MAX_SEGMENT) throw new SourceError(over);
    if (!code.trim())
      throw new SourceError(
        '?code= is empty. A raw # ends the URL: percent-encode the source, with # as %23.',
      );
    return code;
  }
  if (!segment)
    throw new SourceError('Give the source: /<encoded> in the path, or ?code=<source>.');
  if (segment.length > MAX_SEGMENT) throw new SourceError(over);
  return decodeSource(segment);
}

/**
 * A `?code=` source that fails on its last line with a sign of being cut (an unclosed quote, a
 * value with nothing after `=`) was probably cut by a raw `#`, which ends the URL.
 */
export function codeHint(error: unknown, url: URL) {
  const code = url.searchParams.get('code');
  if (!(error instanceof SourceError) || code === null) return error;
  const line = Number(/^line (\d+): /.exec(error.message)?.[1]);
  if (line !== code.trimEnd().split('\n').length) return error;
  if (!/unclosed|got \.$/i.test(error.message)) return error;
  return new SourceError(
    `${error.message} (In ?code=, percent-encode the whole source: a raw # ends the URL, & starts a new parameter and + reads as a space. Write them as %23, %26 and %2B.)`,
  );
}

/** The short URLs for share `id`, with the drawing options that differ from the defaults. */
export function links(origin: string, { id, pngScale }: Share, opts: DrawOptions) {
  const q = new URLSearchParams();
  if (opts.scheme !== 'light') q.set('scheme', opts.scheme);
  const svgQ = q.size ? `?${q}` : '';
  if (opts.scale !== 2) q.set('scale', String(opts.scale));
  const pngQ = q.size ? `?${q}` : '';
  // A PNG over the pixel limit at this scale would only draw an error, so none is offered.
  const fits = opts.scale <= pngScale;
  return {
    id,
    png: fits ? `${origin}/d/${id}.png${pngQ}` : null,
    svg: `${origin}/d/${id}.svg${svgQ}`,
    edit: `${SITE}/d/${id}`,
  };
}

const plain = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });

function answer(l: ReturnType<typeof links>, json: boolean) {
  if (json) return Response.json(l, { headers: { 'Access-Control-Allow-Origin': '*' } });
  return plain(shareText(l) + '\n');
}

/** The links as text lines, for `/link` and the MCP tool. */
export function shareText(l: ReturnType<typeof links>) {
  return [
    l.png ? `png: ${l.png}` : 'png: none (over the PNG pixel limit at this scale; use svg)',
    `svg: ${l.svg}`,
    `edit: ${l.edit}`,
    `markdown: ![Diagram](${l.png ?? l.svg})`,
  ].join('\n');
}

function failed(error: unknown, json: boolean) {
  const e =
    error instanceof SourceError ? sourceError(error) : error instanceof ApiError ? error : null;
  if (!e) throw error;
  return json ? errorJson(e) : plain(`error: ${e.message}\n`, e.status);
}

/**
 * `GET /link/{encoded}`, `GET /link?code=` and `POST /v1/share`. Returns null for other routes. Options are the
 * image URL's: `type` is stored with the source; `scheme` and `scale` go on the returned URLs.
 */
export async function handleShare(req: Request, env: ShareEnv, ctx: ExecutionContext, url: URL) {
  const link = /^\/link(?:\/([^/]+))?$/.exec(url.pathname);
  if (link && req.method === 'GET') {
    const json = url.searchParams.get('format') === 'json';
    try {
      const opts = drawOptions(k => url.searchParams.get(k));
      const source = await urlSource(url, link[1], 'POST /v1/share');
      const share = await createShare(req, env, source, opts.type ?? null, null);
      return answer(links(url.origin, share, opts), json);
    } catch (error) {
      return failed(codeHint(error, url), json);
    }
  }
  if (url.pathname === '/v1/share' && req.method === 'POST') {
    try {
      // A key is optional; a bad one is still refused.
      const who = req.headers.has('Authorization') ? await requireKey(req, env, ctx) : null;
      const { code, get } = await readBody(req);
      const opts = drawOptions(get);
      const share = await createShare(req, env, code, opts.type ?? null, who?.account ?? null);
      return answer(links(url.origin, share, opts), true);
    } catch (error) {
      return failed(error, true);
    }
  }
  return null;
}

/** The stored source and type for `id`, or a 404. */
export async function shareSource(db: D1Database, id: string) {
  const row = ID_RE.test(id)
    ? await db
        .prepare(`SELECT source, type FROM shares WHERE id = ?1`)
        .bind(id)
        .first<{ source: string; type: string }>()
    : null;
  if (!row) throw new ApiError(404, 'ERR_NOT_FOUND', 'No diagram has this link.');
  return row;
}

/** `GET /d/{id}.draft`: the source as Draftably (Mermaid converted), for the site's editor. */
export async function draftResponse(db: D1Database, id: string, url: URL) {
  try {
    if (url.searchParams.has('code'))
      throw new SourceError('A short link names its diagram; ?code= is not allowed here.');
    const row = await shareSource(db, id);
    const { draft } = await toDraft(row.source, row.type);
    return new Response(draft, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // A dated Mermaid source converts differently tomorrow, like its image.
        'Cache-Control': freshness(row.source, row.type)?.cacheControl ?? 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return failed(error, false);
  }
}
