import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSource, encodeSource, imageUrl, SourceError } from '../src/lib/render-url';

const src = 'title "Checkout"\nweb -> api: "POST /pay"\napi -> db';

describe('render URLs', () => {
  it('round-trips through the pako form', async () => {
    const seg = await encodeSource(src);
    expect(seg.startsWith('pako:')).toBe(true);
    expect(await decodeSource(seg)).toBe(src);
  });

  it('reads Kroki (zlib, no prefix) and plain base64url, as other tools write them', async () => {
    expect(await decodeSource(deflateSync(src).toString('base64url'))).toBe(src);
    expect(await decodeSource(Buffer.from(src).toString('base64url'))).toBe(src);
    // Plain text that starts like a zlib header ("x^") still reads as text.
    expect(await decodeSource(Buffer.from('x^ -> y').toString('base64url'))).toBe('x^ -> y');
  });

  it('refuses a source that inflates past 64 KB', async () => {
    const bomb = deflateSync('a -> b\n'.repeat(20_000)).toString('base64url');
    await expect(decodeSource('pako:' + bomb)).rejects.toBeInstanceOf(SourceError);
    await expect(decodeSource('pako:not*base64')).rejects.toBeInstanceOf(SourceError);
  });

  it('builds the service URL', async () => {
    expect(await imageUrl(src, 'png', 'http://localhost:8787/')).toMatch(
      /^http:\/\/localhost:8787\/png\/pako:[\w-]+$/,
    );
  });
});
