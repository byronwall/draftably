/**
 * The keyed REST API. Bodies follow the Mermaid API (`{code, format}`), so an agent that knows
 * one knows the other. Every call needs a key; renders that miss the cache spend credits,
 * everything else is free.
 */
import { validate } from '@draftably/runtime';
import { MAX_SOURCE_BYTES, SourceError } from '../../../src/lib/render-url';
import { keyAccount, type AuthEnv } from './auth';
import { balance } from './credits';
import { type Format } from './draw';
import { ApiError, DiagramError, errorJson } from './errors';
import { toDraft, type Note } from './mermaid';
import { embedUrl, render } from './render';
import { note, noteError } from './obs';
import { readFields, readRequest, refusal, type DrawRequest } from './request';

export { ApiError, errorJson };

export interface ApiEnv extends AuthEnv {
  KEY_LIMIT: RateLimit;
  /** Changes on every deploy; the render cache keys on it. */
  CF_VERSION_METADATA: WorkerVersionMetadata;
}

/** The calling account, rate-limited per key. */
export async function requireKey(req: Request, env: ApiEnv, ctx: ExecutionContext) {
  const who = await keyAccount(req, env.DB, ctx);
  if (!who)
    throw new ApiError(
      401,
      'ERR_AUTH',
      'Send Authorization: Bearer <key>. Make a key at /account.',
    );
  note({ payer: 'key', account: who.account, key: who.key });
  if (!(await env.KEY_LIMIT.limit({ key: who.key })).success) {
    note({ rate_limit: 'key' });
    throw new ApiError(429, 'ERR_LIMIT_BURST', 'Too many calls this minute for this key.');
  }
  return who;
}

const TYPES: Record<Format, string> = { svg: 'image/svg+xml; charset=utf-8', png: 'image/png' };

export interface Diagnostic {
  severity: string;
  message: string;
  line?: number;
  /** The text of that line, so a reader sees what to fix without the source. */
  text?: string;
}

export interface Checked {
  valid: boolean;
  type: string;
  diagnostics: Diagnostic[];
}

/**
 * Check a diagram without drawing it: `/v1/validate`, the MCP tool and the notes on `/link`. A
 * line names the submitted text, so a Mermaid fence in Markdown counts the lines before it.
 */
export async function checkDiagram(r: DrawRequest): Promise<Checked> {
  const submitted = r.source.split('\n');
  const at = (line?: number) => {
    const text = line ? submitted[line - 1]?.trim() : undefined;
    return { ...(line ? { line } : {}), ...(text ? { text } : {}) };
  };
  let draft: string, notes: Note[];
  try {
    ({ draft, notes } = await toDraft(r.source, r.opts.type));
  } catch (error) {
    if (!(error instanceof SourceError)) throw error;
    const e = refusal(error)!;
    noteError(e.code, e.diagnostic);
    const line = error instanceof DiagramError ? error.line : undefined;
    return {
      valid: false,
      type: r.opts.type,
      diagnostics: [{ severity: 'error', message: e.message, ...at(line) }],
    };
  }
  const result = await validate(draft, { limits: { maxSourceBytes: MAX_SOURCE_BYTES } });
  if (!result.ok)
    noteError('ERR_SOURCE', result.diagnostics.find(d => d.severity === 'error')?.code);
  // Lines in a draft converted from Mermaid name nothing the caller wrote, so they are left out.
  const own = r.opts.type === 'draftably';
  return {
    valid: result.ok,
    type: r.opts.type,
    diagnostics: [
      ...notes.map(n => ({ severity: 'warning', message: n.message, ...at(n.line) })),
      ...result.diagnostics.map(d => ({
        severity: d.severity,
        message: d.message,
        ...(own ? at(d.location?.line) : {}),
      })),
    ],
  };
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
        const r = readRequest(await readFields(req));
        note({ format: r.format });
        // Everything the answer needs is built before the credits are taken.
        const link = await embedUrl(url.origin, r);
        const drawn = await render(
          env,
          ctx,
          url.origin,
          r,
          async body => {
            const headers = new Headers({
              'Content-Type': TYPES[r.format],
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
      case 'POST /v1/validate':
        return Response.json(await checkDiagram(readRequest(await readFields(req))));
      case 'POST /v1/convert': {
        const fields = await readFields(req);
        if ((fields.from ?? 'mermaid') !== 'mermaid')
          throw new ApiError(400, 'ERR_SOURCE', 'from must be mermaid.');
        const r = readRequest({ code: fields.code, type: 'mermaid' });
        const { draft, warnings } = await toDraft(r.source, 'mermaid');
        return Response.json({ draft, warnings });
      }
      default:
        throw new ApiError(404, 'ERR_NOT_FOUND', `No route ${route}.`);
    }
  } catch (error) {
    const e = refusal(error);
    if (!e) throw error;
    noteError(e.code, e.diagnostic);
    return errorJson(e);
  }
}
