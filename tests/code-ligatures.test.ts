import { describe, expect, it } from 'vitest';
import PDFDocument from 'pdfkit';
import { rasterize } from '../src/cli/png';
import { fontFiles } from '../src/cli/raster-fonts';
import { CODE_TYPE } from '../src/model/code';
import { measureText } from '../src/model/fonts';
import { renderSvg } from '../src/runtime';

// Pairs JetBrains Mono draws as one ligature when its `calt` feature is on (#629).
const PAIRS = ['==', '!=', '>=', '<=', '->', '=>', '<-', '!==', '//', '&&'];

interface Glyph {
  id: number;
}
interface FontkitFont {
  layout(text: string): { glyphs: Glyph[] };
  glyphForCodePoint(cp: number): Glyph;
}

describe('code text keeps one glyph per character', () => {
  it('shapes each operator as its own characters in the mono face (PDF)', () => {
    const doc = new PDFDocument({ autoFirstPage: false });
    doc.font(fontFiles()['mono-500']);
    const font = (doc as unknown as { _font: { font: FontkitFont } })._font.font;
    for (const text of PAIRS) {
      const shaped = font.layout(`x ${text} y`).glyphs.map(g => g.id);
      const typed = [...`x ${text} y`].map(c => font.glyphForCodePoint(c.codePointAt(0)!).id);
      expect(shaped, text).toEqual(typed);
    }
  });

  it('draws each operator as its characters side by side (PNG)', async () => {
    const attrs = `font-size="${CODE_TYPE.size}" font-weight="${CODE_TYPE.weight}" font-family="${CODE_TYPE.family}"`;
    const step = measureText('M', CODE_TYPE);
    const pixels = async (body: string) =>
      (
        await rasterize(
          `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><text y="14" ${attrs}>${body}</text></svg>`,
        )
      ).render().pixels;
    const esc = (c: string) =>
      c.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    for (const text of PAIRS) {
      const whole = await pixels(`<tspan x="4">${esc(text)}</tspan>`);
      const apart = await pixels(
        [...text].map((c, i) => `<tspan x="${4 + i * step}">${esc(c)}</tspan>`).join(''),
      );
      expect(Buffer.compare(whole, apart), text).toBe(0);
    }
  });

  it('turns ligatures off on code text in the SVG', async () => {
    const result = await renderSvg('node a "code" shape=code <<C\nx == 8\nC\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.svg).toMatch(/text\.code-text\{font-variant-ligatures:none\}/);
    expect(result.value.svg).toMatch(/<text class="code-text"[^>]*>.*x == 8/);
  });
});
