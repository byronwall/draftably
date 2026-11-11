import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Vite's library build writes a worker URL as `new URL("assets/x.js", import.meta.url)`. A host
 * bundler reads a specifier without `./` as a module path first, so an `assets` alias (Nuxt has
 * one) sends it to the host's own folder, and the worker is never emitted. Prefix `./`. Throws
 * when nothing matches, so a change in Vite's output fails the build instead of passing silently.
 */
export function relativeWorkerUrls(dir: string): void {
  let count = 0;
  for (const file of readdirSync(dir, { recursive: true }) as string[]) {
    if (!file.endsWith('.js')) continue;
    const full = path.join(dir, file);
    const text = readFileSync(full, 'utf8');
    const next = text.replace(/new URL\((["'])assets\//g, (_, quote) => {
      count++;
      return `new URL(${quote}./assets/`;
    });
    if (next !== text) writeFileSync(full, next);
  }
  if (!count) throw Error(`No worker URL to make relative in ${dir}`);
}
