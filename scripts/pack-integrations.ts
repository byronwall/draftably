import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'tmp/integration-packages');
mkdirSync(output, { recursive: true });
for (const script of ['runtime:build', 'markdown:build'])
  execFileSync('pnpm', [script], { cwd: root, stdio: 'inherit' });

function pack(name: string): string {
  const result = JSON.parse(
    execFileSync(
      'pnpm',
      ['--dir', path.join(root, 'packages', name), 'pack', '--json', '--pack-destination', output],
      { cwd: root, encoding: 'utf8' },
    ),
  );
  if (typeof result.filename !== 'string') throw new Error(`No archive returned for ${name}.`);
  return result.filename;
}

const runtime = pack('runtime');
const markdown = pack('markdown');
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const instructions = `# Try these package archives

Run these commands in the project that will use Draftably.

## Runtime or diagram element

\`\`\`sh
pnpm add ${quote(runtime)}
\`\`\`

## Markdown

During this local preview, add this entry to your project's pnpm-workspace.yaml.
Keep any existing entries. It makes Markdown use this exact runtime archive.

\`\`\`yaml
overrides:
  '@draftably/runtime': ${JSON.stringify(`file:${runtime}`)}
\`\`\`

\`\`\`sh
pnpm add ${quote(markdown)} ${quote(runtime)}
\`\`\`

Start with docs/integrations/README.md in the Draftably repository.
These archives are local previews. This command does not publish them.
`;
writeFileSync(path.join(output, 'INSTALL.md'), instructions);
writeFileSync(
  path.join(output, 'archives.json'),
  JSON.stringify({ runtime, markdown }, null, 2) + '\n',
);
console.log(
  `\nRuntime: ${runtime}\nMarkdown: ${markdown}\nInstall commands: ${path.join(output, 'INSTALL.md')}`,
);
