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
} from '@draftably/markdown';

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
parseFenceOptions('draft {alt="API"}');
void processor;
