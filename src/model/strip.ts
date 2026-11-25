/**
 * Source strip: the .draft source drawn as a thin band of square modules below the drawing, so
 * the source survives sites that strip PNG metadata, resize the image or recompress it as JPEG.
 *
 * Bytes: [0xD8, 24-bit length, CRC-32 of the source, deflate-raw(source)...], in Reed–Solomon blocks
 * (GF(256), parity ≈ `parity` of each block) and interleaved byte by byte across the blocks.
 *
 * Grid, N columns × M rows, both odd:
 * - row 0 is a clock: module on when the column is even;
 * - column 0 is a clock: module on when the row is even;
 * - column N-2 is always off, column N-1 is always on (they set the on and off levels);
 * - the rest holds the bits, column by column, XOR a fixed whitening mask.
 * The decoder finds the band from the background, reads the pitch from the two clocks and
 * samples each module, so it does not depend on the image's size.
 */

// Format 2: a 24-bit length and a CRC-32 of the source in the header.
const MAGIC = 0xd8;
/** Below this many columns the clocks and guards leave too little room: export without a strip. */
const MIN_COLS = 65;
/** Past this width the slow search for a resized band's pitch costs too much; lossless only. */
const SEARCH_MAX = 6000;

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Uint8Array) => {
  let c = ~0;
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return ~c >>> 0;
};

// --- GF(256) and Reed–Solomon (polynomials highest degree first) ---

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
const div = (a: number, b: number) => (a ? EXP[(LOG[a] + 255 - LOG[b]) % 255] : 0);
const pow2 = (e: number) => EXP[((e % 255) + 255) % 255];

function polyMul(p: number[], q: number[]) {
  const r = new Array<number>(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) r[i + j] ^= mul(p[i], q[j]);
  return r;
}
function polyEval(p: ArrayLike<number>, x: number) {
  let y = p[0];
  for (let i = 1; i < p.length; i++) y = mul(y, x) ^ p[i];
  return y;
}
const polyAdd = (p: number[], q: number[]) => {
  const r = new Array<number>(Math.max(p.length, q.length)).fill(0);
  for (let i = 0; i < p.length; i++) r[i + r.length - p.length] = p[i];
  for (let i = 0; i < q.length; i++) r[i + r.length - q.length] ^= q[i];
  return r;
};
const polyScale = (p: number[], x: number) => p.map(c => mul(c, x));

export function rsEncode(msg: Uint8Array, nsym: number) {
  let gen = [1];
  for (let i = 0; i < nsym; i++) gen = polyMul(gen, [1, pow2(i)]);
  const res = new Uint8Array(msg.length + nsym);
  res.set(msg);
  for (let i = 0; i < msg.length; i++) {
    const c = res[i];
    if (c) for (let j = 1; j < gen.length; j++) res[i + j] ^= mul(gen[j], c);
  }
  res.set(msg);
  return res;
}

/** Correct up to nsym/2 byte errors in place. Returns the count fixed, or -1 when it cannot. */
export function rsDecode(msg: Uint8Array, nsym: number) {
  const synd = [0];
  for (let i = 0; i < nsym; i++) synd.push(polyEval(msg, pow2(i)));
  if (synd.every(s => s === 0)) return 0;
  // Berlekamp–Massey.
  let loc = [1];
  let old = [1];
  for (let i = 0; i < nsym; i++) {
    const k = i + 1;
    let delta = synd[k];
    for (let j = 1; j < loc.length; j++) delta ^= mul(loc[loc.length - 1 - j], synd[k - j]);
    old = [...old, 0];
    if (delta) {
      if (old.length > loc.length) {
        const next = polyScale(old, delta);
        old = polyScale(loc, div(1, delta));
        loc = next;
      }
      loc = polyAdd(loc, polyScale(old, delta));
    }
  }
  while (loc.length && loc[0] === 0) loc.shift();
  const errs = loc.length - 1;
  if (errs * 2 > nsym) return -1;
  // Chien search.
  const rev = [...loc].reverse();
  const pos: number[] = [];
  for (let i = 0; i < msg.length; i++)
    if (polyEval(rev, pow2(i)) === 0) pos.push(msg.length - 1 - i);
  if (pos.length !== errs) return -1;
  // Forney.
  const coef = pos.map(p => msg.length - 1 - p);
  let eloc = [1];
  for (const c of coef) eloc = polyMul(eloc, polyAdd([1], [pow2(c), 0]));
  const prod = polyMul([...synd].reverse(), eloc);
  const evalPoly = prod.slice(prod.length - eloc.length).reverse();
  const X = coef.map(c => pow2(-(255 - c)));
  for (let i = 0; i < X.length; i++) {
    const inv = div(1, X[i]);
    let prime = 1;
    for (let j = 0; j < X.length; j++) if (j !== i) prime = mul(prime, 1 ^ mul(inv, X[j]));
    if (!prime) return -1;
    const y = mul(X[i], polyEval([...evalPoly].reverse(), inv));
    msg[pos[i]] ^= div(y, prime);
  }
  for (let i = 0; i < nsym; i++) if (polyEval(msg, pow2(i))) return -1;
  return errs;
}

