import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export function createDraftAssets({ root }) {
  const assetsDir = resolve(root, 'generated-docs/public/_draftably');
  const urlPrefix = '/_draftably/';
  const writing = new Map();

  async function emitAsset({ fileName, bytes, mediaType }) {
    if (!/^draft-[0-9a-f]{64}\.svg$/.test(fileName) || mediaType !== 'image/svg+xml') {
      throw new TypeError('Expected a content-addressed Draftably SVG');
    }
    let write = writing.get(fileName);
    if (!write) {
      write = mkdir(assetsDir, { recursive: true }).then(() =>
        writeFile(join(assetsDir, fileName), bytes, { flag: 'wx' }).catch(async error => {
          if (error.code !== 'EEXIST') throw error;
          const current = await readFile(join(assetsDir, fileName));
          if (!current.equals(bytes)) throw new Error(`Asset collision: ${fileName}`);
        }),
      );
      writing.set(fileName, write);
    }
    try {
      await write;
    } finally {
      if (writing.get(fileName) === write) writing.delete(fileName);
    }
    return { url: `${urlPrefix}${fileName}` };
  }

  return { emitAsset };
}
