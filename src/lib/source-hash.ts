/**
 * Source in a URL hash, deflated and base64url-encoded: `#s=<data>`. The hash never reaches a
 * server, so a shared link carries the diagram and nothing else.
 */

const toBase64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSource(source: string) {
  const packed = await pipe(new TextEncoder().encode(source), new CompressionStream('deflate-raw'));
  return `s=${toBase64Url(packed)}`;
}

/** The source in a `#s=` hash, or null when there is none or it does not decode. */
export async function decodeSource(hash: string) {
  const data = /^#?s=([\w-]+)/.exec(hash)?.[1];
  if (!data) return null;
  try {
    const bytes = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
