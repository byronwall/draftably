/**
 * Image URLs for the hosted render service (`packages/service`). The URL holds the source:
 * `pako:` + base64url of the zlib-deflated text, as mermaid.ink writes it. Kroki's form (zlib +
 * base64url with no prefix) and plain base64url text decode too. The CLI's `url` command and the
 * Worker both use this file, so the two can't disagree. No Node APIs: it runs in Node 22, a
 * browser and a Worker.
 */
import { readSource } from '../dsl/syntax';
import { baseUrl } from '../model/link';

export const SERVICE_URL = 'https://api.draftably.dev';

/** The largest source the service decodes, in bytes. */
export const MAX_SOURCE_BYTES = 64 * 1024;

/** The longest encoded source a GET URL may carry; longer sources go through POST. */
export const MAX_SEGMENT = 8 * 1024;

function toBase64Url(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array,
  stream: TransformStream<Uint8Array, Uint8Array>,
  max: number,
) {
  const writer = stream.writable.getWriter();
  void writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => {});
  const reader = stream.readable.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new SourceError(`The source is over ${max / 1024} KB.`);
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** A URL that can't be decoded, or a source over the limit. */
export class SourceError extends Error {}

/** `source` as the `pako:` path segment of an image URL. */
export async function encodeSource(source: string) {
  const bytes = new TextEncoder().encode(source);
  return 'pako:' + toBase64Url(await pipe(bytes, new CompressionStream('deflate'), Infinity));
}

/** The zlib header: compression method 8 and a check sum that divides by 31. */
const isZlib = (b: Uint8Array) =>
  b.length > 2 && (b[0] & 0x0f) === 8 && ((b[0] << 8) | b[1]) % 31 === 0;

/** The source text in a `pako:`, Kroki or plain base64url path segment. */
export async function decodeSource(segment: string) {
  const pako = segment.startsWith('pako:');
  const text = pako ? segment.slice(5) : segment;
  if (!/^[A-Za-z0-9_\-+/]*=*$/.test(text)) throw new SourceError('The URL is not base64url.');
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(text);
  } catch {
    throw new SourceError('The URL is not base64url.');
  }
  if (pako || isZlib(bytes)) {
    try {
      bytes = await pipe(bytes, new DecompressionStream('deflate'), MAX_SOURCE_BYTES);
    } catch (error) {
      if (pako || error instanceof SourceError)
        throw error instanceof SourceError ? error : new SourceError('The URL does not inflate.');
      // Plain text that happens to start like a zlib header.
    }
  }
  if (bytes.length > MAX_SOURCE_BYTES)
    throw new SourceError(`The source is over ${MAX_SOURCE_BYTES / 1024} KB.`);
  return new TextDecoder().decode(bytes);
}

/**
 * The file's own `config link-base=` (the last one wins, as in the language) when it is a web
 * address, read by the DSL's own reader. The runtime never trusts an authored base; on a hosted
 * image it is as safe as the absolute links the policy already keeps. A local base (`.`, a folder)
 * means nothing there, so those relative links are dropped.
 */
export function webLinkBase(source: string) {
  let base: string | undefined;
  try {
    for (const line of readSource(source).lines)
      if (line.kind === 'statement' && line.command === 'config')
        for (const [key, word] of line.attrs)
          if (key === 'link-base' && word.quoted) base = word.value;
  } catch {
    return undefined; // the renderer reports the syntax error
  }
  if (!base) return undefined;
  // One parse decides: an http(s) URL, in the canonical form the runtime's own check accepts.
  try {
    const url = new URL(base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The link policy for a hosted drawing of `source`: absolute links as written, relative ones
 * joined to a web link base the way the CLI's `svgHref` joins them, anything else dropped. Node,
 * note and footnote links all go through `resolve`.
 */
export function webLinks(source: string) {
  const base = webLinkBase(source);
  return {
    mode: 'safe' as const,
    resolve: ({ href }: { href: string }) => (base ? baseUrl(href, base) : null) ?? href,
  };
}

/** The service URL that draws `source` as `format`. */
export async function imageUrl(source: string, format: 'svg' | 'png', base = SERVICE_URL) {
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES)
    throw new SourceError(
      `The source is over ${MAX_SOURCE_BYTES / 1024} KB, so the service refuses it.`,
    );
  const segment = await encodeSource(source);
  if (segment.length > MAX_SEGMENT)
    throw new SourceError(
      `The encoded source is ${segment.length} characters, over the ${MAX_SEGMENT} a URL may carry. Use POST /v1/render.`,
    );
  return `${base.replace(/\/$/, '')}/${format}/${segment}`;
}
