/**
 * Writes a static HTML page for each site route into dist-site/, after `vite build`. Link
 * previews and search crawlers do not run the app, so each page carries its own title,
 * description and social card in plain HTML. It also lets GitHub Pages serve deep links with a
 * 200 instead of the 404.html fallback. Run by `pnpm site:build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-site');
const base = process.env.SITE_BASE ?? '/draftably/';
// Social cards need absolute URLs. Set SITE_ORIGIN with the custom domain.
const origin = process.env.SITE_ORIGIN ?? 'https://byronwall.github.io';

interface Meta {
  path: string;
  title: string;
  description: string;
}

const SITE: Meta[] = [
  {
    path: '',
    title: 'Draftably: write the diagram, skip the dragging',
    description:
      'A text language and CLI for diagrams. Write plain .draft source; Draftably lays out the boxes, routes the lines and keeps it in git.',
  },
  {
    path: 'play',
    title: 'Playground · Draftably',
    description:
      'Write .draft source and watch the diagram redraw as you type. Share a link, download SVG or PNG, or drop an exported diagram to keep editing.',
  },
  {
    path: 'docs',
    title: 'Docs · Draftably',
    description:
      'The Draftably language, CLI, themes and agent skill, with live examples you can edit.',
  },
];

/** At most about 150 characters, ending on a word: previews cut longer text. */
const clip = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= 150) return flat;
  return `${flat.slice(0, 147).replace(/\s+\S*$/, '')}…`;
};

async function docsPages(): Promise<Meta[]> {
  // The docs read DSL.md and their pages through Vite (`?raw`, globs), so load them the same way.
  const server = await createServer({
    configFile: path.join(root, 'vite.site.config.ts'),
    server: { middlewareMode: true },
    // Only modules load here; scanning client dependencies would outlive the server.
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'error',
  });
  try {
    const docs = await server.ssrLoadModule('/docs/content.ts');
    return docs.PAGES.map(
      (p: {
        slug: string;
        title: string;
        lead: string;
        tokens: { type: string; text?: string }[];
      }) => {
        const first = p.lead || p.tokens.find(t => t.type === 'paragraph')?.text || p.title;
        return {
          path: `docs/${p.slug}`,
          title: `${p.title} · Draftably docs`,
          description: clip(docs.plain(first)),
        };
      },
    );
  } finally {
    await server.close();
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(template: string, meta: Meta) {
  // Pages serves each route from its folder and redirects the bare path to it with a slash.
  const url = `${origin}${base}${meta.path ? `${meta.path}/` : ''}`;
  const image = `${origin}${base}og.png`;
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Draftably" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Draftably source beside the diagram it draws" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="theme-color" content="#f5f6f9" />`,
  ].join('\n    ');
  return template
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*\/>/, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

// Strip tags a previous run added, so running this twice on one build gives the same pages.
const template = fs
  .readFileSync(path.join(out, 'index.html'), 'utf8')
  .split('\n')
  .filter(line => !/(property="og:|name="twitter:|rel="canonical"|name="theme-color")/.test(line))
  .join('\n');
const all = [...SITE, ...(await docsPages())];
for (const meta of all) {
  const file = path.join(out, meta.path, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(template, meta));
}
// Unknown paths still load the app, under the site's own card.
fs.writeFileSync(path.join(out, '404.html'), page(template, SITE[0]));
console.log(`Wrote ${all.length} pages with social tags.`);
