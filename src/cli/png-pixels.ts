/**
 * Read a PNG's pixels without a dependency, for the source strip. Handles 8-bit grey, RGB,
 * palette, grey-alpha and RGBA images that are not interlaced, which covers draftably's exports
 * and what browsers and screenshot tools write. Returns null for any other PNG.
 */
import zlib from 'node:zlib';
import type { Pixels } from '../model/strip';

export function readPngPixels(png: Uint8Array): Pixels | null {
  const b = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  let at = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let type = 0;
  let laced = 0;
  let palette: Buffer | undefined;
  let alphas: Buffer | undefined;
  const idat: Buffer[] = [];
  while (at + 8 <= b.length) {
    const len = b.readUInt32BE(at);
    const kind = b.toString('latin1', at + 4, at + 8);
    const d = b.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      depth = d[8];
      type = d[9];
      laced = d[12];
    } else if (kind === 'PLTE') palette = d;
    else if (kind === 'tRNS') alphas = d;
    else if (kind === 'IDAT') idat.push(d);
    else if (kind === 'IEND') break;
    at += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (depth !== 8 || laced || !channels || (type === 3 && !palette)) return null;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = new Uint8ClampedArray(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const up = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (a + up) >> 1;
      else if (filter === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      cur[i] = v;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const s = x * channels;
      if (type === 3) {
        const k = cur[s];
        out.set([palette![k * 3], palette![k * 3 + 1], palette![k * 3 + 2], alphas?.[k] ?? 255], o);
      } else if (type < 3 || type === 4) {
        const g = type === 2 ? -1 : cur[s];
        if (g < 0) out.set([cur[s], cur[s + 1], cur[s + 2], 255], o);
        else out.set([g, g, g, type === 4 ? cur[s + 1] : 255], o);
      } else out.set([cur[s], cur[s + 1], cur[s + 2], cur[s + 3]], o);
    }
    prev = cur;
  }
  return { width: w, height: h, data: out };
}
