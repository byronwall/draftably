import assert from 'node:assert/strict';
import { mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from '@mdx-js/mdx';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkDraft from '@draftably/markdown/remark';
import MarkdownIt from 'markdown-it';
import { createMarkdownItDraft } from '@draftably/markdown/markdown-it';

const root = resolve('content');
const out = resolve('out');
const diagrams = resolve(out, 'diagrams');
await mkdir(diagrams, { recursive: true });
let emissions = 0;
const emitAsset = async ({ fileName, bytes }) => {
  emissions++;
  await mkdir(diagrams, { recursive: true });
  await writeFile(resolve(diagrams, fileName), bytes);
  return { url: `/docs/diagrams/${fileName}` };
};
const options = {
  emitAsset,
  sources: { rootDir: root },
  render: { includeSource: false, links: { mode: 'none' } },
};
const processor = unified()
  .use(remarkParse)
  .use(remarkDraft, options)
  .use(remarkRehype)
  .use(rehypeStringify);
const pagePath = resolve(root, 'page.md');
const markdown = await readFile(pagePath, 'utf8');
const htmlFile = await processor.process({ path: pagePath, value: markdown });
const html = String(htmlFile);
const manifest = htmlFile.data.draftably;
assert.equal(manifest.assets.length, 4, 'top-level, include, blockquote, and list fences');
assert.equal(manifest.dependencies.length, 1);
assert.match(html, /src="\/docs\/diagrams\/draft-/);
assert.match(html, /alt="Checkout request path\."/);
assert.match(html, /width="\d+"/);
assert.equal((html.match(/<img\b/g) ?? []).length, 4);
assert.match(html, /class="language-markdown"/);
await writeFile(resolve(out, 'page.html'), html);

const mdx = await compile(
  { path: pagePath, value: markdown },
  {
    remarkPlugins: [[remarkDraft, options]],
  },
);
assert.match(String(mdx), /\/docs\/diagrams\/draft-/);
await writeFile(resolve(out, 'page.mdx.js'), String(mdx));
assert.doesNotMatch(String(html), /mountViewer|runtime\/viewer/);

const warmNames = manifest.assets.map(asset => asset.fileName);
await rm(diagrams, { recursive: true, force: true });
const beforeWarm = emissions;
const warmFile = await processor.process({ path: pagePath, value: markdown });
assert.equal(emissions - beforeWarm, warmNames.length, 'emitter runs after warm render-cache hits');
for (const name of warmNames) assert.ok(await readFile(resolve(diagrams, name)));
assert.deepEqual(
  warmFile.data.draftably.assets.map(asset => asset.fileName),
  warmNames,
);
const aborted = new AbortController();
aborted.abort(new Error('stop cached render'));
const abortedProcessor = unified()
  .use(remarkParse)
  .use(remarkDraft, {
    ...options,
    render: { ...options.render, signal: aborted.signal },
  })
  .use(remarkRehype)
  .use(rehypeStringify);
await assert.rejects(abortedProcessor.process({ path: pagePath, value: markdown }), /aborted/);

const includePath = resolve(root, 'diagrams/included.draft');
const includedSource = await readFile(includePath, 'utf8');
await writeFile(includePath, includedSource.replace('Orders', 'Orders V2'));
const changedFile = await processor.process({ path: pagePath, value: markdown });
assert.notEqual(
  changedFile.data.draftably.assets[1].fileName,
  warmNames[1],
  'include bytes affect the asset hash',
);
await writeFile(includePath, 'nonsense invalid\n');
const includeFence = `# Include error\n\n\`\`\`draft {src="./diagrams/included.draft"}\n\`\`\`\n`;
let includeError;
try {
  await processor.process({ path: resolve(root, 'include-error.md'), value: includeFence });
} catch (error) {
  includeError = error;
}
assert.ok(includeError, 'invalid include must fail the build');
assert.ok(
  includeError.diagnostics?.some(
    d => d.location?.line === 1 && d.related?.some(r => r.location.line === 3),
  ),
);
await writeFile(includePath, includedSource);

const callbackDependencies = [];
const missingPath = resolve(root, 'created-later.draft');
const missingPage = resolve(root, 'missing-page.md');
const missingSource = `\`\`\`draft {src="./created-later.draft"}\n\`\`\`\n`;
const missingProcessor = unified()
  .use(remarkParse)
  .use(remarkDraft, {
    ...options,
    sources: { rootDir: root, onDependency: item => callbackDependencies.push(item) },
  })
  .use(remarkRehype)
  .use(rehypeStringify);
let missingError;
try {
  await missingProcessor.process({ path: missingPage, value: missingSource });
} catch (error) {
  missingError = error;
}
assert.ok(missingError, 'missing include must fail the build');
assert.equal(callbackDependencies[0].dependencyPath, missingPath);
assert.equal(callbackDependencies[0].missing, true);
assert.equal(callbackDependencies[0].watchPath, await realpath(root));
await writeFile(missingPath, 'diagram "Created" version=1\nnode api "API"\n');
const created = await missingProcessor.process({ path: missingPage, value: missingSource });
assert.equal(created.data.draftably.dependencies[0], missingPath);
assert.equal(callbackDependencies.at(-1).missing, false);

const badFence = `- Broken diagram\n\n  \`\`\`draft {alt="Broken"}\n  nonsense bad\n  \`\`\`\n`;
let positionedError;
try {
  await processor.process({ path: resolve(root, 'position.md'), value: badFence });
} catch (error) {
  positionedError = error;
}
assert.ok(
  positionedError?.diagnostics?.some(d => d.code === 'DRAFT_PARSE' && d.location?.line === 4),
);

const placeholderProcessor = unified()
  .use(remarkParse)
  .use(remarkDraft, {
    emitAsset,
    errors: 'placeholder',
  })
  .use(remarkRehype)
  .use(rehypeStringify);
const placeholder = await placeholderProcessor.process({
  path: resolve(root, 'placeholder.md'),
  value: ['```draft {onclick="nope"}', 'private diagram source', '```', ''].join('\n'),
});
assert.match(String(placeholder), /Diagram unavailable\./);
assert.doesNotMatch(String(placeholder), /private diagram source/);
const hostFailureProcessor = unified()
  .use(remarkParse)
  .use(remarkDraft, {
    errors: 'placeholder',
    emitAsset: async () => {
      throw new Error('host emitter failed');
    },
  })
  .use(remarkRehype)
  .use(rehypeStringify);
await assert.rejects(
  hostFailureProcessor.process({ path: pagePath, value: markdown }),
  /host emitter failed/,
);

const markdownItDraft = createMarkdownItDraft({
  emitAsset,
  sources: { rootDir: root },
});
const md = new MarkdownIt().use(markdownItDraft.plugin);
const otherPath = resolve(root, 'other.md');
const otherMarkdown = (await readFile(otherPath, 'utf8')).replaceAll('Checkout', 'Second checkout');
const docs = [
  { path: pagePath, value: markdown },
  { path: otherPath, value: otherMarkdown },
].map(({ path, value }) => {
  const env = { draftably: { documentPath: path } };
  return { env, tokens: md.parse(value, env) };
});
assert.throws(() => md.renderer.render(docs[0].tokens, md.options, docs[0].env), /before prepare/);
const preparedDocs = await Promise.all(
  docs.map(({ tokens, env }) => markdownItDraft.prepare(tokens, env)),
);
assert.ok(
  preparedDocs.every(result => result.assets.length === 4 && result.dependencies.length === 1),
);
const renderedDocs = docs.map(({ tokens, env }) => md.renderer.render(tokens, md.options, env));
assert.ok(renderedDocs.every(value => (value.match(/<img\b/g) ?? []).length === 4));
assert.notEqual(preparedDocs[0].assets[0].fileName, preparedDocs[1].assets[0].fileName);
const hostileCaption = [
  '```draft {caption="Checkout <script>alert(1)</script>"}',
  'diagram "Safe caption" version=1',
  'node api "API"',
  '```',
  '',
].join('\n');
const hostileEnv = { draftably: { documentPath: pagePath } };
const hostileTokens = md.parse(hostileCaption, hostileEnv);
await markdownItDraft.prepare(hostileTokens, hostileEnv);
const hostileHtml = md.renderer.render(hostileTokens, md.options, hostileEnv);
assert.match(hostileHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.doesNotMatch(hostileHtml, /<script>/);
const anchoredSource = [
  '```draft {id="plain-anchor"}',
  'diagram "Anchored" version=1',
  'node api "API"',
  '```',
  '',
].join('\n');
const anchoredEnv = { draftably: { documentPath: pagePath } };
const anchoredTokens = md.parse(anchoredSource, anchoredEnv);
await markdownItDraft.prepare(anchoredTokens, anchoredEnv);
assert.match(md.renderer.render(anchoredTokens, md.options, anchoredEnv), /<p id="plain-anchor">/);

const mdDependencies = [];
const mdMissingSource = ['```draft {src="./markdown-it-created-later.draft"}', '```', ''].join(
  '\n',
);
const mdMissingPage = resolve(root, 'markdown-it-missing.md');
const mdMissingEnv = { draftably: { documentPath: mdMissingPage } };
const mdMissingTokens = md.parse(mdMissingSource, mdMissingEnv);
const missingAdapter = createMarkdownItDraft({
  emitAsset,
  sources: { rootDir: root, onDependency: item => mdDependencies.push(item) },
});
await assert.rejects(missingAdapter.prepare(mdMissingTokens, mdMissingEnv), /preparation failed/);
assert.equal(mdDependencies[0].dependencyPath, resolve(root, 'markdown-it-created-later.draft'));
assert.equal(mdDependencies[0].missing, true);
await writeFile(
  resolve(root, 'markdown-it-created-later.draft'),
  'diagram "Created later" version=1\nnode api "API"\n',
);
const mdCreatedEnv = { draftably: { documentPath: mdMissingPage } };
const mdCreated = await missingAdapter.prepare(
  md.parse(mdMissingSource, mdCreatedEnv),
  mdCreatedEnv,
);
assert.equal(mdCreated.dependencies[0], resolve(root, 'markdown-it-created-later.draft'));
await rm(resolve(root, 'markdown-it-created-later.draft'));

const hostCallbackFailure = new Error('markdown-it emitter failed');
const markdownItFailure = createMarkdownItDraft({
  errors: 'placeholder',
  emitAsset: async () => {
    throw hostCallbackFailure;
  },
});
const failedEnv = { draftably: { documentPath: pagePath } };
await assert.rejects(
  markdownItFailure.prepare(md.parse(markdown, failedEnv), failedEnv),
  error => error === hostCallbackFailure,
);

const outside = resolve('outside.draft');
await writeFile(outside, 'diagram "Outside" version=1\n');
const escapePath = resolve(root, 'escape.draft');
await symlink(outside, escapePath);
let escapeError;
try {
  await processor.process({
    path: resolve(root, 'escape.md'),
    value: ['```draft {src="./escape.draft"}', '```', ''].join('\n'),
  });
} catch (error) {
  escapeError = error;
}
assert.ok(escapeError?.diagnostics?.some(d => d.code === 'DRAFT_INCLUDE'));
await rm(escapePath);
await rm(missingPath);
await rm(outside);

console.log(
  `PASS packed Unified, MDX, and markdown-it consumer: ${manifest.assets.length} assets, ${emissions} emissions.`,
);
console.log(`HTML: ${resolve(out, 'page.html')}`);
console.log(`SVG: ${resolve(diagrams, warmNames[0])}`);
