/**
 * The keyed REST API. Bodies follow the Mermaid API (`{code, format}`), so an agent that knows
 * one knows the other. Every call needs a key; renders that miss the cache spend credits,
 * everything else is free.
 */
import { validate } from '@draftably/runtime';
import { MAX_SOURCE_BYTES, SourceError } from '../../../src/lib/render-url';
import { keyAccount, type AuthEnv } from './auth';
import { balance } from './credits';
import { DEFAULT_FORMAT, drawOptions, type Format } from './draw';
import { ApiError, errorJson } from './errors';
import { sourceType, toDraft } from './mermaid';
import { embedUrl, render } from './render';

export { ApiError, errorJson };

export interface ApiEnv extends AuthEnv {
  KEY_LIMIT: RateLimit;
  /** Changes on every deploy; the render cache keys on it. */
  CF_VERSION_METADATA: WorkerVersionMetadata;
}

export const sourceError = (e: SourceError) => {
  const line = /^line (\d+): /.exec(e.message);
  return new ApiError(400, 'ERR_SOURCE', e.message, line ? Number(line[1]) : undefined);
};

/** The calling account, rate-limited per key. */
export async function requireKey(req: Request, env: ApiEnv, ctx: ExecutionContext) {
  const who = await keyAccount(req, env.DB, ctx);
  if (!who)
    throw new ApiError(
      401,
      'ERR_AUTH',
      'Send Authorization: Bearer <key>. Make a key at /account.',
    );
  if (!(await env.KEY_LIMIT.limit({ key: who.key })).success)
    throw new ApiError(429, 'ERR_LIMIT_BURST', 'Too many calls this minute for this key.');
  return who;
}

/** The diagram source a call may send: the same 64 KB the renderer takes, for every route. */
export function checkSource(code: unknown): string {
  if (typeof code !== 'string' || !code.trim())
    throw new ApiError(400, 'ERR_SOURCE', 'code must be the diagram source.');
  if (new TextEncoder().encode(code).length > MAX_SOURCE_BYTES)
    throw new ApiError(400, 'ERR_SOURCE', `The source is over ${MAX_SOURCE_BYTES / 1024} KB.`);
  return code;
}

const TYPES: Record<Format, string> = { svg: 'image/svg+xml; charset=utf-8', png: 'image/png' };
const MAX_BODY = 256 * 1024;

/** The JSON body, read with a byte count so a missing Content-Length can't buffer more. */
async function body(req: Request) {
  const reader = req.body?.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = reader ? await reader.read() : { done: true as const, value: undefined };
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > MAX_BODY) {
      await reader!.cancel();
      throw new ApiError(413, 'ERR_SOURCE', 'The request is over 256 KB.');
    }
    parts.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, 'ERR_SOURCE', 'The body must be JSON.');
  }
  if (!json || typeof json !== 'object' || Array.isArray(json))
    throw new ApiError(400, 'ERR_SOURCE', 'The body must be a JSON object.');
  const get = (k: string) => (json[k] === undefined || json[k] === null ? null : String(json[k]));
  return { code: checkSource(json.code), get };
}

/** `/v1/*`. Returns null for a path that isn't an API route. */
export async function handleApi(req: Request, env: ApiEnv, ctx: ExecutionContext, url: URL) {
  const route = `${req.method} ${url.pathname}`;
  if (!url.pathname.startsWith('/v1/')) return null;
  try {
    const who = await requireKey(req, env, ctx);
    const { account } = who;
    switch (route) {
      case 'GET /v1/balance':
        return Response.json(await balance(env.DB, account));
      case 'POST /v1/render': {
        const { code, get } = await body(req);
        const format = (get('format') ?? DEFAULT_FORMAT) as Format;
        if (format !== 'svg' && format !== 'png')
          throw new ApiError(400, 'ERR_SOURCE', 'format must be svg or png.');
        const opts = drawOptions(get);
        // Everything the answer needs is built before the credits are taken.
        const link = await embedUrl(url.origin, code, format, opts);
        const drawn = await render(
          env,
          ctx,
          url.origin,
          code,
          format,
          opts,
          async body => {
            const headers = new Headers({
              'Content-Type': TYPES[format],
              'Cache-Control': 'no-store',
            });
            if (link) headers.set('X-Draftably-Url', link);
            return { body, headers };
          },
          who,
        );
        const { headers } = drawn.out;
        headers.set('X-Draftably-Cache', drawn.hit ? 'hit' : 'miss');
        if (drawn.left)
          headers.set('X-Draftably-Credits-Left', String(drawn.left.grant + drawn.left.bought));
        return new Response(drawn.out.body, { headers });
      }
      case 'POST /v1/validate': {
        const { code, get } = await body(req);
        let draft: string, warnings: string[];
        try {
          ({ draft, warnings } = await toDraft(code, get('type')));
        } catch (error) {
          if (!(error instanceof SourceError)) throw error;
          return Response.json({
            valid: false,
            diagnostics: [{ severity: 'error', message: error.message }],
          });
        }
        const result = await validate(draft, { limits: { maxSourceBytes: MAX_SOURCE_BYTES } });
        const diagnostics = [
          ...warnings.map(message => ({ severity: 'warning', message })),
          ...result.diagnostics.map(d => ({
            severity: d.severity,
            message: d.message,
            ...(d.location?.line ? { line: d.location.line } : {}),
          })),
        ];
        return Response.json({
          valid: result.ok,
          type: sourceType(code, get('type')).type,
          diagnostics,
        });
      }
      case 'POST /v1/convert': {
        const { code, get } = await body(req);
        if ((get('from') ?? 'mermaid') !== 'mermaid')
          throw new ApiError(400, 'ERR_SOURCE', 'from must be mermaid.');
        const { draft, warnings } = await toDraft(code, 'mermaid');
        return Response.json({ draft, warnings });
      }
      default:
        throw new ApiError(404, 'ERR_NOT_FOUND', `No route ${route}.`);
    }
  } catch (error) {
    if (error instanceof SourceError) return errorJson(sourceError(error));
    if (error instanceof ApiError) return errorJson(error);
    throw error;
  }
}
