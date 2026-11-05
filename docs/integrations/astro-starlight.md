# Astro and Starlight

This fixture targets Astro 7.4.5, Starlight 0.42.9, and
`@astrojs/markdown-remark` 7.3.5. It uses the packed `@draftably/runtime` and
`@draftably/markdown/remark` packages. The package manifest pins proposed
Draftably version 0.1.0; replace those two dependencies with the packed tarballs
for a local proof.

Astro 7 uses Sätteri by default. This fixture selects Unified explicitly and
passes `remarkDraft` through `markdown.processor`; the older top-level
`markdown.remarkPlugins` setting is deprecated. Starlight uses Astro's Markdown
processor for its Markdown and MDX pages.

The consumer files are in [`integration-examples/astro-starlight`](../../integration-examples/astro-starlight/README.md).
The included `.draft` file is inside the configured `sources.rootDir`, so the
fence resolves `./request.draft` relative to its Markdown file.

`createFileAssets` from `@draftably/markdown/files` writes content-addressed SVGs
to a persistent ignored store. The recipe sets `directory` to the asset folder
and `publicPath` to `/manual/_draftably/`. It needs no custom file writer.
Astro's dev hook serves that store under `/manual/_draftably/`, adds included
files to Vite's watcher, and restarts the dev server when an included file
changes. The build hook calls `assets.copyTo()` with `dist/_draftably/`, which
also restores SVGs when a cached page transform does not run. If a nested
include is missing, creating its parent directories and file restarts the dev
server and refreshes the page.

Run `pnpm dev`, open `/manual/`, and edit `src/content/docs/request.draft`.
Then run `pnpm build` and confirm the image resolves under the nested base path.

## Official references

- [Astro Unified processor](https://docs.astro.build/en/reference/markdown-processors/unified/)
- [Astro build and server hooks](https://docs.astro.build/en/reference/integrations-reference/)
- [Starlight Markdown configuration](https://starlight.astro.build/guides/authoring-content/)
- [Astro 7.4 release](https://astro.build/blog/astro-740/)
- [Starlight releases](https://github.com/withastro/starlight/releases)

The packed consumer built under Node 24.21.0. Editing the included source
changed the asset hash, and deleting `dist/` then rebuilding restored the SVG
from the persistent store. The dev server served the SVG at the `/manual/` base.
Editing the included source restarted the server, changed the rendered hash,
and returned the new SVG with HTTP 200.
