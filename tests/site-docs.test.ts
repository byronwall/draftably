import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { THEME_IDS } from '../src/model/appearance';

const root = path.join(__dirname, '..');
const pages = path.join(root, 'site/docs/pages');
const files = [
  'docs/DSL.md',
  ...fs.readdirSync(pages).map(f => path.relative(root, path.join(pages, f))),
];

// The site draws every ```draft block, so each one must compile. A ```draft themes block is
// drawn once in each theme.
describe('docs examples', () => {
  for (const file of files) {
    const md = fs.readFileSync(path.join(root, file), 'utf8');
    const blocks = [...md.matchAll(/```draft( themes)?\n([\s\S]*?)```/g)];
    it(`${file} draws every draft block`, async () => {
      if (file === 'docs/DSL.md') expect(blocks.length).toBeGreaterThan(5);
      for (const [, themes, source] of blocks) {
        const sources = themes ? THEME_IDS.map(id => `theme ${id}\n${source}`) : [source];
        for (const s of sources) {
          const scene = await compile(s);
          expect(
            scene.diagnostics.filter(d => d.level === 'error'),
            s,
          ).toEqual([]);
        }
      }
    });
  }
});
