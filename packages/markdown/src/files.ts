import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { DraftViewerInitV1, EmitAsset, MarkdownInteractiveBridge } from './core.js';

export interface FileAssets {
  directory: string;
  emitAsset: EmitAsset;
  emitInit: MarkdownInteractiveBridge['emitInit'];
  copyTo(directory: string): Promise<void>;
}

function hash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function fileName(bytes: Uint8Array, extension: 'svg' | 'json'): string {
  return `draft-${hash(bytes)}.${extension}`;
}

function hasControl(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function normalizePublicPath(publicPath: string): string {
  if (
    typeof publicPath !== 'string' ||
    !publicPath ||
    /[\s\\?#]/.test(publicPath) ||
    hasControl(publicPath)
  )
    throw new TypeError(
      'publicPath must be a URL path without query, hash, backslash, or controls.',
    );

  let prefix: string;
  if (publicPath.startsWith('/')) {
    if (publicPath.startsWith('//'))
      throw new TypeError('publicPath must not be protocol-relative.');
    prefix = publicPath;
  } else {
    let url: URL;
    try {
      url = new URL(publicPath);
    } catch {
      throw new TypeError('publicPath must be root-relative or an absolute HTTP(S) URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new TypeError('publicPath must be root-relative or an absolute HTTP(S) URL.');
    prefix = `${url.origin}${url.pathname}`;
  }
  return prefix.replace(/\/+$/, '');
}

async function writeAtomic(directory: string, name: string, bytes: Uint8Array): Promise<void> {
  await mkdir(directory, { recursive: true });
  const target = join(directory, name);
  const temporary = join(directory, `.${name}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    try {
      await link(temporary, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await readFile(target);
      if (!existing.equals(bytes)) throw new Error(`Asset collision: ${name}`, { cause: error });
    }
  } finally {
    await rm(temporary, { force: true });
  }
}

function expectedName(name: string, bytes: Uint8Array): boolean {
  const extension = name.endsWith('.svg') ? 'svg' : name.endsWith('.json') ? 'json' : undefined;
  return !!extension && name === fileName(bytes, extension);
}

/** Create a content-addressed Node file store for generated SVG and viewer JSON assets. */
export function createFileAssets(options: { directory: string; publicPath: string }): FileAssets {
  if (!options || typeof options.directory !== 'string' || !options.directory)
    throw new TypeError('directory must be a non-empty path.');
  const directory = resolve(options.directory);
  const publicPrefix = normalizePublicPath(options.publicPath);
  const writing = new Map<string, Promise<void>>();

  async function store(name: string, bytes: Uint8Array): Promise<void> {
    if (!expectedName(name, bytes))
      throw new TypeError(`Invalid content-addressed asset name: ${name}`);
    let pending = writing.get(name);
    if (!pending) {
      pending = writeAtomic(directory, name, bytes);
      writing.set(name, pending);
    }
    try {
      await pending;
    } finally {
      if (writing.get(name) === pending) writing.delete(name);
    }
  }

  const assetUrl = (name: string) => `${publicPrefix}/${name}`;
  const emitAsset: EmitAsset = async asset => {
    if (asset.mediaType !== 'image/svg+xml' || !asset.fileName.endsWith('.svg'))
      throw new TypeError('Expected a content-addressed Draftably SVG.');
    await store(asset.fileName, asset.bytes);
    return { url: assetUrl(asset.fileName) };
  };
  const emitInit: MarkdownInteractiveBridge['emitInit'] = async (data: DraftViewerInitV1) => {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const name = fileName(bytes, 'json');
    await store(name, bytes);
    return { fileName: name, url: assetUrl(name) };
  };

  async function copyTo(destination: string): Promise<void> {
    const target = resolve(destination);
    await mkdir(target, { recursive: true });
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    for (const name of names) {
      if (!/^draft-[0-9a-f]{64}\.(?:svg|json)$/.test(name)) continue;
      const bytes = await readFile(join(directory, name));
      if (!expectedName(name, bytes)) throw new Error(`Asset content hash mismatch: ${name}`);
      await writeAtomic(target, name, bytes);
    }
  }

  return { directory, emitAsset, emitInit, copyTo };
}
