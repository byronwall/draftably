/**
 * The keyed REST API. Bodies follow the Mermaid API (`{code, format}`), so an agent that knows
 * one knows the other. Every call needs a key; renders spend credits, everything else is free.
 */
import { validate } from '@draftably/runtime';
import { imageUrl, SourceError } from '../../../src/lib/render-url';
import { keyAccount, type AuthEnv } from './auth';
import { balance, COST, refund, spend } from './credits';
import { draw, drawOptions, type DrawOptions, type Format } from './draw';
import { sourceType, toDraft } from './mermaid';

export interface ApiEnv extends AuthEnv {
  KEY_LIMIT: RateLimit;
}

/** One error shape for every route. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly line?: number,
  ) {
    super(message);
  }
}

export const errorJson = (e: ApiError) =>
  Response.json(
    { error: { code: e.code, message: e.message, ...(e.line ? { line: e.line } : {}) } },
    { status: e.status, headers: { 'Access-Control-Allow-Origin': '*' } },
  );

const sourceError = (e: SourceError) => {
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

/**
 * Draw for a paying account: spend first, so a slow render can't run on credit the account
 * doesn't have, and refund when the drawing fails.
 */
export async function paidDraw(
  env: ApiEnv,
  account: string,
  source: string,
  format: Format,
  opts: DrawOptions,
) {
  const left = await spend(env.DB, account, COST[format], format);
  if (!left) throw new ApiError(402, 'ERR_LIMIT_BALANCE', 'Out of credits. Buy more at /account.');
  try {
    return { body: await draw(source, format, opts), left };
  } catch (error) {
    await refund(env.DB, account, COST[format], format);
    throw error;
  }
}

const TYPES: Record<Format, string> = { svg: 'image/svg+xml; charset=utf-8', png: 'image/png' };

async function body(req: Request) {
  if (Number(req.headers.get('Content-Length') ?? 0) > 256 * 1024)
    throw new ApiError(413, 'ERR_SOURCE', 'The request is over 256 KB.');
  let json: Record<string, unknown>;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, 'ERR_SOURCE', 'The body must be JSON.');
  }
  if (typeof json.code !== 'string' || !json.code.trim())
    throw new ApiError(400, 'ERR_SOURCE', 'code must be the diagram source.');
  const get = (k: string) => (json[k] === undefined || json[k] === null ? null : String(json[k]));
  return { code: json.code, get };
}

/** `/v1/*`. Returns null for a path that isn't an API route. */
export async function handleApi(req: Request, env: ApiEnv, ctx: ExecutionContext, url: URL) {
  const route = `${req.method} ${url.pathname}`;
  if (!url.pathname.startsWith('/v1/')) return null;
  try {
    const { account } = await requireKey(req, env, ctx);
    switch (route) {
      case 'GET /v1/balance':
        return Response.json(await balance(env.DB, account));
      case 'POST /v1/render': {
        const { code, get } = await body(req);
        const format = (get('format') ?? 'svg') as Format;
        if (format !== 'svg' && format !== 'png')
          throw new ApiError(400, 'ERR_SOURCE', 'format must be svg or png.');
        const { body: image, left } = await paidDraw(env, account, code, format, drawOptions(get));
        return new Response(image, {
          headers: {
            'Content-Type': TYPES[format],
            'X-Draftably-Credits-Left': String(left.grant + left.bought),
            'X-Draftably-Url': await imageUrl(code, format, url.origin),
          },
        });
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
        const result = await validate(draft);
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
          type: sourceType(code, get('type')),
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
