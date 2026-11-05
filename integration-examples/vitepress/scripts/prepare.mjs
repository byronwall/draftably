import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkDraft from '@draftably/markdown/remark';
import { createFileAssets } from '@draftably/markdown/files';

const root = fileURLToPath(new URL('../', import.meta.url));
const docs = resolve(root, 'docs');
const generated = resolve(root, 'generated-docs');
const assets = createFileAssets({
  directory: resolve(generated, 'public/_draftably'),
  publicPath: '/_draftably',
});
export const dependencies = new Map();

export async function prepare() {
  dependencies.clear();
  const path = resolve(docs, 'index.md');
  const processor = unified()
    .use(remarkParse)
    .use(remarkDraft, {
      emitAsset: assets.emitAsset,
      sources: {
        rootDir: docs,
        onDependency({ dependencyPath, watchPath }) {
          dependencies.set(dependencyPath, watchPath);
        },
      },
    })
    .use(remarkStringify);
  const result = await processor.process({ path, value: await readFile(path, 'utf8') });
  await mkdir(resolve(generated, 'public'), { recursive: true });
  await copyFile(resolve(root, 'public/favicon.svg'), resolve(generated, 'public/favicon.svg'));
  await writeFile(resolve(generated, 'index.md'), String(result));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await prepare();
