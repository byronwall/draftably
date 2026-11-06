import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFileAssets } from '../packages/markdown/src/files.js';

const directories: string[] = [];
async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'draftably-files-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })),
  );
});

function nameFor(bytes: Uint8Array, extension: 'svg' | 'json'): string {
  const hash = createHash('sha256').update(bytes).digest('hex');
  return `draft-${hash}.${extension}`;
}

describe('createFileAssets', () => {
  it('normalizes URL prefixes, recreates warm assets, and copies them to build output', async () => {
    const root = await temporaryDirectory();
    const assets = createFileAssets({
      directory: join(root, 'assets'),
      publicPath: '/manual/diagrams/',
    });
    const bytes = new TextEncoder().encode('<svg/>');
    const fileName = nameFor(bytes, 'svg');

    await expect(
      assets.emitAsset(
        { fileName, mediaType: 'image/svg+xml', bytes },
        { document: {}, fenceIndex: 0 },
      ),
    ).resolves.toEqual({ url: `/manual/diagrams/${fileName}` });
    await rm(join(assets.directory, fileName));
    await assets.emitAsset(
      { fileName, mediaType: 'image/svg+xml', bytes },
      { document: {}, fenceIndex: 0 },
    );
    await assets.copyTo(join(root, 'published', 'diagrams'));
    await expect(
      readFile(join(root, 'published', 'diagrams', fileName)).then(value => new Uint8Array(value)),
    ).resolves.toEqual(bytes);

    const remote = createFileAssets({
      directory: join(root, 'remote'),
      publicPath: 'https://cdn.test/docs/',
    });
    await expect(
      remote.emitAsset(
        { fileName, mediaType: 'image/svg+xml', bytes },
        { document: {}, fenceIndex: 0 },
      ),
    ).resolves.toEqual({ url: `https://cdn.test/docs/${fileName}` });
  });

  it('rejects unsafe public paths, names, and existing content collisions', async () => {
    const root = await temporaryDirectory();
    for (const publicPath of [
      '',
      ' /docs',
      '/docs assets',
      '//cdn.test/docs',
      '/docs?mode=1',
      '/docs#asset',
      '/docs\\assets',
      '/docs\n',
    ]) {
      expect(() => createFileAssets({ directory: root, publicPath })).toThrow();
    }
    const assets = createFileAssets({ directory: root, publicPath: '/docs' });
    const bytes = new TextEncoder().encode('<svg/>');
    const fileName = nameFor(bytes, 'svg');
    await writeFile(join(root, fileName), '<svg>different</svg>');
    await expect(
      assets.emitAsset(
        { fileName, mediaType: 'image/svg+xml', bytes },
        { document: {}, fenceIndex: 0 },
      ),
    ).rejects.toThrow(`Asset collision: ${fileName}`);
    await expect(
      assets.emitAsset(
        { fileName: `draft-${'0'.repeat(64)}.svg`, mediaType: 'image/svg+xml', bytes },
        { document: {}, fenceIndex: 0 },
      ),
    ).rejects.toThrow('Invalid content-addressed asset name');
  });

  it('hashes and copies interactive JSON assets', async () => {
    const root = await temporaryDirectory();
    const assets = createFileAssets({ directory: join(root, 'assets'), publicPath: '/docs' });
    const init = {
      version: 1 as const,
      key: 'draft-0123456789abcdef01234567',
      source: 'diagram "API" version=1',
      state: null,
      label: 'API',
      policyId: 'docs',
    };
    const bytes = new TextEncoder().encode(JSON.stringify(init));
    const expected = nameFor(bytes, 'json');
    await expect(assets.emitInit(init)).resolves.toEqual({
      fileName: expected,
      url: `/docs/${expected}`,
    });
    await assets.copyTo(join(root, 'published'));
    await expect(
      readFile(join(root, 'published', expected)).then(value => new Uint8Array(value)),
    ).resolves.toEqual(bytes);
  });
});
