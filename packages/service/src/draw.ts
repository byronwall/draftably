/**
 * Drawing for every route: GET image URLs now, the REST API and MCP tools later. SVG comes from
 * `@draftably/runtime`; PNG from resvg-wasm with the CLI's TrueType fonts and the CLI's own
 * scaling and font renaming (`src/model/raster.ts`), so a PNG matches `draftably inspect --png`.
 */
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { renderSvg } from '@draftably/runtime';
import { MAX_SOURCE_BYTES, SourceError, webLinks } from '../../../src/lib/render-url';
import { formatSource } from '../../../src/dsl/syntax';
import { withSourceStrip } from '../../../src/model/strip';
import { embedPngSource } from '../../../src/model/embed';
import { rasterFamilies, scaleSvg, svgSize } from '../../../src/model/raster';
import { toDraft } from './mermaid';
import sans500 from '../../../src/cli/fonts/inter-latin-500-normal.ttf';
import sans600 from '../../../src/cli/fonts/inter-latin-600-normal.ttf';
import serif600 from '../../../src/cli/fonts/source-serif-4-latin-600-normal.ttf';
import mono500 from '../../../src/cli/fonts/jetbrains-mono-latin-500-normal.ttf';

export type Format = 'svg' | 'png';

export interface DrawOptions {
  /** The source language; detected when not given. */
  type?: string | null;
  scheme: 'light' | 'dark';
  /** PNG only: pixels per SVG unit. */
  scale: number;
}

/**
 * The most pixels a PNG may have. resvg-wasm peaks at about 8.5 bytes a pixel (the pixmap plus
 * PNG encoding), and wasm memory never shrinks: 8 M pixels is about 70 MB of the isolate's 128 MB,
 * leaving room for the runtime and Mermaid. The largest example at scale 2 is 7.3 M.
 */
export const MAX_PIXELS = 8_000_000;

/** Options from a query string or JSON body, with defaults; anything else is refused. */
export function drawOptions(get: (key: string) => string | null | undefined): DrawOptions {
  const scheme = get('scheme') ?? 'light';
  if (scheme !== 'light' && scheme !== 'dark')
    throw new SourceError('scheme must be light or dark.');
  const scale = Number(get('scale') ?? 2);
  if (![1, 2, 3, 4].includes(scale)) throw new SourceError('scale must be 1, 2, 3 or 4.');
  const type = get('type') || null;
  if (type && type !== 'draftably' && type !== 'mermaid')
    throw new SourceError('type must be draftably or mermaid.');
  return { type, scheme, scale };
}

/** Draw `source` as SVG, or throw a SourceError with the first diagnostic. */
export async function drawSvg(source: string, opts: DrawOptions) {
  const result = await renderSvg(source, {
    colorScheme: opts.scheme,
    links: webLinks(source),
    limits: { maxSourceBytes: MAX_SOURCE_BYTES },
  });
  if (!result.ok) {
    const d = result.diagnostics.find(x => x.severity === 'error') ?? result.diagnostics[0];
    const line = d?.location?.line ? `line ${d.location.line}: ` : '';
    throw new SourceError(line + (d?.message ?? 'The diagram did not render.'));
  }
  return result.value.svg;
}

let ready: Promise<unknown> | undefined;
const fonts = [sans500, sans600, serif600, mono500].map(b => new Uint8Array(b));

function checkPixels(svg: string, scale: number) {
  const { w, h } = svgSize(svg);
  if (w * h * scale * scale > MAX_PIXELS)
    throw new SourceError(
      `The PNG would be ${w * scale} × ${h * scale} pixels, over the ${MAX_PIXELS / 1e6} M pixel limit. Use a smaller scale or SVG.`,
    );
}

/** `svg` as a PNG at `scale`, refused above MAX_PIXELS. */
export async function rasterize(svg: string, scale: number) {
  checkPixels(svg, scale);
  await (ready ??= initWasm(wasm));
  const r = new Resvg(rasterFamilies(scaleSvg(svg, scale)), {
    font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  });
  try {
    const img = r.render();
    try {
      return img.asPng();
    } finally {
      img.free();
    }
  } finally {
    r.free();
  }
}

/**
 * Draw `source` (Draftably or Mermaid) as `format`. A PNG carries the Draftably source as
 * `draftably inspect --png` writes it: in a metadata chunk and in a faint pixel strip below the
 * drawing, so `draftably open` reads it back, also for a Mermaid input.
 */
export async function draw(source: string, format: Format, opts: DrawOptions) {
  const { draft } = await toDraft(source, opts.type);
  const svg = await drawSvg(draft, opts);
  if (format === 'svg') return svg;
  const kept = formatSource(draft);
  // Check the size before the strip: building the strip for a huge drawing costs memory too.
  checkPixels(svg, opts.scale);
  const png = await rasterize(await withSourceStrip(svg, kept, opts.scale), opts.scale);
  return embedPngSource(png, kept);
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A small SVG that shows the error, so an image tag shows why instead of a broken icon. */
export function errorSvg(message: string) {
  const lines = message.match(/.{1,70}(\s|$)/g) ?? [message];
  const h = 40 + lines.length * 20;
  const text = (y: number, attrs: string, s: string) =>
    `<text x="16" y="${y}" ${attrs}>${esc(s)}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="${h}" viewBox="0 0 560 ${h}">` +
    `<rect width="560" height="${h}" rx="6" fill="#fff4f2" stroke="#d4553f"/>` +
    text(
      28,
      'font-family="Inter" font-size="14" font-weight="600" fill="#9b2c1c"',
      'Draftably could not draw this diagram',
    ) +
    lines
      .map((l, i) =>
        text(52 + i * 20, 'font-family="JetBrains Mono" font-size="13" fill="#3b1a14"', l.trim()),
      )
      .join('') +
    `</svg>`
  );
}

/** The error drawn in the format the caller asked for. */
export async function errorImage(message: string, format: Format) {
  const svg = errorSvg(message);
  return format === 'svg' ? svg : rasterize(svg, 2);
}
