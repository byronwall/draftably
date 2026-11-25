/**
 * Read a PNG's pixels without a dependency, for the source strip. Handles every color type and
 * bit depth, with palette and color-key transparency. Interlaced (Adam7) PNGs, which no exporter
 * of a strip writes, and malformed files give null.
 */
import zlib from 'node:zlib';
import type { Pixels } from '../model/strip';

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const DEPTHS: Record<number, number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

export function readPngPixels(png: Uint8Array): Pixels | null {
  try {
    return read(Buffer.from(png.buffer, png.byteOffset, png.byteLength));
  } catch {
    return null;
  }
}

function read(b: Buffer): Pixels | null {
  if (b.length < 8 || b.readUInt32BE(0) !== 0x89504e47) return null;
  let at = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let type = -1;
  let laced = 0;
  let palette: Buffer | undefined;
  let trns: Buffer | undefined;
  const idat: Buffer[] = [];
  let ended = false;
  while (at + 12 <= b.length) {
    const len = b.readUInt32BE(at);
    if (at + 12 + len > b.length) return null;
    const kind = b.toString('latin1', at + 4, at + 8);
    const d = b.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      depth = d[8];
      type = d[9];
      laced = d[12];
    } else if (kind === 'PLTE') palette = d;
    else if (kind === 'tRNS') trns = d;
    else if (kind === 'IDAT') idat.push(d);
    else if (kind === 'IEND') {
      ended = len === 0;
      break;
    }
    at += 12 + len;
  }
  // A file cut short is not a complete image.
  if (!ended) return null;
  const ch = CHANNELS[type];
  if (!ch || !DEPTHS[type].includes(depth) || laced || !w || !h || (type === 3 && !palette))
    return null;
  const bits = ch * depth;
  const bpp = Math.max(1, bits >> 3);
  const stride = Math.ceil((w * bits) / 8);
  const need = h * (stride + 1);
  const raw = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: need });
  if (raw.length < need) return null;
  const max = (1 << Math.min(depth, 8)) - 1;
  // Sample `i` of a row: its raw value at the image's bit depth.
  const sample = (row: Uint8Array, i: number) => {
    if (depth === 16) return (row[i * 2] << 8) | row[i * 2 + 1];
    if (depth === 8) return row[i];
    const bit = i * depth;
    return (row[bit >> 3] >> (8 - depth - (bit & 7))) & max;
  };
  const to8 = (v: number) =>
    depth === 16 ? v >> 8 : depth === 8 ? v : Math.round((v * 255) / max);
  const key = (i: number) => (trns && trns.length >= i * 2 + 2 ? trns.readUInt16BE(i * 2) : -1);
  const out = new Uint8ClampedArray(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const up = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
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
      } else if (filter !== 0) return null;
      cur[i] = v;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) {
        const k = sample(cur, x);
        if (k * 3 + 2 >= palette!.length) return null;
        out.set([palette![k * 3], palette![k * 3 + 1], palette![k * 3 + 2], trns?.[k] ?? 255], o);
      } else if (type === 0 || type === 4) {
        const g = sample(cur, x * ch);
        const alpha = type === 4 ? to8(sample(cur, x * ch + 1)) : g === key(0) ? 0 : 255;
        out.set([to8(g), to8(g), to8(g), alpha], o);
      } else {
        const [r, g, bl] = [0, 1, 2].map(i => sample(cur, x * ch + i));
        const alpha =
          type === 6
            ? to8(sample(cur, x * ch + 3))
            : r === key(0) && g === key(1) && bl === key(2)
              ? 0
              : 255;
        out.set([to8(r), to8(g), to8(bl), alpha], o);
      }
    }
    prev = cur;
  }
  return { width: w, height: h, data: out };
}
