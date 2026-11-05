# Embedding implementation evidence

Status on 2026-11-05. The selected Build recommendations are implemented in the stack below. No package publication, PR merge, extension release, or external contact is included. Explore recommendations remain separate proposals.

## Runtime and distribution

Packed Node and plain-browser consumers pass. The Node consumer needs no DOM shim. Proofs check native geometry, deterministic fonts, source privacy, links, limits, declarations, and nested browser asset paths.

```sh
pnpm runtime:build && pnpm runtime:pack-check
pnpm prove:runtime
```

The final runtime archive measured 534,756 bytes. Its static ESM graph measured 325,578 bytes; distributed font files measured 92,088 bytes. The static entry loads embedded font data only when needed. The package includes a separate viewer entry and worker.

## Static Markdown and optional client

Packed Unified, MDX, and markdown-it consumers pass. The static proof emitted four SVG assets across 28 emitter calls. It checks warm asset replay, includes, positions, concurrent documents, and exact prepared-token ownership. External NodeNext declarations pass strict checking with library checking enabled.

```sh
pnpm markdown:build && pnpm markdown:pack-check
pnpm markdown:browser-check
```

The Markdown archive measured 12,314 bytes. Static output uses ordinary images. The optional browser client validates bounded same-origin initialization data and rejects redirects. Generated IDs remain stable across checkout paths.

The real viewer browser proof covers JavaScript-disabled fallback, two diagrams, successful enhancement, failed policy and redirect handling, cleanup, and late fetch or worker results. Independent Chrome 156 review checks the visible Enhance and Restore controls, keyboard use, viewer isolation, reload, and 390-pixel layout.

## Independent viewer

Packed worker, React Strict Mode, and Solid lifecycle consumers pass. Browser checks cover rapid updates, invalid input after success, hidden hosts, height-only resize, camera preservation, approved links, cleanup, and blocked workers or fonts.

```sh
pnpm viewer:pack-check
pnpm prove:viewer
```

Independent Chrome 156 review passes desktop controls and keyboard activation of Actual size at 390 pixels. Outline selection centers the item and keeps focus. Fit restores the overview. Vue and Svelte have lifecycle recipes; no framework wrapper packages are added.

The runtime caps SVG output at 8,000,000 bytes. Worker rendering defaults to a five-second timeout. Main-thread cancellation remains cooperative.

## Documentation hosts

```sh
pnpm host:pack-check
```

The runner packs both packages into unique temporary paths, installs fresh consumers, and builds each host twice. It clears output directories and changes an included source between builds. Each generated URL stays below `/manual/`, refers to an existing SVG, and changes with source bytes.

Qualified versions:

- Astro 7.4.5, Starlight 0.42.9, and `@astrojs/markdown-remark` 7.3.5.
- Docusaurus 3.10.2 with React 19.2.0.
- VitePress 1.6.4.

Production and development checks use Node 24.21.0. Independent Chrome 156 review confirms loaded SVG, alt text, readable diagrams, and reload. Fresh pages have no console errors.

Docusaurus uses standard webpack and clears its MDX cache before production builds. Its development wrapper covers one entry, direct includes, and one locale. Faster caching failed the include-edit check. VitePress uses generated-image preprocessing. Astro and VitePress recover from newly created nested includes during development.

## Contributor materials and repository checks

The support matrix, contributor guide, saved proposal drafts, and shared source/metadata/diagnostic/output fixtures are included. The fixture contract passes three tests against the actual runtime and Markdown core.

```sh
pnpm exec vitest run tests/fixtures/integrations/contract.test.ts
pnpm check
```

The final `pnpm check` passed 636 tests in 85 files, engine regression suites, 320 parity comparisons, and the production build. All 37 local links in the updated integration and planning documents resolve. Standalone site builds and unit tests also pass with generated runtime artifacts removed.

## Review order

| Layer | Pull request                                            | Scope                                     |
| ----- | ------------------------------------------------------- | ----------------------------------------- |
| 1     | [#422](https://github.com/byronwall/draftably/pull/422) | Reviewed research and plan.               |
| 2     | [#444](https://github.com/byronwall/draftably/pull/444) | Runtime API and diagnostics.              |
| 3     | [#446](https://github.com/byronwall/draftably/pull/446) | Shared SVG output and policies.           |
| 4     | [#447](https://github.com/byronwall/draftably/pull/447) | Runtime package and installed consumers.  |
| 5     | [#448](https://github.com/byronwall/draftably/pull/448) | Shared Markdown core and remark.          |
| 6     | [#449](https://github.com/byronwall/draftably/pull/449) | Independent viewer and framework recipes. |
| 7     | [#450](https://github.com/byronwall/draftably/pull/450) | markdown-it and optional client.          |
| 8     | [#451](https://github.com/byronwall/draftably/pull/451) | Qualified documentation hosts.            |
| 9     | Current contributor layer                               | Contributor fixtures and support record.  |
