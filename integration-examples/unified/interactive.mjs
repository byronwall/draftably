import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkDraft from '@draftably/markdown/remark';

const root = resolve('content');
const out = resolve('out');
const directory = resolve(out, 'docs/diagrams');
await mkdir(directory, { recursive: true });
await copyFile(resolve('favicon.svg'), resolve(out, 'favicon.svg'));
const emitAsset = async ({ fileName, bytes }) => {
  await writeFile(resolve(directory, fileName), bytes);
  return { url: `/docs/diagrams/${fileName}` };
};
const emitInit = async value => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const fileName = `draft-${createHash('sha256').update(bytes).digest('hex')}.json`;
  await writeFile(resolve(directory, fileName), bytes);
  return { fileName, url: `/docs/diagrams/${fileName}` };
};
const source = await readFile(resolve(root, 'interactive.md'), 'utf8');
const file = await unified()
  .use(remarkParse)
  .use(remarkDraft, {
    emitAsset,
    interactive: { clientModuleUrl: '/assets/draftably-client.js', policyId: 'docs', emitInit },
  })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process({ path: resolve(root, 'interactive.md'), value: source });
const html = String(file);
const result = file.data.draftably;
if (
  !html.includes('data-draftably-init="/docs/diagrams/draft-') ||
  html.includes('PRIVATE_SOURCE_SENTINEL')
) {
  throw new Error('Interactive output must use an init asset and keep source out of HTML.');
}
if (result.assets.length !== 4 || result.clientModules[0] !== '/assets/draftably-client.js') {
  throw new Error('Interactive output did not report its SVG, JSON, and client module.');
}
const jsonAsset = result.assets.find(asset => asset.fileName.endsWith('.json'));
if (!jsonAsset) throw new Error('Interactive JSON asset was not emitted.');
const saved = await readFile(resolve(directory, jsonAsset.fileName), 'utf8');
if (!saved.includes('PRIVATE_SOURCE_SENTINEL'))
  throw new Error('Interactive JSON asset does not contain the selected source.');
const secondCheckout = await unified()
  .use(remarkParse)
  .use(remarkDraft, {
    emitAsset,
    interactive: { clientModuleUrl: '/assets/draftably-client.js', policyId: 'docs', emitInit },
  })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process({ path: '/tmp/another-checkout/content/interactive.md', value: source });
const firstKey = html.match(/data-draftably-key="([^"]+)"/)?.[1];
const secondKey = String(secondCheckout).match(/data-draftably-key="([^"]+)"/)?.[1];
if (!firstKey || secondKey !== firstKey)
  throw new Error('Interactive identity changed across checkouts.');
await writeFile(
  resolve('interactive.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.svg"><title>Interactive diagrams</title><style>body{font:16px system-ui,sans-serif;margin:0 auto;max-width:760px;padding:24px}main{min-width:0}figure{margin:20px 0}figure img{display:block;max-width:100%;height:auto}figure img[hidden]{display:none}.draftably-viewer-region{max-width:100%;overflow-x:auto}.draftably-viewer-region:not(:empty){height:26rem}nav button{margin:0 8px 16px 0;padding:8px 12px}</style></head><body><main><h1>Interactive diagrams</h1><nav aria-label="Diagram controls"><button id="enhance" type="button">Enhance diagrams</button><button id="restore" type="button" disabled>Restore static diagrams</button></nav><div id="root">${html}</div></main><script type="module" src="/browser-entry.ts"></script></body></html>`,
);
console.log('Interactive static fallback and JSON asset emitted with a checkout-stable key.');
