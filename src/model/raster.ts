/**
 * SVG to PNG for the CLI (`src/cli/png.ts`, resvg-js) and the render service
 * (`packages/service`, resvg-wasm). Both call `drawPng` with their own resvg build and font
 * loading, so the strip, scale, font renaming and resvg options can't drift between them.
 */
import { embedPngSource } from './embed';
import { FACES, type FaceId } from './fonts';
import { withSourceStrip } from './strip';

/** The family each face's TrueType file registers under in resvg: its typographic family name. */
export const REGISTERED: Record<FaceId, string> = {
  'sans-500': 'Inter',
  'sans-600': 'Inter',
  'serif-600': 'Source Serif 4',
  'mono-500': 'JetBrains Mono',
};

/**
 * `svg` with each hashed diagram family renamed to the family resvg registers for its face. resvg
 * tries only the first family in a `font-family` list and then draws in its default, so the
 * hashed name, which no file carries, would turn every face into Inter.
 */
export function rasterFamilies(svg: string) {
  for (const id of Object.keys(FACES) as FaceId[])
    svg = svg.replaceAll(FACES[id].family, REGISTERED[id]);
  return svg;
}

/** The width and height an SVG declares on its root, rounded up. */
export function svgSize(svg: string) {
  const size = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg);
  if (!size) throw Error('The SVG has no size.');
  return { w: Math.ceil(Number(size[1])), h: Math.ceil(Number(size[2])) };
}

/** `svg` at `scale` times its size, through the root size as Chrome's device scale did: the
 * drawing keeps its viewBox. */
export function scaleSvg(svg: string, scale: number) {
  const { w, h } = svgSize(svg);
  return svg.replace(
    /width="[\d.]+" height="[\d.]+"/,
    `width="${w * scale}" height="${h * scale}"`,
  );
}

/** The resvg options both builds take; each loads the same TrueType fonts its own way. */
interface ResvgOptions {
  font: {
    fontFiles?: string[];
    fontBuffers?: Uint8Array[];
    loadSystemFonts: false;
    defaultFontFamily: string;
  };
}

/**
 * A resvg build (resvg-js in Node, resvg-wasm in the Worker) and its bundled fonts: TrueType files
 * for resvg-js, which has no font buffers, and the same files' bytes for resvg-wasm.
 */
export interface Engine<R> {
  Resvg: new (svg: string, options: ResvgOptions) => R;
  fonts: { fontFiles: string[] } | { fontBuffers: Uint8Array[] };
}

interface Drawable {
  render(): { asPng(): Uint8Array; free?(): void };
  free?(): void;
}

/** `svg` loaded in resvg with only the bundled fonts, each diagram family renamed so resvg finds it. */
export function loadSvg<R>(engine: Engine<R>, svg: string) {
  return new engine.Resvg(rasterFamilies(svg), {
    font: { ...engine.fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  });
}

/** One step of `drawPng`, so the service can time each in its own span. */
export type Step = <T>(
  name: 'strip' | 'rasterize' | 'embed',
  fn: () => T | Promise<T>,
) => Promise<T>;

/**
 * `svg` as a PNG at `scale` times its size. With `source`, the PNG carries it in a metadata chunk
 * and, unless `strip` is false, in a faint pixel strip below the drawing.
 */
export async function drawPng<R extends Drawable>(
  engine: Engine<R>,
  svg: string,
  opts: { scale: number; source?: string; strip?: boolean; step?: Step },
) {
  const { scale, source } = opts,
    step: Step = opts.step ?? (async (_name, fn) => fn());
  if (source !== undefined && opts.strip !== false)
    svg = await step('strip', () => withSourceStrip(svg, source, scale));
  const png = await step('rasterize', () => {
    const r = loadSvg(engine, scaleSvg(svg, scale));
    try {
      const img = r.render();
      try {
        return img.asPng();
      } finally {
        img.free?.();
      }
    } finally {
      r.free?.();
    }
  });
  return source === undefined ? png : step('embed', () => embedPngSource(png, source));
}
