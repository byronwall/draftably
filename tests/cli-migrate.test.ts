import { JSDOM } from 'jsdom';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { migrateText } from '../src/cli/migrate';
import { checkSource } from '../src/dsl/compile';
import { createMermaidFlowParser, makePlainLabel } from '../src/import/mermaid-facade';
import { importMermaidFlow } from '../src/import/mermaid-importer';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const parse = createMermaidFlowParser(async () => (await import('mermaid')).default);
const convert = async (source: string) =>
  importMermaidFlow(await parse(source), makePlainLabel(dom.window.document));
beforeAll(() => {
  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('Option', dom.window.Option);
});
afterAll(() => {
  vi.unstubAllGlobals();
  dom.window.close();
});

it('rewrites flowchart and sequence fences and leaves other Mermaid charts alone', async () => {
  const pie = '```mermaid\npie title Pets\n  "Dogs" : 3\n```';
  const lossy = '```mermaid\nflowchart LR\n  A(Round) --> B\n```';
  const text = [
    '# Doc',
    '```mermaid\nflowchart LR\n  A[Web] -->|HTTPS| B[API]\n```',
    '````mermaid\nsequenceDiagram\n  U->>A: POST /orders\n````',
    pie,
    lossy,
    '```js\nconst mermaid = 1;\n```',
  ].join('\n\n');
  const { text: out, fences } = await migrateText(text, convert);
  expect(fences.map(f => [f.family, f.status])).toEqual([
    ['flowchart', 'converted'],
    ['sequenceDiagram', 'converted'],
    ['pie', 'skipped'],
    ['flowchart', 'kept'],
  ]);
  expect(fences[3].messages.join()).toContain('MERMAID_SHAPE_APPROXIMATION');
  expect(out).toContain(pie);
  expect(out).toContain(lossy);
  expect(out).toContain('```js\nconst mermaid = 1;\n```');
  const drafts = [...out.matchAll(/^(`{3,})draft\n([\s\S]*?)\n\1$/gm)].map(m => m[2]);
  expect(drafts).toHaveLength(2);
  expect(drafts[0]).not.toContain('diagram "');
  expect(checkSource(drafts[0]).edges[0].label).toBe('HTTPS');
  expect(checkSource(drafts[1]).edges).toHaveLength(1);
  const accepted = await migrateText(text, convert, true);
  expect(accepted.fences[3].status).toBe('converted');
});