// --- Byte layout ---

function blocks(total: number, parity: number) {
  const nb = Math.ceil(total / 255);
  const out: { n: number; nsym: number }[] = [];
  for (let b = 0; b < nb; b++) {
    const n = Math.floor(total / nb) + (b < total % nb ? 1 : 0);
    const nsym = Math.max(2, 2 * Math.round((n * parity) / 2));
    out.push({ n, nsym });
  }
  return out;
}
const dataBytes = (total: number, parity: number) =>
  blocks(total, parity).reduce((s, b) => s + b.n - b.nsym, 0);

function interleave(data: Uint8Array, total: number, parity: number) {
  const bs = blocks(total, parity);
  const words: Uint8Array[] = [];
  let at = 0;
  for (const b of bs) {
    const k = b.n - b.nsym;
    const part = new Uint8Array(k);
    part.set(data.subarray(at, at + k));
    at += k;
    words.push(rsEncode(part, b.nsym));
  }
  const out = new Uint8Array(total);
  let i = 0;
  for (let r = 0; r < 255; r++) for (const w of words) if (r < w.length) out[i++] = w[r];
  return out;
}

function deinterleave(stream: Uint8Array, parity: number) {
  const bs = blocks(stream.length, parity);
  const words = bs.map(b => new Uint8Array(b.n));
  let i = 0;
  for (let r = 0; r < 255; r++) for (const w of words) if (r < w.length) w[r] = stream[i++];
  const data: number[] = [];
  let fixed = 0;
  for (let b = 0; b < bs.length; b++) {
    const n = rsDecode(words[b], bs[b].nsym);
    if (n < 0) return null;
    fixed += n;
    data.push(...words[b].subarray(0, bs[b].n - bs[b].nsym));
  }
  return { data: Uint8Array.from(data), fixed };
}

// --- Grid ---

const whiten = (c: number, r: number) => {
  let h = Math.imul((c * 4099 + r) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h & 1;
};

export interface StripGrid {
  cols: number;
  rows: number;
  /** cols × rows, row-major, 1 = module drawn. */
  on: Uint8Array;
}

function grid(stream: Uint8Array, cols: number, rows: number): StripGrid {
  const on = new Uint8Array(cols * rows);
  for (let c = 0; c < cols; c++) on[c] = c % 2 === 0 ? 1 : 0;
  for (let r = 0; r < rows; r++) {
    on[r * cols] = r % 2 === 0 ? 1 : 0;
    on[r * cols + cols - 2] = r === 0 ? on[cols - 2] : 0;
    on[r * cols + cols - 1] = 1;
  }
  let bit = 0;
  for (let c = 1; c < cols - 2; c++)
    for (let r = 1; r < rows; r++, bit++) {
      const v = bit < stream.length * 8 ? (stream[bit >> 3] >> (7 - (bit & 7))) & 1 : 0;
      on[r * cols + c] = v ^ whiten(c, r);
    }
  return { cols, rows, on };
}

const capacity = (cols: number, rows: number) => Math.floor(((cols - 3) * (rows - 1)) / 8);

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export interface StripOptions {
  /** Module size in CSS px. */
  module: number;
  /** Fraction of each Reed–Solomon block spent on parity. */
  parity: number;
}

/** Lay out `source` as a grid `cols` modules across, or null when that is too narrow. */
export async function encodeStrip(source: string, cols: number, parity: number) {
  if (cols % 2 === 0) cols--;
  if (cols < MIN_COLS) return null;
  const text = new TextEncoder().encode(source);
  const packed = await pipe(text, new CompressionStream('deflate-raw'));
  const n = packed.length;
  const sum = crc32(text);
  const head = Uint8Array.of(
    MAGIC,
    n >> 16,
    (n >> 8) & 255,
    n & 255,
    ...[24, 16, 8, 0].map(s => (sum >>> s) & 255),
  );
  const data = new Uint8Array(head.length + packed.length);
  data.set(head);
  data.set(packed, head.length);
  let rows = 3;
  while (dataBytes(capacity(cols, rows), parity) < data.length) rows += 2;
  const total = capacity(cols, rows);
  return grid(interleave(data, total, parity), cols, rows);
}

/** SVG rects for a grid, one rect per horizontal run of modules. */
export function stripRects(g: StripGrid, x: number, y: number, m: number) {
  let out = '';
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      if (!g.on[r * g.cols + c]) continue;
      let end = c;
      while (end + 1 < g.cols && g.on[r * g.cols + end + 1]) end++;
      out += `<rect x="${x + c * m}" y="${y + r * m}" width="${(end - c + 1) * m}" height="${m}"/>`;
      c = end;
    }
  return out;
}

