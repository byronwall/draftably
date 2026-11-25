import { describe, expect, it } from 'vitest';
import PDFDocument from 'pdfkit';
import { rasterize } from '../src/cli/png';
import { fontFiles } from '../src/cli/raster-fonts';
import { FACES, FONT_ROLES, measureText, typeProfile, type FaceId } from '../src/model/fonts';

// A face that falls back to Inter draws `iiii` and `MMMM` 10 to 30 px off the stored widths at
// this size; the right face draws them within its two outer side bearings.
const SIZE = 20;

// Symbols diagram labels use, then Latin characters the faces always had. Neither export path
// falls back to a system font, so each face must carry them all (#624).
const SYMBOLS = ['→', '←', '↑', '◆', '◇', '✓', '×', '²', 'é', 'ß'];
// A private-use code point no face carries: it draws as `.notdef`.
const NOTDEF = '';

const textSvg = (text: string, type: ReturnType<typeof typeProfile>) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="40"><text x="0" y="30" font-size="${SIZE}" font-weight="${type.weight}" font-family="${type.family}">${text}</text></svg>`;

describe('PNG fonts', () => {
  for (const role of FONT_ROLES)
    it(`draws ${role} text in its own face, at the width the compiler measured`, async () => {
      const type = typeProfile(role, true, SIZE, SIZE);
      for (const text of ['iiii', 'MMMM']) {
        const drawn = (await rasterize(textSvg(text, type))).getBBox()!.width;
        expect(drawn, `${role} ${text}`).toBeLessThanOrEqual(measureText(text, type) + 0.5);
        expect(drawn, `${role} ${text}`).toBeGreaterThan(measureText(text, type) - 4);
      }
    });

  for (const role of FONT_ROLES)
    it(`draws arrows, shapes and check marks in ${role}, not as .notdef boxes`, async () => {
      const type = typeProfile(role, true, SIZE, SIZE);
      const pixels = async (text: string) => (await rasterize(textSvg(text, type))).render().pixels;
      const box = await pixels(NOTDEF);
      for (const char of SYMBOLS) {
        expect(Buffer.compare(await pixels(char), box), `${role} ${char}`).not.toBe(0);
        // The drawn glyph stays inside the advance the compiler reserved for it.
        const drawn = (await rasterize(textSvg(char, type))).getBBox()!.width;
        expect(drawn, `${role} ${char}`).toBeGreaterThan(1);
        expect(drawn, `${role} ${char}`).toBeLessThanOrEqual(measureText(char, type) + 1);
      }
    });
});

describe('PDF fonts', () => {
  // PDFKit draws each face alone, from the same TrueType files resvg loads.
  const files = fontFiles();
  for (const id of Object.keys(FACES) as FaceId[])
    it(`maps every symbol to a real glyph in ${id}`, () => {
      const doc = new PDFDocument({ autoFirstPage: false });
      doc.font(files[id]);
      const font = (doc as unknown as { _font: { font: FontkitFont } })._font.font;
      for (const char of SYMBOLS) {
        const glyph = font.glyphForCodePoint(char.codePointAt(0)!);
        expect(glyph.id, `${id} ${char}`).not.toBe(0);
        expect(glyph.advanceWidth, `${id} ${char}`).toBeGreaterThan(0);
      }
    });
});

interface FontkitFont {
  glyphForCodePoint(cp: number): { id: number; advanceWidth: number };
}
