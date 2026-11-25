import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli/main';
import { readPngPixels } from '../src/cli/png-pixels';
import { readPngSource } from '../src/model/embed';
import { decodeStrip } from '../src/model/strip';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-strip-'));

/** The PNG without its text chunks, as a host that strips metadata leaves it. */
function scrub(png: Buffer) {
  const parts = [png.subarray(0, 8)];
  for (let at = 8; at < png.length;) {
    const len = png.readUInt32BE(at);
    if (!/^(iTXt|tEXt|zTXt)$/.test(png.toString('latin1', at + 4, at + 8)))
      parts.push(png.subarray(at, at + 12 + len));
    at += 12 + len;
  }
  return Buffer.concat(parts);
}

describe('source strip', () => {
  // A fractional export size once shifted the drawing half a pixel and blurred every module.
  it.each(['1', '1.5', '2', '3'])('reads the source back from a %sx PNG export', async scale => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const out = path.join(dir, `checkout-${scale}.png`);
    expect(await main(['inspect', 'examples/checkout.draft', '--png', out, '--scale', scale])).toBe(
      0,
    );
    const png = fs.readFileSync(out);
    const carried = await readPngSource(png);
    const read = await decodeStrip(readPngPixels(scrub(png))!);
    expect(read.source).toBe(carried);
  });

  it('leaves the strip out with --no-source-strip', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const out = path.join(dir, 'plain.png');
    await main(['inspect', 'examples/checkout.draft', '--png', out, '--no-source-strip']);
    expect((await decodeStrip(readPngPixels(fs.readFileSync(out))!)).source).toBeNull();
  });
});
