import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import { describe, expect, it } from 'vitest';
import { anchorPath, findPage, PAGES } from '../site/docs/content';
import { compile } from '../src/dsl/compile';
import { THEME_IDS } from '../src/model/appearance';
import { findExample } from '../src/model/examples';

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

// Guidance and supporting sources stay on the site. Relative repository paths resolve to GitHub.
describe('docs links', () => {
  const links = PAGES.flatMap(page => {
    const out: { page: string; href: string }[] = [];
    const markdown = new Marked();
    markdown.walkTokens([...markdown.lexer(page.lead), ...page.tokens], t => {
      if (t.type === 'link') out.push({ page: page.slug, href: t.href });
    });
    return out;
  });

  it('reads links from the pages', () => {
    expect(links.length).toBeGreaterThan(100);
  });

  it('never sends a reader to the repository for guidance or source examples', () => {
    const bad = links.filter(
      ({ href }) =>
        /(?:github\.com|raw\.githubusercontent\.com)\/byronwall\/draftably(?:\/|$)/.test(href) ||
        !/^([a-z]+:|#|\/)/.test(href),
    );
    expect(bad).toEqual([]);
  });

  it('points every docs link at a page or heading that exists', () => {
    const bad = links.filter(({ href }) => {
      const docs = /^(?:https:\/\/draftably\.dev)?\/docs\/([a-z0-9-]+)\/?(?:#(.*))?$/.exec(href);
      if (docs) {
        const page = findPage(docs[1]);
        return !page || (docs[2] != null && !page.headings.some(h => h.id === docs[2]));
      }
      return href.startsWith('#') && !anchorPath(href.slice(1));
    });
    expect(bad).toEqual([]);
  });

  it('opens an existing example for every Playground example link', () => {
    const bad = links.filter(({ href }) => {
      const url = new URL(href, 'https://draftably.dev');
      const id = url.searchParams.get('example');
      return url.pathname === '/play' && id !== null && !findExample(id);
    });
    expect(bad).toEqual([]);
  });

  it('serves every linked evaluation source from the public site', () => {
    const sources = links.filter(({ href }) => href.startsWith('/evaluations/'));
    expect(sources.length).toBeGreaterThan(40);
    for (const { href } of sources) {
      expect(fs.existsSync(path.join(root, 'site/public', href)), href).toBe(true);
    }
  });
});
