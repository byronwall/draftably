/**
 * The request boundary. Every way to send a diagram (GET image URLs, short links, `/v1/*`, the MCP
 * tools) reads its input here, so all of them apply the same limits, read the source the same way
 * and get the same cache key, price and error code for the same input.
 *
 * - `readBody` reads a POST body with a byte limit, also when there is no Content-Length.
 * - `readRequest` turns the fields a caller sent into one canonical `DrawRequest`.
 * - `cacheKey` is derived from a `DrawRequest` only.
 */
import { runtimeVersion } from '@draftably/runtime';
import { MAX_SOURCE_BYTES, SourceError } from '../../../src/lib/render-url';
import { DEFAULT_FORMAT, drawOptions, type DrawOptions, type Format } from './draw';
import { ApiError, DiagramError } from './errors';
import { freshness, sourceType, type SourceType } from './mermaid';

/** The largest POST body any route reads: REST, share, MCP and the Stripe webhook. */
export const MAX_BODY = 256 * 1024;

/** The body as text, or a 413 once it is over `max` bytes. */
export async function readBody(req: Request, max = MAX_BODY) {
  const reader = req.body?.getReader();
  if (!reader) return '';
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, 'ERR_TOO_LARGE', `The request is over ${max / 1024} KB.`);
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  return new TextDecoder().decode(bytes);
}

/** The body as JSON, any shape (an MCP batch is an array). */
export async function readJson(req: Request): Promise<unknown> {
  const text = await readBody(req);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, 'ERR_SOURCE', 'The body must be JSON.');
  }
}

/** The body as a JSON object, for `/v1/*` and `/v1/share`. */
export async function readFields(req: Request): Promise<Fields> {
  const json = await readJson(req);
  if (!json || typeof json !== 'object' || Array.isArray(json))
    throw new ApiError(400, 'ERR_SOURCE', 'The body must be a JSON object.');
  return json as Fields;
}

/** What a caller sends, from any transport: a JSON body, MCP arguments or a URL's query. */
export interface Fields {
  code?: unknown;
  format?: unknown;
  type?: unknown;
  scheme?: unknown;
  scale?: unknown;
  /** `/v1/convert` only. */
  from?: unknown;
}

/** One diagram request, the same for every transport. */
export interface DrawRequest {
  /** The source with any leading byte-order marks dropped, at most MAX_SOURCE_BYTES. */
  source: string;
  format: Format;
  /** `type` is the language the source is read as, never left to detect later. */
  opts: DrawOptions & { type: SourceType };
}

/** A SourceError as the 400 every route answers with, with its line when it names one. */
export const sourceError = (e: SourceError) => {
  const line = /^line (\d+)(?:, column \d+)?: /.exec(e.message);
  const diagnostic = e instanceof DiagramError ? e.diagnostic : undefined;
  return new ApiError(400, 'ERR_SOURCE', e.message, line ? Number(line[1]) : undefined, diagnostic);
};

/** `e` as an ApiError when it is a refusal, else null (a bug, to throw on). */
export const refusal = (e: unknown) =>
  e instanceof ApiError ? e : e instanceof SourceError ? sourceError(e) : null;

/**
 * The canonical request for `fields`: the source checked and its language fixed, the format and
 * options checked, with defaults. Anything wrong is a 400 ERR_SOURCE.
 */
export function readRequest(fields: Fields, defaultFormat: Format = DEFAULT_FORMAT): DrawRequest {
  const get = (k: string) => {
    const v = fields[k as keyof Fields];
    return v === undefined || v === null ? null : String(v);
  };
  // A GET URL's decoder drops a leading byte-order mark; drop them all here, so every way in
  // (and a share's id) reads the same text.
  const source = typeof fields.code === 'string' ? fields.code.replace(/^﻿+/, '') : '';
  if (!source.trim()) throw new ApiError(400, 'ERR_SOURCE', 'code must be the diagram source.');
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES)
    throw new ApiError(400, 'ERR_SOURCE', `The source is over ${MAX_SOURCE_BYTES / 1024} KB.`);
  const format = get('format') ?? defaultFormat;
  if (format !== 'svg' && format !== 'png')
    throw new ApiError(400, 'ERR_SOURCE', 'format must be svg or png.');
  try {
    const opts = drawOptions(get);
    return { source, format, opts: { ...opts, type: sourceType(source, opts.type).type } };
  } catch (error) {
    throw refusal(error) ?? error;
  }
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * The edge-cache key for `r`: on this service's own origin, so the Cache API accepts it. It holds
 * everything that changes the image and nothing else, so one image is drawn and charged once.
 */
export async function cacheKey(origin: string, build: string, r: DrawRequest) {
  const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(r.source)));
  const url = new URL(`/__cache/${r.format}/${hash}`, origin);
  url.searchParams.set('type', r.opts.type);
  url.searchParams.set('scheme', r.opts.scheme);
  // Scale changes only a PNG; an SVG keyed on it would be drawn and charged twice.
  if (r.format === 'png') url.searchParams.set('scale', String(r.opts.scale));
  url.searchParams.set('v', runtimeVersion);
  url.searchParams.set('build', build);
  // A gantt chart can draw differently tomorrow, so its key carries today's date.
  const day = freshness(r.source, r.opts.type)?.day;
  if (day) url.searchParams.set('day', day);
  return new Request(url.toString());
}