/**
 * Add the strip at the bottom of an exported SVG drawing. `scale` is the export's image px per
 * CSS px: the band snaps to that pixel grid, so a lossless copy keeps every module sharp. The
 * drawing grows by the band plus a small gap and quiet zone; drawings put labels in their bottom
 * padding, so the band cannot share it. The first full-size rect is taken as the background.
 */
export async function addSourceStrip(
  svg: string,
  source: string,
  opts: StripOptions & { ink: string; opacity: number; scale?: number },
) {
  const vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!vb) throw Error('The SVG has no viewBox.');
  const [vx, vy, vw, vh] = vb.slice(1).map(Number);
  const k = opts.scale ?? 2;
  const snap = (v: number) => Math.round(v * k) / k;
  const m = opts.module;
  const margin = Math.min(16, vw / 10);
  const g = await encodeStrip(source, Math.floor((vw - 2 * margin) / m), opts.parity);
  if (!g) return { svg, grid: null, grew: 0, top: vh };
  const gap = Math.max(2, 3 * m);
  const quiet = Math.max(2, 3 * m);
  const top = vy + snap(vh + gap);
  // A whole CSS height: renderers round the root size, which would shift a fractional drawing.
  const nh = Math.ceil(Math.max(vh, top - vy + g.rows * m + quiet));
  const x = vx + snap((vw - g.cols * m) / 2);
  const band = `<g data-draftably-strip="1" fill="${opts.ink}" fill-opacity="${opts.opacity}" shape-rendering="crispEdges">${stripRects(g, x, top, m)}</g>`;
  const grown = svg
    .replace(vb[0], `viewBox="${vx} ${vy} ${vw} ${nh}"`)
    .replace(/(<svg[^>]*?) height="[\d.]+"/, `$1 height="${nh}"`)
    .replace(
      new RegExp(`(<rect x="${vx}" y="${vy}" width="${vw}") height="${vh}"`),
      `$1 height="${nh}"`,
    );
  return {
    svg: grown.replace(/<\/svg>\s*$/, `${band}</svg>`),
    grid: g,
    grew: nh - vh,
    top: top - vy,
  };
}

/**
 * The strip exports carry: one image pixel per module at the export's `scale`, 3% ink and light
 * parity. A lossless PNG file or clipboard copy keeps every module; a resize does not.
 */
export const EXPORT_STRIP = { opacity: 0.03, parity: 0.1 };

/**
 * The strip's ink: black on a light background, white on a dark one. A transparent export has no
 * background rect and reads as on white, so it gets black.
 */
function stripInk(svg: string) {
  const vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  const bg = vb
    ? new RegExp(
        `<rect x="${vb[1]}" y="${vb[2]}" width="${vb[3]}" height="${vb[4]}" fill="#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})"`,
      ).exec(svg)?.[1]
    : undefined;
  if (!bg) return '#000000';
  const hex = bg.length === 3 ? [...bg].map(c => c + c).join('') : bg;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 128 ? '#000000' : '#FFFFFF';
}

/**
 * `svg` with `source` drawn as a strip below it, for a PNG at `scale` image px per CSS px. A
 * drawing too narrow for a strip comes back unchanged.
 */
