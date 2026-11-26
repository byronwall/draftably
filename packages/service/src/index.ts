/**
 * The hosted render service. GET image URLs hold the diagram source, so any URL always draws the
 * same image for one runtime version; the edge cache keys on both. Anonymous image URLs are free
 * and rate-limited per IP; with an API key they spend credits instead. `/v1/*` is the keyed REST
 * API, `/mcp` the MCP server (API key or OAuth, oauth.ts) and `/account` the sign-in page.
 */
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { runtimeVersion } from '@draftably/runtime';
import { SourceError } from '../../../src/lib/render-url';
import { handleAccount } from './account';
import { homePage } from './html';
import { ApiError, handleApi, requireKey, type ApiEnv } from './api';
import { drawOptions, errorImage, type DrawOptions, type Format } from './draw';
import { render, type Payer } from './render';
import { handleAuthorize, oauthOptions, type OAuthEnv } from './oauth';
import {
  codeHint,
  draftResponse,
  handleShare,
  shareSource,
  urlSource,
  type ShareEnv,
} from './share';
import { handleWebhook, type StripeEnv } from './stripe';
import { ipHash, note, noteError, scrub, span, withEvent, type Wide } from './obs';

export interface Env extends ApiEnv, StripeEnv, ShareEnv, OAuthEnv {
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
      'Access-Control-Expose-Headers': 'X-Draftably-Error',
      'X-Draftably-Version': runtimeVersion,
    },
  });
}

/** The error as an image, and as one ASCII line in `X-Draftably-Error` for a script to read. */
async function errorResponse(message: string, format: Format, status: number) {
  const res = image(await errorImage(message, format), format, status, 'no-store');
  const line = message.replace(/\n> /g, ' | ').replace(/…/g, '...');
  res.headers.set('X-Draftably-Error', line.replace(/[^\x20-\x7e]/g, '?'));
  return res;
}

/** The source an image route names, as `{type, source}` (a share keeps its type). */
type Load = () => Promise<{ source: string; type?: string | null }>;

const IMAGE_PATH = /^\/(?:draftably\/)?(svg|png)(?:\/([^/]+))?$/;
const SHARE_IMAGE = /^\/d\/([^/.]+)\.(svg|png)$/;

/**
 * `/{svg|png}/{encoded}` or `/{svg|png}?code=`, the Kroki-style `/draftably/{svg|png}/{encoded}`,
 * and a share's `/d/{id}.{svg|png}`.
 */
function parseImagePath(url: URL, db: D1Database): { format: Format; load: Load } | null {
  const m = IMAGE_PATH.exec(url.pathname);
  if (m)
    return {
      format: m[1] as Format,
      load: () =>
        span('decode', { segment_bytes: m[2]?.length ?? 0 }, async s => {
          const source = await urlSource(url, m[2], 'POST /v1/render');
          s.setAttribute('source_bytes', new TextEncoder().encode(source).length);
          return { source };
        }),
    };
  const d = SHARE_IMAGE.exec(url.pathname);
  if (!d) return null;
  return {
    format: d[2] as Format,
    load: async () => {
      if (url.searchParams.has('code'))
        throw new SourceError('A short link names its diagram; ?code= is not allowed here.');
      return shareSource(db, d[1]);
    },
  };
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
  load: Load,
  format: Format,
  opts: DrawOptions,
  payer?: Payer,
) {
  const anonLimit = async () => {
    if (payer) return;
    const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
    if (!(await env.ANON_LIMIT.limit({ key: ip })).success) {
      note({ rate_limit: 'anon' });
      throw new ApiError(
        429,
        'ERR_LIMIT_BURST',
        'Too many renders from this address. Wait a minute, or use an API key.',
      );
    }
  };
  try {
    const { source, type } = await load();
    // A share draws as the language it was stored as.
    if (type) opts = { ...opts, type };
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
  } catch (caught) {
    const error = codeHint(caught, new URL(req.url));
    if (error instanceof ApiError) {
      noteError(error.code, error.message);
      return errorResponse(error.message, format, error.status);
    }
    if (!(error instanceof SourceError)) throw error;
    noteError('ERR_SOURCE', error.message);
    return errorResponse(error.message, format, 400);
  }
}

