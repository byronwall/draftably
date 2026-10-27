import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';
import { resolveAppearance, type ThemeId } from '../src/model/appearance';
import { measureText, wordPieces, wrapLines } from '../src/model/fonts';
import { titleArea } from '../src/model/labels';

const look = (theme: ThemeId = 'drafting') =>
  resolveAppearance({ theme, overrides: {}, colors: [] });

describe('word pieces', () => {
  it('splits identifiers where a reader would', () => {
    expect(wordPieces('annotationCommands')).toEqual(['annotation', 'Commands']);
    expect(wordPieces('src/viz/Treemap.tsx')).toEqual(['src/', 'viz/', 'Treemap.tsx']);
    expect(wordPieces('MEASURED_*_METRICS')).toEqual(['MEASURED_', '*_METRICS']);
    expect(wordPieces('code-annotations.md')).toEqual(['code-', 'annotations.md']);
    expect(wordPieces('Maintenanceverificationreport')).toEqual(['Maintenanceverificationreport']);
  });
});

describe('title wrapping', () => {
  it('breaks a long identifier between its pieces, not inside a word', () => {
    const title = look().title;
    // annotationCommands is wider than a 120px title line.
    expect(measureText('annotationCommands', title)).toBeGreaterThan(120);
    expect(wrapLines('annotationCommands', 120, title)).toEqual(['annotation', 'Commands']);
    expect(wrapLines('examples/*.draft', 100, title)).toEqual(['examples/', '*.draft']);
  });

  it('still breaks by character when one piece is too long for the line', () => {
    const title = look('fieldnotes').title;
    const parts = wrapLines('Maintenanceverificationreport', 128, title);
    expect(parts.length).toBe(2);
    expect(parts.every(p => measureText(p, title) <= 128)).toBe(true);
  });
});

describe('default node width', () => {
  const scene = checkSource(
    [
      'diagram "Wrap" version=1',
      'node ask "restic installed?" shape=diamond',
      'node long "Maintenanceverificationreport"',
      'node fixed "Maintenanceverificationreport"',
      'node plain "Load env file"',
      'size fixed width=164 height=56',
      'edge e1 ask -> long',
      'layout root flow direction=right',
    ].join('\n'),
  );
  const fits = (id: string, word: string) => {
    const o = scene.byId.get(id)!;
    return measureText(word, scene.look.title) <= titleArea(o.shape, o.w, o.h, scene.look).width;
  };

  it('grows a default-sized shape until its longest word fits whole', () => {
    expect(fits('ask', 'installed?')).toBe(true);
    expect(fits('long', 'Maintenanceverificationreport')).toBe(true);
    expect(scene.byId.get('long')!.w).toBeGreaterThan(164);
  });

  it('keeps the default width when every word fits, and a requested size exactly', () => {
    expect(scene.byId.get('plain')!.w).toBe(164);
    expect(scene.byId.get('fixed')!.w).toBe(164);
  });
});
