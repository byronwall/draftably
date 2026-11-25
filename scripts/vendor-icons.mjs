#!/usr/bin/env node
// Copy the Lucide icon set from `@iconify-json/lucide` into `src/assets/icons/lucide.json`, in the
// short form `src/model/iconify.ts` reads. The runtime may not import from node_modules, so the
// set lives in the source tree. Run `pnpm icons:vendor` after an upgrade of the package.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'node_modules/@iconify-json/lucide');
const set = JSON.parse(fs.readFileSync(path.join(pkg, 'icons.json'), 'utf8'));
const { version } = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));
const icons = {};
for (const [name, icon] of Object.entries(set.icons))
  icons[name] = icon.width || icon.height ? { ...icon } : icon.body;
const aliases = {};
for (const [name, alias] of Object.entries(set.aliases ?? {})) aliases[name] = alias.parent;
const out = path.join(root, 'src/assets/icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, 'lucide.json'),
  JSON.stringify({
    prefix: 'lucide',
    version,
    width: set.width ?? 16,
    height: set.height ?? 16,
    icons,
    aliases,
  }),
);
console.log(
  `lucide ${version}: ${Object.keys(icons).length} icons, ${Object.keys(aliases).length} aliases`,
);
