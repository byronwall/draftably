/**
 * The parts of PNG output that need no Node APIs, shared by the CLI (`src/cli/png.ts`, resvg-js)
 * and the render service (`packages/service`, resvg-wasm), so both draw the same pixels.
 */
import { FACES, type FaceId } from './fonts';

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
