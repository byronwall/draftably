/**
 * A one-line notice on stderr when npm has a newer draftably. The latest version is cached for a
 * day; a detached process refreshes it, so a command never waits on the network or fails on it.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cliVersion } from './skill';

const DAY = 24 * 60 * 60 * 1000;

/** `~/Library/Caches/draftably` on macOS, `$XDG_CACHE_HOME/draftably` or `~/.cache/draftably` elsewhere. */
function cacheFile() {
  const base =
    process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library/Caches')
      : process.platform === 'win32'
        ? (process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData/Local'))
        : (process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'));
  return path.join(base, 'draftably', 'update.json');
}

/** Whether version `a` is newer than `b`, comparing major.minor.patch. */
export function newer(a: string, b: string) {
  const pa = a.split(/[.-]/).map(Number),
    pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
  return false;
}

/** Print the notice from the cache, and refresh the cache in the background once a day. */
export function updateNotice() {
  if (process.env.CI || process.env.DRAFTABLY_NO_UPDATE_CHECK || !process.stdout.isTTY) return;
  const current = cliVersion();
  if (current === 'unknown') return;
  const file = cacheFile();
  let cache: { checked?: number; latest?: string } = {};
  try {
    cache = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // No cache yet.
  }
  if (cache.latest && newer(cache.latest, current))
    console.error(
      `draftably ${cache.latest} is available; this is ${current}. Update: npm i -g draftably, or run npx draftably@latest.`,
    );
  if (Date.now() - (cache.checked ?? 0) < DAY) return;
  try {
    // Mark the check first, so commands run meanwhile don't start another.
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ ...cache, checked: Date.now() }));
    const script = `fetch('https://registry.npmjs.org/draftably/latest', { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(p => p.version && require('fs').writeFileSync(${JSON.stringify(file)}, JSON.stringify({ checked: Date.now(), latest: p.version })))
      .catch(() => {});`;
    spawn(process.execPath, ['-e', script], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // A read-only cache folder only means no notice.
  }
}
