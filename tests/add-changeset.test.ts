import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('pnpm changeset:add', () => {
  it('writes a file that passes format:check', () => {
    const before = new Set(readdirSync('.changeset'));
    execFileSync('node', [
      'scripts/add-changeset.ts',
      'patch',
      'A long release note that runs past the print width, with `code` and a (parenthesis) in it.',
    ]);
    const added = readdirSync('.changeset').filter(f => !before.has(f));
    try {
      expect(added).toHaveLength(1);
      // Throws when Prettier would rewrite the file.
      execFileSync('node_modules/.bin/prettier', ['--check', `.changeset/${added[0]}`]);
    } finally {
      for (const f of added) rmSync(`.changeset/${f}`);
    }
  });
});
