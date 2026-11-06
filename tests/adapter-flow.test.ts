import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCore = vi.hoisted(() => ({
  prepare: vi.fn(),
  makeDiagnostic: vi.fn(),
  isHostFailure: vi.fn(
    (error: unknown) => !!error && typeof error === 'object' && 'hostFailure' in error,
  ),
  isNoPlaceholder: vi.fn(
    (error: unknown) => !!error && typeof error === 'object' && 'noPlaceholder' in error,
  ),
  hostFailure: vi.fn((error: unknown, message?: string) =>
    Object.assign(new Error(message, { cause: error }), { hostFailure: true }),
  ),
}));
vi.mock('../packages/markdown/src/core.js', () => mockCore);

import remarkDraft from '../packages/markdown/src/remark.js';
import { createMarkdownItDraft } from '../packages/markdown/src/markdown-it.js';

type FenceRule = (...args: unknown[]) => string;
import { hostFailure } from '../packages/markdown/src/core.js';
import { escapeHtml } from '../packages/markdown/src/markdown-it-helpers.js';

const draftToken = () => ({
  type: 'fence',
  info: 'draft',
  content: 'source',
  map: [0, 3] as [number, number],
});

beforeEach(() => {
  mockCore.prepare.mockReset();
  mockCore.makeDiagnostic.mockImplementation((code, message, location) => ({
    code,
    message,
    location,
    severity: 'error',
    itemIds: [],
  }));
});

describe('adapter failure handling', () => {
  it('keeps a host asset failure fatal when remark placeholders are enabled', async () => {
    const original = new Error('disk full');
    mockCore.prepare.mockRejectedValue(hostFailure(original, 'SVG asset emitter failed.'));
    const tree = { type: 'root', children: [{ type: 'code', lang: 'draft', value: 'source' }] };
    const transform = remarkDraft({
      emitAsset: async () => ({ url: '/unused.svg' }),
      errors: 'placeholder',
    });
    await expect(transform(tree as never, { path: '/docs/page.md', data: {} })).rejects.toBe(
      original,
    );
  });
});

describe('markdown-it preparation', () => {
  it('requires preparation and renders the same prepared token tree safely', async () => {
    mockCore.prepare.mockResolvedValue({
      node: {
        type: 'figure',
        children: [
          {
            type: 'image',
            url: '/diagram.svg?x=1&y=2',
            alt: '<unsafe>',
            data: { hProperties: { width: 80, height: 50 } },
          },
          { type: 'figcaption', children: [{ type: 'text', value: '<script>alert(1)</script>' }] },
        ],
      },
      asset: { fileName: 'draft-test.svg', url: '/diagram.svg' },
      diagnostics: [],
    });
    const md: {
      renderer: { rules: Record<string, FenceRule | undefined>; renderToken: () => string };
      utils: { escapeHtml(value: string): string };
    } = {
      renderer: { rules: {}, renderToken: () => '<pre>default</pre>' },
      utils: { escapeHtml },
    };
    const draft = createMarkdownItDraft({ emitAsset: async () => ({ url: '/unused.svg' }) });
    draft.plugin(md as never);
    const tokens = [draftToken()];
    const env = { draftably: { documentPath: '/docs/page.md' } };
    const render = () =>
      md.renderer.rules.fence!(tokens as never, 0, {}, env, md.renderer as never);
    expect(render).toThrow('before prepare');
    const document = await draft.prepare(tokens as never, env);
    expect(document.assets).toHaveLength(1);
    expect(render()).toContain('src="/diagram.svg?x=1&amp;y=2"');
    expect(render()).toContain('alt="&lt;unsafe&gt;"');
    expect(render()).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(render()).not.toContain('<script>');
  });

  it('keeps concurrently prepared token trees isolated', async () => {
    mockCore.prepare.mockImplementation(async (_source, _metadata, _location, document) => ({
      node: {
        type: 'paragraph',
        data: { hProperties: { id: 'anchor<&' } },
        children: [{ type: 'text', value: document.path }],
      },
      asset: { fileName: `${document.path}.svg`, url: `/${document.path}.svg` },
      diagnostics: [],
    }));
    const md: {
      renderer: { rules: Record<string, FenceRule | undefined>; renderToken: () => string };
      utils: { escapeHtml(value: string): string };
    } = {
      renderer: { rules: {}, renderToken: () => '<pre>default</pre>' },
      utils: { escapeHtml },
    };
    const draft = createMarkdownItDraft({ emitAsset: async () => ({ url: '/unused.svg' }) });
    draft.plugin(md as never);
    const docs = ['/one.md', '/two.md'].map(documentPath => {
      const tokens = [draftToken()];
      const env = { draftably: { documentPath } };
      return { tokens, env };
    });
    const results = await Promise.all(
      docs.map(({ tokens, env }) => draft.prepare(tokens as never, env)),
    );
    const render = (tokens: (typeof docs)[number]['tokens'], env: (typeof docs)[number]['env']) =>
      md.renderer.rules.fence!(tokens as never, 0, {}, env, md.renderer as never);

    expect(results.map(result => result.assets[0].fileName)).toEqual([
      '/one.md.svg',
      '/two.md.svg',
    ]);
    expect(render(docs[0].tokens, docs[0].env)).toBe('<p id="anchor&lt;&amp;">/one.md</p>\n');
    expect(render(docs[1].tokens, docs[1].env)).toBe('<p id="anchor&lt;&amp;">/two.md</p>\n');
  });

  it('clears old output before a token is prepared again', async () => {
    mockCore.prepare
      .mockResolvedValueOnce({
        node: { type: 'paragraph', children: [{ type: 'text', value: 'old output' }] },
        diagnostics: [],
      })
      .mockRejectedValueOnce(new Error('new preparation failed'));
    const md: {
      renderer: { rules: Record<string, FenceRule | undefined>; renderToken: () => string };
      utils: { escapeHtml(value: string): string };
    } = {
      renderer: { rules: {}, renderToken: () => '<pre>default</pre>' },
      utils: { escapeHtml },
    };
    const draft = createMarkdownItDraft({ emitAsset: async () => ({ url: '/unused.svg' }) });
    draft.plugin(md as never);
    const tokens = [draftToken()];
    const env = { draftably: { documentPath: '/docs/page.md' } };
    const render = () =>
      md.renderer.rules.fence!(tokens as never, 0, {}, env, md.renderer as never);

    await draft.prepare(tokens as never, env);
    expect(render()).toContain('old output');
    await expect(draft.prepare(tokens as never, env)).rejects.toThrow('preparation failed');
    expect(render).toThrow('before prepare');
  });
});
