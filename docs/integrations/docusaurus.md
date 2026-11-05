# Docusaurus

This fixture targets Docusaurus 3.10.2 and uses the packed
`@draftably/runtime` and `@draftably/markdown/remark` packages. The package
manifest pins proposed Draftably version 0.1.0; replace those dependencies with
the packed tarballs for a local proof.

The docs plugin runs as an async Remark transformer after Docusaurus's default
plugins. Keep the config and sidebar in CommonJS files. The config uses dynamic
imports for Draftably's ESM entry points. Draftably replaces its own code fence
with an image node, so Docusaurus does not need another diagram plugin. The
host helper writes each SVG to a persistent content-addressed directory.
`staticDirectories` exposes that store during development, while
`postBuild({ outDir })` copies the store into each clean build output.

The sample sets `baseUrl` to `/manual/` and emits that base in the image URL.
The fixture uses one locale. A localized installation must use its current
locale's effective base URL for every emitted asset URL.

Run `pnpm start`, open `/manual/`, and edit `docs/request.draft`. This fixture
has one Markdown entry and one `.draft` include directly under `docs/`. Its dev
script watches those direct `.draft` edits and updates the entry file's
timestamp. This forces Docusaurus to re-run the Markdown transform. The plugin
also uses `getPathsToWatch()` for its dependencies. A site with more entries or
nested includes needs a watcher for each affected entry. The default
`pnpm build` script clears Docusaurus's MDX cache before production builds because
that cache does not include remark-discovered files. Run `pnpm build` and check
that the SVG exists under `build/_draftably/`. The fixture uses the standard
webpack build. The optional Faster/Rspack plugin kept a stale result after an
included source changed in the packed-consumer proof.

## Official references

- [Docusaurus versions](https://docusaurus.io/versions)
- [Remark plugin configuration and async transformers](https://docusaurus.io/docs/markdown-features/plugins)
- [Plugin paths to watch](https://docusaurus.io/docs/api/plugin-methods/extend-infrastructure)
- [Plugin lifecycle hooks](https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis)
- [Static directories and base URL](https://docusaurus.io/docs/api/docusaurus-config)
- [Static assets](https://docusaurus.io/docs/static-assets)

The packed consumer built under Node 24.21.0. Editing the included source
changed the asset hash, and deleting `build/` then rebuilding restored the SVG
from the persistent store. The dev server served the image with HTTP 200.
Editing the included source created a new content hash, and the new image also
returned HTTP 200.
