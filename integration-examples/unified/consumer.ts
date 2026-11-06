import MarkdownIt from 'markdown-it';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDraft from '@draftably/markdown/remark';
import {
  createMarkdownItDraft,
  type DraftMarkdownItEnvironment,
} from '@draftably/markdown/markdown-it';
import {
  parseFenceOptions,
  type DraftDocumentResult,
  type DraftMarkdownOptions,
  type MarkdownInteractiveBridge,
} from '@draftably/markdown';
import { createFileAssets } from '@draftably/markdown/files';

const options: DraftMarkdownOptions = {
  emitAsset: async asset => ({ url: `/diagrams/${asset.fileName}` }),
};
const processor = unified().use(remarkParse).use(remarkDraft, options);
const adapter = createMarkdownItDraft(options);
const markdownIt = new MarkdownIt().use(adapter.plugin);
const env: DraftMarkdownItEnvironment = { draftably: { documentPath: '/content/page.md' } };
const tokens = markdownIt.parse('```draft\ndiagram "API" version=1\n```', env);
const document: Promise<DraftDocumentResult> = adapter.prepare(tokens, env);
await document;
markdownIt.renderer.render(tokens, markdownIt.options, env);
const rendered = await adapter.render(markdownIt, '```draft\ndiagram "API" version=1\n```', env);
const html: string = rendered.html;
const manifest: DraftDocumentResult = rendered.manifest;
const files = createFileAssets({ directory: '/tmp/draftably-assets', publicPath: '/docs/' });
const fileOptions: DraftMarkdownOptions = { emitAsset: files.emitAsset, mermaid: 'convert' };
const emitInit: MarkdownInteractiveBridge['emitInit'] = files.emitInit;
void Promise.all([files.copyTo('/tmp/draftably-assets-output')]);
void fileOptions;
void emitInit;
void html;
void manifest;
parseFenceOptions('draft {alt="API"}');
void processor;
