/**
 * Icon sets beyond Lucide for the CLI: any `@iconify-json/<prefix>` package installed in the
 * project (`pnpm add -D @iconify-json/logos`), found from the working folder up. Nothing is fetched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { searchIcons, setIconSource, loadAllIconSets, type IconSet } from '../model/iconify';

/** Each `node_modules/@iconify-json` folder from `cwd` up to the root. */
function scopes(cwd: string) {
  const out: string[] = [];
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    const scope = path.join(dir, 'node_modules/@iconify-json');
    if (fs.existsSync(scope)) out.push(scope);
    if (path.dirname(dir) === dir) return out;
  }
}

/** Read installed sets from `cwd` and its parents. */
export function useInstalledIconSets(cwd = process.cwd()) {
  setIconSource({
    load(prefix) {
      if (!/^[a-z0-9-]+$/.test(prefix)) return;
      for (const scope of scopes(cwd)) {
        const file = path.join(scope, prefix, 'icons.json');
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as IconSet;
      }
    },
    list: () => [
      ...new Set(
        scopes(cwd).flatMap(scope =>
          fs.readdirSync(scope).filter(p => fs.existsSync(path.join(scope, p, 'icons.json'))),
        ),
      ),
    ],
  });
}

/** `draftably icons <word>`: matching names from every installed set, one per line. */
export async function printIcons(word: string, limit: number) {
  await loadAllIconSets();
  const names = searchIcons(word, limit);
  if (!names.length) {
    console.log(`No icon matches "${word}". Lucide names are listed at https://lucide.dev/icons.`);
    return 1;
  }
  console.log(names.join('\n'));
  return 0;
}
