import { describe, expect, it } from 'vitest';
import { parseFenceOptions } from '../packages/markdown/src/metadata.js';
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveSource } from '../packages/markdown/src/source.js';

describe('canonical draft fence metadata', () => {
  it('accepts the documented quoted form and escaped characters', () => {
    expect(
      parseFenceOptions(
        'draft {id="checkout" alt="A \\"safe\\" path" caption="API\\\\DB" state="write"}',
      ),
    ).toEqual({ id: 'checkout', alt: 'A "safe" path', caption: 'API\\DB', state: 'write' });
  });

  it.each([
    'draft {src="https://example.test/a.draft"}',
    'draft {onclick="run()"}',
    'draft {id="one" id="two"}',
    'draft {alt="unterminated}',
    'draft {alt="line\nbreak"}',
    'draft {id=checkout}',
    'draft {id=""}',
    'draft {mode=""}',
    'draft trailing',
  ])('rejects unsafe or malformed metadata: %s', value => {
    expect(() => parseFenceOptions(value)).toThrow();
  });

  it('accepts a bare fence', () => {
    expect(parseFenceOptions('draft')).toEqual({});
  });

  it('accepts the interactive capability marker for host-side validation', () => {
    expect(parseFenceOptions('draft {mode="interactive"}')).toEqual({ mode: 'interactive' });
  });
});

describe('local source resolution', () => {
  it('reads a contained .draft file and rejects a symlink escape', async () => {
    const base = await mkdtemp(join(tmpdir(), 'draft-markdown-'));
    const root = join(base, 'content');
    const outside = join(base, 'outside');
    await mkdir(root);
    await mkdir(outside);
    await writeFile(join(root, 'inside.draft'), 'diagram "Inside" version=1');
    await writeFile(join(outside, 'outside.draft'), 'diagram "Outside" version=1');
    await symlink(join(outside, 'outside.draft'), join(root, 'escape.draft'));
    try {
      const result = await resolveSource('./inside.draft', join(root, 'page.md'), root);
      expect(result.source).toContain('Inside');
      await expect(resolveSource('./escape.draft', join(root, 'page.md'), root)).rejects.toThrow(
        'outside the configured content root',
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('returns a watchable missing path marker without accepting remote paths', async () => {
    const base = await mkdtemp(join(tmpdir(), 'draft-markdown-'));
    const root = join(base, 'content');
    await mkdir(root);
    try {
      await expect(resolveSource('./new.draft', join(root, 'page.md'), root)).rejects.toMatchObject(
        {
          missingPath: resolve(root, 'new.draft'),
          watchPath: await realpath(root),
        },
      );
      await expect(
        resolveSource('https://example.test/x.draft', join(root, 'page.md'), root),
      ).rejects.toThrow('relative local path');
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
