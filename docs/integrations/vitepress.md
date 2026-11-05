# VitePress generated images

This fixture targets stable VitePress 1.6.4. It uses the packed
`@draftably/runtime` and `@draftably/markdown/remark` packages from a prebuild
step. It does not claim that VitePress's synchronous Markdown-it fence hook can
await Draftably rendering.

Before starting VitePress, `scripts/prepare.mjs` runs the original Markdown
through Unified and `remarkDraft`. It writes ordinary image Markdown to
`generated-docs/index.md` and writes content-addressed SVGs under
`generated-docs/public/_draftably/`. The generated image path is `/_draftably/<hash>.svg`;
VitePress prepends the configured `/manual/` base when it builds the page.
The preprocessor also copies the shared favicon to VitePress's `public` folder.

Run `pnpm dev`, open `/manual/`, and edit `docs/request.draft`. The runner
regenerates the page on Markdown or included `.draft` changes. If a nested
include is missing, creating its parent directories and file regenerates the
page without restarting the dev server. Run `pnpm build`
to regenerate from a clean state and confirm the SVG is in the output. Keep
`generated-docs/` and `generated-docs/public/_draftably/` as generated outputs.

## Official references

- [VitePress site configuration](https://vitepress.dev/reference/site-config)
- [VitePress asset handling and base paths](https://vitepress.dev/guide/asset-handling)
- [VitePress Markdown configuration](https://vitepress.dev/guide/markdown)
- [VitePress releases](https://github.com/vuejs/vitepress/releases)

The packed consumer built under Node 24.21.0. Editing the included source
changed the asset hash, and deleting `.vitepress/dist/` then rebuilding kept
the generated SVG. The dev runner regenerated the page after an included
source edit, and VitePress served the new SVG at the `/manual/` base.