export async function withSourceStrip(svg: string, source: string, scale: number) {
  const ink = stripInk(svg);
  const { svg: out } = await addSourceStrip(svg, source, {
    module: 1 / scale,
    scale,
    ink,
    ...EXPORT_STRIP,
  });
  return out;
}

// --- Decode from pixels ---

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, as from ImageData. */
  data: ArrayLike<number>;
}

export interface StripRead {
  source: string | null;
  grid?: StripGrid;
  /** Byte errors Reed–Solomon fixed. */
  fixed?: number;
  why?: string;
}

export async function decodeStrip(px: Pixels, parity = EXPORT_STRIP.parity): Promise<StripRead> {
  const { width: W, height: H, data } = px;
  if (W < MIN_COLS || H < 8) return { source: null, why: 'too small' };
  // Luminance composited over white, so a transparent export reads as it shows on a light page.
  // Read on demand: a large image with no strip only has its bottom rows scanned.
  const lumAt = (i: number) => {
    const a = data[i * 4 + 3] / 255;
    return (
      a * (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) + (1 - a) * 255
    );
  };
  const xa = Math.floor(W * 0.03);
  const xb = Math.ceil(W * 0.97);
  const bottom: number[] = [];
  for (let x = xa; x < xb; x++) bottom.push(lumAt((H - 1) * W + x), lumAt((H - 2) * W + x));
  bottom.sort((a, b) => a - b);
  const bg = bottom[bottom.length >> 1];
  const dev = (x: number, y: number) => Math.abs(lumAt(y * W + x) - bg);
  const rowDev = (y: number) => {
    let s = 0;
    for (let x = xa; x < xb; x++) s += dev(x, y);
    return s / (xb - xa);
  };
  const noise = Math.max(rowDev(H - 1), rowDev(H - 2));
  const k = Math.max(0.6, 4 * noise);
  // Band rows: the first run of busy rows above the quiet zone.
  // Skip short runs of busy rows (compression noise) until a band at least 3 rows tall. Climb
  // only while rows stay near the band's own level, so noise in the gap above does not join the
  // band to the drawing.
  // The band sits at the bottom: search only the last rows, so other images fail fast.
  const floor = Math.max(1, H - 800);
  let y1 = H;
  let y0 = H;
  while (y0 > floor) {
    y1 = y0 - 1;
    while (y1 > floor && rowDev(y1) <= k) y1--;
    y0 = y1;
    const level: number[] = [rowDev(y1)];
    while (y0 > floor) {
      const v = rowDev(y0 - 1);
      const sorted = [...level].sort((a, b) => a - b);
      if (v <= k || (level.length >= 3 && v < 0.4 * sorted[sorted.length >> 1])) break;
      level.push(v);
      y0--;
    }
    if (y1 - y0 >= 2) break;
  }
  if (y1 - y0 < 2) return { source: null, why: 'no band' };
  // JPEG ringing makes the rows next to the band busy too: trim rows under half the band's level.
  const rd: number[] = [];
  for (let y = y0; y <= y1; y++) rd.push(rowDev(y));
  const mid = [...rd].sort((a, b) => a - b)[rd.length >> 1];
  while (y0 < y1 && rowDev(y0) < 0.5 * mid) y0++;
  while (y1 > y0 && rowDev(y1) < 0.5 * mid) y1--;
  const colDev = (x: number) => {
    let s = 0;
    for (let y = y0; y <= y1; y++) s += dev(x, y);
    return s / (y1 - y0 + 1);
  };
  const cols = Array.from({ length: W }, (_, x) => colDev(x));
  const ck = cols.reduce((a, b) => Math.max(a, b), 0) * 0.25;
  let x0 = 0;
  while (x0 < W && cols[x0] <= ck) x0++;
  let x1 = W - 1;
  while (x1 > 0 && cols[x1] <= ck) x1--;
  if (x1 - x0 < MIN_COLS) return { source: null, why: 'no band' };
  const bilinear = (x: number, y: number) => {
    const xf = Math.min(W - 2, Math.max(0, Math.floor(x - 0.5)));
    const yf = Math.min(H - 2, Math.max(0, Math.floor(y - 0.5)));
    const tx = Math.min(1, Math.max(0, x - 0.5 - xf));
    const ty = Math.min(1, Math.max(0, y - 0.5 - yf));
    return (
      (1 - ty) * ((1 - tx) * dev(xf, yf) + tx * dev(xf + 1, yf)) +
      ty * ((1 - tx) * dev(xf, yf + 1) + tx * dev(xf + 1, yf + 1))
    );
  };
  /** Sample the N×M grid inside the given edges and decode it. */
  const finish = async (
    ox: number,
    ex: number,
    oy: number,
    ey: number,
    N: number,
    M: number,
  ): Promise<StripRead> => {
    const px1 = (ex - ox) / N;
    const py1 = (ey - oy) / M;
    const sample = (c: number, r: number) => {
      const cx = ox + (c + 0.5) * px1;
      const cy = oy + (r + 0.5) * py1;
      if (px1 < 3 || py1 < 3) return bilinear(cx, cy);
      const hx = Math.max(0.5, 0.25 * px1);
      const hy = Math.max(0.5, 0.25 * py1);
      let s = 0;
      let n = 0;
      for (let y = Math.round(cy - hy); y <= Math.round(cy + hy - 0.01); y++)
        for (let x = Math.round(cx - hx); x <= Math.round(cx + hx - 0.01); x++)
          if (x >= 0 && y >= 0 && x < W && y < H) {
            s += dev(x, y);
            n++;
          }
      return n ? s / n : 0;
    };
    let onS = 0;
    let offS = 0;
    for (let r = 1; r < M; r++) {
      onS += sample(N - 1, r);
      offS += sample(N - 2, r);
    }
    const thr = (onS + offS) / (2 * (M - 1));
    const on = new Uint8Array(N * M);
    for (let r = 0; r < M; r++)
      for (let c = 0; c < N; c++) on[r * N + c] = sample(c, r) > thr ? 1 : 0;
    const g = { cols: N, rows: M, on };
    const total = capacity(N, M);
    const stream = new Uint8Array(total);
    let bit = 0;
    for (let c = 1; c < N - 2; c++)
      for (let r = 1; r < M; r++, bit++) {
        if (bit >= total * 8) break;
        const v = on[r * N + c] ^ whiten(c, r);
        if (v) stream[bit >> 3] |= 1 << (7 - (bit & 7));
      }
    const read = deinterleave(stream, parity);
    if (!read) return { source: null, grid: g, why: 'too many errors' };
    const d = read.data;
    if (d[0] !== MAGIC) return { source: null, grid: g, why: 'bad header' };
    const len = (d[1] << 16) | (d[2] << 8) | d[3];
    const sum = ((d[4] << 24) | (d[5] << 16) | (d[6] << 8) | d[7]) >>> 0;
    if (8 + len > d.length) return { source: null, grid: g, why: 'bad length' };
    try {
      const text = await pipe(d.subarray(8, 8 + len), new DecompressionStream('deflate-raw'));
      // Reed–Solomon can settle on a different valid codeword: only the checksum proves the text.
      if (crc32(text) !== sum) return { source: null, grid: g, why: 'checksum mismatch' };
      return { source: new TextDecoder().decode(text), grid: g, fixed: read.fixed };
    } catch {
      return { source: null, grid: g, why: 'inflate failed' };
    }
  };

  // Fast path for a lossless copy: count the clock's runs along the top row and the left column.
  const runs = (vals: number[]) => {
    const top = vals.reduce((a, b) => Math.max(a, b), 0);
    let n = 0;
    let on = false;
    for (const v of vals) {
      if (!on && v > top * 0.5) n++;
      on = v > top * 0.5;
    }
    return n;
  };
  const topRow: number[] = [];
  for (let x = x0; x <= x1; x++) topRow.push(dev(x, y0));
  const fastN = 2 * runs(topRow) - 1;
  const leftCol: number[] = [];
  for (let y = y0; y <= y1; y++) leftCol.push(dev(x0, y));
  const fastM = 2 * runs(leftCol) - 1;
  if (fastN >= MIN_COLS && fastM >= 3) {
    const read = await finish(x0, x1 + 1, y0, y1 + 1, fastN, fastM);
    if (read.source !== null) return read;
  }
  // A resized band: search for its pitch, but only where the top row alternates like a clock.
  if (x1 - x0 > SEARCH_MAX || runs(topRow) < 16) return { source: null, why: 'no band' };

  // Grid edges (pixel boundaries) and size: pick the column count whose clock row scores best,
  // then the row count from the left clock, then nudge each edge to subpixel.
  let ox = x0;
  let ex = x1 + 1;
  let oy = y0;
  let ey = y1 + 1;
  const topScore = (n: number) => {
    const p = (ex - ox) / n;
    let s = 0;
    for (let c = 0; c < n; c++) s += (c % 2 ? -1 : 1) * bilinear(ox + (c + 0.5) * p, oy + 0.5 * p);
    // The on/off guard pair at the right end; a wrong count samples data there instead.
    let g = 0;
    const rows = Math.max(1, Math.floor((ey - oy) / p));
    for (let r = 0; r < rows; r++) {
      const y = oy + (r + 0.5) * p;
      g += bilinear(ex - 0.5 * p, y) - bilinear(ex - 1.5 * p, y);
    }
    return s / n + g / rows;
  };
  const pick = (from: number, to: number, f: (n: number) => number) => {
    let at = from | 1;
    let top = -Infinity;
    for (let n = from | 1; n <= to; n += 2) {
      const v = f(n);
      if (v >= top) {
        top = v;
        at = n;
      }
    }
    return at;
  };
  // Column count from the clock row's strongest period. A square wave has no energy below its
  // fundamental, and its odd harmonics are weaker, so the peak is the true pitch.
  const power = (prof: number[], n: number, len: number) => {
    const f = (2 * Math.PI * n) / (2 * len);
    let re = 0;
    let im = 0;
    for (let i = 0; i < prof.length; i++) {
      re += prof[i] * Math.cos(f * (i + 0.5));
      im += prof[i] * Math.sin(f * (i + 0.5));
    }
    return re * re + im * im;
  };
  const centered = (p: number[]) => {
    const mean = p.reduce((a, b) => a + b, 0) / p.length;
    return p.map(v => v - mean);
  };
  // Read the clock on the row where each candidate pitch puts its center.
  const rowsC = new Map<number, number[]>();
  const clockRow = (y: number) => {
    let r = rowsC.get(y);
    if (!r) {
      const row: number[] = [];
      for (let x = x0; x <= x1; x++) row.push(dev(x, y));
      rowsC.set(y, (r = centered(row)));
    }
    return r;
  };
  const N = pick(Math.max(5, Math.floor((ex - ox) / 12) | 1), (ex - ox) / 0.9, n =>
    power(clockRow(Math.min(y1, Math.floor(y0 + (0.5 * (ex - ox)) / n))), n, ex - ox),
  );
  const leftScore = (m: number, n: number) => {
    const px = (ex - ox) / n;
    const py = (ey - oy) / m;
    let s = 0;
    for (let r = 0; r < m; r++) {
      const y = oy + (r + 0.5) * py;
      s += (r % 2 ? -1 : 1) * bilinear(ox + 0.5 * px, y);
      s += bilinear(ex - 0.5 * px, y) - bilinear(ex - 1.5 * px, y);
    }
    return s / m;
  };
  // Modules stay square under a resize, so the row count is near the height over the pitch.
  const rough = (ey - oy) / ((ex - ox) / N);
  const leftP: number[] = [];
  const lx = Math.min(x1, Math.floor(ox + (0.5 * (ex - ox)) / N));
  for (let y = y0; y <= y1; y++) leftP.push(dev(lx, y));
  const leftC = centered(leftP);
  const M = pick(Math.max(3, Math.floor(rough * 0.8)), Math.max(3, rough * 1.25), m =>
    power(leftC, m, ey - oy),
  );
  const score = () => topScore(N) + leftScore(M, N);
  for (const step of [1, 0.5, 0.25]) {
    let moved = true;
    for (let round = 0; moved && round < 8; round++) {
      moved = false;
      for (const k of ['ox', 'ex', 'oy', 'ey'] as const)
        for (const d of [-step, step]) {
          const before = score();
          const e = { ox, ex, oy, ey };
          e[k] += d;
          // A pitch under half a pixel cannot be a band; never score it.
          if ((e.ex - e.ox) / N < 0.5 || (e.ey - e.oy) / M < 0.5) continue;
          ({ ox, ex, oy, ey } = e);
          if (score() > before + 1e-9) moved = true;
          else {
            e[k] -= d;
            ({ ox, ex, oy, ey } = e);
          }
        }
    }
  }
  return finish(ox, ex, oy, ey, N, M);
}
