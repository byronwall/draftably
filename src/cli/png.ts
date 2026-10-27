/**
 * PNG output for the command line, rasterized by an installed Chrome or Chromium in headless
 * mode, so the CLI keeps no runtime dependencies and draws the embedded fonts exactly.
 */
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { embedPngSource } from '../model/embed';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const ON_PATH = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

function findChrome(): string {
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
  throw Error('PNG output needs Chrome or Chromium. Install one, or set CHROME_PATH to it.');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-png-'));
  try {
    const page = path.join(dir, 'page.html');
    fs.writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style>${svg}`,
    );
    const shot = path.join(dir, 'shot.png');
    // Asynchronous, so several drawings can rasterize at once.
    await promisify(execFile)(
      findChrome(),
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        `--user-data-dir=${path.join(dir, 'profile')}`,
        `--force-device-scale-factor=${scale}`,
        `--window-size=${w},${h}`,
        `--screenshot=${shot}`,
        pathToFileURL(page).href,
      ],
      { timeout: 60_000 },
    );
    const png = fs.readFileSync(shot);
    fs.writeFileSync(
      path.resolve(out),
      source === undefined ? png : await embedPngSource(png, source),
    );
    return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
