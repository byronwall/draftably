/**
 * A playground link that opens with this source: `/play#s=<deflate-raw, base64url>`. The format is
 * the playground's share hash (`encodeSource` in src/lib/source-hash.ts on the playground branch);
 * this copy goes once the branches meet.
 */
const toBase64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export async function playUrl(source: string) {
  const out = new Blob([new TextEncoder().encode(source)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(out).arrayBuffer());
  return `${import.meta.env.BASE_URL}play#s=${toBase64Url(bytes)}`;
}
