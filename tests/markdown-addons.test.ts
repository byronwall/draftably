import { describe, expect, it } from 'vitest';
import { parseInitJson, sameOriginInitUrl } from '../packages/markdown/src/client-validation.js';
import {
  escapeHtml,
  imageHtml,
  isDraftFenceInfo,
} from '../packages/markdown/src/markdown-it-helpers.js';
import { hostFailure, isHostFailure, isNoPlaceholder } from '../packages/markdown/src/core.js';

describe('markdown-it helpers', () => {
  it('matches only the complete draft language token', () => {
    expect(isDraftFenceInfo('draft')).toBe(true);
    expect(isDraftFenceInfo('draft {alt="x"}')).toBe(true);
    expect(isDraftFenceInfo('draftly')).toBe(false);
    expect(isDraftFenceInfo('other draft')).toBe(false);
  });

  it('escapes image attributes and captions as plain text', () => {
    expect(imageHtml({ url: '/a?x=1&y=2', alt: '"<script>"', width: 40, height: 20 })).toBe(
      '<img src="/a?x=1&amp;y=2" alt="&quot;&lt;script&gt;&quot;" width="40" height="20">',
    );
    expect(escapeHtml('<em>text</em>')).toBe('&lt;em&gt;text&lt;/em&gt;');
  });
});

describe('interactive init validation', () => {
  const init = JSON.stringify({
    version: 1,
    key: 'draft-0123456789abcdef01234567',
    source: 'diagram "A" version=1',
    state: null,
    label: 'A & B',
    policyId: 'docs',
  });

  it('accepts the exact generated shape and same-origin URLs', () => {
    expect(parseInitJson(init, 'draft-0123456789abcdef01234567', 'docs').label).toBe('A & B');
    expect(
      sameOriginInitUrl('/diagrams/init.json', 'https://site.test', 'https://site.test/docs/')
        .pathname,
    ).toBe('/diagrams/init.json');
  });

  it.each([
    [
      'cross-origin URL',
      () =>
        sameOriginInitUrl(
          'https://evil.test/init.json',
          'https://site.test',
          'https://site.test/docs/',
        ),
    ],
    [
      'URL credentials',
      () =>
        sameOriginInitUrl(
          'https://user:pass@site.test/init.json',
          'https://site.test',
          'https://site.test/docs/',
        ),
    ],
    [
      'control character',
      () => sameOriginInitUrl('/init.json\n', 'https://site.test', 'https://site.test/docs/'),
    ],
    [
      'unknown key',
      () =>
        parseInitJson(
          init.replace('"version":1', '"version":1,"extra":true'),
          'draft-0123456789abcdef01234567',
          'docs',
        ),
    ],
    ['wrong policy', () => parseInitJson(init, 'draft-0123456789abcdef01234567', 'other')],
    [
      'oversized source',
      () => {
        const value = JSON.parse(init);
        value.source = 'x'.repeat(1_000_001);
        return parseInitJson(JSON.stringify(value), 'draft-0123456789abcdef01234567', 'docs');
      },
    ],
  ])('rejects %s', (_name, run) => expect(run).toThrow());
});

describe('host failure classification', () => {
  it('retains emitter exceptions as build failures', () => {
    const emitterError = new Error('disk is full');
    const marked = hostFailure(emitterError, 'SVG asset emitter failed.');
    expect(isHostFailure(marked)).toBe(true);
    expect(marked.cause).toBe(emitterError);
    expect(hostFailure(marked)).toBe(marked);
    expect(
      isNoPlaceholder(Object.assign(new Error('renderer failed'), { noPlaceholder: true })),
    ).toBe(true);
  });
});
