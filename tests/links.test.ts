import { describe, expect, it } from 'vitest';
import { parseModel } from '../src/dsl/syntax';
import { editorUrl, joinPath, linkTarget } from '../src/model/link';

describe('links', () => {
  it('keeps URLs as written and reads a line and column off a file path', () => {
    expect(linkTarget('https://github.com/o/r/blob/main/a.ts#L4')).toEqual({
      kind: 'url',
      path: 'https://github.com/o/r/blob/main/a.ts#L4',
    });
    expect(linkTarget('src/api.ts:42:5')).toEqual({
      kind: 'file',
      path: 'src/api.ts',
      line: 42,
      col: 5,
    });
    expect(linkTarget('docs/flow.draft')).toEqual({ kind: 'draft', path: 'docs/flow.draft' });
  });

  it('resolves a relative path from the base and builds an editor link', () => {
    expect(joinPath('/repo', 'src/./a.ts')).toBe('/repo/src/a.ts');
    expect(joinPath('/repo/docs', '../src/a.ts')).toBe('/repo/src/a.ts');
    expect(joinPath('/repo', '/abs/a.ts')).toBe('/abs/a.ts');
    expect(editorUrl('cursor', '/repo/src/a.ts', 42)).toBe('cursor://file/repo/src/a.ts:42');
  });
});

describe('config', () => {
  it('reads several keys per line or one per line, and warns when a key repeats', () => {
    const m = parseModel('config editor=cursor\nconfig link-base="../.." editor=zed\nnode a "A"\n');
    expect(m.appearance.config).toEqual({ editor: 'zed', linkBase: '../..' });
    expect(m.warnings).toEqual([
      { code: 'config-repeated', message: expect.stringContaining('line 1'), line: 2 },
    ]);
    expect(() => parseModel('config editor=notepad\n')).toThrow(/editor=/);
  });
});
