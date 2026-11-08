/**
 * PNG output for the command line, rasterized in-process by resvg with the bundled fonts.
 */
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { embedPngSource } from '../model/embed';
import { fontFiles } from './raster-fonts';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const ON_PATH = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

export function findChrome(): string {
  const env = process.env.CHROME_PATH;
  if (env) return env;
  const found = CANDIDATES.find(p => fs.existsSync(p));
  if (found) return found;
  for (const name of ON_PATH)
    try {
      return execFileSync('which', [name], { encoding: 'utf8' }).trim();
    } catch {
      // Not installed under this name.
    }
  throw Error('PDF output needs Chrome or Chromium. Install one, or set CHROME_PATH to it.');
}

/** The width and height an SVG declares on its root, rounded up. */
export function svgSize(svg: string) {
  const size = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg);
  if (!size) throw Error('The SVG has no size.');
  return { w: Math.ceil(Number(size[1])), h: Math.ceil(Number(size[2])) };
}

/**
 * Write `svg` as a PNG at `scale` times its own size, with `source` embedded when given. Returns
 * the image's size in pixels.
 */
export async function writePng(svg: string, out: string, scale = 2, source?: string) {
  const { w, h } = svgSize(svg);
  const { Resvg } = await import('@resvg/resvg-js');
  // Scale through the root size, as Chrome's device scale did: the drawing keeps its viewBox.
  const sized = svg.replace(
    /width="[\d.]+" height="[\d.]+"/,
    `width="${w * scale}" height="${h * scale}"`,
  );
  const png = new Resvg(sized, {
    font: {
      loadSystemFonts: false,
      fontFiles: Object.values(fontFiles()),
      defaultFontFamily: 'Inter',
    },
  })
    .render()
    .asPng();
  fs.writeFileSync(
    path.resolve(out),
    source === undefined ? png : await embedPngSource(png, source),
  );
  return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
}

/**
 * Put the drawing on the macOS clipboard as a PNG at `scale` (with `source` in it when given) and
 * `svgText` as text, so it pastes as an image in a doc or chat and as markup in an editor. Returns
 * the PNG's size in pixels.
 */
export async function copyToClipboard(svg: string, svgText: string, scale = 2, source?: string) {
  if (process.platform !== 'darwin')
    throw Error('--clipboard works on macOS only. Use --png or --svg to write a file instead.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-copy-'));
  try {
    const png = path.join(dir, 'copy.png'),
      text = path.join(dir, 'copy.svg');
    const size = await writePng(svg, png, scale, source);
    fs.writeFileSync(text, svgText);
    const read = (file: string, type: string) =>
      `(read (POSIX file ${JSON.stringify(file)}) as «class ${type}»)`;
    await promisify(execFile)('osascript', [
      '-e',
      `set the clipboard to {«class PNGf»:${read(png, 'PNGf')}, «class utf8»:${read(text, 'utf8')}}`,
    ]);
    return size;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
