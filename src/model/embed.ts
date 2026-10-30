/**
 * The `.draft` source carried inside an exported image, so a PNG or SVG found in a PR or a doc
 * opens again as an editable diagram. Shared by the CLI and the viewer; see "Source in exported
 * images" in docs/DSL.md for the stable format.
 *
 * PNG: an `iTXt` chunk with keyword `draftably`, holding the UTF-8 source (zlib-compressed or not),
 * and a `tEXt` chunk `draftably-version` naming the draftably version that drew it.
 * SVG: `<metadata id="draftably-source" data-draftably-version="…">` with the XML-escaped source.
 */
import { version } from '../../packages/cli/package.json';

export const SOURCE_KEYWORD = 'draftably';
export const VERSION_KEYWORD = 'draftably-version';
export const DRAFTABLY_VERSION = version;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const utf8 = new TextEncoder(),
  latin1 = new TextDecoder('latin1');

let crcTable: Uint32Array | undefined;
function crc32(bytes: Uint8Array) {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  let crc = 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** zlib (RFC 1950) streams, which PNG uses; Node and browsers both have these streams. */
const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(
    await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer(),
  );

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length),
    view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(utf8.encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

function isPng(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** Each chunk of a PNG: its type, its data, and where the chunk starts. */
function* chunks(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 8; at + 12 <= bytes.length;) {
    const length = view.getUint32(at),
      type = latin1.decode(bytes.subarray(at + 4, at + 8));
    yield { type, data: bytes.subarray(at + 8, at + 8 + length), at };
    at += 12 + length;
  }
}

/** The PNG with `source` in a `draftably` chunk before its end, replacing any earlier one. */
export async function embedPngSource(png: Uint8Array, source: string): Promise<Uint8Array> {
  if (!isPng(png)) throw Error('This is not a PNG file.');
  const kept: Uint8Array[] = [];
  let end = -1;
  for (const c of chunks(png)) {
    if (c.type === 'IEND') end = c.at;
    else if (!isOurs(c)) kept.push(png.subarray(c.at, c.at + 12 + c.data.length));
  }
  if (end < 0) throw Error('This PNG has no end chunk.');
  // iTXt: keyword, NUL, compressed=1, method=0, empty language and translated keyword, text.
  const text = concat(
    utf8.encode(SOURCE_KEYWORD),
    Uint8Array.of(0, 1, 0, 0, 0),
    await pipe(utf8.encode(source), new CompressionStream('deflate')),
  );
  return concat(
    png.subarray(0, 8),
    ...kept,
    chunk('iTXt', text),
    chunk('tEXt', concat(utf8.encode(VERSION_KEYWORD), Uint8Array.of(0), utf8.encode(version))),
    png.subarray(end),
  );
}

const keywordOf = (data: Uint8Array) => latin1.decode(data.subarray(0, data.indexOf(0)));
const isOurs = (c: { type: string; data: Uint8Array }) =>
  (c.type === 'iTXt' && keywordOf(c.data) === SOURCE_KEYWORD) ||
  (c.type === 'tEXt' && keywordOf(c.data) === VERSION_KEYWORD);

/** The source in a PNG's `draftably` chunk, or null when it has none. */
export async function readPngSource(png: Uint8Array): Promise<string | null> {
  if (!isPng(png)) return null;
  for (const c of chunks(png)) {
    if (c.type !== 'iTXt' || keywordOf(c.data) !== SOURCE_KEYWORD) continue;
    let at = SOURCE_KEYWORD.length + 1;
    const compressed = c.data[at] === 1;
    at += 2;
    at = c.data.indexOf(0, at) + 1; // language tag
    at = c.data.indexOf(0, at) + 1; // translated keyword
    const text = c.data.subarray(at);
    return new TextDecoder().decode(
      compressed ? await pipe(text, new DecompressionStream('deflate')) : text,
    );
  }
  return null;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescape = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** The `<metadata>` element that carries `source` in an SVG. */
export const svgSourceElement = (source: string) =>
  `<metadata id="draftably-source" data-draftably-version="${version}">${escape(source)}</metadata>`;

/** The SVG with `source` in a metadata element just inside its root. */
export const embedSvgSource = (svg: string, source: string) =>
  svg.replace(/<svg\b[^>]*>/, open => open + svgSourceElement(source));

/** The source in an SVG's `draftably-source` metadata, or null when it has none. */
export function readSvgSource(svg: string): string | null {
  const match = /<metadata\b[^>]*\bid="draftably-source"[^>]*>([\s\S]*?)<\/metadata>/.exec(svg);
  return match ? unescape(match[1]) : null;
}

/** The source embedded in PNG or SVG bytes, or null when there is none. */
export async function readImageSource(bytes: Uint8Array): Promise<string | null> {
  if (isPng(bytes)) return readPngSource(bytes);
  const text = new TextDecoder().decode(bytes);
  return /<svg\b/.test(text) ? readSvgSource(text) : null;
}

/** True for a file name the CLI and viewer read source out of. */
export const isImageName = (name: string) => /\.(png|svg)$/i.test(name);
