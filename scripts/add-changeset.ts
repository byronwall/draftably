import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import * as prettier from 'prettier';

const args = process.argv.slice(2);
const names: string[] = [];
for (let i = args.length - 1; i >= 0; i--) {
  if (args[i] !== '--package') continue;
  const name = args[i + 1];
  if (!name) throw Error('--package needs a package name.');
  names.unshift(name);
  args.splice(i, 2);
}
const [bump, ...words] = args;
const summary = words.join(' ').trim();
if (!['patch', 'minor', 'major'].includes(bump) || !summary) {
  console.error('Usage: pnpm changeset:add <patch|minor|major> "Release note" [--package <name>]');
  process.exit(1);
}

if (!names.length) names.push('draftably');
const published = readdirSync('packages')
  .map(dir => JSON.parse(readFileSync(`packages/${dir}/package.json`, 'utf8')))
  .filter(pkg => !pkg.private);
for (const name of names)
  if (!published.some(pkg => pkg.name === name)) throw Error(`Unknown public package: ${name}`);
const path = `.changeset/${randomUUID()}.md`;
// Formatted with the repo's Prettier settings, so `format:check` passes on the new file.
const text = `---\n${[...new Set(names)].map(name => `${JSON.stringify(name)}: ${bump}`).join('\n')}\n---\n\n${summary}\n`;
const options = await prettier.resolveConfig(path);
writeFileSync(path, await prettier.format(text, { ...options, filepath: path }));
console.log(`Wrote ${path}`);
