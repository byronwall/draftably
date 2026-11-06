import { describe, expect, it } from 'vitest';
import { renderSvg, validate } from '../src/runtime';
import { renderWithScene } from '../src/runtime/render';
import { projectScene } from '../src/dsl/project';
import { compile } from '../src/dsl/compile';
import { clone } from '../src/model/geometry';

describe('native runtime', () => {
  it('returns detached image SVG summaries without links or source metadata', async () => {
    const result = await renderSvg(
      'diagram "Checkout" version=1\nnode a "A" href=https://example.com\n',
      { sourceId: 'checkout.draft' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.svg).toContain('<svg');
    expect(result.value.svg).not.toContain('<a class="link"');
    expect(result.value.svg).not.toContain('draftably-source');
    expect(result.value.items).toEqual([{ id: 'a', kind: 'node', label: 'A', line: 2 }]);
    expect(result.value.title).toBe('Checkout');
    expect(result.value.width).toBeGreaterThan(0);
  });

  it('validates through async compilation and reports native source locations', async () => {
    const result = await validate('node a "A"\nnode a "Duplicate"\n', { sourceId: 'bad.draft' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0]).toMatchObject({
      code: 'DRAFT_PARSE',
      location: { sourceId: 'bad.draft', line: 2 },
    });
  });

  it('rejects invalid XML characters after quoted escape decoding', async () => {
    const result = await renderSvg('node a "bad\\u0001label"\n');
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: 'DRAFT_TEXT_INVALID' }] });
    expect(await renderSvg('node a "bad\u0001label"\n')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'DRAFT_TEXT_INVALID' }],
    });
  });

  it('allows tighter limits, rejects loosening and unknown limits, and honors cancellation', async () => {
    expect(await renderSvg('node a "A"\n', { limits: { maxObjects: 1 } })).toMatchObject({
      ok: true,
    });
    expect(
      await renderSvg('node a "A"\nnode b "B"\n', { limits: { maxObjects: 1 } }),
    ).toMatchObject({ ok: false, reason: 'limit' });
    expect(
      await renderSvg('group a "A"\ngroup b "B" in=a\nnode c "C" in=b\n', {
        limits: { maxDepth: 2 },
      }),
    ).toMatchObject({ ok: false, reason: 'limit' });
    expect(await renderSvg('node a "A"\n', { limits: { maxOutputBytes: 8 } })).toMatchObject({
      ok: false,
      reason: 'limit',
    });
    await expect(renderSvg('node a "A"\n', { limits: { maxObjects: 501 } })).rejects.toThrow(
      RangeError,
    );
    await expect(
      validate('node a "A"\n', { limits: { maxOutputBytes: 2 } } as never),
    ).rejects.toThrow(RangeError);
    const controller = new AbortController();
    controller.abort();
    expect(await validate('node a "A"\n', { signal: controller.signal })).toMatchObject({
      ok: false,
      reason: 'aborted',
    });
  });

  it('keeps inherited-looking source IDs as own projection and clone keys', async () => {
    const scene = await compile('node __proto__ "Prototype"\nnode constructor "Constructor"\n');
    const doc = projectScene(scene),
      copied = clone(doc);
    expect(Object.hasOwn(doc.styles, '__proto__')).toBe(true);
    expect(Object.hasOwn(copied.styles, '__proto__')).toBe(true);
    const result = await renderWithScene(
      'node __proto__ "Prototype"\nnode constructor "Constructor"\n',
    );
    expect(result.result.ok).toBe(true);
    if (result.result.ok)
      expect(result.result.value.items.map(item => item.id)).toEqual(['__proto__', 'constructor']);
  });

  it('rejects an escaped unpaired surrogate in a decoded label', async () => {
    expect(await renderSvg('node a "bad\\uD800label"\n')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'DRAFT_TEXT_INVALID' }],
    });
  });
});
