import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examples = resolve(root, 'integration-examples');
const docsPath = resolve(root, 'site/docs/pages/documentation-sites.md');
const nodeVersion = process.versions.node.split('.').map(Number);
if (nodeVersion[0] < 22 || (nodeVersion[0] === 22 && nodeVersion[1] < 22)) {
  throw new Error(
    `Host proof needs Node >=22.22.0 for Astro; current Node is ${process.versions.node}.`,
  );
}

const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  CI: 'true',
  PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
};
const runRoot = await mkdtemp(join(tmpdir(), 'draftably-host-proof-'));
const archives = join(runRoot, 'archives');
await cp(examples, join(runRoot, 'integration-examples'), { recursive: true });
await mkdir(archives, { recursive: true });

function run(command: string, args: string[], cwd = root): Promise<void> {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  return new Promise((done, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) done();
      else reject(new Error(`${command} failed (${signal ?? code})`));
    });
  });
}

async function capture(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'inherit'] });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) done(Buffer.concat(chunks).toString('utf8'));
      else reject(new Error(`${command} failed (${signal ?? code})`));
    });
  });
}

async function pack(packageDir: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'));
  const tarballName = `${manifest.name.replace(/^@/, '').replaceAll('/', '-')}-${manifest.version}.tgz`;
  await run('pnpm', ['--dir', packageDir, 'pack', '--pack-destination', archives]);
  const path = join(archives, tarballName);
  await readFile(path);
  return path;
}

async function prepareConsumer(
  name: string,
  runtimeTarball: string,
  markdownTarball: string,
): Promise<string> {
  const consumer = resolve(runRoot, 'integration-examples', name);
  const manifestPath = join(consumer, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.dependencies['@draftably/runtime'] = `file:${runtimeTarball}`;
  manifest.dependencies['@draftably/markdown'] = `file:${markdownTarball}`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    join(consumer, 'pnpm-workspace.yaml'),
    [
      'packages:',
      '  - .',
      'overrides:',
      `  '@draftably/runtime': 'file:${runtimeTarball}'`,
      'allowBuilds:',
      '  core-js: true',
      '  esbuild: true',
      '  "@swc/core": true',
      '',
    ].join('\n'),
  );
  await run('pnpm', ['install'], consumer);
  return consumer;
}

async function copyDocumentedSnippets(consumer: string, section: string): Promise<void> {
  const markdown = await readFile(docsPath, 'utf8');
  const start = markdown.indexOf(`## ${section}\n`);
  if (start < 0) throw new Error(`Documentation section not found: ${section}`);
  const nextSection = markdown.indexOf('\n## ', start + 1);
  const content = markdown.slice(start, nextSection < 0 ? undefined : nextSection);
  const fences = content.matchAll(/```(?:js|mjs|javascript)\n([\s\S]*?)```/g);
  let copied = 0;
  for (const match of fences) {
    const file = match[1].match(/^\/\/ ([\w./-]+)\n/);
    if (!file) continue;
    const destination = resolve(consumer, file[1]);
    const relativePath = relative(consumer, destination);
    if (relativePath.startsWith(`..${sep}`) || relativePath === '..')
      throw new Error(`Documentation snippet escapes consumer: ${file[1]}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, match[1]);
    copied++;
  }
  if (copied === 0) throw new Error(`No named code snippets found in ${section}`);
  console.log(`${section}: copied ${copied} documented file(s) into the consumer`);
}

const hosts = [
  {
    name: 'astro-starlight',
    include: 'src/content/docs/request.draft',
    output: 'dist',
    html: 'dist/index.html',
    build: ['build'],
  },
  {
    name: 'docusaurus',
    include: 'docs/request.draft',
    output: 'build',
    html: 'build/index.html',
    build: ['build'],
  },
  {
    name: 'vitepress',
    include: 'docs/request.draft',
    output: '.vitepress/dist',
    html: '.vitepress/dist/index.html',
    build: ['build'],
  },
] as const;
const requestedHost = process.argv[2];
if (requestedHost && !hosts.some(host => host.name === requestedHost))
  throw new Error(
    `Unknown host ${requestedHost}; choose ${hosts.map(host => host.name).join(', ')}.`,
  );
const selectedHosts = requestedHost ? hosts.filter(host => host.name === requestedHost) : hosts;

await run('pnpm', ['runtime:build']);
await run('pnpm', ['markdown:build']);
const runtimeTarball = await pack(resolve(root, 'packages/runtime'));
const markdownTarball = await pack(resolve(root, 'packages/markdown'));
const report: Record<string, unknown> = {
  node: process.versions.node,
  pnpm: (await capture('pnpm', ['--version'], root)).trim(),
  runtimeTarball,
  markdownTarball,
  consumers: {},
};

for (const host of selectedHosts) {
  const consumer = await prepareConsumer(host.name, runtimeTarball, markdownTarball);
  const section =
    host.name === 'astro-starlight'
      ? 'Astro and Starlight'
      : host.name === 'docusaurus'
        ? 'Docusaurus'
        : 'VitePress';
  await copyDocumentedSnippets(consumer, section);
  const installed = JSON.parse(await capture('pnpm', ['list', '--depth=0', '--json'], consumer));
  const packageVersions = installed[0]?.dependencies ?? {};
  console.log(
    `\n${host.name} installed versions: ${Object.entries(packageVersions)
      .map(([name, value]) => `${name}@${(value as { version: string }).version}`)
      .join(', ')}`,
  );

  const sourcePath = join(consumer, host.include);
  const before = await readFile(sourcePath, 'utf8');
  const sourceFence = 'node db "Database"';
  if (before.split(sourceFence).length !== 2)
    throw new Error(`${host.name}: expected one fixture node label`);

  const snapshots: string[] = [];
  for (let buildIndex = 0; buildIndex < 2; buildIndex++) {
    if (buildIndex === 1) {
      await writeFile(sourcePath, before.replace(sourceFence, 'node db "Updated database"'));
    }
    await rm(join(consumer, host.output), { recursive: true, force: true });
    await run('pnpm', host.build, consumer);
    const html = await readFile(join(consumer, host.html), 'utf8');
    const match = html.match(/src=["']([^"']*draft-[0-9a-f]{64}\.svg)["']/);
    if (!match) throw new Error(`${host.name}: built HTML has no emitted Draftably SVG`);
    const url = match[1];
    if (!url.startsWith('/manual/'))
      throw new Error(`${host.name}: expected /manual/ URL, found ${url}`);
    const outputPath = join(consumer, host.output);
    const assetPath = resolve(outputPath, url.slice('/manual/'.length));
    const fromOutput = relative(outputPath, assetPath);
    if (fromOutput.startsWith(`..${sep}`) || fromOutput === '..')
      throw new Error(`${host.name}: asset escaped build output`);
    const asset = await readFile(assetPath, 'utf8');
    if (!asset.startsWith('<svg')) throw new Error(`${host.name}: referenced asset is not SVG`);
    snapshots.push(url);
    console.log(`${host.name} build ${buildIndex + 1}: ${url} exists`);
  }
  if (snapshots[0] === snapshots[1])
    throw new Error(`${host.name}: include edit did not change the asset hash`);
  (report.consumers as Record<string, unknown>)[host.name] = {
    versions: Object.fromEntries(
      Object.entries(packageVersions).map(([name, value]) => [
        name,
        (value as { version: string }).version,
      ]),
    ),
    assetUrls: snapshots,
  };
}

const reportPath = join(runRoot, 'report.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nHost package proof passed. Consumer copies and report: ${runRoot}`);
