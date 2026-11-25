/**
 * Icon sets installed in a project: each `node_modules/@iconify-json/<prefix>` package found from
 * a folder up to the root. The CLI and the local viewer server read sets from here only.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { IconSet } from '../model/iconify';

/** Each `node_modules/@iconify-json` folder from `dir` up to the root. */
function scopes(dir: string) {
  const out: string[] = [];
  for (let at = path.resolve(dir); ; at = path.dirname(at)) {
    const scope = path.join(at, 'node_modules/@iconify-json');
    if (fs.existsSync(scope)) out.push(scope);
    if (path.dirname(at) === at) return out;
  }
}

/** The file of an installed set, or undefined. */
export function installedIconFile(prefix: string, dir: string) {
  if (!/^[a-z0-9-]+$/.test(prefix)) return;
  for (const scope of scopes(dir)) {
    const file = path.join(scope, prefix, 'icons.json');
    if (fs.existsSync(file)) return file;
  }
}

export function installedIconSet(prefix: string, dir: string): IconSet | undefined {
  const file = installedIconFile(prefix, dir);
  return file ? (JSON.parse(fs.readFileSync(file, 'utf8')) as IconSet) : undefined;
}

/** Prefixes of every installed set. */
export const installedIconPrefixes = (dir: string) => [
  ...new Set(
    scopes(dir).flatMap(scope =>
      fs.readdirSync(scope).filter(p => fs.existsSync(path.join(scope, p, 'icons.json'))),
    ),
  ),
];
