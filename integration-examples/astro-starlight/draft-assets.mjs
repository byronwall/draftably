import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';

export function createDraftAssets({ root, base, urlPath }) {
  const publicDir = resolve(root, '.cache/draftably/public');
  const assetsDir = join(publicDir, urlPath);
  const urlPrefix = `${base.replace(/\/$/, '')}/${urlPath}/`;
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

  async function publish(outDir) {
    await mkdir(join(outDir, urlPath), { recursive: true });
    for (const file of await readdir(assetsDir).catch(() => [])) {
      if (/^draft-[0-9a-f]{64}\.svg$/.test(file))
        await copyFile(join(assetsDir, file), join(outDir, urlPath, file));
    }
  }

  function devMiddleware() {
    const prefix = `/${urlPath}/`;
    return (req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (!path.startsWith(prefix)) return next();
      const file = path.slice(prefix.length);
      if (!/^draft-[0-9a-f]{64}\.svg$/.test(file)) return next();
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      createReadStream(join(assetsDir, file)).on('error', next).pipe(res);
    };
  }

  return { emitAsset, publish, devMiddleware };
}