const HOME = `Draftably render service

Draw a diagram with no install and no account:
  1. Write Draftably source, for example:
       node web "Web app"
       node api "API"
       edge call web -> api "GET /items"
  2. Percent-encode it (write # as %23, & as %26 and + as %2B) and open
     https://api.draftably.dev/link?code=<source>
     It answers with short png, svg and edit links; share those.
     A bad source returns 400 and the line to fix.
  Compact form: base64url the UTF-8 bytes, no padding, and open /link/<encoded>
  or /png/<encoded> (a long image URL that stores nothing).
     Python: base64.urlsafe_b64encode(src.encode()).decode().rstrip('=')
Syntax, a full example and JavaScript: https://draftably.dev/llms.txt

GET /svg/{encoded}   SVG drawing of a Draftably diagram
GET /png/{encoded}   PNG drawing, with the source embedded; ?scale=1|2|3|4 (default 2)
                     {encoded} = base64url(source), or "pako:" + base64url(zlib(source))
                     as mermaid.ink. With the CLI: draftably url <file.draft>
                     The source is Draftably or Mermaid (flowchart, sequence, gantt,
                     timeline); ?type=mermaid|draftably skips the guess.
                     ?scheme=light|dark
                     Free: 60 new drawings a minute per address. Send an API key
                     (Authorization: Bearer dft_...) to use credits instead.

GET /png?code=<src>  The source as percent-encoded text instead of {encoded}; also
                     /svg and /link. Write # as %23, & as %26 and + as %2B.

GET /link?code=<src> A short link, made with a GET. Answers with text: png, svg and
                     edit URLs and a Markdown line (?format=json for JSON). The same
                     source always gets the same link. Also /link/{encoded}.
GET /d/{id}.png      The short link's drawing; also .svg, ?scheme=, ?scale=.
GET /d/{id}.draft    The short link's source, as Draftably.
POST /v1/share       {"code": "...", "type"?}  -> {id, png, svg, edit}. No key needed.

POST /v1/render      {"code": "...", "format": "svg"|"png", "type"?, "scheme"?, "scale"?}
POST /v1/validate    {"code": "...", "type"?}  -> {valid, type, diagnostics}
POST /v1/convert     {"code": "...", "from": "mermaid"}  -> {draft, warnings}
GET  /v1/balance     -> {grant, bought, resetsAt}
                     All need Authorization: Bearer dft_.... An SVG costs 1 credit, a PNG 2.

/mcp                 MCP server (Streamable HTTP): render_diagram, validate_diagram,
                     convert_mermaid, image_url, share_diagram, language_guide.
                     Chat apps sign in with OAuth; other clients send the API key.

/account             Sign in by email, see credits, make API keys, buy credits,
                     disconnect apps. 1,000 free credits a month.

Connect over MCP
ChatGPT: Settings > Apps & Connectors > Advanced settings, turn on Developer
mode. Create a connector with the URL https://api.draftably.dev/mcp and
OAuth. Sign in, then press Allow.

claude.ai and Claude Desktop: Settings > Connectors > Add custom connector
with the URL https://api.draftably.dev/mcp. Sign in, then press Allow.

Claude Code, with a key from /account:
  claude mcp add --transport http draftably https://api.draftably.dev/mcp \\
    --header "Authorization: Bearer dft_..."

Codex, with the key in DRAFTABLY_API_KEY:
  codex mcp add draftably --url https://api.draftably.dev/mcp \\
    --bearer-token-env-var DRAFTABLY_API_KEY

Cursor, in ~/.cursor/mcp.json:
  {"mcpServers": {"draftably": {"type": "http",
    "url": "https://api.draftably.dev/mcp",
    "headers": {"Authorization": "Bearer dft_..."}}}}

Version ${runtimeVersion}. Language: https://draftably.dev/docs
`;

/** The route kind on the request's log line. */
function routeKind(path: string): Wide['route'] {
  if (IMAGE_PATH.test(path) || SHARE_IMAGE.test(path) || /^\/d\/[^/]+\.draft$/.test(path))
    return 'image';
  if (/^\/link(\/|$)/.test(path)) return 'share';
  if (path.startsWith('/v1/')) return 'rest';
  if (path === '/mcp') return 'mcp';
  if (path === '/authorize' || path.startsWith('/oauth/') || path.startsWith('/.well-known/'))
    return 'oauth';
  if (path === '/stripe/webhook') return 'webhook';
  if (path === '/login' || path.startsWith('/auth/')) return 'login';
  if (path === '/logout' || path.startsWith('/account')) return 'account';
  if (path === '/' || path === '/health') return 'health';
  return 'other';
}

/** Every path the service answers, as logged. */
const PATHS = new Set([
  '/',
  '/health',
  '/mcp',
  '/authorize',
  '/oauth/token',
  '/oauth/register',
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/.well-known/oauth-protected-resource/mcp',
  '/login',
  '/logout',
  '/auth/verify',
  '/account',
  '/account/keys',
  '/account/buy',
  '/account/keys/:id/revoke',
  '/account/apps/:id/revoke',
  '/stripe/webhook',
  '/v1/render',
  '/v1/validate',
  '/v1/convert',
  '/v1/balance',
  '/v1/share',
]);

/**
 * The path for the log line, safe to keep: none for an image (its path holds the diagram source),
 * a known route as its template, and for anything else only its first segment, scrubbed, which is
 * enough to spot scanners (`/wp-login.php`).
 */
