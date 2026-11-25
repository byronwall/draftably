import { randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  decodeSource,
  encodeSource,
  imageUrl,
  SourceError,
  webLinkBase,
  webLinks,
} from '../src/lib/render-url';

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

  it('refuses a URL the service would refuse', async () => {
    await expect(imageUrl('#' + 'x'.repeat(65 * 1024), 'svg')).rejects.toBeInstanceOf(SourceError);
    const noisy = Array.from({ length: 300 }, () => `# ${randomBytes(24).toString('hex')}`).join(
      '\n',
    );
    await expect(imageUrl(noisy, 'svg')).rejects.toThrow(/POST \/v1\/render/);
  });

  it('builds the service URL', async () => {
    expect(await imageUrl(src, 'png', 'http://localhost:8787/')).toMatch(
      /^http:\/\/localhost:8787\/png\/pako:[\w-]+$/,
    );
  });

  it('reads the last web link-base, joins links as a folder, and drops a bad base', () => {
    const two =
      'config link-base="https://a.example/x/"\nconfig link-base="https://b.example/docs"\n';
    expect(webLinkBase(two)).toBe('https://b.example/docs');
    expect(webLinks(two).resolve({ href: 'notes' })).toBe('https://b.example/docs/notes');
    expect(webLinks(two).baseUrl).toBe('https://b.example/docs/');
    expect(webLinkBase('config link-base="https://bad host"\n')).toBeUndefined();
    expect(webLinkBase('config link-base="../.."\n')).toBeUndefined();
    expect(webLinks('node a "A"\n').resolve({ href: 'https://x.example/' })).toBe(
      'https://x.example/',
    );
  });
});
