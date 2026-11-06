import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import MarkdownIt from 'markdown-it';
import remarkDraft from '@draftably/markdown/remark';
import { createMarkdownItDraft } from '@draftably/markdown/markdown-it';

const out = resolve('out/mermaid');
await mkdir(out, { recursive: true });
const emitAsset = async ({ fileName, bytes }) => {
  await writeFile(resolve(out, fileName), bytes);
  return { url: `/docs/diagrams/${fileName}` };
};
const options = { emitAsset, mermaid: 'convert' };
const markdown = await readFile(resolve('content/mermaid.md'), 'utf8');

// Flowchart and sequence become Draftably images; the pie stays a code block for Mermaid.
const check = (name, html, manifest) => {
  assert.equal(manifest.assets.length, 2, `${name}: two Draftably images`);
  assert.equal((html.match(/<img\b/g) ?? []).length, 2, `${name}: two <img> tags`);
  assert.match(html, /alt="Flowchart"/);
  assert.match(html, /alt="Sequence diagram"/);
  assert.equal(
    (html.match(/class="language-mermaid"/g) ?? []).length,
    1,
    `${name}: one fence left`,
  );
  assert.match(html, /pie title Pets adopted/);
  assert.doesNotMatch(html, /flowchart LR|sequenceDiagram/);
  for (const asset of manifest.assets) assert.match(asset.url, /^\/docs\/diagrams\/draft-.*\.svg$/);
};

const file = await unified()
  .use(remarkParse)
  .use(remarkDraft, options)
  .use(remarkRehype)
  .use(rehypeStringify)
  .process({ path: resolve('content/mermaid.md'), value: markdown });
check('remark', String(file), file.data.draftably);
await writeFile(resolve(out, 'remark.html'), String(file));

const md = new MarkdownIt();
const draft = createMarkdownItDraft(options);
md.use(draft.plugin);
const { html, manifest } = await draft.render(md, markdown);
check('markdown-it', html, manifest);
await writeFile(resolve(out, 'markdown-it.html'), html);

// Without the option, every Mermaid fence stays code.
const plain = await unified()
  .use(remarkParse)
  .use(remarkDraft, { emitAsset })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(markdown);
assert.equal((String(plain).match(/class="language-mermaid"/g) ?? []).length, 3);

const svg = await readFile(resolve(out, file.data.draftably.assets[0].fileName), 'utf8');
assert.match(svg, /^<svg/);
console.log(`PASS mermaid fences: remark and markdown-it each drew 2 images, left 1 pie fence`);
console.log(`  assets: ${file.data.draftably.assets.map(a => a.fileName).join(', ')}`);
console.log(`  HTML: ${resolve(out, 'remark.html')}`);
