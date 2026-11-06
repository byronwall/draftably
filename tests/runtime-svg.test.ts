import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderSvg, fontMetricsVersion } from '../src/runtime';
import { embedSvgSource, readSvgSource } from '../src/model/embed';

const source =
  'diagram "A & B" version=1\nnode a "A < B" href=javascript:alert(1)\nnode b "Store" href=./store\nedge ab a -> b\n';

describe('portable SVG policies', () => {
  it('namespaces inline references, scopes CSS and preserves both source reader forms', async () => {
    const a = await renderSvg(source, {
      target: 'inline',
      idPrefix: 'first',
      includeSource: true,
      description: 'A < B & C',
    });
    const b = await renderSvg(source, { target: 'inline', idPrefix: 'second', fonts: 'host' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const xml = new JSDOM(a.value.svg, { contentType: 'image/svg+xml' });
    expect(xml.window.document.documentElement.localName).toBe('svg');
    expect(xml.window.document.querySelector('desc')?.textContent).toBe('A < B & C');
    expect(readSvgSource(a.value.svg)).toBe(source);
    expect(readSvgSource(embedSvgSource('<svg></svg>', source))).toBe(source);
    expect(readSvgSource(b.value.svg)).toBe(null);
    const page = new JSDOM(a.value.svg + b.value.svg);
    const ids = [...page.window.document.querySelectorAll('[id]')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const svg of [a.value.svg, b.value.svg]) {
      const local = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
      for (const match of svg.matchAll(/url\(#([^)]*)\)/g))
        expect(local.getElementById(match[1])).not.toBe(null);
    }
    expect(b.value.svg).not.toContain('data:font');
    expect(a.value.svg).toContain(fontMetricsVersion);
  });

  it('checks final links after host resolution and never uses authored link-base', async () => {
    const result = await renderSvg(source, {
      links: { mode: 'safe', baseUrl: 'https://example.com/docs/', target: '_blank' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.svg).not.toContain('javascript:');
    expect(result.value.svg).toContain('href="https://example.com/docs/store"');
    expect(result.value.svg).toContain('rel="noopener noreferrer"');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'DRAFT_LINK_BLOCKED', itemIds: ['a'] }),
    );
    const blocked = await renderSvg(source, {
      links: { mode: 'safe', resolve: () => 'data:text/html,hi' },
    });
    expect(blocked.ok && blocked.value.svg.includes('<a ')).toBe(false);
    await expect(
      renderSvg(source, {
        links: {
          mode: 'safe',
          resolve: () => {
            throw Error('host resolver');
          },
        },
      }),
    ).rejects.toThrow('host resolver');
  });

  it('rejects invalid host text and combinations and stops output at the configured byte ceiling', async () => {
    expect(await renderSvg(source, { title: '\ud800' })).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'DRAFT_TEXT_INVALID' }],
    });
    await expect(renderSvg(source, { target: 'inline', idPrefix: 'bad"' })).rejects.toThrow(
      TypeError,
    );
    await expect(renderSvg(source, { fonts: 'host' } as never)).rejects.toThrow(TypeError);
    const result = await renderSvg(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const size = new TextEncoder().encode(result.value.svg).length;
    expect(await renderSvg(source, { limits: { maxOutputBytes: size } })).toMatchObject({
      ok: true,
    });
    expect(await renderSvg(source, { limits: { maxOutputBytes: size - 1 } })).toMatchObject({
      ok: false,
      reason: 'limit',
    });
  });
});