function pathLabel(route: Wide['route'], path: string) {
  // An image or link path can hold the diagram source; a short link's id is not logged either.
  if (route === 'image') return undefined;
  if (route === 'share') return '/link';
  const template = path
    .replace(/^\/account\/keys\/[0-9a-f]{12}\/revoke$/, '/account/keys/:id/revoke')
    .replace(/^\/account\/apps\/[\w-]{1,64}\/revoke$/, '/account/apps/:id/revoke');
  if (PATHS.has(template)) return template;
  // Anything else (scanner noise) logs its first segment when it is a short name that starts
  // with a letter, such as `/wp-login.php`. A token (32 characters) or an IP never matches.
  const first = path.split('/')[1] ?? '';
  const more = path.split('/').length > 2 ? '/*' : '';
  return /^[a-z][\w.-]{0,24}$/i.test(first) ? `/${first}${more}` : '/<other>';
}

async function handle(req: Request, env: Env, ctx: ExecutionContext, url: URL) {
  if (req.method === 'POST' && url.pathname === '/stripe/webhook') return handleWebhook(req, env);
  const api = (await handleShare(req, env, ctx, url)) ?? (await handleApi(req, env, ctx, url));
  if (api) return api;
  const account = (await handleAuthorize(req, env, url)) ?? (await handleAccount(req, env, url));
  if (account) return account;
  // HEAD would draw and charge for a body it never sends.
  if (req.method !== 'GET')
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  if (url.pathname === '/')
    return req.headers.get('Accept')?.includes('text/html')
      ? homePage(HOME)
      : new Response(HOME, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', Vary: 'Accept' },
        });
  if (url.pathname === '/health') return Response.json({ ok: true, version: runtimeVersion });
  const draft = /^\/d\/([^/.]+)\.draft$/.exec(url.pathname);
  if (draft) return draftResponse(env.DB, draft[1], url);
  const route = parseImagePath(url, env.DB);
  if (!route) return new Response('Not found', { status: 404 });
  note({ format: route.format });

  // Options are checked first, so a bad one never matches a cached image.
  let opts: DrawOptions;
  try {
    opts = drawOptions(k => url.searchParams.get(k));
  } catch (error) {
    if (!(error instanceof SourceError)) throw error;
    noteError('ERR_SOURCE', error.message);
    return errorResponse(error.message, route.format, 400);
  }
  // A key spends credits and skips the per-address limit. It is checked before the cache, so a
  // revoked or wrong key is refused even for an image that is already cached.
  let payer: Payer | undefined;
  if (req.headers.has('Authorization')) {
    try {
      payer = await requireKey(req, env, ctx);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      noteError(error.code, error.message);
      return errorResponse(error.message, route.format, error.status);
    }
  }
  return imageResponse(req, env, ctx, url.origin, route.load, route.format, opts, payer);
}

/** Everything but `/mcp` and the OAuth endpoints, which the provider below answers first. */
const app = {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handle(req, env, ctx, new URL(req.url)),
} satisfies ExportedHandler<Env>;

// A token is for one resource, `<origin>/mcp`, so each origin (the custom domain, wrangler dev)
// gets its own provider.
const providers = new Map<string, OAuthProvider<Env>>();
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
function provider(origin: string) {
  let found = providers.get(origin);
  if (!found) providers.set(origin, (found = new OAuthProvider(oauthOptions(origin, app))));
  return found;
}

export default {
  /** Every request: handle it, then log one wide event for it. */
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const route = routeKind(url.pathname);
    const ev: Wide = {
      event: 'request',
      route,
      method: req.method,
      path: pathLabel(route, url.pathname),
      version: runtimeVersion,
      build: env.CF_VERSION_METADATA?.id ?? 'unknown',
      country: (req.cf?.country as string | undefined) ?? undefined,
      payer: 'anonymous',
    };
    try {
      const ip = req.headers.get('CF-Connecting-IP');
      // Best effort: a failed digest must not fail the request.
      if (ip) ev.ip = await ipHash(ip).catch(() => undefined);
      // The provider refuses an http resource off loopback and throws, so send http to https.
      if (url.protocol === 'http:' && !LOOPBACK.has(url.hostname)) {
        url.protocol = 'https:';
        ev.status = 301;
        return Response.redirect(url.href, 301);
      }
      // The provider caches its helpers on env, which Workers may reuse across requests and
      // origins; a copy keeps each origin's own.
      const res = await withEvent(ev, () => provider(url.origin).fetch(req, { ...env }, ctx));
      ev.status = res.status;
      // An answer no handler gave a code, such as a 404 or 405.
      if (res.status >= 400) ev.error_code ??= `HTTP_${res.status}`;
      return res;
    } catch (error) {
      // Thrown on, so Workers Issues groups it as a failed invocation.
      ev.status = 500;
      ev.error_code = 'ERR_INTERNAL';
      ev.error = scrub(String(error instanceof Error ? error.message : error));
      throw error;
    } finally {
      console.log(ev);
    }
  },
} satisfies ExportedHandler<Env>;
