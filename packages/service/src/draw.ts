/**
 * Drawing for every route: GET image URLs now, the REST API and MCP tools later. SVG comes from
 * `@draftably/runtime`; PNG from `drawPng` (`src/model/raster.ts`), the function the CLI uses,
 * run on resvg-wasm with the CLI's TrueType fonts, so a PNG matches `draftably inspect --png`.
 */
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { renderSvg } from '@draftably/runtime';
import { MAX_SOURCE_BYTES, SourceError, webLinks } from '../../../src/lib/render-url';
import { formatSource } from '../../../src/dsl/syntax';
import { withSourceStrip } from '../../../src/model/strip';
import { drawPng, svgSize, type Step } from '../../../src/model/raster';
import { DiagramError } from './errors';
import { toDraft } from './mermaid';
import { byteSize, note, span } from './obs';
import sans500 from '../../../src/cli/fonts/inter-latin-500-normal.ttf';
import sans600 from '../../../src/cli/fonts/inter-latin-600-normal.ttf';
import serif600 from '../../../src/cli/fonts/source-serif-4-latin-600-normal.ttf';
import mono500 from '../../../src/cli/fonts/jetbrains-mono-latin-500-normal.ttf';

export type Format = 'svg' | 'png';

/** The format when a call names none: PNG, which an agent can look at. REST and MCP share it. */
export const DEFAULT_FORMAT: Format = 'png';

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
export function drawSvg(source: string, opts: DrawOptions) {
  return span('render.svg', { source_bytes: byteSize(source), scheme: opts.scheme }, async s => {
    const result = await renderSvg(source, {
      colorScheme: opts.scheme,
      links: webLinks(source),
      limits: { maxSourceBytes: MAX_SOURCE_BYTES },
    });
    if (!result.ok) {
      const d = result.diagnostics.find(x => x.severity === 'error') ?? result.diagnostics[0];
      const loc = d?.location;
      const at = loc?.line ? `line ${loc.line}${loc.column ? `, column ${loc.column}` : ''}: ` : '';
      // The line itself, so a reader of the error image sees what to fix without the source.
      const text = loc?.line ? source.split('\n')[loc.line - 1]?.trim() : '';
      const quoted = text ? `\n> ${text.slice(0, 200)}` : '';
      throw new DiagramError(
        at + (d?.message ?? 'The diagram did not render.') + quoted,
        d?.code ?? 'unknown',
      );
    }
    s.setAttribute('svg_bytes', byteSize(result.value.svg));
    return result.value.svg;
  });
}

let ready: Promise<unknown> | undefined;
const engine = {
  Resvg,
  fonts: { fontBuffers: [sans500, sans600, serif600, mono500].map(b => new Uint8Array(b)) },
};

function checkPixels(svg: string, scale: number) {
  const { w, h } = svgSize(svg);
  note({ pixels: Math.round(w * h * scale * scale) });
  if (w * h * scale * scale > MAX_PIXELS)
    throw new SourceError(
      `The PNG would be ${w * scale} × ${h * scale} pixels, over the ${MAX_PIXELS / 1e6} M pixel limit. Use a smaller scale or SVG.`,
    );
}

/** `svg` as a PNG at `scale`, with `source` in it when given; refused above MAX_PIXELS. */
async function png(svg: string, scale: number, source?: string) {
  // Check the size before the strip too: building the strip for a huge drawing costs memory.
  await span('png.pixels', { scale }, () => checkPixels(svg, scale));
  const step: Step = (name, fn) =>
    span(`png.${name}`, name === 'rasterize' ? { scale, cold: !ready } : { scale }, async s => {
      if (name === 'rasterize') await (ready ??= initWasm(wasm));
      const out = await fn();
      if (out instanceof Uint8Array) s.setAttribute('png_bytes', out.length);
      // The strip makes the drawing taller: check again before resvg allocates the image.
      else if (typeof out === 'string') checkPixels(out, scale);
      return out;
    });
  return drawPng(engine, svg, { scale, source, step });
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
  return png(svg, opts.scale, formatSource(draft));
}

/**
 * The largest scale (4 down to 1) whose PNG of `svg` fits MAX_PIXELS, measured the way `draw()`
 * measures it: before and after the source strip. 0 when no scale fits.
 */
export async function maxPngScale(svg: string, draft: string) {
  const kept = formatSource(draft);
  for (const scale of [4, 3, 2, 1]) {
    const { w, h } = svgSize(svg);
    if (w * h * scale * scale > MAX_PIXELS) continue;
    const full = svgSize(await withSourceStrip(svg, kept, scale));
    if (full.w * full.h * scale * scale <= MAX_PIXELS) return scale;
  }
  return 0;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A small SVG that shows the error, so an image tag shows why instead of a broken icon. */
export function errorSvg(message: string) {
  const lines = message.split('\n').flatMap(p => p.match(/.{1,70}(\s|$)|.{70}/g) ?? [p]);
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
  return format === 'svg' ? svg : png(svg, 2);
}
